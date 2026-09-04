import { AttendanceHeatmap, MONTH_NAMES } from '@/components/attendance-heatmap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatInTz } from '@/lib/tz';
import type { HeatmapDay } from '@/types';
import { router } from '@inertiajs/react';
import { AlertCircle, CheckSquare, ChevronDown, Clock, Coffee, LogIn, LogOut, ShieldCheck, Square, Timer, X } from 'lucide-react';
import { useState } from 'react';
import type { NoteItem, OverrideStatus, ShiftRow } from './types';

interface Props {
    shifts: ShiftRow[];
    dateFrom: string;
    dateTo: string;
    tz: string;
    notes: Record<string, NoteItem[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSeconds(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(dateStr + 'T00:00:00'));
}

function deriveDisplayMonth(dateTo: string): { year: number; month: number } {
    const to = new Date(dateTo + 'T00:00:00');
    return { year: to.getFullYear(), month: to.getMonth() + 1 };
}


function buildCalendarDays(shifts: ShiftRow[], year: number, month: number): HeatmapDay[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shiftMap = new Map(shifts.map((s) => [s.date, s]));
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: HeatmapDay[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr   = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const jsDate    = new Date(dateStr + 'T00:00:00');
        const dow       = jsDate.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isFuture  = jsDate > today;
        const shift     = shiftMap.get(dateStr) ?? null;

        let status: HeatmapDay['status'];
        if (isFuture)       status = 'future';
        else if (isWeekend) status = 'weekend';
        else if (shift)     status = shift.day_status as unknown as HeatmapDay['status'];
        else                status = 'absent';

        days.push({ date: dateStr, status, shift: null, holiday_name: null });
    }

    return days;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OVERRIDE_OPTIONS: { value: OverrideStatus; label: string }[] = [
    { value: 'present',     label: 'Present' },
    { value: 'short_leave', label: 'Short Leave' },
    { value: 'half_day',    label: 'Half Day' },
    { value: 'absent',      label: 'Absent' },
];

const STATUS_BADGE: Record<string, string> = {
    present:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    short_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    half_day:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    absent:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
    present:     'Present',
    short_leave: 'Short Leave',
    half_day:    'Half Day',
    absent:      'Absent',
};

// ── ShiftDetailSheet ──────────────────────────────────────────────────────────

function AdminShiftDetailSheet({
    shift, date, open, onClose, tz, notes,
}: {
    shift: ShiftRow | null;
    date: string | null;
    open: boolean;
    onClose: () => void;
    tz: string;
    notes: NoteItem[];
}) {
    const status = shift?.admin_override_status ?? shift?.day_status ?? null;

    function handleOverride(value: OverrideStatus | null) {
        if (!shift) return;
        router.patch(
            route('attendance.shifts.override-status', { shift: shift.id }),
            { status: value },
            { preserveScroll: true },
        );
    }

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto font-sans">
                <SheetHeader className="pb-4 border-b pr-8">
                    <SheetTitle className="font-sans text-sm font-semibold leading-snug tracking-normal">
                        {date ? formatDate(date) : ''}
                    </SheetTitle>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {status && (
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] ?? ''}`}>
                                {STATUS_LABEL[status] ?? status}
                            </span>
                        )}
                        {shift?.admin_override_status && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                                <ShieldCheck className="h-3 w-3" />
                                Overridden
                            </span>
                        )}
                    </div>
                </SheetHeader>

                {!shift ? (
                    <div className="mt-10 flex flex-col items-center gap-3 text-center">
                        <div className="rounded-full bg-muted p-4">
                            <Clock className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No shift recorded</p>
                        <p className="text-muted-foreground text-xs max-w-[18rem]">No attendance data was logged for this day.</p>
                        {notes.length > 0 && (
                            <div className="mt-4 w-full space-y-1 text-left">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Tasks · {notes.length}
                                </p>
                                {notes.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                                        {item.checked
                                            ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                            : <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        }
                                        <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">

                        {/* Clock in / out */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border bg-card p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <LogIn className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest">Clock In</span>
                                </div>
                                <p className="font-mono text-base font-semibold tabular-nums">
                                    {shift.clocked_in_at ? formatInTz(shift.clocked_in_at, tz) : '—'}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-card p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <LogOut className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest">Clock Out</span>
                                </div>
                                <p className="font-mono text-base font-semibold tabular-nums">
                                    {shift.clocked_out_at ? formatInTz(shift.clocked_out_at, tz) : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Duration stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                                    <Timer className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest">Worked</span>
                                </div>
                                <p className="font-mono text-base font-semibold tabular-nums text-green-800 dark:text-green-300">
                                    {formatSeconds(shift.total_worked_seconds)}
                                </p>
                            </div>
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                    <Coffee className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest">Break</span>
                                </div>
                                <p className="font-mono text-base font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                                    {formatSeconds(shift.total_break_seconds)}
                                </p>
                            </div>
                        </div>

                        {/* Override status */}
                        <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Status Override
                            </p>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            {shift.admin_override_status
                                                ? (STATUS_LABEL[shift.admin_override_status] ?? shift.admin_override_status)
                                                : 'Override Status'
                                            }
                                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {OVERRIDE_OPTIONS.map((opt) => (
                                            <DropdownMenuItem
                                                key={opt.value}
                                                onSelect={() => handleOverride(opt.value)}
                                                className={shift.admin_override_status === opt.value ? 'font-semibold' : ''}
                                            >
                                                {opt.label}
                                            </DropdownMenuItem>
                                        ))}
                                        {shift.admin_override_status && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onSelect={() => handleOverride(null)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <X className="h-3.5 w-3.5 mr-1.5" />
                                                    Clear Override
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Flags */}
                        {(shift.is_late || shift.auto_closed) && (
                            <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2">
                                {shift.is_late && (
                                    <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-2">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                                        <span className="text-xs text-red-700 dark:text-red-300">Marked as late</span>
                                    </div>
                                )}
                                {shift.auto_closed && (
                                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <span className="text-xs text-amber-700 dark:text-amber-300">Shift was auto-closed by the system</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Daily tasks / notes */}
                        {notes.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Tasks · {notes.length}
                                </p>
                                <div className="space-y-1">
                                    {notes.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                                            {item.checked
                                                ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                                : <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            }
                                            <span className={`text-xs ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Breaks timeline */}
                        {shift.breaks.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Breaks · {shift.breaks.length}
                                </p>
                                <div className="space-y-1.5">
                                    {shift.breaks.map((b, idx) => (
                                        <div key={b.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-1 items-center gap-1.5 font-mono text-xs tabular-nums">
                                                <span>{b.started_at ? formatInTz(b.started_at, tz) : '—'}</span>
                                                <span className="text-muted-foreground/50">→</span>
                                                <span>{b.ended_at ? formatInTz(b.ended_at, tz) : <span className="text-blue-500 dark:text-blue-400">Open</span>}</span>
                                            </div>
                                            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                                                {b.duration_seconds != null ? formatSeconds(b.duration_seconds) : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── AttendanceCalendar ────────────────────────────────────────────────────────

export function AttendanceCalendar({ shifts, dateFrom, dateTo, tz, notes }: Props) {
    const { year, month } = deriveDisplayMonth(dateTo);

    const shiftMap = new Map(shifts.map((s) => [s.date, s]));
    const days = buildCalendarDays(shifts, year, month);

    const breakCounts: Record<string, number> = {};
    shifts.forEach((s) => { if (s.break_count > 0) breakCounts[s.date] = s.break_count; });

    const flagDates = new Set(Object.keys(notes).filter((d) => notes[d].length > 0));

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const selectedShift = selectedDate ? (shiftMap.get(selectedDate) ?? null) : null;
    const selectedNotes = selectedDate ? (notes[selectedDate] ?? []) : [];

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                        {MONTH_NAMES[month - 1]} {year}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <AttendanceHeatmap
                        days={days}
                        year={year}
                        month={month}
                        onDayClick={(day) => setSelectedDate(day.date)}
                        breakCounts={breakCounts}
                        flagDates={flagDates}
                    />
                </CardContent>
            </Card>

            <AdminShiftDetailSheet
                shift={selectedShift}
                date={selectedDate}
                open={selectedDate !== null}
                onClose={() => setSelectedDate(null)}
                tz={tz}
                notes={selectedNotes}
            />
        </>
    );
}
