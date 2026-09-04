import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { AttendanceCalendar } from './attendance-calendar';
import { AttendanceCharts } from './attendance-charts';
import { DailyRecordsTable } from './daily-records-table';
import { EditBreakSheet } from './edit-break-sheet';
import { fmtDate, initials } from './helpers';
import { StatTilesRow } from './stat-tiles';
import type { BreakRow, NoteItem, Props, ShiftRow } from './types';

export default function AttendanceAdminDetail({ user, shifts, dateFrom, dateTo, notes, salaryEnabled, monthlySalary }: Props) {
    const tz = ((usePage().props as { appTimezone?: string }).appTimezone) ?? 'UTC';
    const [editingBreak, setEditingBreak] = useState<BreakRow | null>(null);
    const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);

    function handleEditBreak(b: BreakRow, shift: ShiftRow) {
        setEditingBreak(b);
        setEditingShift(shift);
    }

    function handleCloseEdit() {
        setEditingBreak(null);
        setEditingShift(null);
    }

    function handleDeleteBreak(b: BreakRow) {
        if (!confirm('Delete this break?')) return;
        router.delete(route('attendance.breaks.destroy', { break: b.id }), { preserveScroll: true });
    }

    const backHref = route('attendance.admin.index') + `?date_from=${dateFrom}&date_to=${dateTo}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Attendance', href: backHref },
        { title: user.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Attendance — ${user.name}`} />
            <EditBreakSheet
                breakRow={editingBreak}
                open={editingBreak !== null}
                onClose={handleCloseEdit}
                tz={tz}
                shift={editingShift}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={backHref}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {initials(user.name)}
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold leading-tight">{user.name}</h1>
                            <p className="text-sm text-muted-foreground">{fmtDate(dateFrom)} – {fmtDate(dateTo)}</p>
                        </div>
                    </div>
                </div>

                <StatTilesRow shifts={shifts} dateFrom={dateFrom} dateTo={dateTo} salaryEnabled={salaryEnabled} monthlySalary={monthlySalary} />
                <AttendanceCharts
                    shifts={shifts}
                    rightSlot={<AttendanceCalendar shifts={shifts} dateFrom={dateFrom} dateTo={dateTo} tz={tz} notes={notes} />}
                />
                <DailyRecordsTable
                    shifts={shifts}
                    tz={tz}
                    onEditBreak={handleEditBreak}
                    onDeleteBreak={handleDeleteBreak}
                />
            </div>
        </AppLayout>
    );
}
