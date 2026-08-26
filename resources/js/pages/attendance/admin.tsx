import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Filter, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface UserSummaryRow {
    user: { id: number; name: string };
    days_worked: number;
    total_worked_seconds: number;
    total_break_seconds: number;
    total_breaks: number;
}

interface Props {
    summary: UserSummaryRow[];
    users: { id: number; name: string }[];
    filters: { user_id?: string | null; date_from: string; date_to: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Attendance', href: '/attendance/admin' },
];

function fmtSeconds(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function AttendanceAdmin({ summary, users, filters }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const [draftUserId, setDraftUserId] = useState<string>(filters.user_id ?? '');
    const [draftDateFrom, setDraftDateFrom] = useState(filters.date_from);
    const [draftDateTo, setDraftDateTo] = useState(filters.date_to);

    const activeUserId = filters.user_id ?? '';
    const userLabel = users.find((u) => String(u.id) === activeUserId)?.name ?? '';

    function openSheet() {
        setDraftUserId(activeUserId);
        setDraftDateFrom(filters.date_from);
        setDraftDateTo(filters.date_to);
        setSheetOpen(true);
    }

    function applyFilters() {
        setSheetOpen(false);
        router.get(
            route('attendance.admin.index'),
            {
                ...(draftUserId ? { user_id: draftUserId } : {}),
                date_from: draftDateFrom,
                date_to: draftDateTo,
            },
            { preserveState: true, replace: true },
        );
    }

    function resetFilters() {
        setSheetOpen(false);
        router.get(route('attendance.admin.index'), {}, { preserveState: false });
    }

    function removeUserChip() {
        router.get(
            route('attendance.admin.index'),
            { date_from: filters.date_from, date_to: filters.date_to },
            { preserveState: true, replace: true },
        );
    }

    function detailHref(userId: number) {
        return route('attendance.admin.show', userId) + `?date_from=${filters.date_from}&date_to=${filters.date_to}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Attendance" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">Attendance</h1>
                    <p className="text-muted-foreground text-sm">Monthly summary of attendance records</p>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <CardTitle className="text-base font-semibold">
                                {summary.length} user{summary.length !== 1 ? 's' : ''}
                            </CardTitle>

                            <div className="flex flex-wrap gap-1.5">
                                {/* Date chips — always present, no × */}
                                <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                    From: {filters.date_from}
                                </span>
                                <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                    To: {filters.date_to}
                                </span>
                                {/* User chip — optional, has × */}
                                {activeUserId && (
                                    <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        User: {userLabel}
                                        <button onClick={removeUserChip} className="hover:opacity-70 ml-0.5">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>

                        <Button variant="outline" size="sm" className="shrink-0" onClick={openSheet}>
                            <SlidersHorizontal className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 text-xs font-medium uppercase tracking-wider">
                                    <TableHead className="px-4">User</TableHead>
                                    <TableHead className="px-4">Days Worked</TableHead>
                                    <TableHead className="px-4">Total Worked</TableHead>
                                    <TableHead className="px-4">Total Break Time</TableHead>
                                    <TableHead className="px-4">Breaks</TableHead>
                                    <TableHead className="px-4 text-right">Detail</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground px-4 py-10 text-center text-sm">
                                            No attendance records for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    summary.map((row) => (
                                        <TableRow key={row.user.id}>
                                            <TableCell className="px-4 py-3 font-medium">{row.user.name}</TableCell>
                                            <TableCell className="px-4 py-3 text-sm">{row.days_worked}</TableCell>
                                            <TableCell className="px-4 py-3 font-mono text-sm">
                                                {fmtSeconds(row.total_worked_seconds)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-mono text-sm">
                                                {fmtSeconds(row.total_break_seconds)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">{row.total_breaks}</TableCell>
                                            <TableCell className="px-4 py-3 text-right">
                                                <Link href={detailHref(row.user.id)}>
                                                    <Button variant="ghost" size="sm">
                                                        Detail
                                                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Filter sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="flex w-80 flex-col gap-0 p-0">
                    <SheetHeader className="border-b px-6 py-4">
                        <SheetTitle className="flex items-center gap-2 text-base">
                            <Filter className="h-4 w-4" />
                            Filters
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                        <div className="space-y-2">
                            <Label>User</Label>
                            <Select value={draftUserId} onValueChange={setDraftUserId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All users" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {draftUserId && (
                                <button className="text-muted-foreground hover:text-foreground text-xs underline" onClick={() => setDraftUserId('')}>
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Date from</Label>
                            <Input type="date" value={draftDateFrom} onChange={(e) => setDraftDateFrom(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Date to</Label>
                            <Input type="date" value={draftDateTo} onChange={(e) => setDraftDateTo(e.target.value)} />
                        </div>
                    </div>

                    <SheetFooter className="border-t px-6 py-4">
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="mr-auto">
                            Reset to this month
                        </Button>
                        <Button size="sm" onClick={applyFilters}>
                            Apply
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
