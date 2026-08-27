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
    auto_closed: boolean;
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

export interface AttendanceSettings {
    clock_in_start: string;
    clock_in_end: string;
    shift_end: string;
    min_break_minutes: number;
    ip_whitelist: string;
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
