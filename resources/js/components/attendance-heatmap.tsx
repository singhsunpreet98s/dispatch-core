import type { HeatmapDay } from '@/types';
import { Coffee, Flag } from 'lucide-react';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const STATUS_CLASS: Record<string, string> = {
    future:      'bg-muted opacity-30 cursor-default',
    weekend:     'bg-muted/60 cursor-default',
    holiday:     'bg-purple-100 dark:bg-purple-900/30 hover:brightness-95 cursor-pointer',
    absent:      'bg-red-100 dark:bg-red-900/20 hover:brightness-95 cursor-pointer',
    half_day:    'bg-orange-200 dark:bg-orange-700/40 hover:brightness-95 cursor-pointer',
    short_leave: 'bg-yellow-300 dark:bg-yellow-600/50 hover:brightness-95 cursor-pointer',
    present:     'bg-green-400 dark:bg-green-600/70 hover:brightness-95 cursor-pointer',
    open:        'bg-blue-400 dark:bg-blue-600/70 animate-pulse cursor-pointer',
    leave:       'bg-sky-200 dark:bg-sky-700/40 hover:brightness-95 cursor-pointer',
};

const LEGEND_ITEMS = [
    { label: 'Present',     cls: 'bg-green-400 dark:bg-green-600/70' },
    { label: 'Short Leave', cls: 'bg-yellow-300 dark:bg-yellow-600/50' },
    { label: 'Half Day',    cls: 'bg-orange-200 dark:bg-orange-700/40' },
    { label: 'Absent',      cls: 'bg-red-100 dark:bg-red-900/20' },
    { label: 'Open',        cls: 'bg-blue-400 dark:bg-blue-600/70' },
    { label: 'Holiday',     cls: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Leave',       cls: 'bg-sky-200 dark:bg-sky-700/40' },
    { label: 'Weekend',     cls: 'bg-muted/60' },
];

interface Props {
    days: HeatmapDay[];
    year: number;
    month: number;
    onDayClick: (d: HeatmapDay) => void;
    breakCounts?: Record<string, number>;
    flagDates?: Set<string>;
}

export function AttendanceHeatmap({ days, year, month, onDayClick, breakCounts, flagDates }: Props) {
    const firstDow = days.length > 0 ? new Date(days[0].date + 'T00:00:00').getDay() : 0;

    return (
        <div className="w-full">
            <div className="mb-1 grid grid-cols-7 gap-1">
                {DAY_LABELS.map((d) => (
                    <span key={d} className="text-muted-foreground text-center text-[10px]">{d}</span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
                {days.map((day) => {
                    const dn = new Date(day.date + 'T00:00:00').getDate();
                    const clickable = day.status !== 'future' && day.status !== 'weekend';
                    const breaks  = breakCounts?.[day.date] ?? 0;
                    const hasFlag = flagDates?.has(day.date) ?? false;
                    return (
                        <button
                            key={day.date}
                            title={day.holiday_name ? `Holiday: ${day.holiday_name}` : `${day.date} — ${day.status}`}
                            onClick={() => clickable && onDayClick(day)}
                            className={`relative flex h-9 w-full flex-col items-center justify-center rounded text-[11px] font-medium transition-all ${STATUS_CLASS[day.status] ?? 'bg-muted'}`}
                        >
                            {hasFlag && (
                                <Flag className="absolute top-0.5 right-0.5 h-2 w-2 fill-red-500 text-red-500" />
                            )}
                            <span>{dn}</span>
                            {breaks > 0 && (
                                <span className="mt-0.5 flex items-center gap-0.5 rounded-full bg-black/15 dark:bg-white/20 px-1 leading-[1.4]">
                                    <Coffee className="h-[7px] w-[7px]" />
                                    <span className="text-[7px] font-semibold tabular-nums">{breaks}</span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {LEGEND_ITEMS.map((item) => (
                    <span key={item.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`inline-block h-2.5 w-2.5 rounded-sm ${item.cls}`} />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
