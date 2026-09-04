import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatInTz } from '@/lib/tz';
import { router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Coffee, LogIn, LogOut, MapPin, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { dayName, fmtSeconds, STATUS_STYLE } from './helpers';
import type { BreakRow, OverrideStatus, ShiftRow } from './types';

const OVERRIDE_OPTIONS: { value: OverrideStatus; label: string }[] = [
    { value: 'present',     label: 'Present' },
    { value: 'short_leave', label: 'Short Leave' },
    { value: 'half_day',    label: 'Half Day' },
    { value: 'absent',      label: 'Absent' },
];

export function DailyRecordsTable({
    shifts,
    tz,
    onEditBreak,
    onDeleteBreak,
}: {
    shifts: ShiftRow[];
    tz: string;
    onEditBreak: (b: BreakRow, shift: ShiftRow) => void;
    onDeleteBreak: (b: BreakRow) => void;
}) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    function handleOverride(row: ShiftRow, status: OverrideStatus | null) {
        router.patch(
            route('attendance.shifts.override-status', { shift: row.id }),
            { status },
            { preserveScroll: true },
        );
    }

    function toggleExpand(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <Card>
            <CardHeader className="shrink-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b bg-muted/30 text-xs">
                            <TableHead className="w-8 px-4 py-3" />
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Date</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Clock In</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Clock Out</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Worked</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Break</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Flags</TableHead>
                            <TableHead className="px-4 py-3 font-medium uppercase tracking-wide text-muted-foreground">Override</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y">
                        {shifts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                    No records for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            shifts.map((row) => {
                                const isOpen = expanded.has(row.id);
                                const cfg = STATUS_STYLE[row.day_status] ?? STATUS_STYLE.present;
                                return (
                                    <>
                                        {/* Shift row */}
                                        <TableRow key={row.id} className={`transition-colors hover:bg-muted/20 ${cfg.row}`}>
                                            <TableCell className="px-4 py-3">
                                                {row.break_count > 0 && (
                                                    <button
                                                        onClick={() => toggleExpand(row.id)}
                                                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                                        title={isOpen ? 'Collapse breaks' : 'Show breaks'}
                                                    >
                                                        {isOpen
                                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                                            : <ChevronRight className="h-3.5 w-3.5" />}
                                                    </button>
                                                )}
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                <span className="text-sm font-medium">{dayName(row.date)}</span>
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                {row.clocked_in_at ? (
                                                    <span className="flex items-center gap-1.5 font-mono text-sm">
                                                        <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                                                        {formatInTz(row.clocked_in_at, tz)}
                                                    </span>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                {row.clocked_out_at ? (
                                                    <span className="flex items-center gap-1.5 font-mono text-sm">
                                                        <LogOut className="h-3.5 w-3.5 text-rose-500" />
                                                        {formatInTz(row.clocked_out_at, tz)}
                                                    </span>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </TableCell>

                                            <TableCell className="px-4 py-3 font-mono text-sm font-medium">
                                                {fmtSeconds(row.total_worked_seconds)}
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                {row.break_count > 0 ? (
                                                    <span className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                                                        <Coffee className="h-3.5 w-3.5 text-amber-500" />
                                                        {fmtSeconds(row.total_break_seconds)}
                                                        <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                                            ×{row.break_count}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">—</span>
                                                )}
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                                    {cfg.label}
                                                </span>
                                            </TableCell>

                                            <TableCell className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.is_late && (
                                                        <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400">Late</span>
                                                    )}
                                                    {row.auto_closed && (
                                                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Auto-closed</span>
                                                    )}
                                                    {!row.clocked_out_at && !row.auto_closed && (
                                                        <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-400">Open</span>
                                                    )}
                                                    {row.clock_in_outside_geofence && (
                                                        <span className="flex items-center gap-0.5 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400">
                                                            <LogIn className="h-3 w-3" /><MapPin className="h-3 w-3" /><X className="h-2.5 w-2.5" />
                                                        </span>
                                                    )}
                                                    {row.clock_out_outside_geofence && (
                                                        <span className="flex items-center gap-0.5 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400">
                                                            <LogOut className="h-3 w-3" /><MapPin className="h-3 w-3" /><X className="h-2.5 w-2.5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Override column */}
                                            <TableCell className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {row.admin_override_status && (
                                                        <span className="flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                                                            <ShieldCheck className="h-3 w-3" />
                                                            {STATUS_STYLE[row.admin_override_status]?.label ?? row.admin_override_status}
                                                        </span>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Override attendance status">
                                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            {OVERRIDE_OPTIONS.map((opt) => (
                                                                <DropdownMenuItem
                                                                    key={opt.value}
                                                                    onClick={() => handleOverride(row, opt.value)}
                                                                    className={row.admin_override_status === opt.value ? 'font-semibold' : ''}
                                                                >
                                                                    {opt.label}
                                                                </DropdownMenuItem>
                                                            ))}
                                                            {row.admin_override_status && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleOverride(row, null)}
                                                                        className="text-muted-foreground"
                                                                    >
                                                                        Clear override
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Break sub-rows */}
                                        {isOpen && row.breaks.length > 0 && (
                                            <TableRow key={`${row.id}-breaks`}>
                                                <TableCell colSpan={9} className="p-0">
                                                    <div className="border-t border-dashed border-border/60 bg-muted/20 px-6 py-3">
                                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Breaks
                                                        </p>
                                                        <div className="flex flex-col gap-2">
                                                            {row.breaks.map((b, i) => (
                                                                <div key={b.id} className="flex items-center gap-4 rounded-lg border bg-background px-4 py-2.5 text-sm">
                                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                                                        {i + 1}
                                                                    </span>

                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-medium text-muted-foreground">Start</span>
                                                                        <span className="font-mono text-sm font-medium">
                                                                            {b.started_at ? formatInTz(b.started_at, tz) : '—'}
                                                                        </span>
                                                                    </div>

                                                                    <span className="text-muted-foreground">→</span>

                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-medium text-muted-foreground">End</span>
                                                                        {b.ended_at ? (
                                                                            <span className="font-mono text-sm font-medium">{formatInTz(b.ended_at, tz)}</span>
                                                                        ) : (
                                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">ongoing</span>
                                                                        )}
                                                                    </div>

                                                                    {b.duration_seconds != null && (
                                                                        <span className="ml-auto text-xs text-muted-foreground">
                                                                            {fmtSeconds(b.duration_seconds)}
                                                                        </span>
                                                                    )}

                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => onEditBreak(b, row)}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                            title="Edit break"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => onDeleteBreak(b)}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/30"
                                                                            title="Delete break"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
