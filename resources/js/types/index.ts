import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    exact?: boolean;
    children?: NavItem[];
}

export interface Flash {
    success?: string | null;
    error?: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash: Flash;
    logoUrl: string | null;
    appTimezone: string;
    featureFlags: Record<string, boolean>;
    impersonating: { impersonator_id: number; as: string } | null;
    [key: string]: unknown;
}

export interface AttendanceBreak {
    id: number;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number;
}

export interface AttendanceShift {
    id: number;
    date: string;
    clocked_in_at: string | null;
    clocked_out_at: string | null;
    ip_address: string | null;
    clock_in_lat: number | null;
    clock_in_lng: number | null;
    clock_out_lat: number | null;
    clock_out_lng: number | null;
    auto_closed: boolean;
    is_late: boolean;
    total_worked_seconds: number;
    total_break_seconds: number;
    breaks: AttendanceBreak[];
}

export interface HeatmapDay {
    date: string;
    status: 'present' | 'partial' | 'absent' | 'future' | 'open' | 'weekend' | 'holiday' | 'leave';
    shift: AttendanceShift | null;
    holiday_name: string | null;
}

export interface LeaveRequest {
    id: number;
    date_from: string;
    date_to: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface AttendanceHoliday {
    id: number;
    date: string;
    name: string;
}

export interface ChecklistItem {
    text: string;
    checked: boolean;
}

export interface AttendanceGeofenceOption {
    id: number;
    name: string;
    lookup: 'general' | 'attendance';
}

export interface AttendanceSettings {
    clock_in_start: string;
    clock_in_end: string;
    shift_end: string;
    min_break_minutes: number;
    ip_whitelist: string;
    current_ip: string;
    geofences: AttendanceGeofenceOption[];
    geofence_ids: number[];
}

export interface DashboardUser {
    id: number;
    name: string;
    email: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    accent_color: string | null;
    sendgrid_contact_id: string | null;
    two_factor_confirmed_at: string | null;
    mfa_required: boolean;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface Salary {
    id: number;
    user_id: number;
    ctc: number;
    per_month: number;
    created_at: string;
    updated_at: string;
}

export interface SalaryBreakdownEntry {
    date: string;
    status: 'absent' | 'half_day' | 'short_leave' | 'leave_unpaid' | 'extra_present' | 'extra_half_day' | 'extra_short_leave';
    per_day: number;
    earned: number;
    deduction: number;
    reason: string;
}

export interface MonthlySalary {
    id: number;
    user_id: number;
    year: number;
    month: number;
    per_month_salary: number | string;
    total_days: number;
    working_days: number;
    days_present: number;
    days_half_day: number;
    days_short_leave: number;
    days_absent: number;
    days_leave_paid: number;
    days_leave_unpaid: number;
    days_extra: number;
    extra_earned: number | string;
    gross_earned: number | string;
    breakdown: SalaryBreakdownEntry[] | null;
    calculated_at: string;
    created_at: string;
    updated_at: string;
}

export interface SalaryHistory {
    id: number;
    user_id: number;
    changed_by: number;
    changed_by_user: { id: number; name: string } | null;
    changed_field: 'ctc' | 'per_month';
    change_type: 'percentage' | 'amount' | 'absolute';
    direction: 'increase' | 'decrease' | null;
    change_value: number;
    old_ctc: number;
    new_ctc: number;
    old_per_month: number;
    new_per_month: number;
    created_at: string;
}
