import { formatInTz } from '@/lib/tz';
import { format, parseISO } from 'date-fns';

export const STATUS_STYLE: Record<string, { label: string; dot: string; row: string; badge: string }> = {
    present:     { label: 'Present',     dot: 'bg-emerald-500', row: '', badge: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    short_leave: { label: 'Short Leave', dot: 'bg-amber-400',   row: '', badge: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    half_day:    { label: 'Half Day',    dot: 'bg-orange-400',  row: '', badge: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
    absent:      { label: 'Absent',      dot: 'bg-red-400',     row: 'bg-red-50/30 dark:bg-red-950/10', badge: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300' },
};

export const STATUS_BAR_COLOR: Record<string, string> = {
    present:     '#10b981',
    short_leave: '#f59e0b',
    half_day:    '#f97316',
    absent:      '#ef4444',
};

export function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function fmtDate(iso: string): string {
    try { return format(parseISO(iso), 'MMM d, yyyy'); } catch { return iso; }
}

export function dayLabel(dateStr: string): string {
    return format(parseISO(dateStr), 'd');
}

export function dayName(dateStr: string): string {
    return format(parseISO(dateStr), 'EEE, MMM d');
}

export function secToHours(s: number): number {
    return parseFloat((s / 3600).toFixed(2));
}

export function initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function timeToSeconds(t: string): number {
    const parts = t.split(':');
    return parseInt(parts[0] ?? '0') * 3600 + parseInt(parts[1] ?? '0') * 60 + parseInt(parts[2] ?? '0');
}

export function isoToTimeInput(iso: string | null, tz: string): string {
    if (!iso) return '';
    return formatInTz(iso, tz);
}
