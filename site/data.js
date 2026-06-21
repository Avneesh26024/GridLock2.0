// ============================================================
// GRIDLOCK DATA LAYER — all real data from cluster_final.ipynb
// Edit values here; do not touch index.html or style.css for data changes
// ============================================================

// --- HERO STATS ---
const HERO_STATS = [
  { value: "298,450", label: "Violations Analyzed" },
  { value: "2,298",   label: "Hotspots Identified" },
  { value: "168",     label: "BTP Junctions Covered" },
  { value: "Nov 2023 – Apr 2024", label: "Data Range" },
];

// --- TOP HOTSPOTS (sorted by impact_score desc) ---
// label_type: "confirmed_junction" | "unofficial_hotspot" | "small_street_hotspot"
const TOP_HOTSPOTS = [
  { rank: 1,  name: "BTP051 - Safina Plaza Junction",                                  type: "confirmed_junction",  violations: 15449, impact_score: 65.55, lat: 12.9900, lng: 77.5960 },
  { rank: 2,  name: "BTP082 - KR Market Junction",                                     type: "confirmed_junction",  violations: 11538, impact_score: 53.62, lat: 12.9637, lng: 77.5762 },
  { rank: 3,  name: "BTP040 - Elite Junction",                                          type: "confirmed_junction",  violations: 10718, impact_score: 46.96, lat: 12.9716, lng: 77.5946 },
  { rank: 4,  name: "BTP044 - Sagar Theatre Junction",                                  type: "confirmed_junction",  violations: 10549, impact_score: 46.85, lat: 12.9698, lng: 77.5906 },
  { rank: 5,  name: "Kadubisanahalli - Outer Ring Road",                                type: "unofficial_hotspot",  violations:  8819, impact_score: 45.74, lat: 12.9292, lng: 77.6983 },
  { rank: 6,  name: "KR Puram - MBT Road",                                              type: "unofficial_hotspot",  violations:  6428, impact_score: 39.37, lat: 13.0025, lng: 77.6940 },
  { rank: 7,  name: "BTP058 - Subbanna Junction",                                       type: "confirmed_junction",  violations:  5189, impact_score: 32.02, lat: 12.9775, lng: 77.5713 },
  { rank: 8,  name: "Begur Chikkanahalli - Unnamed Road",                               type: "unofficial_hotspot",  violations:  5061, impact_score: 31.94, lat: 12.8576, lng: 77.6310 },
  { rank: 9,  name: "Kadubisanahalli - New Horizon College Road",                       type: "unofficial_hotspot",  violations:  6291, impact_score: 29.41, lat: 12.9314, lng: 77.6921 },
  { rank: 10, name: "BTP211 - Central Street Junction",                                 type: "confirmed_junction",  violations:  5388, impact_score: 27.68, lat: 12.9869, lng: 77.5964 },
  { rank: 11, name: "BTP057 - Anand Rao Junction",                                      type: "confirmed_junction",  violations:  3935, impact_score: 23.94, lat: 12.9777, lng: 77.5716 },
  { rank: 12, name: "BTP083 - AS Char Street, Mysore Road",                             type: "confirmed_junction",  violations:  2778, impact_score: 23.09, lat: 12.9538, lng: 77.5692 },
  { rank: 13, name: "Malleshwaram - Sri Venkataranga Ayangar Road",                     type: "unofficial_hotspot",  violations:  4223, impact_score: 21.81, lat: 13.0040, lng: 77.5710 },
  { rank: 14, name: "Byatarayanapura - Sahakar Nagar Road",                             type: "unofficial_hotspot",  violations:  4715, impact_score: 21.70, lat: 13.0651, lng: 77.5711 },
  { rank: 15, name: "BTP027 - Modi Bridge Junction",                                    type: "confirmed_junction",  violations:  4584, impact_score: 21.49, lat: 12.9593, lng: 77.5583 },
  { rank: 16, name: "Hebbal - Bellary Road",                                             type: "unofficial_hotspot",  violations:  4046, impact_score: 21.04, lat: 13.0454, lng: 77.5954 },
  { rank: 17, name: "BTP045 - Danvanthri Road Junction",                                type: "confirmed_junction",  violations:  3181, impact_score: 20.09, lat: 12.9748, lng: 77.5850 },
  { rank: 18, name: "Garvebhavi Palya - Hosur Road",                                    type: "unofficial_hotspot",  violations:  2794, impact_score: 19.78, lat: 12.9060, lng: 77.6300 },
  { rank: 19, name: "BTP080 - NR Road, SP Road Junction",                               type: "confirmed_junction",  violations:  3681, impact_score: 19.36, lat: 12.9664, lng: 77.5784 },
  { rank: 20, name: "BTP020 - Hosahalli Metro Station",                                  type: "confirmed_junction",  violations:  4101, impact_score: 18.65, lat: 12.9702, lng: 77.5196 },
];

// --- NARRATIVE CALLOUTS (Key Findings section) ---
const KEY_CALLOUTS = [
  {
    icon: "🔴",
    title: "Night-Time Dominance",
    text: "Over 70% of violations occur between 10 PM and 6 AM — suggesting enforcement is heavily concentrated in off-peak hours. Daytime congestion windows (8–10 AM, 5–8 PM) may be systematically under-enforced.",
  },
  {
    icon: "🟠",
    title: "Commercial Corridors Drive the Scores",
    text: "The top-5 hotspots by impact score are all high-density commercial zones (MG Road belt, KR Market, ORR tech corridor). These areas see predominantly car and two-wheeler violations — smaller footprint individually but enormous cumulative road blockage.",
  },
  {
    icon: "🔵",
    title: "17% Unclusterable Noise",
    text: "Approximately 17% of unjunctioned violations were too geographically dispersed to form a dense cluster — likely representing one-off patrols or truly isolated incidents. These are excluded from hotspot scoring.",
  },
];

// --- ENFORCEMENT TIERS ---
const ENFORCEMENT_TIERS = [
  {
    tier: 1,
    label: "Immediate Action",
    color: "danger",
    icon: "🚨",
    description: "High impact score + high volume. Requires immediate, sustained presence or structural intervention (signage, barriers, tow policy).",
    hotspots: [
      "BTP051 - Safina Plaza Junction (Score: 65.55)",
      "BTP082 - KR Market Junction (Score: 53.62)",
      "BTP040 - Elite Junction (Score: 46.96)",
      "BTP044 - Sagar Theatre Junction (Score: 46.85)",
      "Kadubisanahalli - Outer Ring Road (Score: 45.74)",
    ],
  },
  {
    tier: 2,
    label: "Corridor Monitoring",
    color: "warning",
    icon: "⚠️",
    description: "Emerging hotspots or high-volume corridors not yet at saturation. Route-based mobile patrolling recommended rather than static posts.",
    hotspots: [
      "KR Puram - MBT Road (Score: 39.37)",
      "BTP058 - Subbanna Junction (Score: 32.02)",
      "Begur Chikkanahalli - Unnamed Road (Score: 31.94)",
      "Kadubisanahalli - New Horizon College Road (Score: 29.41)",
      "Malleshwaram - Sri Venkataranga Ayangar Road (Score: 21.81)",
      "Byatarayanapura - Sahakar Nagar Road (Score: 21.70)",
    ],
  },
  {
    tier: 3,
    label: "Behavioral / Repeat-Offender",
    color: "primary",
    icon: "📋",
    description: "Vehicles with 27+ recorded violations across multiple officers. Escalated action (impoundment, license flagging) will have outsized deterrence impact.",
    hotspots: [
      "FKN00GL4424: 55 violations across 11 officers",
      "FKN00GL3514: 42 violations across 23 officers",
      "FKN00GL9771: 41 violations across 21 officers",
      "FKN00GL17863: 41 violations across 25 officers",
      "FKN00GL2906: 35 violations across 14 officers",
    ],
  },
];

// --- TOP REPEAT OFFENDERS ---
const REPEAT_OFFENDERS = [
  { vehicle: "FKN00GL4424",  occurrences: 55, unique_officers: 11, avg_gap_days: 2.50,  avg_turnaround_h: 68.48  },
  { vehicle: "FKN00GL3514",  occurrences: 42, unique_officers: 23, avg_gap_days: 3.03,  avg_turnaround_h: 56.01  },
  { vehicle: "FKN00GL9771",  occurrences: 41, unique_officers: 21, avg_gap_days: 3.67,  avg_turnaround_h: 87.78  },
  { vehicle: "FKN00GL17863", occurrences: 41, unique_officers: 25, avg_gap_days: 2.90,  avg_turnaround_h: 35.34  },
  { vehicle: "FKN00GL2906",  occurrences: 35, unique_officers: 14, avg_gap_days: 3.55,  avg_turnaround_h: 39.60  },
  { vehicle: "FKN00GL14092", occurrences: 34, unique_officers: 16, avg_gap_days: 3.03,  avg_turnaround_h: 43.68  },
  { vehicle: "FKN00GL15265", occurrences: 34, unique_officers: 16, avg_gap_days: 4.39,  avg_turnaround_h: 40.37  },
  { vehicle: "FKN00GL1875",  occurrences: 30, unique_officers: 16, avg_gap_days: 4.28,  avg_turnaround_h: 73.03  },
  { vehicle: "FKN00GL19337", occurrences: 30, unique_officers:  9, avg_gap_days: 3.20,  avg_turnaround_h: 148.62 },
  { vehicle: "FKN00GL9852",  occurrences: 29, unique_officers: 17, avg_gap_days: 5.00,  avg_turnaround_h: 35.59  },
];

// --- POLICE STATION ROLLUP (top 12 by avg_impact_score) ---
const POLICE_STATIONS = [
  { station: "Shivajinagar",          total_violations: 28112, num_hotspots: 69,  avg_impact_score: 45.70 },
  { station: "City Market",           total_violations: 17708, num_hotspots: 37,  avg_impact_score: 37.91 },
  { station: "Upparpet",              total_violations: 34482, num_hotspots: 21,  avg_impact_score: 37.89 },
  { station: "K.R. Pura",             total_violations:  6546, num_hotspots: 78,  avg_impact_score: 33.51 },
  { station: "Chikkajala",            total_violations:  5925, num_hotspots: 40,  avg_impact_score: 27.85 },
  { station: "V.V.Puram (C.Pet)",     total_violations:  1556, num_hotspots: 16,  avg_impact_score: 26.46 },
  { station: "HAL Old Airport",       total_violations: 21251, num_hotspots: 154, avg_impact_score: 26.44 },
  { station: "Banaswadi",             total_violations:  3759, num_hotspots: 86,  avg_impact_score: 26.33 },
  { station: "Bellandur",             total_violations:  5156, num_hotspots: 100, avg_impact_score: 24.05 },
  { station: "Mahadevapura",          total_violations:  6187, num_hotspots: 93,  avg_impact_score: 23.16 },
  { station: "Devanahalli Airport",   total_violations:   940, num_hotspots: 34,  avg_impact_score: 22.01 },
  { station: "Halasuru Gate",         total_violations:  6294, num_hotspots: 22,  avg_impact_score: 20.22 },
];

// --- DATA QUALITY CAVEATS ---
const CAVEATS = [
  "Impact scores are a proxy estimate, not a direct congestion measurement, since the dataset does not include vehicle speed or volume sensor data from the road network.",
  "Approximately 17% of unjunctioned violations did not form a dense enough cluster to be classified as a hotspot and are excluded from scoring — they appear in the dataset but not in this analysis.",
  "Enforcement activity is concentrated in night and early-morning hours (10 PM – 6 AM), which may reflect patrol scheduling patterns more than actual congestion timing during peak commute windows.",
  "All vehicle numbers have been anonymized (FKN00GL prefix) per data sharing agreements. The analysis is valid at the aggregate level; individual vehicle re-identification is not possible from this dataset.",
];
