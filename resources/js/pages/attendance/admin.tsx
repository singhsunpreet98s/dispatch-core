import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowRight, CalendarDays, Clock, Filter, SlidersHorizontal, Users, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserSummaryRow {
    user: { id: number; name: string };
    days_worked: number;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function fmtDate(iso: string): string {
    try { return format(parseISO(iso), 'MMM d, yyyy'); } catch { return iso; }
}

function initials(name: string): string {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
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

    const [draftUserId, setDraftUserId] = useState<string>(filters.user_id ?? '');
    const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
        from: parseISO(filters.date_from),
        to:   parseISO(filters.date_to),
    });

    const activeUserId = filters.user_id ?? '';
    const userLabel = users.find((u) => String(u.id) === activeUserId)?.name ?? '';

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalWorked = summary.reduce((acc, r) => acc + r.total_worked_seconds, 0);
    const maxWorked   = Math.max(...summary.map((r) => r.total_worked_seconds), 1);

    function openSheet() {
        setDraftUserId(activeUserId);
        setDraftDateRange({ from: parseISO(filters.date_from), to: parseISO(filters.date_to) });
        setSheetOpen(true);
    }

    function applyFilters() {
        setSheetOpen(false);
        const from = draftDateRange?.from ? format(draftDateRange.from, 'yyyy-MM-dd') : filters.date_from;
        const to   = draftDateRange?.to   ? format(draftDateRange.to,   'yyyy-MM-dd') : filters.date_to;
        router.get(
            route('attendance.admin.index'),
            { ...(draftUserId ? { user_id: draftUserId } : {}), date_from: from, date_to: to },
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
                    {/* Date range — always shown */}
                    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        {fmtDate(filters.date_from)} – {fmtDate(filters.date_to)}
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
                    <StatTile
                        icon={<Users className="h-5 w-5" />}
                        label="Employees shown"
                        value={String(summary.length)}
                    />
                    <StatTile
                        icon={<Clock className="h-5 w-5" />}
                        label="Total hours worked"
                        value={fmtSeconds(totalWorked)}
                    />
                    <StatTile
                        icon={<CalendarDays className="h-5 w-5" />}
                        label="Avg per employee"
                        value={summary.length ? fmtSeconds(Math.round(totalWorked / summary.length)) : '—'}
                    />
                </div>

                {/* ── Table card ── */}
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0 pb-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Employee breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <div className="flex-1 overflow-auto min-h-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b bg-muted/30 text-xs">
                                        <TableHead className="px-6 py-3 font-medium uppercase tracking-wide text-muted-foreground">Employee</TableHead>
                                        <TableHead className="px-6 py-3 font-medium uppercase tracking-wide text-muted-foreground">Days</TableHead>
                                        <TableHead className="px-6 py-3 font-medium uppercase tracking-wide text-muted-foreground">Time Worked</TableHead>
                                        <TableHead className="px-6 py-3 font-medium uppercase tracking-wide text-muted-foreground">Break Time</TableHead>
                                        <TableHead className="px-6 py-3 font-medium uppercase tracking-wide text-muted-foreground">Breaks</TableHead>
                                        <TableHead className="px-6 py-3 text-right" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y">
                                    {summary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                                                No attendance records for this period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        summary.map((row) => {
                                            const pct = Math.round((row.total_worked_seconds / maxWorked) * 100);
                                            return (
                                                <TableRow key={row.user.id} className="hover:bg-muted/20 transition-colors">
                                                    {/* Employee */}
                                                    <TableCell className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                                {initials(row.user.name)}
                                                            </div>
                                                            <span className="font-medium">{row.user.name}</span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Days */}
                                                    <TableCell className="px-6 py-3">
                                                        <span className="text-sm font-medium">{row.days_worked}</span>
                                                        <span className="ml-1 text-xs text-muted-foreground">days</span>
                                                    </TableCell>

                                                    {/* Time worked + bar */}
                                                    <TableCell className="px-6 py-3">
                                                        <span className="font-mono text-sm">{fmtSeconds(row.total_worked_seconds)}</span>
                                                        <div className="mt-1 h-1 w-24 rounded-full bg-muted">
                                                            <div
                                                                className="h-1 rounded-full bg-primary/60"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </TableCell>

                                                    {/* Break time */}
                                                    <TableCell className="px-6 py-3 font-mono text-sm text-muted-foreground">
                                                        {fmtSeconds(row.total_break_seconds)}
                                                    </TableCell>

                                                    {/* Breaks */}
                                                    <TableCell className="px-6 py-3 text-sm text-muted-foreground">
                                                        {row.total_breaks}
                                                    </TableCell>

                                                    {/* Detail */}
                                                    <TableCell className="px-6 py-3 text-right">
                                                        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                                                            <Link href={detailHref(row.user.id)}>
                                                                View
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
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
                        {/* User */}
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

                        {/* Date range */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Date range</p>
                            <DatePickerWithRange
                                value={draftDateRange}
                                onChange={setDraftDateRange}
                                numberOfMonths={1}
                                placeholder="Pick a date range"
                                disabled={{ after: new Date() }}
                                className="w-full"
                                triggerClassName="w-full"
                            />
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
