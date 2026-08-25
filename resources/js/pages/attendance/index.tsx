import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type AttendanceSettings, type AttendanceShift, type BreadcrumbItem, type ChecklistItem, type HeatmapDay, type LeaveRequest } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    heatmapDays: HeatmapDay[];
    currentShift: AttendanceShift | null;
    settings: AttendanceSettings;
    serverTime: string;
    canClockIn: boolean;
    ipAllowed: boolean;
    year: number;
    month: number;
    todayNote: ChecklistItem[];
    leaveRequests: LeaveRequest[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Attendance', href: '/attendance' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSeconds(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatTime(isoString: string): string {
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(
        new Date(isoString),
    );
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(dateStr + 'T00:00:00'),
    );
}

function navigateMonth(year: number, month: number, delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1;  y += 1; }
    router.get(route('attendance.index'), { year: y, month: m }, { preserveState: false });
}

// ── LiveTimer ─────────────────────────────────────────────────────────────────

function LiveTimer({ clockedInAt, totalBreakSeconds }: { clockedInAt: string; totalBreakSeconds: number }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(clockedInAt).getTime();
        const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000) - totalBreakSeconds));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [clockedInAt, totalBreakSeconds]);

    return <span className="font-mono text-2xl font-semibold tabular-nums">{formatSeconds(elapsed)}</span>;
}

// ── BreakTimer ────────────────────────────────────────────────────────────────

function BreakTimer({ startedAt, minBreakMinutes, onEnd, processing }: {
    startedAt: string; minBreakMinutes: number; onEnd: () => void; processing: boolean;
}) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(startedAt).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startedAt]);

    const elapsedMinutes = Math.floor(elapsed / 60);
    const canEnd   = elapsedMinutes >= minBreakMinutes;
    const remaining = minBreakMinutes - elapsedMinutes;

    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">Break in progress</p>
            <span className="font-mono text-2xl font-semibold tabular-nums">{formatSeconds(elapsed)}</span>
            {!canEnd && (
                <p className="text-muted-foreground text-xs">Min {minBreakMinutes} min — {remaining} min remaining</p>
            )}
            <Button onClick={onEnd} disabled={!canEnd || processing} size="sm">
                {processing ? 'Ending…' : canEnd ? 'End Break' : `End Break (${remaining}m left)`}
            </Button>
        </div>
    );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
    future:  'bg-muted opacity-30 cursor-default',
    weekend: 'bg-muted/60 cursor-default',
    holiday: 'bg-purple-100 dark:bg-purple-900/30 hover:brightness-95 cursor-pointer',
    absent:  'bg-red-100 dark:bg-red-900/20 hover:brightness-95 cursor-pointer',
    partial: 'bg-amber-200 dark:bg-amber-700/40 hover:brightness-95 cursor-pointer',
    present: 'bg-green-400 dark:bg-green-600/70 hover:brightness-95 cursor-pointer',
    open:    'bg-blue-400 dark:bg-blue-600/70 animate-pulse cursor-pointer',
    leave:   'bg-sky-200 dark:bg-sky-700/40 hover:brightness-95 cursor-pointer',
};

function AttendanceHeatmap({ days, year, month, onDayClick }: {
    days: HeatmapDay[]; year: number; month: number; onDayClick: (d: HeatmapDay) => void;
}) {
    const firstDow = days.length > 0 ? new Date(days[0].date + 'T00:00:00').getDay() : 0;

    return (
        <div className="w-full">
            {/* Day-of-week header */}
            <div className="mb-1 grid grid-cols-7 gap-1">
                {DAY_LABELS.map((d) => (
                    <span key={d} className="text-muted-foreground text-center text-[10px]">{d}</span>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
                {days.map((day) => {
                    const dn = new Date(day.date + 'T00:00:00').getDate();
                    const clickable = day.status !== 'future' && day.status !== 'weekend';
                    return (
                        <button
                            key={day.date}
                            title={day.holiday_name ? `Holiday: ${day.holiday_name}` : `${day.date} — ${day.status}`}
                            onClick={() => clickable && onDayClick(day)}
                            className={`flex h-8 w-full items-center justify-center rounded text-[11px] font-medium transition-all ${STATUS_CLASS[day.status] ?? 'bg-muted'}`}
                        >
                            {dn}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {[
                    { label: 'Present',  cls: 'bg-green-400 dark:bg-green-600/70' },
                    { label: 'Partial',  cls: 'bg-amber-200 dark:bg-amber-700/40' },
                    { label: 'Absent',   cls: 'bg-red-100 dark:bg-red-900/20' },
                    { label: 'Open',     cls: 'bg-blue-400 dark:bg-blue-600/70' },
                    { label: 'Holiday',  cls: 'bg-purple-100 dark:bg-purple-900/30' },
                    { label: 'Leave',    cls: 'bg-sky-200 dark:bg-sky-700/40' },
                    { label: 'Weekend',  cls: 'bg-muted/60' },
                ].map((item) => (
                    <span key={item.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`inline-block h-2.5 w-2.5 rounded-sm ${item.cls}`} />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── ShiftDetailSheet ──────────────────────────────────────────────────────────

function ShiftDetailSheet({ day, open, onClose }: { day: HeatmapDay | null; open: boolean; onClose: () => void }) {
    const shift = day?.shift ?? null;
    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{day ? formatDate(day.date) : ''}</SheetTitle>
                </SheetHeader>
                {day?.holiday_name && (
                    <p className="mt-2 text-xs font-medium text-purple-600">Holiday: {day.holiday_name}</p>
                )}
                {!shift ? (
                    <p className="text-muted-foreground mt-6 text-sm">No shift recorded for this day.</p>
                ) : (
                    <div className="mt-6 space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Clock in</span>
                            <span className="font-mono">{shift.clocked_in_at ? formatTime(shift.clocked_in_at) : '—'}</span>
                            <span className="text-muted-foreground">Clock out</span>
                            <span className="font-mono">{shift.clocked_out_at ? formatTime(shift.clocked_out_at) : 'Still open'}</span>
                            <span className="text-muted-foreground">Worked</span>
                            <span className="font-mono">{formatSeconds(shift.total_worked_seconds)}</span>
                            <span className="text-muted-foreground">Breaks</span>
                            <span className="font-mono">{formatSeconds(shift.total_break_seconds)}</span>
                            <span className="text-muted-foreground">IP address</span>
                            <span className="font-mono text-xs">{shift.ip_address ?? '—'}</span>
                            {shift.auto_closed && (
                                <>
                                    <span className="text-muted-foreground">Auto-closed</span>
                                    <span className="text-xs text-amber-600">Yes</span>
                                </>
                            )}
                        </div>
                        {shift.breaks.length > 0 && (
                            <div>
                                <p className="mb-2 font-medium">Breaks</p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Start</TableHead>
                                            <TableHead>End</TableHead>
                                            <TableHead>Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {shift.breaks.map((b) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-mono text-xs">{formatTime(b.started_at)}</TableCell>
                                                <TableCell className="font-mono text-xs">{b.ended_at ? formatTime(b.ended_at) : 'Open'}</TableCell>
                                                <TableCell className="font-mono text-xs">{formatSeconds(b.duration_seconds)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── CheckLeavesSheet ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<LeaveRequest['status'], string> = {
    pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function CheckLeavesSheet({ open, onClose, leaves }: { open: boolean; onClose: () => void; leaves: LeaveRequest[] }) {
    function cancel(id: number) {
        router.delete(route('attendance.leave.destroy', id), { preserveScroll: true });
    }

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>My Leave Requests</SheetTitle>
                </SheetHeader>
                {leaves.length === 0 ? (
                    <p className="text-muted-foreground mt-6 text-sm">No leave requests yet.</p>
                ) : (
                    <div className="mt-6 space-y-3">
                        {leaves.map((leave) => (
                            <div key={leave.id} className="rounded-lg border p-3 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                        <p className="font-medium">
                                            {formatDate(leave.date_from)}
                                            {leave.date_from !== leave.date_to && (
                                                <> &mdash; {formatDate(leave.date_to)}</>
                                            )}
                                        </p>
                                        <p className="text-muted-foreground text-xs">{leave.reason}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[leave.status]}`}>
                                            {leave.status}
                                        </span>
                                        {leave.status === 'pending' && (
                                            <button
                                                onClick={() => cancel(leave.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                                title="Cancel request"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── ApplyLeaveSheet ───────────────────────────────────────────────────────────

function ApplyLeaveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        date_from: '',
        date_to:   '',
        reason:    '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('attendance.leave.store'), {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Apply for Leave</SheetTitle>
                </SheetHeader>
                <form onSubmit={submit} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="date_from">From</Label>
                        <Input
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            onChange={(e) => setData('date_from', e.target.value)}
                            min={new Date().toISOString().slice(0, 10)}
                        />
                        {errors.date_from && <p className="text-destructive text-xs">{errors.date_from}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="date_to">To</Label>
                        <Input
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            onChange={(e) => setData('date_to', e.target.value)}
                            min={data.date_from || new Date().toISOString().slice(0, 10)}
                        />
                        {errors.date_to && <p className="text-destructive text-xs">{errors.date_to}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            placeholder="Briefly describe the reason for your leave…"
                            rows={3}
                        />
                        {errors.reason && <p className="text-destructive text-xs">{errors.reason}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Submitting…' : 'Submit Request'}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}

// ── ClockPanel ────────────────────────────────────────────────────────────────

function ClockPanel({ currentShift, settings, canClockIn, ipAllowed }: {
    currentShift: AttendanceShift | null; settings: AttendanceSettings; canClockIn: boolean; ipAllowed: boolean;
}) {
    const clockInForm    = useForm({});
    const clockOutForm   = useForm({});
    const breakStartForm = useForm({});
    const breakEndForm   = useForm({});

    const openBreak = currentShift?.breaks.find((b) => b.ended_at === null) ?? null;

    if (!currentShift) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-4 py-6">
                    {canClockIn ? (
                        <>
                            <p className="text-muted-foreground text-sm">Ready to start your shift?</p>
                            <Button onClick={() => clockInForm.post(route('attendance.clock-in'))} disabled={clockInForm.processing} size="lg">
                                {clockInForm.processing ? 'Clocking in…' : 'Clock In'}
                            </Button>
                        </>
                    ) : !ipAllowed ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Not on an allowed network</p>
                            <p className="text-muted-foreground mt-1 text-xs">Clock-in requires a whitelisted IP address.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border px-4 py-3 text-center">
                            <p className="text-muted-foreground text-sm">Clock-in window</p>
                            <p className="mt-1 font-medium">{settings.clock_in_start || '—'} – {settings.clock_in_end || '—'}</p>
                            <p className="text-muted-foreground mt-1 text-xs">Outside the clock-in window right now.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (currentShift.clocked_out_at) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Today's Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                        <p className="text-muted-foreground text-xs">Clocked in</p>
                        <p className="font-mono font-medium">{currentShift.clocked_in_at ? formatTime(currentShift.clocked_in_at) : '—'}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Clocked out</p>
                        <p className="font-mono font-medium">{formatTime(currentShift.clocked_out_at)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Worked</p>
                        <p className="font-mono font-medium">{formatSeconds(currentShift.total_worked_seconds)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Breaks</p>
                        <p className="font-mono font-medium">{formatSeconds(currentShift.total_break_seconds)}</p>
                    </div>
                    {currentShift.auto_closed && (
                        <p className="col-span-full text-xs text-amber-600">Shift was automatically closed by the system.</p>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (openBreak) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-4 py-6">
                    <BreakTimer
                        startedAt={openBreak.started_at}
                        minBreakMinutes={settings.min_break_minutes}
                        onEnd={() => breakEndForm.post(route('attendance.break.end'))}
                        processing={breakEndForm.processing}
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Active Shift</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-2">
                <div className="text-center">
                    <p className="text-muted-foreground mb-1 text-xs">
                        Clocked in at {currentShift.clocked_in_at ? formatTime(currentShift.clocked_in_at) : ''}
                    </p>
                    <LiveTimer clockedInAt={currentShift.clocked_in_at!} totalBreakSeconds={currentShift.total_break_seconds} />
                    {currentShift.breaks.length > 0 && (
                        <p className="text-muted-foreground mt-1 text-xs">{currentShift.breaks.length} break(s) taken</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => breakStartForm.post(route('attendance.break.start'))} disabled={breakStartForm.processing}>
                        {breakStartForm.processing ? 'Starting…' : 'Start Break'}
                    </Button>
                    <Button variant="destructive" onClick={() => clockOutForm.post(route('attendance.clock-out'))} disabled={clockOutForm.processing}>
                        {clockOutForm.processing ? 'Clocking out…' : 'Clock Out'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ── ChecklistNotes ────────────────────────────────────────────────────────────

function ChecklistNotes({ initialItems }: { initialItems: ChecklistItem[] }) {
    const today = new Date().toISOString().slice(0, 10);
    const [items, setItems] = useState<ChecklistItem[]>(initialItems);
    const [newText, setNewText] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    function toggle(index: number) {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)));
        setDirty(true);
    }

    function remove(index: number) {
        setItems((prev) => prev.filter((_, i) => i !== index));
        setDirty(true);
    }

    function addItem() {
        const text = newText.trim();
        if (!text) return;
        setItems((prev) => [...prev, { text, checked: false }]);
        setNewText('');
        setDirty(true);
        inputRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') { e.preventDefault(); addItem(); }
    }

    function save() {
        setSaving(true);
        router.post(
            route('attendance.notes.save'),
            { date: today, items },
            {
                preserveScroll: true,
                onFinish: () => { setSaving(false); setDirty(false); },
            },
        );
    }

    const done  = items.filter((i) => i.checked).length;
    const total = items.length;

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-sm font-semibold">Today's Notes</CardTitle>
                    {total > 0 && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{done}/{total} completed</p>
                    )}
                </div>
                {dirty && (
                    <Button size="icon" variant="ghost" onClick={save} disabled={saving} className="h-7 w-7 shrink-0" title="Save notes">
                        <Save className={`h-4 w-4 ${saving ? 'animate-pulse' : ''}`} />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                {/* Item list */}
                <div className="flex flex-col gap-1.5">
                    {items.length === 0 && (
                        <p className="text-muted-foreground text-xs italic">No items yet. Add your first task below.</p>
                    )}
                    {items.map((item, i) => (
                        <div key={i} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40">
                            <Checkbox
                                id={`note-${i}`}
                                checked={item.checked}
                                onCheckedChange={() => toggle(i)}
                                className="shrink-0"
                            />
                            <label
                                htmlFor={`note-${i}`}
                                className={`flex-1 cursor-pointer select-none text-sm ${item.checked ? 'text-muted-foreground line-through' : ''}`}
                            >
                                {item.text}
                            </label>
                            <button
                                onClick={() => remove(i)}
                                className="text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                tabIndex={-1}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add item row */}
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a task…"
                        className="h-8 text-sm"
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addItem} disabled={!newText.trim()}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttendancePage({ heatmapDays, currentShift, settings, canClockIn, ipAllowed, year, month, todayNote, leaveRequests }: Props) {
    const [selectedDay, setSelectedDay]     = useState<HeatmapDay | null>(null);
    const [checkLeavesOpen, setCheckLeaves] = useState(false);
    const [applyLeaveOpen, setApplyLeave]   = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">My Attendance</h1>
                        <p className="text-muted-foreground text-sm">Track your shifts and attendance</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setCheckLeaves(true)} className="gap-1.5">
                            <CalendarCheck className="h-4 w-4" />
                            Check Leaves
                            {leaveRequests.filter((l) => l.status === 'pending').length > 0 && (
                                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
                                    {leaveRequests.filter((l) => l.status === 'pending').length}
                                </span>
                            )}
                        </Button>
                        <Button size="sm" onClick={() => setApplyLeave(true)} className="gap-1.5">
                            <CalendarPlus className="h-4 w-4" />
                            Apply Leave
                        </Button>
                    </div>
                </div>

                {/* Active shift / clock panel — always at top */}
                <ClockPanel currentShift={currentShift} settings={settings} canClockIn={canClockIn} ipAllowed={ipAllowed} />

                {/* Calendar + Notes side by side */}
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[360px_1fr]">
                    {/* Compact heatmap */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold">
                                {MONTH_NAMES[month - 1]} {year}
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(year, month, -1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(year, month, 1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <AttendanceHeatmap days={heatmapDays} year={year} month={month} onDayClick={setSelectedDay} />
                        </CardContent>
                    </Card>

                    {/* Daily notes / checklist */}
                    <ChecklistNotes initialItems={todayNote} />
                </div>
            </div>

            <ShiftDetailSheet day={selectedDay} open={selectedDay !== null} onClose={() => setSelectedDay(null)} />
            <CheckLeavesSheet open={checkLeavesOpen} onClose={() => setCheckLeaves(false)} leaves={leaveRequests} />
            <ApplyLeaveSheet open={applyLeaveOpen} onClose={() => setApplyLeave(false)} />
        </AppLayout>
    );
}
