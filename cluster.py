import cudf
import pandas as pd
import numpy as np
from cuml.cluster import HDBSCAN
from pyproj import Transformer
from tqdm import tqdm
import re

print("="*60)
print("STEP 1: FLATTENING MAP & PREPPING ON GPU")
print("="*60)

# 1. Load dataset directly onto the GPU
# (Make sure the filename matches exactly what is in your directory)
gpu_dataset = cudf.read_csv("jan to may police violation_anonymized791b166.csv")

# Bring to CPU temporarily just for the map projection math
valid_df = gpu_dataset.dropna(subset=['latitude', 'longitude']).to_pandas().copy()

# 2. Set up the Map Projector
# EPSG:4326 is standard GPS (Lat/Lon). 
# EPSG:32643 is the flat UTM map zone in meters that covers Bengaluru.
transformer = Transformer.from_crs("EPSG:4326", "EPSG:32643", always_xy=True)

print("Projecting spherical coordinates into a flat Cartesian grid (meters)...")
valid_df['x_meters'], valid_df['y_meters'] = transformer.transform(
    valid_df['longitude'].values, 
    valid_df['latitude'].values
)

# 3. Push the flattened X/Y coordinates back to the GPU
gpu_coords = cudf.DataFrame(valid_df[['x_meters', 'y_meters']])

print(f"Prepared {len(valid_df)} valid coordinates in VRAM.\n")


print("="*60)
print("STEP 2: RUNNING GPU-ACCELERATED HDBSCAN")
print("="*60)

# The RTX 3070 Ti will crunch this in roughly 1 to 3 seconds!
# We don't specify a metric because our flat grid uses standard Euclidean math perfectly.
hdbscan_model = HDBSCAN(min_cluster_size=50)
valid_df['hdbscan_cluster'] = hdbscan_model.fit_predict(gpu_coords).to_numpy()

print("Clustering Complete! Moving to text processing...\n")


print("="*60)
print("STEP 3: ADVANCED LABELING & MAPPING")
print("="*60)

def extract_clean_locality(loc_string):
    if pd.isna(loc_string): return "Unknown"
    parts = [p.strip() for p in str(loc_string).split(',')]
    clean_parts = []
    
    for p in parts:
        p_lower = p.lower()
        if 'karnataka' in p_lower or 'india' in p_lower: continue
        if 'bengaluru' in p_lower or 'bangalore' in p_lower: continue
        if 'bbmp' in p_lower or 'city corporation' in p_lower: continue
        if re.search(r'\b\d{6}\b', p): continue
        if not p: continue
        clean_parts.append(p)
        
    return clean_parts[-1] if clean_parts else "Unknown"

cluster_summaries = []

# Group by clusters (ignoring the '-1' noise points)
grouped_clusters = valid_df[valid_df['hdbscan_cluster'] != -1].groupby('hdbscan_cluster')

# Wrap the loop in tqdm for a beautiful progress bar
for cluster_id, group in tqdm(grouped_clusters, desc="Labeling Hotspots", unit="cluster"):
    total_in_cluster = len(group)
    junction_counts = group['junction_name'].value_counts()
    valid_junctions = junction_counts[junction_counts.index != 'No Junction']
    
    no_junction_pct = (junction_counts.get('No Junction', 0) / total_in_cluster) * 100
    dominant_junction_pct = (valid_junctions.iloc[0] / total_in_cluster * 100) if not valid_junctions.empty else 0
    
    if dominant_junction_pct >= 60.0:
        label_name = valid_junctions.index[0]
        label_type = "confirmed_junction"
    else:
        localities = group['location'].apply(extract_clean_locality)
        top_locality = localities.value_counts().index[0]
        
        if no_junction_pct >= 60.0:
            label_name = f"{top_locality} (Area)"
            label_type = "unofficial_hotspot"
        else:
            label_name = f"{top_locality} (Mixed Area)"
            label_type = "mixed_ambiguous"
            
    cluster_summaries.append({
        'cluster_id': cluster_id,
        'label_name': label_name,
        'label_type': label_type,
        'total_violations_in_cluster': total_in_cluster,
        'centroid_lat': round(group['latitude'].mean(), 6),
        'centroid_long': round(group['longitude'].mean(), 6),
        'dominant_junction_pct': round(dominant_junction_pct, 2)
    })

# Display the top 15 results in the terminal
summary_table = pd.DataFrame(cluster_summaries).sort_values(by='total_violations_in_cluster', ascending=False)
print("\nTop 15 Hotspots Identified:")
print("-" * 50)
print(summary_table.head(15).to_string())

print("\nMapping clusters back to the main dataset...")

# Move the main dataset to CPU to merge safely
violations_dataset = gpu_dataset.to_pandas()

cluster_mapping = valid_df['hdbscan_cluster']
violations_dataset['hdbscan_cluster'] = violations_dataset.index.map(cluster_mapping)
violations_dataset['hdbscan_cluster'] = violations_dataset['hdbscan_cluster'].fillna(-1).astype(int)

label_dict = dict(zip(summary_table['cluster_id'], summary_table['label_name']))
label_dict[-1] = "Noise / Isolated Point"
violations_dataset['hotspot_name'] = violations_dataset['hdbscan_cluster'].map(label_dict)

print("\nSuccessfully added 'hdbscan_cluster' and 'hotspot_name' columns!")

# Uncomment the line below if you want to immediately save the results to a new CSV file
# violations_dataset.to_csv("final_clustered_dataset.csv", index=False)
print("Pipeline Execution Complete.")