import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, Coffee, Timer } from 'lucide-react';
import { fmtSeconds } from './helpers';
import type { ShiftRow } from './types';

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold leading-tight">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

export function StatTilesRow({ shifts }: { shifts: ShiftRow[] }) {
    const totalWorked    = shifts.reduce((a, s) => a + s.total_worked_seconds, 0);
    const totalBreakTime = shifts.reduce((a, s) => a + s.total_break_seconds, 0);
    const totalBreaks    = shifts.reduce((a, s) => a + s.break_count, 0);
    const daysPresent    = shifts.filter((s) => s.day_status === 'present').length;

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile
                icon={<CalendarDays className="h-5 w-5" />}
                label="Days worked"
                value={String(shifts.length)}
                sub={`${daysPresent} present`}
            />
            <StatTile
                icon={<Clock className="h-5 w-5" />}
                label="Total worked"
                value={fmtSeconds(totalWorked)}
                sub={`avg ${fmtSeconds(Math.round(totalWorked / (shifts.length || 1)))}/day`}
            />
            <StatTile
                icon={<Coffee className="h-5 w-5" />}
                label="Total break time"
                value={fmtSeconds(totalBreakTime)}
            />
            <StatTile
                icon={<Timer className="h-5 w-5" />}
                label="Total breaks"
                value={String(totalBreaks)}
                sub={`${shifts.length ? (totalBreaks / shifts.length).toFixed(1) : 0} avg/day`}
            />
        </div>
    );
}
