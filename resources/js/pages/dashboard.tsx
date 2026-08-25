import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type DashboardUser } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CalendarIcon,
    CalendarOff,
    Check,
    CheckCircle2,
    Eye,
    Loader2,
    Mail,
    MousePointerClick,
    TrendingDown,
    TrendingUp,
    UserMinus,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
    indigo:   '#6366f1',
    emerald:  '#10b981',
    rose:     '#f43f5e',
    amber:    '#f59e0b',
    violet:   '#8b5cf6',
    cyan:     '#06b6d4',
    slate:    '#94a3b8',
    orange:   '#f97316',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionItemType = 'leave';

interface LeaveActionMeta { date_from: string; date_to: string; reason: string; }
interface ActionItem { id: number; type: ActionItemType; user: { id: number; name: string }; meta: LeaveActionMeta; }

interface Stats {
    requests: number; delivered: number; undelivered: number;
    opens: number; unique_opens: number; clicks: number; unique_clicks: number;
    bounces: number; spam_reports: number; unsubscribes: number;
    delivery_rate: number; open_rate: number; click_rate: number;
}

interface DailyStatPoint {
    date: string; requests: number; delivered: number; undelivered: number;
    bounces: number; opens: number; unique_opens: number; clicks: number;
    unique_clicks: number; unsubscribes: number; spam_reports: number;
}

interface SingleSend { id: string; name: string; status: string; send_at?: string | null; updated_at?: string; }

interface CampaignEmailConfig { subject?: string; sender_id?: number | null; custom_unsubscribe_url?: string | null; suppression_group_id?: number | null; ip_pool?: string | null; generate_plain_content?: boolean; editor?: string; }
interface CampaignSendTo { list_ids?: string[]; segment_ids?: string[]; all?: boolean; }
interface CampaignDetail { id: string; name: string; status: string; categories?: string[]; send_at?: string | null; created_at?: string; updated_at?: string; send_to?: CampaignSendTo; email_config?: CampaignEmailConfig; }
interface CampaignStats extends Stats { undelivered: number; delivery_rate: number; open_rate: number; click_rate: number; }
interface CampaignDetailData { detail: CampaignDetail; sender_name: string | null; stats: CampaignStats; }

interface DashboardFilters { date_from: string; date_to: string; user_id: number | null; }

interface Props {
    stats: Stats;
    dailyStats: DailyStatPoint[];
    recentCampaigns: SingleSend[];
    actionItems: ActionItem[];
    filters: DashboardFilters;
    users: DashboardUser[];
    selectedUser: DashboardUser | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];
const TYPE_LABELS: Record<ActionItemType, string> = { leave: 'Leave' };

const today = () => new Date().toISOString().slice(0, 10);
const subDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const PRESETS = [
    { label: '7d',  days: 6  },
    { label: '30d', days: 29 },
    { label: '90d', days: 89 },
];

const fmt = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'));
const fmtDateRange = (from: string, to: string) => { const f = (d: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00')); return from === to ? f(from) : `${f(from)} – ${f(to)}`; };
const formatDate = (dateStr?: string | null) => { if (!dateStr) return '—'; return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr)); };

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
    s === 'triggered' ? 'default' : s === 'scheduled' ? 'secondary' : s === 'canceled' ? 'destructive' : 'outline';
const statusLabel: Record<string, string> = { triggered: 'Sent', scheduled: 'Scheduled', draft: 'Draft', canceled: 'Canceled' };

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const points = data.map(v => ({ v }));
    return (
        <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0}    />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    fill={`url(#spark-${color.replace('#', '')})`}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
    title, value, sub, icon: Icon, color, sparkData,
}: {
    title: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string; sparkData?: number[];
}) {
    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-1 pt-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
                    {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
                </div>
                <div className="ml-3 shrink-0 rounded-xl p-2.5" style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                </div>
            </CardHeader>
            <div className="mt-auto px-1 pb-1">
                <Sparkline data={sparkData ?? []} color={color} />
            </div>
        </Card>
    );
}

// ── Area Chart ────────────────────────────────────────────────────────────────

const SERIES = [
    { key: 'requests',    name: 'Sent',        color: C.indigo  },
    { key: 'delivered',   name: 'Delivered',   color: C.emerald },
    { key: 'undelivered', name: 'Undelivered', color: C.rose    },
    { key: 'bounces',     name: 'Bounces',     color: C.amber   },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload?.length) return null;

    const date: string = payload[0]?.payload?.date ?? '';
    const label = date
        ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'))
        : '';

    return (
        <div className="min-w-[170px] rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg">
            {label && (
                <p className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold text-muted-foreground">
                    {label}
                </p>
            )}
            <div className="space-y-1.5">
                {payload.map((entry) => (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{fmt(Number(entry.value))}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmailAreaChart({ data }: { data: DailyStatPoint[] }) {
    const chartData = data.map(d => ({
        ...d,
        label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                No daily data available for this period.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    {SERIES.map(s => (
                        <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={s.color} stopOpacity={0.22} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0}    />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tickFormatter={v => fmt(v)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                />
                {SERIES.map(s => (
                    <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.color}
                        fill={`url(#grad-${s.key})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ── Campaign Detail Sheet ─────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start gap-3 py-2">
            <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
            <span className="flex-1 text-sm break-all">{value}</span>
        </div>
    );
}

function CampaignDetailSheet({ open, onOpenChange, loading, data }: { open: boolean; onOpenChange: (v: boolean) => void; loading: boolean; data: CampaignDetailData | null; }) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-4">
                    <SheetTitle className="text-base font-semibold">{data ? data.detail.name : 'Campaign Details'}</SheetTitle>
                </SheetHeader>
                {loading && <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
                {!loading && !data && <p className="py-8 text-center text-sm text-muted-foreground">Failed to load campaign details.</p>}
                {!loading && data && (
                    <div className="space-y-5">
                        <section>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</p>
                            <div className="rounded-lg border divide-y">
                                <div className="px-4"><DetailRow label="Campaign ID" value={<span className="font-mono text-xs">{data.detail.id}</span>} /></div>
                                <div className="px-4"><DetailRow label="Status" value={<Badge variant={statusVariant(data.detail.status)}>{statusLabel[data.detail.status] ?? data.detail.status}</Badge>} /></div>
                                <div className="px-4"><DetailRow label="Send Date" value={formatDate(data.detail.send_at)} /></div>
                                <div className="px-4"><DetailRow label="Created" value={formatDate(data.detail.created_at)} /></div>
                                <div className="px-4"><DetailRow label="Last Updated" value={formatDate(data.detail.updated_at)} /></div>
                            </div>
                        </section>
                        {data.detail.email_config && (
                            <section>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Configuration</p>
                                <div className="rounded-lg border divide-y">
                                    <div className="px-4"><DetailRow label="Subject" value={data.detail.email_config.subject} /></div>
                                    {(data.sender_name || data.detail.email_config.sender_id) && <div className="px-4"><DetailRow label="Sender" value={data.sender_name ?? String(data.detail.email_config.sender_id)} /></div>}
                                    {data.detail.email_config.ip_pool && <div className="px-4"><DetailRow label="IP Pool" value={data.detail.email_config.ip_pool} /></div>}
                                    <div className="px-4"><DetailRow label="Editor" value={data.detail.email_config.editor} /></div>
                                </div>
                            </section>
                        )}
                        <section>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Stats</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Sent',          value: fmt(data.stats.requests),      sub: 'total requests' },
                                    { label: 'Delivered',     value: fmt(data.stats.delivered),     sub: `${data.stats.delivery_rate}% rate` },
                                    { label: 'Undelivered',   value: fmt(data.stats.undelivered),   sub: 'bounces + drops' },
                                    { label: 'Bounces',       value: fmt(data.stats.bounces),       sub: 'hard + soft' },
                                    { label: 'Unique Opens',  value: fmt(data.stats.unique_opens),  sub: `${data.stats.open_rate}% rate` },
                                    { label: 'Total Opens',   value: fmt(data.stats.opens),         sub: 'all opens' },
                                    { label: 'Unique Clicks', value: fmt(data.stats.unique_clicks), sub: `${data.stats.click_rate}% rate` },
                                    { label: 'Total Clicks',  value: fmt(data.stats.clicks),        sub: 'all clicks' },
                                    { label: 'Spam Reports',  value: fmt(data.stats.spam_reports),  sub: undefined },
                                    { label: 'Unsubscribes',  value: fmt(data.stats.unsubscribes),  sub: undefined },
                                ].map(({ label, value, sub }) => (
                                    <div key={label} className="rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <p className="text-xl font-bold tracking-tight">{value}</p>
                                        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ── Action Required ───────────────────────────────────────────────────────────

function ActionRequired({ items }: { items: ActionItem[] }) {
    const [activeType, setActiveType] = useState<ActionItemType | 'all'>('all');
    const types = [...new Set(items.map(i => i.type))] as ActionItemType[];
    const visible = activeType === 'all' ? items : items.filter(i => i.type === activeType);
    if (items.length === 0) return null;

    return (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Action Required
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white leading-none">{items.length}</span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setActiveType('all')} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${activeType === 'all' ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-300 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30'}`}>All ({items.length})</button>
                        {types.map(t => { const count = items.filter(i => i.type === t).length; return (
                            <button key={t} onClick={() => setActiveType(t)} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${activeType === t ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-300 text-amber-600 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30'}`}>{TYPE_LABELS[t]} ({count})</button>
                        ); })}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
                {visible.map(item => (
                    <div key={`${item.type}-${item.id}`} className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:gap-4">
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <CalendarOff className="h-3 w-3" />{TYPE_LABELS[item.type]}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.user.name}</p>
                            {item.type === 'leave' && (
                                <>
                                    <p className="text-muted-foreground text-xs">{fmtDateRange(item.meta.date_from, item.meta.date_to)}</p>
                                    <p className="text-muted-foreground mt-0.5 truncate text-xs italic">{item.meta.reason}</p>
                                </>
                            )}
                        </div>
                        {item.type === 'leave' && (
                            <div className="flex shrink-0 gap-2">
                                <Button size="sm" variant="outline" className="h-7 gap-1 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20" onClick={() => router.patch(route('attendance.leave.approve', item.id), {}, { preserveScroll: true })}>
                                    <Check className="h-3.5 w-3.5" />Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 gap-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => router.patch(route('attendance.leave.reject', item.id), {}, { preserveScroll: true })}>
                                    <X className="h-3.5 w-3.5" />Reject
                                </Button>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ── User Filter ───────────────────────────────────────────────────────────────

function UserFilter({ users, selectedUser, onChange }: { users: DashboardUser[]; selectedUser: DashboardUser | null; onChange: (uid: number | null) => void; }) {
    if (users.length === 0) return null;
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Viewing:</span>
            <Select value={selectedUser ? String(selectedUser.id) : 'all'} onValueChange={v => onChange(v === 'all' ? null : Number(v))}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Dashboard({ stats, dailyStats, recentCampaigns, actionItems, filters, users, selectedUser }: Props) {
    const [open, setOpen] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>({
        from: new Date(filters.date_from + 'T00:00:00'),
        to:   new Date(filters.date_to   + 'T00:00:00'),
    });
    const [detailOpen, setDetailOpen]         = useState(false);
    const [detailLoading, setDetailLoading]   = useState(false);
    const [campaignDetailData, setCampaignDetailData] = useState<CampaignDetailData | null>(null);

    async function handleViewDetail(campaignId: string) {
        setDetailOpen(true);
        setDetailLoading(true);
        setCampaignDetailData(null);
        try {
            const res  = await fetch(route('campaigns.detail', { singlesendId: campaignId }));
            const data = await res.json();
            setCampaignDetailData(data);
        } finally {
            setDetailLoading(false);
        }
    }

    const activePreset = filters.date_to === today()
        ? (PRESETS.find(p => subDays(p.days) === filters.date_from)?.label ?? null)
        : null;

    function navigate(f: string, t: string, uid?: number | null) {
        const params: Record<string, string | number> = { date_from: f, date_to: t };
        const effectiveUid = uid === undefined ? filters.user_id : uid;
        if (effectiveUid) params.user_id = effectiveUid;
        router.get(route('dashboard'), params, { preserveState: false });
    }

    function handleRangeSelect(r: DateRange | undefined) {
        setRange(r);
        if (r?.from && r?.to) {
            navigate(r.from.toISOString().slice(0, 10), r.to.toISOString().slice(0, 10));
            setOpen(false);
        }
    }

    // Extract sparkline series per metric from daily stats
    const spark = (key: keyof DailyStatPoint) => dailyStats.map(d => d[key] as number);

    const statCards = [
        { title: 'Total Sent',     value: fmt(stats.requests),      sub: 'emails requested',              icon: Mail,             color: C.indigo,  sparkKey: 'requests'      as keyof DailyStatPoint },
        { title: 'Delivered',      value: fmt(stats.delivered),     sub: `${stats.delivery_rate}% rate`,  icon: CheckCircle2,     color: C.emerald, sparkKey: 'delivered'     as keyof DailyStatPoint },
        { title: 'Undelivered',    value: fmt(stats.undelivered),   sub: 'bounces + drops',               icon: TrendingDown,     color: C.rose,    sparkKey: 'undelivered'   as keyof DailyStatPoint },
        { title: 'Bounces',        value: fmt(stats.bounces),       sub: 'hard + soft bounces',           icon: AlertTriangle,    color: C.amber,   sparkKey: 'bounces'       as keyof DailyStatPoint },
        { title: 'Unique Opens',   value: fmt(stats.unique_opens),  sub: `${stats.open_rate}% open rate`, icon: Eye,              color: C.violet,  sparkKey: 'unique_opens'  as keyof DailyStatPoint },
        { title: 'Unique Clicks',  value: fmt(stats.unique_clicks), sub: `${stats.click_rate}% CTR`,      icon: MousePointerClick,color: C.cyan,    sparkKey: 'unique_clicks' as keyof DailyStatPoint },
        { title: 'Spam Reports',   value: fmt(stats.spam_reports),  sub: undefined,                       icon: TrendingUp,       color: C.orange,  sparkKey: 'spam_reports'  as keyof DailyStatPoint },
        { title: 'Unsubscribes',   value: fmt(stats.unsubscribes),  sub: undefined,                       icon: UserMinus,        color: C.slate,   sparkKey: 'unsubscribes'  as keyof DailyStatPoint },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Action Required */}
                <ActionRequired items={actionItems} />

                {/* Header + filters */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
                            <p className="text-muted-foreground text-sm">
                                {fmtLabel(filters.date_from)} – {fmtLabel(filters.date_to)} · SendGrid
                            </p>
                            {selectedUser && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                                    <span className="font-medium">Showing: {selectedUser.name}</span>
                                    <button onClick={() => navigate(filters.date_from, filters.date_to, null)} className="rounded text-muted-foreground hover:text-foreground" aria-label="Clear">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </p>
                            )}
                        </div>
                        <UserFilter users={users} selectedUser={selectedUser} onChange={uid => navigate(filters.date_from, filters.date_to, uid)} />
                    </div>

                    {/* Preset chips + custom range */}
                    <div className="flex flex-wrap items-center gap-2">
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => { navigate(subDays(p.days), today()); setOpen(false); }}
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    activePreset === p.label
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                }`}
                            >
                                Last {p.label}
                            </button>
                        ))}
                        <span className="text-border hidden sm:block">|</span>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn('justify-start text-left font-normal', !range && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {range?.from ? (
                                        range.to
                                            ? <>{format(range.from, 'LLL dd, y')} – {format(range.to, 'LLL dd, y')}</>
                                            : format(range.from, 'LLL dd, y')
                                    ) : <span>Pick a date range</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={range?.from}
                                    selected={range}
                                    onSelect={handleRangeSelect}
                                    numberOfMonths={2}
                                    disabled={{ after: new Date() }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Stat cards — 4 wide */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {statCards.map(card => (
                        <StatCard
                            key={card.title}
                            title={card.title}
                            value={card.value}
                            sub={card.sub}
                            icon={card.icon}
                            color={card.color}
                            sparkData={spark(card.sparkKey)}
                        />
                    ))}
                </div>

                {/* Area chart */}
                {!selectedUser && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">Email Delivery Trends</CardTitle>
                            <p className="text-xs text-muted-foreground">Daily breakdown — sent, delivered, undelivered, and bounces</p>
                        </CardHeader>
                        <CardContent className="pr-4">
                            <EmailAreaChart data={dailyStats} />
                        </CardContent>
                    </Card>
                )}

                {/* Recent campaigns */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Recent Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentCampaigns.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                                {selectedUser ? `No campaigns found for ${selectedUser.name}.` : 'No campaigns found.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            <th className="px-6 py-3">Campaign</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Send Date</th>
                                            <th className="px-6 py-3">Last Updated</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {recentCampaigns.map(campaign => (
                                            <tr key={campaign.id} className="transition-colors hover:bg-muted/30">
                                                <td className="px-6 py-4 font-medium">{campaign.name}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={statusVariant(campaign.status)}>{statusLabel[campaign.status] ?? campaign.status}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">{formatDate(campaign.send_at)}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{formatDate(campaign.updated_at)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => handleViewDetail(campaign.id)}>
                                                        <Eye className="h-3.5 w-3.5" />Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <CampaignDetailSheet open={detailOpen} onOpenChange={setDetailOpen} loading={detailLoading} data={campaignDetailData} />
        </AppLayout>
    );
}
