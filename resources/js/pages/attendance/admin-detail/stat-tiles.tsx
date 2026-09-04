import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, Coffee, DollarSign, Timer } from 'lucide-react';
import { countWorkingDays, effectiveDays, fmtSeconds } from './helpers';
import type { MonthlySalaryData, ShiftRow } from './types';

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

const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

export function StatTilesRow({
    shifts, dateFrom, dateTo, salaryEnabled, monthlySalary,
}: {
    shifts: ShiftRow[];
    dateFrom: string;
    dateTo: string;
    salaryEnabled: boolean;
    monthlySalary: MonthlySalaryData | null;
}) {
    const totalWorked    = shifts.reduce((a, s) => a + s.total_worked_seconds, 0);
    const totalBreakTime = shifts.reduce((a, s) => a + s.total_break_seconds, 0);
    const totalBreaks    = shifts.reduce((a, s) => a + s.break_count, 0);

    const effDays     = effectiveDays(shifts);
    const workingDays = countWorkingDays(dateFrom, dateTo);

    return (
        <div className={`grid grid-cols-2 gap-4 ${salaryEnabled ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
            <StatTile
                icon={<CalendarDays className="h-5 w-5" />}
                label="Days worked"
                value={`${effDays % 1 === 0 ? effDays : effDays.toFixed(2)} / ${workingDays}`}
                sub="present=1 · short=0.75 · half=0.5"
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
            {salaryEnabled && (
                <StatTile
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Gross earned"
                    value={monthlySalary ? fmt(monthlySalary.gross_earned) : '—'}
                    sub={monthlySalary ? fmt(monthlySalary.per_month_salary) + ' base' : 'Not calculated yet'}
                />
            )}
        </div>
    );
}
