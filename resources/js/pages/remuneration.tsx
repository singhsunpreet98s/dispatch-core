import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type MonthlySalary, type SalaryBreakdownEntry, type Salary, type SalaryHistory } from '@/types';
import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
    salary: Salary | null;
    history: SalaryHistory[];
    monthly_pay: MonthlySalary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Remuneration', href: '/remuneration' },
];

const fieldLabels: Record<string, string> = {
    ctc: 'CTC',
    per_month: 'Per Month',
};

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
        typeof value === 'string' ? parseFloat(value) : value,
    );
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

function parseNum(v: number | string): number {
    return typeof v === 'string' ? parseFloat(v) : v;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const STATUS_BADGE: Record<string, string> = {
    absent:             'border-red-500 text-red-600',
    half_day:           'border-orange-500 text-orange-600',
    short_leave:        'border-yellow-500 text-yellow-600',
    leave_unpaid:       'border-red-400 text-red-500',
    extra_present:      'border-green-600 text-green-700',
    extra_half_day:     'border-green-500 text-green-600',
    extra_short_leave:  'border-green-400 text-green-500',
};

const STATUS_LABEL: Record<string, string> = {
    absent:             'Absent',
    half_day:           'Half Day',
    short_leave:        'Short Leave',
    leave_unpaid:       'Unpaid Leave',
    extra_present:      'Extra Day',
    extra_half_day:     'Extra Half Day',
    extra_short_leave:  'Extra Short',
};

function fmtDay(dateStr: string): string {
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(
        new Date(dateStr + 'T00:00:00'),
    );
}

const EXTRA_STATUSES = new Set(['extra_present', 'extra_half_day', 'extra_short_leave']);

function DeductionBreakdown({ entries, perDay }: { entries: SalaryBreakdownEntry[]; perDay: number }) {
    const deductions = entries.filter((e) => !EXTRA_STATUSES.has(e.status));
    const extras     = entries.filter((e) =>  EXTRA_STATUSES.has(e.status));
    const totalDeduction = deductions.reduce((s, e) => s + e.deduction, 0);
    const totalExtra     = extras.reduce((s, e) => s + e.earned, 0);

    if (entries.length === 0) {
        return (
            <div className="text-muted-foreground px-4 py-3 text-xs">
                No deductions — full salary earned.
            </div>
        );
    }

    return (
        <div className="bg-muted/40 border-t px-4 py-3 space-y-3">
            {deductions.length > 0 && (
                <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Deductions</p>
                    <div className="space-y-1.5">
                        {deductions.map((e) => (
                            <div key={e.date} className="flex items-center justify-between gap-4 text-xs">
                                <span className="w-28 shrink-0 font-medium">{fmtDay(e.date)}</span>
                                <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_BADGE[e.status]}`}>
                                    {STATUS_LABEL[e.status]}
                                </Badge>
                                <span className="text-muted-foreground flex-1 truncate">{e.reason}</span>
                                <span className="shrink-0 font-semibold text-red-600">−{formatCurrency(e.deduction)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex justify-end border-t pt-2">
                        <span className="text-xs font-semibold text-red-600">Total deducted: {formatCurrency(totalDeduction)}</span>
                    </div>
                </div>
            )}
            {extras.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-600">Add-ons</p>
                    <div className="space-y-1.5">
                        {extras.map((e) => (
                            <div key={e.date} className="flex items-center justify-between gap-4 text-xs">
                                <span className="w-28 shrink-0 font-medium">{fmtDay(e.date)}</span>
                                <Badge variant="outline" className={`shrink-0 text-[10px] ${STATUS_BADGE[e.status]}`}>
                                    {STATUS_LABEL[e.status]}
                                </Badge>
                                <span className="text-muted-foreground flex-1 truncate">{e.reason}</span>
                                <span className="shrink-0 font-semibold text-green-600">+{formatCurrency(e.earned)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex justify-end border-t pt-2">
                        <span className="text-xs font-semibold text-green-600">Total add-on: +{formatCurrency(totalExtra)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function MonthlyPayTable({ records }: { records: MonthlySalary[] }) {
    const [expanded, setExpanded] = useState<number | null>(null);

    if (records.length === 0) {
        return <p className="text-muted-foreground text-sm">No pay records yet. Salary is calculated on the 1st of each month.</p>;
    }

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-6" />
                                <TableHead>Month</TableHead>
                                <TableHead className="text-center">Working Days</TableHead>
                                <TableHead className="text-center">Present</TableHead>
                                <TableHead className="text-center">Half Day</TableHead>
                                <TableHead className="text-center">Short Leave</TableHead>
                                <TableHead className="text-center">Absent</TableHead>
                                <TableHead className="text-center">Paid Leave</TableHead>
                                <TableHead className="text-right">Earned</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((r) => {
                                const hasDeductions = (r.breakdown ?? []).length > 0;
                                const isExpanded = expanded === r.id;
                                const workingDays = r.working_days || r.total_days;
                                const perDay = workingDays > 0 ? parseNum(r.per_month_salary) / workingDays : 0;

                                return (
                                    <>
                                        <TableRow
                                            key={r.id}
                                            className={hasDeductions ? 'cursor-pointer hover:bg-muted/50' : ''}
                                            onClick={() => hasDeductions && setExpanded(isExpanded ? null : r.id)}
                                        >
                                            <TableCell className="pr-0">
                                                {hasDeductions && (
                                                    isExpanded
                                                        ? <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                                                        : <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {MONTH_NAMES[r.month - 1]} {r.year}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground text-sm">{workingDays}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-green-500 text-green-600">{r.days_present + (r.days_extra || 0)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-orange-500 text-orange-600">{r.days_half_day}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-yellow-500 text-yellow-600">{r.days_short_leave}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-red-500 text-red-600">{r.days_absent}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="border-blue-500 text-blue-600">{r.days_leave_paid ?? 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(parseNum(r.gross_earned))}</TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <a
                                                    href={route('remuneration.slip', { monthlySalary: r.id })}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Print Salary Slip"
                                                >
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                </a>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <tr key={`${r.id}-breakdown`}>
                                                <td colSpan={10} className="p-0">
                                                    <DeductionBreakdown entries={r.breakdown ?? []} perDay={perDay} />
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Remuneration({ salary, history, monthly_pay }: Props) {
    const ctc = salary ? parseNum(salary.ctc) : null;
    const perMonth = salary ? parseNum(salary.per_month) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Remuneration" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">Remuneration</h1>
                    <p className="text-muted-foreground text-sm">Your current compensation details</p>
                </div>

                {/* CTC + Per Month cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Annual CTC</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ctc != null ? (
                                <p className="text-3xl font-bold">{formatCurrency(ctc)}</p>
                            ) : (
                                <p className="text-muted-foreground text-lg">Not set yet</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Per Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {perMonth != null ? (
                                <p className="text-3xl font-bold">{formatCurrency(perMonth)}</p>
                            ) : (
                                <p className="text-muted-foreground text-lg">Not set yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly pay records */}
                <div className="space-y-3">
                    <div>
                        <h2 className="text-base font-semibold">Monthly Pay</h2>
                        <p className="text-muted-foreground text-sm">
                            {monthly_pay.length > 0
                                ? `Pay for ${MONTH_NAMES[monthly_pay[0].month - 1]} ${monthly_pay[0].year}: ${formatCurrency(parseNum(monthly_pay[0].gross_earned))}`
                                : 'Calculated on the 1st of each month based on your attendance'}
                        </p>
                    </div>
                    <MonthlyPayTable records={monthly_pay} />
                </div>

                {/* Hike / revision history */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold">Revision History</h2>

                    {history.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No salary revisions on record yet.</p>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Field</TableHead>
                                                <TableHead>Change</TableHead>
                                                <TableHead>CTC</TableHead>
                                                <TableHead>Per Month</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {history.map((h) => {
                                                const isIncrease =
                                                    h.changed_field === 'ctc'
                                                        ? parseNum(h.new_ctc) >= parseNum(h.old_ctc)
                                                        : parseNum(h.new_per_month) >= parseNum(h.old_per_month);

                                                const isInitial = parseNum(h.old_ctc) === 0 && parseNum(h.old_per_month) === 0;

                                                const changeLabel = isInitial ? '—' : (() => {
                                                    if (h.change_type === 'absolute') {
                                                        const newVal = h.changed_field === 'ctc' ? h.new_ctc : h.new_per_month;
                                                        return `Set to ${formatCurrency(parseNum(newVal))}`;
                                                    }
                                                    const sign = h.direction === 'increase' ? '+' : '−';
                                                    const val = parseNum(h.change_value);
                                                    if (h.change_type === 'percentage') {
                                                        return `${sign}${val % 1 === 0 ? val : val.toFixed(2)}%`;
                                                    }
                                                    return `${sign}${formatCurrency(val)}`;
                                                })();

                                                return (
                                                    <TableRow key={h.id}>
                                                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                                            {formatDate(h.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {fieldLabels[h.changed_field]}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isInitial ? (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            ) : (
                                                                <span className={`flex items-center gap-1 text-xs font-medium ${isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                                    {changeLabel}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {isInitial ? (
                                                                formatCurrency(parseNum(h.new_ctc))
                                                            ) : (
                                                                <>
                                                                    <span className="text-muted-foreground">{formatCurrency(parseNum(h.old_ctc))}</span>
                                                                    {' → '}
                                                                    <span className="font-medium">{formatCurrency(parseNum(h.new_ctc))}</span>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {isInitial ? (
                                                                formatCurrency(parseNum(h.new_per_month))
                                                            ) : (
                                                                <>
                                                                    <span className="text-muted-foreground">{formatCurrency(parseNum(h.old_per_month))}</span>
                                                                    {' → '}
                                                                    <span className="font-medium">{formatCurrency(parseNum(h.new_per_month))}</span>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
