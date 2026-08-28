import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatInTz } from '@/lib/tz';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BreakRow {
    id: number;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
}

interface ShiftRow {
    id: number;
    date: string;
    clocked_in_at: string | null;
    clocked_out_at: string | null;
    total_worked_seconds: number;
    total_break_seconds: number;
    total_shift_seconds: number;
    day_status: 'present' | 'short_leave' | 'half_day' | 'absent';
    break_count: number;
    auto_closed: boolean;
    breaks: BreakRow[];
}

const DAY_STATUS_BADGE: Record<string, string> = {
    present:     'border-green-500 text-green-600',
    short_leave: 'border-yellow-500 text-yellow-600',
    half_day:    'border-orange-500 text-orange-600',
    absent:      'border-red-500 text-red-600',
};

const DAY_STATUS_LABEL: Record<string, string> = {
    present:     'Present',
    short_leave: 'Short Leave',
    half_day:    'Half Day',
    absent:      'Absent',
};

interface Props {
    user: { id: number; name: string };
    shifts: ShiftRow[];
    dateFrom: string;
    dateTo: string;
}

function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function dayLabel(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').getDate().toString();
}

function secToHours(s: number): number {
    return parseFloat((s / 3600).toFixed(2));
}

const ACCENT = 'var(--primary)';

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border-border rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="text-foreground mb-1.5 font-semibold">Day {label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="flex items-center gap-1.5">
                    <span
                        className="inline-block h-2 w-2 shrink-0 rounded-sm"
                        style={{ background: p.fill, opacity: p.dataKey === 'Worked' ? 0.35 : 1 }}
                    />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="text-foreground font-medium">{fmtSeconds(Math.round(p.value * 3600))}</span>
                </p>
            ))}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AttendanceAdminDetail({ user, shifts, dateFrom, dateTo }: Props) {
    const tz = ((usePage().props as { appTimezone?: string }).appTimezone) ?? 'UTC';
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    function toggleExpand(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const totalWorked = shifts.reduce((a, s) => a + s.total_worked_seconds, 0);
    const totalBreakTime = shifts.reduce((a, s) => a + s.total_break_seconds, 0);
    const totalBreaks = shifts.reduce((a, s) => a + s.break_count, 0);

    const chartData = shifts.map((s) => ({
        day: dayLabel(s.date),
        Worked: secToHours(s.total_worked_seconds),
        Break: secToHours(s.total_break_seconds),
    }));

    const backHref = route('attendance.admin.index') + `?date_from=${dateFrom}&date_to=${dateTo}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Attendance', href: backHref },
        { title: user.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Attendance — ${user.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">{user.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            {dateFrom} — {dateTo}
                        </p>
                    </div>
                    <Link href={backHref}>
                        <Button variant="outline" size="sm">← Back</Button>
                    </Link>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Days Worked</p>
                            <p className="mt-1 text-2xl font-bold">{shifts.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Worked</p>
                            <p className="mt-1 text-2xl font-bold">{fmtSeconds(totalWorked)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Break Time</p>
                            <p className="mt-1 text-2xl font-bold">{fmtSeconds(totalBreakTime)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Breaks</p>
                            <p className="mt-1 text-2xl font-bold">{totalBreaks}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Stacked bar chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Daily Time Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.45 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tickFormatter={(v) => `${v}h`}
                                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.45 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={36}
                                />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
                                <Legend
                                    iconType="square"
                                    iconSize={10}
                                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                                />
                                <Bar dataKey="Worked" stackId="a" fill={ACCENT} fillOpacity={0.35} radius={[0, 0, 3, 3]} />
                                <Bar dataKey="Break" stackId="a" fill={ACCENT} fillOpacity={1} radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Day-by-day table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Daily Records</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 text-xs font-medium uppercase tracking-wider">
                                    <TableHead className="w-8 px-4" />
                                    <TableHead className="px-4">Date</TableHead>
                                    <TableHead className="px-4">Clock In</TableHead>
                                    <TableHead className="px-4">Clock Out</TableHead>
                                    <TableHead className="px-4">Worked</TableHead>
                                    <TableHead className="px-4">Break Time</TableHead>
                                    <TableHead className="px-4">Breaks</TableHead>
                                    <TableHead className="px-4">Day Status</TableHead>
                                    <TableHead className="px-4">Flags</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-muted-foreground px-4 py-10 text-center text-sm">
                                            No records for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    shifts.map((row) => {
                                        const isOpen = expanded.has(row.id);
                                        return (
                                            <>
                                                <TableRow key={row.id}>
                                                    <TableCell className="px-4 py-3">
                                                        {row.break_count > 0 && (
                                                            <button
                                                                onClick={() => toggleExpand(row.id)}
                                                                className="text-muted-foreground hover:text-foreground"
                                                            >
                                                                {isOpen
                                                                    ? <ChevronDown className="h-4 w-4" />
                                                                    : <ChevronRight className="h-4 w-4" />
                                                                }
                                                            </button>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3 font-mono text-sm">{row.date}</TableCell>
                                                    <TableCell className="px-4 py-3 font-mono text-sm">{row.clocked_in_at ? formatInTz(row.clocked_in_at, tz) : '—'}</TableCell>
                                                    <TableCell className="px-4 py-3 font-mono text-sm">{row.clocked_out_at ? formatInTz(row.clocked_out_at, tz) : '—'}</TableCell>
                                                    <TableCell className="px-4 py-3 font-mono text-sm">{fmtSeconds(row.total_worked_seconds)}</TableCell>
                                                    <TableCell className="px-4 py-3 font-mono text-sm">{fmtSeconds(row.total_break_seconds)}</TableCell>
                                                    <TableCell className="px-4 py-3 text-sm">{row.break_count}</TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${DAY_STATUS_BADGE[row.day_status] ?? ''}`}
                                                        >
                                                            {DAY_STATUS_LABEL[row.day_status] ?? row.day_status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-3">
                                                        {row.auto_closed ? (
                                                            <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Auto-closed</Badge>
                                                        ) : !row.clocked_out_at ? (
                                                            <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Open</Badge>
                                                        ) : null}
                                                    </TableCell>
                                                </TableRow>

                                                {isOpen && row.breaks.map((b) => (
                                                    <TableRow key={b.id} className="bg-muted/20">
                                                        <TableCell className="px-4 py-2" />
                                                        <TableCell colSpan={2} className="text-muted-foreground px-4 py-2 text-xs italic">
                                                            Break
                                                        </TableCell>
                                                        <TableCell className="px-4 py-2 font-mono text-xs">{b.started_at ? formatInTz(b.started_at, tz) : '—'}</TableCell>
                                                        <TableCell className="px-4 py-2 font-mono text-xs">{b.ended_at ? formatInTz(b.ended_at, tz) : 'ongoing'}</TableCell>
                                                        <TableCell className="px-4 py-2 font-mono text-xs">
                                                            {b.duration_seconds != null ? fmtSeconds(b.duration_seconds) : '—'}
                                                        </TableCell>
                                                        <TableCell colSpan={3} />
                                                    </TableRow>
                                                ))}
                                            </>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
