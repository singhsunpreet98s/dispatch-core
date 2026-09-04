import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dayLabel, fmtSeconds, secToHours } from './helpers';
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

export function AttendanceCharts({ shifts, rightSlot }: { shifts: ShiftRow[]; rightSlot?: React.ReactNode }) {
    const chartData = shifts.map((s) => ({
        day:    dayLabel(s.date),
        Worked: secToHours(s.total_worked_seconds),
        Break:  secToHours(s.total_break_seconds),
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

            {/* Right slot — calendar or other content */}
            {rightSlot && <div className="xl:col-span-1">{rightSlot}</div>}
        </div>
    );
}
