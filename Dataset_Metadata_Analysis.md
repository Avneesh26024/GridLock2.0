# Dataset Exploratory Analysis

This document outlines the exploratory details, schemas, and structural metadata for two independent datasets: **PS1** and **PS2**. They are treated as separate, distinct logs with no direct correlation.

---

## Dataset 1: PS1 (Police Violations)
**Source File:** `jan to may police violation_anonymized791b166.csv`

### 1. Columns & Data Types
The dataset contains 24 columns in total:
* **Float/Numeric:** `latitude`, `longitude`, `description` (all NaNs), `closed_datetime` (NaNs), `center_code`, `action_taken_timestamp` (NaNs)
* **Boolean:** `data_sent_to_scita`
* **String/Object:** `id`, `location`, `vehicle_number`, `vehicle_type`, `violation_type`, `offence_code`, `created_datetime`, `modified_datetime`, `device_id`, `created_by_id`, `police_station`, `junction_name`, `data_sent_to_scita_timestamp`, `updated_vehicle_number`, `updated_vehicle_type`, `validation_status`, `validation_timestamp`

### 2. Time Range & Granularity
* **Oldest Timestamp (`created_datetime`):** `2023-11-09 19:11:46+00:00`
* **Newest Timestamp (`created_datetime`):** `2024-04-08 17:30:46+00:00`
* **Granularity:** Discrete events, accurate down to the millisecond/second depending on the record.

### 3. Geographic Information
Contains high-resolution tracking of the violation locations:
* `latitude` and `longitude`: GPS precise location.
* `location`: Detailed string address (e.g., "18th Main Road, Block 2, Koramangala...").
* `junction_name`: Name of the specific traffic junction if applicable.
* `police_station`: The jurisdiction station handling the incident.

### 4. Size & Unique Locations
* **Total Rows:** 298,450
* **Total Columns:** 24
* **Unique Locations:**  ~220,707 distinct combinations of latitude and longitude.

### 5. Violation Type & Severity
Violations are classified using string arrays and integer codes:
* `violation_type`: Human-readable infraction type (e.g., `["WRONG PARKING","PARKING NEAR ROAD CROSSING"]`).
* `offence_code`: Integer codes mapped to those violations (e.g., `[112,104]`).

### 6. Missing / Null Values
* **100% Missing (298,450 nulls):** `description`, `closed_datetime`, `action_taken_timestamp`. 
* **85.8% Missing (256,289 nulls):** `data_sent_to_scita_timestamp`.
* **41.9% Missing (125,254 nulls):** `updated_vehicle_number`, `updated_vehicle_type`, `validation_status`, `validation_timestamp`.
* **Minimal Missing (<3,100 nulls):** `center_code`, `location`, `created_by_id`, `police_station`, `junction_name`.

### 7. What a Single Row Represents
A single row represents **one specific traffic or parking violation event recorded by a capture device.** It logs the vehicle details, the time of the capture, the location of the offense, the specific offense codes, and subsequent validation steps applied to the infraction.

---

## Dataset 2: PS2 (Astram Event Data)
**Source File:** `Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv`

### 1. Columns & Data Types
The dataset is highly detailed with 46 columns:
* **Float/Numeric:** `latitude`, `longitude`, `endlatitude`, `endlongitude`, `map_file`, `age_of_truck`, `client_id`, `comment`, `meta_data`, `resolved_at_latitude`, `resolved_at_longitude`.
* **Boolean:** `requires_road_closure`
* **String/Object (34 columns):** `id`, `event_type`, `address`, `end_address`, `event_cause`, `start_datetime`, `end_datetime`, `status`, `authenticated`, `modified_datetime`, `direction`, `description`, `veh_type`, `veh_no`, `corridor`, `priority`, `cargo_material`, `reason_breakdown`, `created_date`, `route_path`, `created_by_id`, `last_modified_by_id`, `assigned_to_police_id`, `citizen_accident_id`, `police_station`, `kgid`, `resolved_at_address`, `closed_by_id`, `closed_datetime`, `resolved_by_id`, `resolved_datetime`, `gba_identifier`, `zone`, `junction`.

### 2. Event Metadata
This dataset heavily features event lifecycle statuses rather than purely citations:
* **Identification:** `event_type` (e.g., 'unplanned'), `event_cause` (e.g., 'vehicle_breakdown'), `priority`.
* **Geospatial & Address:** Details such as `address`, `corridor` (e.g., 'Tumkur Road'), and `resolved_at_address`.
* **Text Descriptions:** Open-text fields like `description` capturing notes like "Starting problem".

### 3. Traffic Volume or Speed Data
**None.** This dataset is composed of discrete incident reports (accidents, operations, breakdowns), not continuous traffic flow. No features reflect vehicle count, density, or velocity.

### 4. Time Range & Granularity
* **Time Range:** Activity spans mostly from `2023-11-09` to `2024-04-08` based on the `start_datetime`. 
* **Granularity:** The dataset operates on a per-incident level, marking discrete times for the start, resolution, and closure of the events.

### 5. Size & Unique Locations
* **Total Rows:** 8,173
* **Total Columns:** 46
* **Unique Geospatial Coordinates:** ~8,045 unique variations of start positions.

### 6. Before/After Structure
There isn't a traditional "before/after" structural layout. Instead, it natively utilizes an **incident lifecycle** architecture. Each single row captures the full event history natively:
* **Opening Phase:** `start_datetime`, `created_date`, `status`, initial positions.
* **Closing Phase:** `resolved_datetime`, `closed_datetime`, `resolved_at_latitude/longitude`. 
This structure lets you measure response intervals or turnaround durations internally on a single record.

### 7. Missing / Null Values
Due to the conditional nature of traffic incidents, nulls exist in specialized fields:
* **100% Missing:** `map_file`, `comment`, `meta_data`.
* **~99% Missing:** Information rarely utilized, like `resolved_at_latitude`, `citizen_accident_id`, `route_path`, `direction`.
* **~96% Missing:** Specialty truck fields (`cargo_material`, `age_of_truck`, `reason_breakdown`).
* **Highly populated (0 nulls):** Key architectural columns including `id`, `event_type`, `latitude`, `longitude`, `event_cause`, `start_datetime`, and `status`.

### 8. What a Single Row Represents
A single row monitors a **roadway incident or obstruction (like a breakdown or collision) from its initial report to its final resolution**. It captures what happened, where the blockage occurred, and timestamps detailing precisely when emergency or maintenance personnel attended to and cleared the issue.