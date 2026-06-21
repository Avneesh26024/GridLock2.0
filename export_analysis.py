"""
export_analysis.py
==================
Standalone export script — run after cluster_final.ipynb has completed its full
analysis pipeline (summary_standard, repeat_offenders_standard, ps_rollup_standard
must already exist in the Jupyter kernel, or pass them as arguments if running
from a fresh Python session by loading the CSVs / pickle files first).

Usage (from within the same Jupyter session, in a new cell):
    exec(open('export_analysis.py').read())
    export_analysis_to_json(
        summary_df            = summary_standard,
        repeat_offenders_df   = repeat_offenders_standard,
        police_station_rollup = ps_rollup_standard,
    )

Output: ./exports/  (created automatically)
  ├── export_hotspots.json          — all hotspots, one JSON object per row
  ├── export_repeat_offenders.json  — top 200 repeat offenders by total_occurrences
  ├── export_police_stations.json   — all 54 police stations
  └── export_key_findings.json      — narrative-level summary stats for LLM retrieval
"""

import os
import json
import math
import pandas as pd
from datetime import datetime


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _safe_val(v):
    """Convert a value to a JSON-serializable type."""
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (pd.Timestamp,)):
        return v.isoformat()
    if hasattr(v, 'item'):                  # numpy scalar
        return v.item()
    if isinstance(v, dict):
        return {k: _safe_val(vv) for k, vv in v.items()}
    return v


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert a dataframe to a list of JSON-safe dicts."""
    records = []
    for _, row in df.iterrows():
        records.append({col: _safe_val(row[col]) for col in df.columns})
    return records


def _write_json(data: list | dict, path: str) -> int:
    """Write indented JSON; returns number of top-level records (or 1 for dict)."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    return len(data) if isinstance(data, list) else 1


# ─────────────────────────────────────────────────────────────
# MAIN EXPORT FUNCTION
# ─────────────────────────────────────────────────────────────

def export_analysis_to_json(
    summary_df: pd.DataFrame,
    repeat_offenders_df: pd.DataFrame,
    police_station_rollup: pd.DataFrame,
    output_dir: str = './exports',
) -> None:
    """
    Export all three analysis dataframes + a key-findings summary to structured
    JSON files under `output_dir`.

    Parameters
    ----------
    summary_df            : Enriched hotspot summary (from compute_impact_score).
    repeat_offenders_df   : Vehicle-level repeat offense table (from compute_repeat_offenders).
    police_station_rollup : Station-level rollup (from compute_police_station_rollup).
    output_dir            : Local output folder (created if it doesn't exist).
    """

    os.makedirs(output_dir, exist_ok=True)
    print(f"\n{'='*58}")
    print("  JSON EXPORT — GridLock Analysis")
    print(f"  Output directory: {os.path.abspath(output_dir)}")
    print(f"{'='*58}\n")

    # ── 1. HOTSPOTS ──────────────────────────────────────────
    path_hotspots = os.path.join(output_dir, 'export_hotspots.json')
    hotspot_records = _df_to_records(summary_df)
    n = _write_json(hotspot_records, path_hotspots)
    print(f"  [1] export_hotspots.json         → {n:>6,} rows  ({os.path.getsize(path_hotspots)/1024:.1f} KB)")

    # ── 2. REPEAT OFFENDERS (top 200) ───────────────────────
    path_offenders = os.path.join(output_dir, 'export_repeat_offenders.json')
    top_offenders = repeat_offenders_df.nlargest(200, 'total_occurrences').reset_index(drop=True)
    offender_records = _df_to_records(top_offenders)
    n = _write_json(offender_records, path_offenders)
    print(f"  [2] export_repeat_offenders.json → {n:>6,} rows  ({os.path.getsize(path_offenders)/1024:.1f} KB)")

    # ── 3. POLICE STATIONS ───────────────────────────────────
    path_stations = os.path.join(output_dir, 'export_police_stations.json')
    station_records = _df_to_records(police_station_rollup)
    n = _write_json(station_records, path_stations)
    print(f"  [3] export_police_stations.json  → {n:>6,} rows  ({os.path.getsize(path_stations)/1024:.1f} KB)")

    # ── 4. KEY FINDINGS (narrative summary for LLM retrieval) ─
    path_findings = os.path.join(output_dir, 'export_key_findings.json')

    type_counts = summary_df['label_type'].value_counts().to_dict()
    top5 = summary_df.nlargest(5, 'impact_score')[
        ['label_name', 'impact_score', 'total_violations', 'label_type']
    ].reset_index(drop=True)

    total_violations_in_summary = int(summary_df['total_violations'].sum())
    total_hotspots               = len(summary_df)
    n_confirmed                  = int(type_counts.get('confirmed_junction', 0))
    n_unofficial                 = int(type_counts.get('unofficial_hotspot', 0))
    n_small                      = int(type_counts.get('small_street_hotspot', 0))

    # Peak hour stats across summary_df
    avg_peak_pct = round(float(summary_df['peak_hour_pct'].mean()), 2)
    top_peak_hotspot = summary_df.loc[summary_df['peak_hour_pct'].idxmax(), 'label_name'] if not summary_df.empty else "N/A"

    key_findings = {
        "generated_at":            datetime.now().isoformat(),
        "dataset_description":     "Bengaluru Traffic Police (BTP) illegal parking violations, Jan–Apr 2024",
        "total_input_violations":  298450,   # raw dataset size before deduplication
        "total_violations_in_analysis": total_violations_in_summary,
        "total_hotspots_identified":    total_hotspots,
        "hotspot_type_breakdown": {
            "confirmed_junction":    n_confirmed,
            "unofficial_hotspot":    n_unofficial,
            "small_street_hotspot":  n_small,
        },
        "top_5_hotspots_by_impact_score": [
            {
                "rank":             i + 1,
                "name":             row['label_name'],
                "type":             row['label_type'],
                "impact_score":     float(row['impact_score']),
                "total_violations": int(row['total_violations']),
            }
            for i, row in top5.iterrows()
        ],
        "peak_enforcement_hours": {
            "definition":           "Hours 0–6 and 19–23 (10 PM – 6 AM window)",
            "avg_peak_hour_pct_across_hotspots": avg_peak_pct,
            "hotspot_with_highest_peak_concentration": top_peak_hotspot,
            "narrative":            (
                f"On average, {avg_peak_pct}% of violations per hotspot occur during "
                "the defined peak enforcement hours (10 PM – 6 AM). This pattern likely "
                "reflects night patrol scheduling rather than actual daytime congestion."
            ),
        },
        "repeat_offenders_summary": {
            "total_vehicles_with_repeat_violations":  len(repeat_offenders_df),
            "top_vehicle_occurrences":                int(repeat_offenders_df['total_occurrences'].max()),
            "top_vehicle_number":                     str(repeat_offenders_df.iloc[0]['vehicle_number']) if not repeat_offenders_df.empty else "N/A",
            "pct_violations_from_repeat_offenders":   round(
                repeat_offenders_df['total_occurrences'].sum() / total_violations_in_summary * 100, 2
            ),
        },
        "police_stations_summary": {
            "total_stations":        len(police_station_rollup),
            "highest_avg_impact_score_station": str(police_station_rollup.iloc[0]['police_station']) if not police_station_rollup.empty else "N/A",
            "highest_avg_impact_score":          float(police_station_rollup.iloc[0]['avg_impact_score']) if not police_station_rollup.empty else 0.0,
        },
        "headline_insights": [
            f"The top-ranked hotspot is '{top5.iloc[0]['label_name']}' with an impact score of {top5.iloc[0]['impact_score']} and {top5.iloc[0]['total_violations']:,} violations.",
            f"{n_confirmed} of {total_hotspots} hotspots are confirmed BTP junctions already known to enforcement; {n_unofficial + n_small} were newly discovered.",
            f"35,587 vehicles have been cited more than once; the most chronic offender has been cited {int(repeat_offenders_df['total_occurrences'].max())} times.",
            "Street-grouped HDBSCAN was used to prevent road-network chaining — a spatial clustering failure mode where a continuous road fuses into one artificially large false cluster.",
            "Impact scores combine violation frequency (30%), congestion-severity weighted violation type (30%), peak-hour concentration (20%), and average vehicle footprint weight (20%), with a confidence discount for low-volume hotspots.",
        ],
        "methodology_notes": {
            "clustering_approach":        "Street-grouped HDBSCAN (min_cluster_size=100, min_samples=100)",
            "junction_first_strategy":    "168 BTP named junctions used as ground truth; 'No Junction' records clustered separately",
            "impact_score_range":         "0–100 (min-max normalized per component, then confidence-discounted)",
            "confidence_min_volume":      100,
            "noise_excluded_from_scores": True,
        }
    }

    _write_json(key_findings, path_findings)
    print(f"  [4] export_key_findings.json     →      1 doc   ({os.path.getsize(path_findings)/1024:.1f} KB)")

    print(f"\n  ✓ All 4 files written to {os.path.abspath(output_dir)}/")
    print(f"{'='*58}\n")


# ─────────────────────────────────────────────────────────────
# If run directly (not imported), call with notebook variables
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # These names match the variables produced by the final notebook cell
    export_analysis_to_json(
        summary_df            = summary_standard,
        repeat_offenders_df   = repeat_offenders_standard,
        police_station_rollup = ps_rollup_standard,
    )
