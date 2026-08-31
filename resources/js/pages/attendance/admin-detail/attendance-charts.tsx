import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { dayLabel, fmtSeconds, secToHours, STATUS_BAR_COLOR, STATUS_STYLE } from './helpers';
import type { ShiftRow } from './types';

function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
            <p className="mb-1.5 font-semibold text-foreground">Day {label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-medium text-foreground">{fmtSeconds(Math.round(p.value * 3600))}</span>
                </p>
            ))}
        </div>
    );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: p.payload.fill }} />
                {p.name}: <span className="ml-1">{p.value} day{p.value !== 1 ? 's' : ''}</span>
            </p>
        </div>
    );
}

export function AttendanceCharts({ shifts }: { shifts: ShiftRow[] }) {
    const chartData = shifts.map((s) => ({
        day:    dayLabel(s.date),
        date:   s.date,
        status: s.day_status,
        Worked: secToHours(s.total_worked_seconds),
        Break:  secToHours(s.total_break_seconds),
    }));

    const statusCounts = Object.entries(
        shifts.reduce<Record<string, number>>((acc, s) => {
            acc[s.day_status] = (acc[s.day_status] ?? 0) + 1;
            return acc;
        }, {}),
    )
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
            name:  STATUS_STYLE[key]?.label ?? key,
            value,
            fill:  STATUS_BAR_COLOR[key] ?? '#94a3b8',
        }));

    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

            {/* Area chart — daily trend */}
            <Card className="xl:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Daily time trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradWorked" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradBreak" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.07} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(v) => `${v}h`} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} axisLine={false} tickLine={false} width={32} />
                            <Tooltip content={<AreaTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 1 }} />
                            <Area type="monotone" dataKey="Worked" name="Worked" stroke="#6366f1" strokeWidth={2} fill="url(#gradWorked)" dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            <Area type="monotone" dataKey="Break"  name="Break"  stroke="#f59e0b" strokeWidth={2} fill="url(#gradBreak)"  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Worked
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-amber-400" /> Break
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Donut chart — attendance breakdown */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Attendance breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={statusCounts}
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={78}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {statusCounts.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip content={<DonutTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-col gap-1.5">
                        {statusCounts.map((s) => (
                            <div key={s.name} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                                    {s.name}
                                </span>
                                <span className="font-medium text-foreground">{s.value}d</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
