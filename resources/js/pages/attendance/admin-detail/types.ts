export interface BreakRow {
    id: number;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
}

export type OverrideStatus = 'present' | 'absent' | 'half_day' | 'short_leave';

export interface ShiftRow {
    id: number;
    date: string;
    clocked_in_at: string | null;
    clocked_out_at: string | null;
    total_worked_seconds: number;
    total_break_seconds: number;
    total_shift_seconds: number;
    day_status: 'present' | 'short_leave' | 'half_day' | 'absent';
    admin_override_status: OverrideStatus | null;
    break_count: number;
    auto_closed: boolean;
    is_late: boolean;
    clock_in_outside_geofence: boolean | null;
    clock_out_outside_geofence: boolean | null;
    breaks: BreakRow[];
}

export interface Props {
    user: { id: number; name: string };
    shifts: ShiftRow[];
    dateFrom: string;
    dateTo: string;
}

export interface EditBreakShiftContext {
    clocked_in_at: string | null;
    clocked_out_at: string | null;
}
