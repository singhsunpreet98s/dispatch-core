import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Salary, type SalaryHistory } from '@/types';
import { Head } from '@inertiajs/react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
    salary: Salary | null;
    history: SalaryHistory[];
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

export default function Remuneration({ salary, history }: Props) {
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
