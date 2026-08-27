import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Salary, type SalaryHistory } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface SalaryUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Props {
    user: SalaryUser;
    salary: Salary | null;
    history: SalaryHistory[];
}

interface FormData {
    changed_field: 'ctc' | 'per_month';
    change_type: 'percentage' | 'amount' | 'absolute';
    direction: 'increase' | 'decrease' | '';
    change_value: string;
    [key: string]: string;
}

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
        new Date(dateStr),
    );
}

const fieldLabels: Record<string, string> = {
    ctc: 'CTC',
    per_month: 'Per Month',
};

export default function UserSalary({ user, salary, history }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Users', href: '/users' },
        { title: user.name, href: `/users` },
        { title: 'Salary', href: `/users/${user.id}/salary` },
    ];

    const isFirstTime = salary === null;

    const form = useForm<FormData>({
        changed_field: 'ctc',
        change_type: 'absolute',
        direction: '',
        change_value: '',
    });

    const currentCtc = salary ? (typeof salary.ctc === 'string' ? parseFloat(salary.ctc) : salary.ctc) : 0;
    const currentPerMonth = salary
        ? typeof salary.per_month === 'string'
            ? parseFloat(salary.per_month)
            : salary.per_month
        : 0;

    // The current base value for the selected field (shown as read-only when using relative operations)
    const currentBaseValue = form.data.changed_field === 'ctc' ? currentCtc : currentPerMonth;

    const preview = useMemo(() => {
        const val = parseFloat(form.data.change_value);
        if (!form.data.change_value || isNaN(val) || val < 0) return null;

        const field = form.data.changed_field;
        const type = form.data.change_type;
        const dir = form.data.direction;

        if (type !== 'absolute' && !dir) return null;

        let newCtc = currentCtc;
        let newPerMonth = currentPerMonth;

        if (field === 'ctc') {
            if (type === 'percentage') {
                newCtc = dir === 'increase' ? currentCtc + (currentCtc * val) / 100 : currentCtc - (currentCtc * val) / 100;
            } else if (type === 'amount') {
                newCtc = dir === 'increase' ? currentCtc + val : currentCtc - val;
            } else {
                newCtc = val;
            }
            newCtc = Math.max(0, newCtc);
            newPerMonth = newCtc / 12;
        } else {
            if (type === 'percentage') {
                newPerMonth = dir === 'increase' ? currentPerMonth + (currentPerMonth * val) / 100 : currentPerMonth - (currentPerMonth * val) / 100;
            } else if (type === 'amount') {
                newPerMonth = dir === 'increase' ? currentPerMonth + val : currentPerMonth - val;
            } else {
                newPerMonth = val;
            }
            newPerMonth = Math.max(0, newPerMonth);
            newCtc = newPerMonth * 12;
        }

        return { newCtc: Math.round(newCtc * 100) / 100, newPerMonth: Math.round(newPerMonth * 100) / 100 };
    }, [form.data.changed_field, form.data.change_type, form.data.direction, form.data.change_value, currentCtc, currentPerMonth]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('users.salary.update', user.id));
    }

    const isRelative = form.data.change_type !== 'absolute';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${user.name} — Salary`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">{user.name}</h1>
                    <p className="text-muted-foreground text-sm">{user.email} · {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                </div>

                {/* Current salary summary */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">CTC (Annual)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{salary ? formatCurrency(currentCtc) : <span className="text-muted-foreground text-lg">Not set</span>}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-muted-foreground text-sm font-medium">Per Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{salary ? formatCurrency(currentPerMonth) : <span className="text-muted-foreground text-lg">Not set</span>}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Adjustment form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {isFirstTime ? 'Set Initial Salary' : 'Adjust Salary'}
                        </CardTitle>
                        {isFirstTime && (
                            <p className="text-muted-foreground text-sm">Set the starting salary for this user. Percentage and amount adjustments will be available after the initial salary is saved.</p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Field selector — hidden on first-time (always CTC which drives per_month) */}
                                {!isFirstTime && (
                                    <div className="space-y-2">
                                        <Label>Field</Label>
                                        <Select
                                            value={form.data.changed_field}
                                            onValueChange={(v) => {
                                                form.setData('changed_field', v as 'ctc' | 'per_month');
                                                form.setData('change_value', '');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ctc">CTC (Annual)</SelectItem>
                                                <SelectItem value="per_month">Per Month</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Operation — locked to "absolute" on first-time */}
                                {!isFirstTime && (
                                    <div className="space-y-2">
                                        <Label>Operation</Label>
                                        <Select
                                            value={form.data.change_type}
                                            onValueChange={(v) => {
                                                form.setData('change_type', v as 'percentage' | 'amount' | 'absolute');
                                                form.setData('direction', '');
                                                form.setData('change_value', '');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">By percentage (%)</SelectItem>
                                                <SelectItem value="amount">By amount (₹)</SelectItem>
                                                <SelectItem value="absolute">Set absolute value</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Direction — only for relative operations */}
                                {!isFirstTime && isRelative && (
                                    <div className="space-y-2">
                                        <Label>Direction</Label>
                                        <Select
                                            value={form.data.direction}
                                            onValueChange={(v) => form.setData('direction', v as 'increase' | 'decrease')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="increase">Increase</SelectItem>
                                                <SelectItem value="decrease">Decrease</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Current base value — read-only, shown only for relative operations */}
                                {!isFirstTime && isRelative && (
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">
                                            Current {fieldLabels[form.data.changed_field]}
                                        </Label>
                                        <Input
                                            type="text"
                                            value={currentBaseValue.toLocaleString('en-IN')}
                                            disabled
                                            className="bg-muted cursor-not-allowed opacity-60"
                                        />
                                    </div>
                                )}

                                {/* Value input */}
                                <div className="space-y-2">
                                    <Label>
                                        {isFirstTime
                                            ? 'Annual CTC (₹)'
                                            : form.data.change_type === 'percentage'
                                            ? 'Percentage (%)'
                                            : form.data.change_type === 'amount'
                                            ? 'Amount (₹)'
                                            : `New ${fieldLabels[form.data.changed_field]} (₹)`}
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.data.change_value}
                                        onChange={(e) => form.setData('change_value', e.target.value)}
                                    />
                                </div>
                            </div>

                            {form.errors.change_value && <p className="text-destructive text-xs">{form.errors.change_value}</p>}
                            {form.errors.changed_field && <p className="text-destructive text-xs">{form.errors.changed_field}</p>}
                            {form.errors.change_type && <p className="text-destructive text-xs">{form.errors.change_type}</p>}
                            {form.errors.direction && <p className="text-destructive text-xs">{form.errors.direction}</p>}

                            {/* Live preview */}
                            {preview && (
                                <div className="bg-muted rounded-md px-4 py-3 text-sm">
                                    <p className="text-muted-foreground mb-1 font-medium">Preview</p>
                                    <div className="flex flex-wrap gap-6">
                                        <span>
                                            CTC:{' '}
                                            {!isFirstTime && <span className="font-medium line-through opacity-50">{formatCurrency(currentCtc)}</span>}{' '}
                                            <ArrowRight className="inline h-3 w-3" />{' '}
                                            <span className="font-semibold">{formatCurrency(preview.newCtc)}</span>
                                        </span>
                                        <span>
                                            Per Month:{' '}
                                            {!isFirstTime && <span className="font-medium line-through opacity-50">{formatCurrency(currentPerMonth)}</span>}{' '}
                                            <ArrowRight className="inline h-3 w-3" />{' '}
                                            <span className="font-semibold">{formatCurrency(preview.newPerMonth)}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Applying…' : isFirstTime ? 'Set Salary' : 'Apply Change'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Salary history timeline */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold">Salary History</h2>
                    {history.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No salary changes recorded yet.</p>
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
                                                <TableHead>By</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {history.map((h) => {
                                                const isIncrease =
                                                    h.changed_field === 'ctc'
                                                        ? h.new_ctc >= h.old_ctc
                                                        : h.new_per_month >= h.old_per_month;

                                                const isInitial = Number(h.old_ctc) === 0 && Number(h.old_per_month) === 0;

                                                const changeLabel = isInitial ? '—' : (() => {
                                                    if (h.change_type === 'absolute') {
                                                        const newVal = h.changed_field === 'ctc' ? h.new_ctc : h.new_per_month;
                                                        return `Set to ${formatCurrency(Number(newVal))}`;
                                                    }
                                                    const sign = h.direction === 'increase' ? '+' : '−';
                                                    const val = Number(h.change_value);
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
                                                        <TableCell className="text-xs font-medium">{fieldLabels[h.changed_field]}</TableCell>
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
                                                                formatCurrency(Number(h.new_ctc))
                                                            ) : (
                                                                <>
                                                                    <span className="text-muted-foreground">{formatCurrency(Number(h.old_ctc))}</span>
                                                                    {' → '}
                                                                    <span className="font-medium">{formatCurrency(Number(h.new_ctc))}</span>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {isInitial ? (
                                                                formatCurrency(Number(h.new_per_month))
                                                            ) : (
                                                                <>
                                                                    <span className="text-muted-foreground">{formatCurrency(Number(h.old_per_month))}</span>
                                                                    {' → '}
                                                                    <span className="font-medium">{formatCurrency(Number(h.new_per_month))}</span>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            {h.changed_by_user?.name ?? 'Admin'}
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
