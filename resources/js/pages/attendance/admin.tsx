import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Clock, Filter, SlidersHorizontal, Users, X } from 'lucide-react';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserSummaryRow {
    user: { id: number; name: string };
    days_worked: number;
    effective_days: number;
    total_worked_seconds: number;
    total_break_seconds: number;
    total_breaks: number;
}

interface Props {
    summary: UserSummaryRow[];
    users: { id: number; name: string }[];
    filters: { user_id?: string | null; date_from: string; date_to: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Attendance', href: '/attendance/admin' },
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => CURRENT_YEAR - i);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function countWorkingDays(dateFrom: string, dateTo: string): number {
    let count = 0;
    const cur = new Date(dateFrom + 'T00:00:00');
    const to  = new Date(dateTo   + 'T00:00:00');
    while (cur <= to) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

function fmtEffective(val: number): string {
    return val % 1 === 0 ? String(val) : val.toFixed(2);
}

function initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function monthYearFromDate(iso: string): { month: number; year: number } {
    const d = new Date(iso + 'T00:00:00');
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function monthStart(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
    return new Date(year, month, 0).toISOString().slice(0, 10);
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold leading-tight">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendanceAdmin({ summary, users, filters }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const active = monthYearFromDate(filters.date_from);
    const [draftUserId, setDraftUserId] = useState<string>(filters.user_id ?? '');
    const [draftMonth, setDraftMonth]   = useState(active.month);
    const [draftYear, setDraftYear]     = useState(active.year);

    const activeUserId = filters.user_id ?? '';
    const userLabel = users.find((u) => String(u.id) === activeUserId)?.name ?? '';

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalWorked   = summary.reduce((acc, r) => acc + r.total_worked_seconds, 0);
    const maxWorked     = Math.max(...summary.map((r) => r.total_worked_seconds), 1);
    const totalWorkDays = countWorkingDays(filters.date_from, filters.date_to);

    function openSheet() {
        setDraftUserId(activeUserId);
        setDraftMonth(active.month);
        setDraftYear(active.year);
        setSheetOpen(true);
    }

    function applyFilters() {
        setSheetOpen(false);
        router.get(
            route('attendance.admin.index'),
            {
                ...(draftUserId ? { user_id: draftUserId } : {}),
                date_from: monthStart(draftYear, draftMonth),
                date_to:   monthEnd(draftYear, draftMonth),
            },
            { preserveState: true, replace: true },
        );
    }

    function resetFilters() {
        setSheetOpen(false);
        router.get(route('attendance.admin.index'), {}, { preserveState: false });
    }

    function removeUserFilter() {
        router.get(
            route('attendance.admin.index'),
            { date_from: filters.date_from, date_to: filters.date_to },
            { preserveState: true, replace: true },
        );
    }

    function detailHref(userId: number) {
        return route('attendance.admin.show', userId) + `?date_from=${filters.date_from}&date_to=${filters.date_to}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">

                {/* ── Page header ── */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Attendance</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">Summary of attendance records</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openSheet} className="shrink-0 gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </Button>
                </div>

                {/* ── Active filter strip ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Month/year — always shown */}
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        {MONTH_NAMES[active.month - 1]} {active.year}
                    </span>

                    {/* User filter — dismissible */}
                    {activeUserId && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {userLabel}
                            <button onClick={removeUserFilter} className="ml-0.5 rounded-full hover:opacity-70">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                </div>

                {/* ── Stat tiles ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatTile icon={<Users className="h-5 w-5" />} label="Employees shown" value={String(summary.length)} />
                    <StatTile icon={<Clock className="h-5 w-5" />} label="Total hours worked" value={fmtSeconds(totalWorked)} />
                    <StatTile
                        icon={<CalendarDays className="h-5 w-5" />}
                        label="Avg per employee"
                        value={summary.length ? fmtSeconds(Math.round(totalWorked / summary.length)) : '—'}
                    />
                </div>

                {/* ── Table card ── */}
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0 pb-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Employee breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <div className="flex-1 overflow-auto min-h-0">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b bg-card text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        <th className="px-6 py-3">Employee</th>
                                        <th className="px-6 py-3">Days Worked</th>
                                        <th className="px-6 py-3">Time Worked</th>
                                        <th className="px-6 py-3">Break Time</th>
                                        <th className="px-6 py-3">Breaks</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                                                No attendance records for this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        summary.map((row) => {
                                            const pct = Math.round((row.total_worked_seconds / maxWorked) * 100);
                                            return (
                                                <tr key={row.user.id} className="transition-colors hover:bg-muted/20">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                                {initials(row.user.name)}
                                                            </div>
                                                            <span className="font-medium">{row.user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="text-sm font-medium">{fmtEffective(row.effective_days)}</span>
                                                        <span className="text-muted-foreground text-xs"> / {totalWorkDays}</span>
                                                        <p className="text-[11px] text-muted-foreground">{row.days_worked} shift{row.days_worked !== 1 ? 's' : ''}</p>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="font-mono text-sm">{fmtSeconds(row.total_worked_seconds)}</span>
                                                        <div className="mt-1 h-1 w-24 rounded-full bg-muted">
                                                            <div className="h-1 rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 font-mono text-sm text-muted-foreground">
                                                        {fmtSeconds(row.total_break_seconds)}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-muted-foreground">
                                                        {row.total_breaks}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                                                            <Link href={detailHref(row.user.id)}>
                                                                View
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Filter sheet ── */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="flex w-80 flex-col gap-0 p-0">
                    <SheetHeader className="border-b px-6 py-4">
                        <SheetTitle className="flex items-center gap-2 text-base">
                            <Filter className="h-4 w-4" />
                            Filters
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                        {/* Employee */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Employee</p>
                            <Select value={draftUserId || 'all'} onValueChange={(v) => setDraftUserId(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-full text-sm">
                                    <SelectValue placeholder="All employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All employees</SelectItem>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {draftUserId && (
                                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setDraftUserId('')}>
                                    Clear selection
                                </button>
                            )}
                        </div>

                        {/* Month & Year */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Month</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Select value={String(draftMonth)} onValueChange={(v) => setDraftMonth(Number(v))}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTH_NAMES.map((name, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={String(draftYear)} onValueChange={(v) => setDraftYear(Number(v))}>
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEAR_OPTIONS.map((y) => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="border-t px-6 py-4">
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="mr-auto text-muted-foreground">
                            Reset to this month
                        </Button>
                        <Button size="sm" onClick={applyFilters}>
                            Apply
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
