import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Clock, Coffee, HardDrive, LogIn, LogOut, MapPin, Monitor, Wifi, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BreakEntry {
    id: number;
    started_at: string | null;
    ended_at: string | null;
    duration_seconds: number | null;
    is_open: boolean;
}

interface ShiftData {
    clocked_in_at: string | null;
    clocked_out_at: string | null;
    ip_address: string | null;
    clock_in_lat: number | null;
    clock_in_lng: number | null;
    clock_out_lat: number | null;
    clock_out_lng: number | null;
    auto_closed: boolean;
    current_break_started_at: string | null;
    completed_break_seconds: number;
    total_worked_seconds: number;
    break_count: number;
    is_late: boolean;
    breaks: BreakEntry[];
}

interface SystemInfo {
    serialNumber: string;
    model: string;
    ipAddress: string;
    maxStorageGB: number;
    storageLeftGB: number;
    openApplications: string[];
}

interface LiveUserData {
    user: { id: number; name: string; email: string; system_id: string | null };
    status: 'present' | 'on_break' | 'clocked_out' | 'absent';
    shift: ShiftData | null;
}

interface ExitEvent {
    id: number;
    user_name: string;
    serial_number: string;
    event_timestamp: string;
}

interface Props {
    liveData: LiveUserData[];
    today: string;
    appTimezone: string;
    clockInEnd: string;
    exitEvents: ExitEvent[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Attendance', href: '/attendance/admin' },
    { title: 'Live View', href: '/attendance/live' },
];

type FilterStatus = 'all' | LiveUserData['status'] | 'late';

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS = {
    present: {
        label: 'Present',
        gradient: 'linear-gradient(90deg,#10b981,#34d399)',
        glow: '0 4px 24px -4px rgba(16,185,129,.22)',
        timerHex: '#10b981',
        dotHex: '#10b981',
        avatarCls: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
        badgeCls: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
        cardBorderCls: 'border-emerald-200/70 dark:border-emerald-800/50',
        chipActiveCls: 'bg-emerald-500 border-emerald-500 text-white',
        sheetAccent: 'bg-emerald-500',
    },
    on_break: {
        label: 'On Break',
        gradient: 'linear-gradient(90deg,#f59e0b,#fb923c)',
        glow: '0 4px 24px -4px rgba(245,158,11,.22)',
        timerHex: '#d97706',
        dotHex: '#f59e0b',
        avatarCls: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
        badgeCls: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
        cardBorderCls: 'border-amber-200/70 dark:border-amber-800/50',
        chipActiveCls: 'bg-amber-500 border-amber-500 text-white',
        sheetAccent: 'bg-amber-500',
    },
    clocked_out: {
        label: 'Clocked Out',
        gradient: 'linear-gradient(90deg,#818cf8,#a78bfa)',
        glow: '0 4px 24px -4px rgba(129,140,248,.2)',
        timerHex: '#6366f1',
        dotHex: '#818cf8',
        avatarCls: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
        badgeCls: 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300',
        cardBorderCls: 'border-indigo-200/70 dark:border-indigo-800/50',
        chipActiveCls: 'bg-indigo-500 border-indigo-500 text-white',
        sheetAccent: 'bg-indigo-500',
    },
    absent: {
        label: 'Absent',
        gradient: 'linear-gradient(90deg,#f43f5e,#fb7185)',
        glow: '0 4px 24px -4px rgba(244,63,94,.15)',
        timerHex: '',
        dotHex: '#f43f5e',
        avatarCls: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400',
        badgeCls: 'border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300',
        cardBorderCls: 'border-rose-200/70 dark:border-rose-800/50',
        chipActiveCls: 'bg-rose-500 border-rose-500 text-white',
        sheetAccent: 'bg-rose-500',
    },
} as const;

// ─── Utilities ──────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/** HH:MM:SS — for live ticking cards */
function fmtClock(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

/** Xh Ym — for static/sheet display */
function fmtDuration(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
}

function fmtTime(isoStr: string | null, tz: string): string {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

function getWorkedSeconds(item: LiveUserData, now: number): number {
    if (!item.shift?.clocked_in_at) return 0;
    if (item.status === 'clocked_out') return item.shift.total_worked_seconds;
    const elapsed = Math.max(0, Math.floor((now - new Date(item.shift.clocked_in_at).getTime()) / 1000));
    let breaks = item.shift.completed_break_seconds;
    if (item.shift.current_break_started_at) {
        breaks += Math.max(0, Math.floor((now - new Date(item.shift.current_break_started_at).getTime()) / 1000));
    }
    return Math.max(0, elapsed - breaks);
}

function getBreakSeconds(item: LiveUserData, now: number): number {
    if (!item.shift?.current_break_started_at) return 0;
    return Math.max(0, Math.floor((now - new Date(item.shift.current_break_started_at).getTime()) / 1000));
}

// ─── LocationMap ────────────────────────────────────────────────────────────

function osmEmbedUrl(lat: number, lng: number): string {
    const delta = 0.005;
    const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

type MapPin = 'in' | 'out';

function LocationMap({ shift }: { shift: ShiftData }) {
    const hasIn  = shift.clock_in_lat  != null && shift.clock_in_lng  != null;
    const hasOut = shift.clock_out_lat != null && shift.clock_out_lng != null;

    const [active, setActive] = useState<MapPin>(hasIn ? 'in' : 'out');

    if (!hasIn && !hasOut) return null;

    const showIn  = hasIn  && (active === 'in'  || !hasOut);
    const showOut = hasOut && (active === 'out' || !hasIn);

    const lat = showIn  ? shift.clock_in_lat!  : shift.clock_out_lat!;
    const lng = showIn  ? shift.clock_in_lng!  : shift.clock_out_lng!;

    return (
        <div>
            <p className="text-muted-foreground mb-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location
            </p>

            {/* Toggle tabs — only shown when both exist */}
            {hasIn && hasOut && (
                <div className="mb-2.5 flex gap-1.5">
                    <button
                        onClick={() => setActive('in')}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                            active === 'in'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <LogIn className="h-3 w-3" />
                        Clock In
                    </button>
                    <button
                        onClick={() => setActive('out')}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                            active === 'out'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <LogOut className="h-3 w-3" />
                        Clock Out
                    </button>
                </div>
            )}

            {/* Single label when only one location is available */}
            {!(hasIn && hasOut) && (
                <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    {hasIn ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                    {hasIn ? 'Clock-in location' : 'Clock-out location'}
                </p>
            )}

            {/* Map iframe */}
            <div className="overflow-hidden rounded-xl border">
                <iframe
                    key={`${lat},${lng}`}
                    src={osmEmbedUrl(lat, lng)}
                    width="100%"
                    height="180"
                    style={{ border: 'none', display: 'block' }}
                    title="Location map"
                    loading="lazy"
                />
            </div>

            {/* Coordinates */}
            <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {lat.toFixed(6)}, {lng.toFixed(6)}
                <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 underline hover:text-foreground"
                >
                    Open in Maps
                </a>
            </p>
        </div>
    );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AttendanceLive({ liveData, today, appTimezone, clockInEnd, exitEvents }: Props) {
    const now = useNow();
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [selected, setSelected] = useState<LiveUserData | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [systemInfoLoading, setSystemInfoLoading] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

    async function openCard(item: LiveUserData) {
        setSelected(item);
        setSystemInfo(null);
        if (!item.user.system_id) return;
        setSystemInfoLoading(true);
        try {
            const res = await fetch(route('attendance.system-info', { serialNumber: item.user.system_id }), {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const json = await res.json();
                setSystemInfo(json.data ?? null);
            }
        } finally {
            setSystemInfoLoading(false);
        }
    }

    useEffect(() => {
        const id = setInterval(() => {
            router.reload({ only: ['liveData', 'exitEvents'] });
            setLastRefreshed(new Date());
        }, 60_000);
        return () => clearInterval(id);
    }, []);

    const counts = {
        present: liveData.filter((d) => d.status === 'present').length,
        on_break: liveData.filter((d) => d.status === 'on_break').length,
        clocked_out: liveData.filter((d) => d.status === 'clocked_out').length,
        absent: liveData.filter((d) => d.status === 'absent').length,
        late: liveData.filter((d) => d.shift?.is_late).length,
    };

    const filtered =
        filter === 'all'
            ? liveData
            : filter === 'present'
              ? liveData.filter((d) => d.status === 'present' || d.status === 'on_break')
              : filter === 'late'
                ? liveData.filter((d) => d.shift?.is_late)
                : liveData.filter((d) => d.status === filter);

    const chips: { key: FilterStatus; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: liveData.length },
        { key: 'present', label: 'Present', count: counts.present + counts.on_break },
        { key: 'on_break', label: 'On Break', count: counts.on_break },
        { key: 'clocked_out', label: 'Clocked Out', count: counts.clocked_out },
        { key: 'absent', label: 'Absent', count: counts.absent },
        ...(clockInEnd ? [{ key: 'late' as FilterStatus, label: 'Late', count: counts.late }] : []),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Live Attendance">
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
                />
            </Head>

            <div className="flex flex-1 flex-col gap-6 p-6" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
                {/* ── Header ─────────────────────────────────── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="mb-1.5 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-[10px] font-semibold tracking-[0.18em] text-emerald-600 uppercase dark:text-emerald-400">Live</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                            Team Status
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {today} · refreshes every 1m · updated{' '}
                            {lastRefreshed.toLocaleTimeString('en-US', {
                                timeZone: appTimezone,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                            })}
                        </p>
                    </div>

                    {/* Quick stat pills */}
                    <div className="flex items-center gap-3">
                        {(
                            [
                                { key: 'present', val: counts.present },
                                { key: 'on_break', val: counts.on_break },
                                { key: 'absent', val: counts.absent },
                            ] as const
                        ).map(({ key, val }) => (
                            <div key={key} className="text-center">
                                <p
                                    className="text-2xl leading-none font-bold tabular-nums"
                                    style={{ color: STATUS[key].dotHex, fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    {val}
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-[10px] font-medium tracking-wide uppercase">{STATUS[key].label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Action Required tile ───────────────────── */}
                {exitEvents.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/25 dark:bg-red-500/8">
                        <div className="flex items-center gap-2.5 border-b border-red-200/70 px-4 py-3 dark:border-red-500/20">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                            <span className="text-sm font-semibold text-red-700 dark:text-red-400">Action Required</span>
                            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                                {exitEvents.length}
                            </span>
                        </div>
                        <ul className="divide-y divide-red-100 dark:divide-red-500/10">
                            {exitEvents.map((ev) => (
                                <li key={ev.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                            <span className="font-semibold">{ev.user_name}</span> has tried to quit the app
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-red-500/80 dark:text-red-400/60">
                                            {new Date(ev.event_timestamp).toLocaleTimeString('en-US', {
                                                timeZone: appTimezone,
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            })}
                                            {' · '}
                                            {ev.serial_number}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            router.post(
                                                route('attendance.exit-events.acknowledge', { exitEvent: ev.id }),
                                                {},
                                                { preserveScroll: true, only: ['exitEvents'] },
                                            )
                                        }
                                        className="shrink-0 rounded-lg border border-red-200 bg-white p-1.5 text-red-400 transition hover:border-red-300 hover:text-red-600 dark:border-red-500/20 dark:bg-red-500/5 dark:hover:text-red-300"
                                        title="Dismiss"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Filter chips ───────────────────────────── */}
                <div className="flex flex-wrap gap-2">
                    {chips.map((chip) => {
                        const isActive = filter === chip.key;
                        const cfg = chip.key !== 'all' && chip.key !== 'late' ? STATUS[chip.key as keyof typeof STATUS] : null;
                        const lateActive = chip.key === 'late' && isActive;
                        return (
                            <button
                                key={chip.key}
                                onClick={() => setFilter(chip.key)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                                    lateActive
                                        ? 'border-orange-500 bg-orange-500 text-white'
                                        : isActive
                                          ? (cfg?.chipActiveCls ?? 'border-foreground bg-foreground text-background')
                                          : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                                }`}
                            >
                                {chip.key !== 'all' && isActive && <span className="h-1.5 w-1.5 rounded-full bg-white/60" />}
                                {chip.label}
                                <span
                                    className={`rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold tabular-nums ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {chip.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Cards grid ─────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="text-muted-foreground flex flex-1 items-center justify-center py-20 text-sm">No users match this filter.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {filtered.map((item) => {
                            const cfg = STATUS[item.status];
                            const workedSecs = getWorkedSeconds(item, now);
                            const breakSecs = getBreakSeconds(item, now);
                            const isLive = item.status === 'present' || item.status === 'on_break';

                            return (
                                <button
                                    key={item.user.id}
                                    onClick={() => openCard(item)}
                                    className={`group relative flex h-[168px] w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] dark:bg-zinc-900 ${cfg.cardBorderCls}`}
                                    style={{ boxShadow: cfg.glow }}
                                >
                                    {/* Status strip */}
                                    <div
                                        className="absolute inset-x-0 top-0 h-[3px] transition-all duration-300 group-hover:h-[4px]"
                                        style={{ background: cfg.gradient }}
                                    />

                                    <div className="flex h-full flex-col p-4 pt-5">
                                        {/* Avatar + badge */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${cfg.avatarCls}`}
                                            >
                                                {initials(item.user.name)}
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium ${cfg.badgeCls}`}>
                                                {cfg.label}
                                            </span>
                                        </div>

                                        {/* Name + email */}
                                        <div className="mt-2">
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <p className="truncate text-[13px] leading-snug font-semibold">{item.user.name}</p>
                                                {item.shift?.is_late && (
                                                    <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-px text-[9px] font-semibold tracking-wide text-orange-600 uppercase dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-400">
                                                        Late
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground truncate text-[11px]">{item.user.email}</p>
                                        </div>

                                        {/* Push to bottom */}
                                        <div className="flex-1" />

                                        {/* Timer section */}
                                        {item.status === 'absent' ? (
                                            <p className="text-muted-foreground text-xs">Not clocked in today</p>
                                        ) : (
                                            <div>
                                                <p
                                                    className="leading-none tabular-nums"
                                                    style={{
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        fontSize: '20px',
                                                        fontWeight: 600,
                                                        letterSpacing: '-0.02em',
                                                        color: cfg.timerHex || undefined,
                                                    }}
                                                >
                                                    {isLive ? fmtClock(workedSecs) : fmtDuration(workedSecs)}
                                                </p>

                                                <div className="text-muted-foreground mt-1 flex items-center gap-2.5 text-[10px]">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {fmtTime(item.shift!.clocked_in_at, appTimezone)}
                                                        {item.status === 'clocked_out' && item.shift?.clocked_out_at && (
                                                            <span>→ {fmtTime(item.shift.clocked_out_at, appTimezone)}</span>
                                                        )}
                                                    </span>

                                                    {item.status === 'on_break' && (
                                                        <span
                                                            className="flex items-center gap-1 font-medium"
                                                            style={{ color: STATUS.on_break.timerHex }}
                                                        >
                                                            <Coffee className="h-2.5 w-2.5" />
                                                            {fmtClock(breakSecs)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Detail sheet ───────────────────────────────── */}
            <Sheet
                open={!!selected}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelected(null);
                        setSystemInfo(null);
                    }
                }}
            >
                <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
                    {selected &&
                        (() => {
                            const cfg = STATUS[selected.status];
                            const workedSecs = getWorkedSeconds(selected, now);
                            const currentBreakSecs = getBreakSeconds(selected, now);
                            const totalBreakSecs = (selected.shift?.completed_break_seconds ?? 0) + currentBreakSecs;

                            return (
                                <>
                                    {/* Sheet header */}
                                    <div className="relative overflow-hidden border-b px-6 py-5">
                                        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: cfg.gradient }} />
                                        <SheetHeader className="space-y-0 pt-1 text-left">
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${cfg.avatarCls}`}
                                                >
                                                    {initials(selected.user.name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <SheetTitle className="text-base leading-tight font-semibold">{selected.user.name}</SheetTitle>
                                                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{selected.user.email}</p>
                                                    <div className="mt-2 flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] leading-5 font-medium ${cfg.badgeCls}`}
                                                        >
                                                            {cfg.label}
                                                        </span>
                                                        {selected.shift?.is_late && (
                                                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-orange-600 uppercase dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-400">
                                                                Late
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </SheetHeader>
                                    </div>

                                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
                                        {selected.shift ? (
                                            <>
                                                {/* Time grid */}
                                                <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border">
                                                    {[
                                                        {
                                                            label: 'Clocked In',
                                                            value: fmtTime(selected.shift.clocked_in_at, appTimezone),
                                                        },
                                                        {
                                                            label: 'Clocked Out',
                                                            value: selected.shift.clocked_out_at
                                                                ? fmtTime(selected.shift.clocked_out_at, appTimezone)
                                                                : '—',
                                                        },
                                                        { label: 'Worked Today', value: fmtDuration(workedSecs), mono: true },
                                                        { label: 'Total Break', value: fmtDuration(totalBreakSecs), mono: true },
                                                    ].map((cell) => (
                                                        <div key={cell.label} className="bg-background flex flex-col gap-0.5 px-4 py-3">
                                                            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                                                                {cell.label}
                                                            </span>
                                                            <span
                                                                className="font-semibold"
                                                                style={
                                                                    cell.mono
                                                                        ? {
                                                                              fontFamily: "'JetBrains Mono', monospace",
                                                                              fontSize: '15px',
                                                                          }
                                                                        : { fontSize: '15px' }
                                                                }
                                                            >
                                                                {cell.value}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* IP address */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Wifi className="text-muted-foreground h-4 w-4" />
                                                        {selected.shift.ip_address ? (
                                                            <>
                                                                <span className="text-muted-foreground">IP</span>
                                                                <code className="bg-muted rounded px-1.5 py-0.5 text-[12px]">
                                                                    {selected.shift.ip_address}
                                                                </code>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground">No IP recorded</span>
                                                        )}
                                                    </div>
                                                    {selected.shift.auto_closed && (
                                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                                            Auto-closed
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Location map */}
                                                <LocationMap shift={selected.shift} />

                                                {/* Breaks */}
                                                {selected.shift.breaks.length > 0 ? (
                                                    <div>
                                                        <p className="text-muted-foreground mb-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase">
                                                            Breaks · {selected.shift.breaks.length}
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {selected.shift.breaks.map((b, i) => (
                                                                <div
                                                                    key={b.id}
                                                                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                                                                        b.is_open ? 'bg-amber-50 dark:bg-amber-500/8' : 'bg-muted/50'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span
                                                                            className={`text-[10px] font-semibold tracking-wide uppercase ${
                                                                                b.is_open ? 'text-amber-500' : 'text-muted-foreground'
                                                                            }`}
                                                                        >
                                                                            #{i + 1}
                                                                        </span>
                                                                        <Coffee
                                                                            className={`h-3.5 w-3.5 ${b.is_open ? 'text-amber-500' : 'text-muted-foreground'}`}
                                                                        />
                                                                        <span className="text-[13px]">
                                                                            {fmtTime(b.started_at, appTimezone)}
                                                                            <span className="text-muted-foreground mx-1.5">→</span>
                                                                            {b.is_open ? (
                                                                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                                                                    ongoing
                                                                                </span>
                                                                            ) : (
                                                                                fmtTime(b.ended_at, appTimezone)
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <span
                                                                        className="text-[12px] font-medium tabular-nums"
                                                                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                                                    >
                                                                        {b.is_open
                                                                            ? fmtClock(currentBreakSecs)
                                                                            : b.duration_seconds != null
                                                                              ? fmtDuration(b.duration_seconds)
                                                                              : '—'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground text-sm">No breaks taken today.</p>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                                <p className="font-medium">Not clocked in</p>
                                                <p className="text-muted-foreground text-xs">No shift data recorded for today.</p>
                                            </div>
                                        )}

                                        {/* System info panel */}
                                        {selected.user.system_id && (
                                            <div>
                                                <p className="text-muted-foreground mb-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase">
                                                    System Info
                                                </p>
                                                {systemInfoLoading ? (
                                                    <p className="text-muted-foreground text-xs">Loading…</p>
                                                ) : systemInfo ? (
                                                    <div className="space-y-3">
                                                        <div className="bg-muted/40 grid grid-cols-2 gap-px overflow-hidden rounded-xl border">
                                                            {[
                                                                { label: 'Serial', value: systemInfo.serialNumber },
                                                                { label: 'Model', value: systemInfo.model },
                                                                { label: 'IP Address', value: systemInfo.ipAddress },
                                                                {
                                                                    label: 'Storage',
                                                                    value: `${systemInfo.storageLeftGB.toFixed(1)} / ${systemInfo.maxStorageGB.toFixed(1)} GB`,
                                                                },
                                                            ].map((cell) => (
                                                                <div key={cell.label} className="bg-background flex flex-col gap-0.5 px-3 py-2.5">
                                                                    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                                                                        {cell.label}
                                                                    </span>
                                                                    <span className="truncate font-mono text-[12px] font-medium">{cell.value}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Storage bar */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="text-muted-foreground flex items-center gap-1">
                                                                    <HardDrive className="h-3 w-3" />
                                                                    Storage used
                                                                </span>
                                                                <span className="font-medium tabular-nums">
                                                                    {(
                                                                        ((systemInfo.maxStorageGB - systemInfo.storageLeftGB) /
                                                                            systemInfo.maxStorageGB) *
                                                                        100
                                                                    ).toFixed(0)}
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                                                <div
                                                                    className="h-full rounded-full bg-blue-500 transition-all"
                                                                    style={{
                                                                        width: `${Math.min(100, ((systemInfo.maxStorageGB - systemInfo.storageLeftGB) / systemInfo.maxStorageGB) * 100)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Open apps */}
                                                        {systemInfo.openApplications.length > 0 && (
                                                            <div>
                                                                <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
                                                                    <Monitor className="h-3 w-3" />
                                                                    Open Apps · {systemInfo.openApplications.length}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {systemInfo.openApplications.map((app) => (
                                                                        <span
                                                                            key={app}
                                                                            className="bg-muted rounded-md px-2 py-0.5 font-mono text-[11px]"
                                                                        >
                                                                            {app}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground text-xs italic">No system data in cache.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
