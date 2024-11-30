export interface Leg {
    LANE: number;
    map: string | null;
    load: boolean;
    prep: boolean;
    loaded_to_hub: boolean;
    material: string;
    spool_id: string;
    color: string;
    weight: number | string; // Handle the mixed types (number or empty string)
    runout_lane: string;
    filament_status: string;
    filament_status_led: string;
}

export interface System {
    type: string;
    hub_loaded: boolean;
    can_cut: boolean;
    screen: string;
}

// Dynamic record to allow arbitrary naming for lanes
export interface AFCUnit {
    [laneName: string]: Leg | System;
}

// A dynamic record for the main AFC object, allowing user-defined names for AFC units
export interface AFCDef {
    [afcUnitName: string]: AFCUnit | MainSystem;
}

export interface Extruder {
    lane_loaded: string;
    tool_start_sensor: boolean;
    tool_end_sensor: boolean;
    buffer: string;
    buffer_status: string;
}

export interface MainSystem {
    current_load: string;
    num_units: number;
    num_lanes: number; // Accounts for 2–64 lanes dynamically
    num_extruders: number;
    extruders: {
        extruder: Extruder;
    };
}

export interface Status {
    AFC: AFCDef;
}

export interface AFCResult {
    eventtime: number;
    status: Status;
}

export interface AFCRoot {
    result: AFCResult;
}
