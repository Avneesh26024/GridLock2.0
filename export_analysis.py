"""
export_analysis.py
==================
Standalone export script — run after cluster_final.ipynb has completed its full
analysis pipeline. Supports both Pipeline A (Standard Hybrid) and Pipeline B
(Footprint Reclamation). Pass the appropriate variables for whichever pipeline
you want to export.

Usage (from within the same Jupyter session, in a new cell):
    exec(open('export_analysis.py').read())

    # Pipeline A:
    export_analysis_to_json(
        summary_df            = summary_standard,
        repeat_offenders_df   = repeat_offenders_standard,
        police_station_rollup = ps_rollup_standard,
        pipeline_label        = "A",
    )

    # Pipeline B:
    export_analysis_to_json(
        summary_df            = summary_footprint,
        repeat_offenders_df   = repeat_offenders_footprint,
        police_station_rollup = ps_rollup_footprint,
        pipeline_label        = "B",
    )

Output: ./exports/  (created automatically)
  Pipeline A:
  ├── export_hotspots_A.json
  ├── export_repeat_offenders_A.json
  ├── export_police_stations_A.json
  └── export_key_findings_A.json

  Pipeline B:
  ├── export_hotspots_B.json
  ├── export_repeat_offenders_B.json
  ├── export_police_stations_B.json
  └── export_key_findings_B.json
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
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if hasattr(v, 'item'):          # numpy scalar
        return v.item()
    if isinstance(v, dict):
        return {k: _safe_val(vv) for k, vv in v.items()}
    return v


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert a dataframe to a list of JSON-safe dicts."""
    return [{col: _safe_val(row[col]) for col in df.columns} for _, row in df.iterrows()]


def _write_json(data: list | dict, path: str) -> int:
    """Write indented JSON; returns number of top-level records (or 1 for dict)."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    return len(data) if isinstance(data, list) else 1


# ─────────────────────────────────────────────────────────────
# PIPELINE METADATA
# ─────────────────────────────────────────────────────────────

_PIPELINE_META = {
    "A": {
        "label":       "Pipeline A — Standard Hybrid",
        "description": (
            "Standard hybrid approach: confirmed BTP junctions aggregated directly, "
            "'No Junction' records clustered with street-grouped HDBSCAN. "
            "No footprint reclamation applied."
        ),
        "reclamation_applied": False,
        "reclaimed_points":    0,
    },
    "B": {
        "label":       "Pipeline B — Footprint Reclamation",
        "description": (
            "Footprint reclamation hybrid approach: each confirmed junction's 95th-percentile "
            "spatial radius is computed; 'No Junction' records falling within that radius are "
            "reassigned to the nearest junction before HDBSCAN clustering of the remainder. "
            "11,788 mislabeled points reclaimed into confirmed junctions."
        ),
        "reclamation_applied": True,
        "reclaimed_points":    11788,
    },
}


# ─────────────────────────────────────────────────────────────
# MAIN EXPORT FUNCTION
# ─────────────────────────────────────────────────────────────

def export_analysis_to_json(
    summary_df: pd.DataFrame,
    repeat_offenders_df: pd.DataFrame,
    police_station_rollup: pd.DataFrame,
    pipeline_label: str = "B",          # "A" or "B"
    output_dir: str = './exports',
) -> None:
    """
    Export all three analysis dataframes + a key-findings summary to structured
    JSON files under `output_dir`, suffixed by pipeline label (_A or _B).

    Parameters
    ----------
    summary_df            : Enriched hotspot summary (from compute_impact_score).
    repeat_offenders_df   : Vehicle-level repeat offense table (from compute_repeat_offenders).
    police_station_rollup : Station-level rollup (from compute_police_station_rollup).
    pipeline_label        : "A" for Standard Hybrid, "B" for Footprint Reclamation.
    output_dir            : Local output folder (created if it doesn't exist).
    """

    if pipeline_label not in _PIPELINE_META:
        raise ValueError(f"pipeline_label must be 'A' or 'B', got '{pipeline_label}'")

    meta = _PIPELINE_META[pipeline_label]
    suffix = f"_{pipeline_label}"

    os.makedirs(output_dir, exist_ok=True)
    print(f"\n{'='*62}")
    print(f"  JSON EXPORT — GridLock Analysis [{meta['label']}]")
    print(f"  Output directory: {os.path.abspath(output_dir)}")
    print(f"{'='*62}\n")

    # ── 1. HOTSPOTS ──────────────────────────────────────────
    path_hotspots = os.path.join(output_dir, f'export_hotspots{suffix}.json')
    n = _write_json(_df_to_records(summary_df), path_hotspots)
    print(f"  [1] export_hotspots{suffix}.json         → {n:>6,} rows  ({os.path.getsize(path_hotspots)/1024:.1f} KB)")

    # ── 2. REPEAT OFFENDERS (top 200) ────────────────────────
    path_offenders = os.path.join(output_dir, f'export_repeat_offenders{suffix}.json')
    top_offenders  = repeat_offenders_df.nlargest(200, 'total_occurrences').reset_index(drop=True)
    n = _write_json(_df_to_records(top_offenders), path_offenders)
    print(f"  [2] export_repeat_offenders{suffix}.json → {n:>6,} rows  ({os.path.getsize(path_offenders)/1024:.1f} KB)")

    # ── 3. POLICE STATIONS ────────────────────────────────────
    path_stations = os.path.join(output_dir, f'export_police_stations{suffix}.json')
    n = _write_json(_df_to_records(police_station_rollup), path_stations)
    print(f"  [3] export_police_stations{suffix}.json  → {n:>6,} rows  ({os.path.getsize(path_stations)/1024:.1f} KB)")

    # ── 4. KEY FINDINGS ───────────────────────────────────────
    path_findings = os.path.join(output_dir, f'export_key_findings{suffix}.json')

    type_counts  = summary_df['label_type'].value_counts().to_dict()
    top5         = summary_df.nlargest(5, 'impact_score')[
        ['label_name', 'impact_score', 'total_violations', 'label_type']
    ].reset_index(drop=True)

    total_violations_in_summary = int(summary_df['total_violations'].sum())
    total_hotspots               = len(summary_df)
    n_confirmed                  = int(type_counts.get('confirmed_junction', 0))
    n_unofficial                 = int(type_counts.get('unofficial_hotspot', 0))
    n_small                      = int(type_counts.get('small_street_hotspot', 0))
    avg_peak_pct                 = round(float(summary_df['peak_hour_pct'].mean()), 2)
    top_peak_hotspot             = (summary_df.loc[summary_df['peak_hour_pct'].idxmax(), 'label_name']
                                    if not summary_df.empty else "N/A")

    key_findings = {
        "generated_at":                  datetime.now().isoformat(),
        "pipeline":                      meta['label'],
        "pipeline_description":          meta['description'],
        "reclamation_applied":           meta['reclamation_applied'],
        "reclaimed_points":              meta['reclaimed_points'],
        "dataset_description":           "Bengaluru Traffic Police (BTP) illegal parking violations, Jan–May 2024",
        "total_input_violations":        298450,
        "total_violations_in_analysis":  total_violations_in_summary,
        "noise_excluded":                298450 - total_violations_in_summary,
        "noise_excluded_pct":            round((298450 - total_violations_in_summary) / 298450 * 100, 2),
        "total_hotspots_identified":     total_hotspots,
        "hotspot_type_breakdown": {
            "confirmed_junction":   n_confirmed,
            "unofficial_hotspot":   n_unofficial,
            "small_street_hotspot": n_small,
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
            "definition":          "Morning 08:00–10:00 and Evening 17:00–20:00",
            "avg_peak_hour_pct_across_hotspots": avg_peak_pct,
            "hotspot_with_highest_peak_concentration": top_peak_hotspot,
            "narrative": (
                f"On average, {avg_peak_pct}% of violations per hotspot occur during "
                "defined peak hours (08:00–10:00 and 17:00–20:00), reflecting commuter-period "
                "congestion patterns."
            ),
        },
        "repeat_offenders_summary": {
            "total_vehicles_with_repeat_violations": len(repeat_offenders_df),
            "top_vehicle_occurrences":               int(repeat_offenders_df['total_occurrences'].max()),
            "top_vehicle_number":                    str(repeat_offenders_df.iloc[0]['vehicle_number']) if not repeat_offenders_df.empty else "N/A",
            "pct_violations_from_repeat_offenders":  round(
                repeat_offenders_df['total_occurrences'].sum() / total_violations_in_summary * 100, 2
            ),
        },
        "police_stations_summary": {
            "total_stations":                    len(police_station_rollup),
            "highest_avg_impact_score_station":  str(police_station_rollup.iloc[0]['police_station']) if not police_station_rollup.empty else "N/A",
            "highest_avg_impact_score":          float(police_station_rollup.iloc[0]['avg_impact_score']) if not police_station_rollup.empty else 0.0,
        },
        "headline_insights": [
            f"The top-ranked hotspot is '{top5.iloc[0]['label_name']}' with an impact score of {top5.iloc[0]['impact_score']} and {int(top5.iloc[0]['total_violations']):,} violations.",
            f"{n_confirmed} of {total_hotspots} hotspots are confirmed BTP junctions; {n_unofficial + n_small} were newly discovered via clustering.",
            f"{len(repeat_offenders_df):,} vehicles have been cited more than once; the most chronic offender has been cited {int(repeat_offenders_df['total_occurrences'].max())} times.",
            "Street-grouped HDBSCAN with compound street+locality key prevents road-network chaining — a spatial clustering failure where a continuous road fuses into one artificially large false cluster.",
            "Impact scores combine violation frequency (30%), congestion-severity weighted violation type (30%), peak-hour concentration (20%), and average vehicle footprint weight (20%), with a confidence discount for low-volume hotspots.",
            *(
                [f"Footprint reclamation reassigned {meta['reclaimed_points']:,} 'No Junction' records into their nearest confirmed junction before clustering."]
                if meta['reclamation_applied'] else
                ["No footprint reclamation applied — 'No Junction' records clustered independently of confirmed junctions."]
            ),
        ],
        "methodology_notes": {
            "clustering_approach":         "Street-grouped HDBSCAN (min_cluster_size=100, min_samples=100)",
            "street_grouping_key":         "Compound street+locality key (first and last clean address segment) to prevent cross-neighborhood merging",
            "junction_first_strategy":     "168 BTP named junctions used as ground truth; 'No Junction' records clustered separately",
            "footprint_reclamation":       meta['reclamation_applied'],
            "footprint_radius_percentile": "95th percentile of intra-junction point distances" if meta['reclamation_applied'] else "N/A",
            "impact_score_range":          "0–100 (min-max normalized per component, confidence-discounted)",
            "confidence_min_volume":       100,
            "noise_excluded_from_scores":  True,
            "mega_group_threshold":        500,
            "small_group_threshold":       100,
        },
    }

    _write_json(key_findings, path_findings)
    print(f"  [4] export_key_findings{suffix}.json     →      1 doc   ({os.path.getsize(path_findings)/1024:.1f} KB)")

    print(f"\n  ✓ All 4 files written to {os.path.abspath(output_dir)}/")
    print(f"{'='*62}\n")


# ─────────────────────────────────────────────────────────────
# If run directly, export both pipelines if variables exist
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys

    # Pipeline A
    try:
        export_analysis_to_json(
            summary_df            = summary_standard,
            repeat_offenders_df   = repeat_offenders_standard,
            police_station_rollup = ps_rollup_standard,
            pipeline_label        = "A",
        )
    except NameError:
        print("  Pipeline A variables not found in session — skipping A export.")

    # Pipeline B
    try:
        export_analysis_to_json(
            summary_df            = summary_footprint,
            repeat_offenders_df   = repeat_offenders_footprint,
            police_station_rollup = ps_rollup_footprint,
            pipeline_label        = "B",
        )
    except NameError:
        print("  Pipeline B variables not found in session — skipping B export.")