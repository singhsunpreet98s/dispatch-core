import { type Column, DataTable, type Paginator } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Unsubscriber {
    id: number;
    email: string;
    user: { name: string; email: string } | null;
    created_at: string;
}

interface Props {
    unsubscribers: Paginator<Unsubscriber>;
    isAdmin: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Unsubscribers', href: '/unsubscribers' },
];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

export default function UnsubscribersIndex({ unsubscribers, isAdmin }: Props) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRecord, setDeletingRecord] = useState<Unsubscriber | null>(null);
    const deleteForm = useForm({});

    function openDelete(record: Unsubscriber) {
        setDeletingRecord(record);
        setDeleteDialogOpen(true);
    }

    function handleDelete() {
        if (!deletingRecord) return;
        deleteForm.delete(route('unsubscribers.destroy', deletingRecord.id), {
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setDeletingRecord(null);
            },
        });
    }

    const columns: Column<Unsubscriber>[] = [
        {
            key: 'email',
            header: 'Email',
            render: (r) => <span className="font-medium">{r.email}</span>,
        },
        ...(isAdmin
            ? [{
                key: 'user',
                header: 'Sent By',
                render: (r: Unsubscriber) => r.user
                    ? <span className="text-muted-foreground">{r.user.name}</span>
                    : <span className="text-muted-foreground italic">—</span>,
              } as Column<Unsubscriber>]
            : []),
        {
            key: 'created_at',
            header: 'Unsubscribed On',
            render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (r) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openDelete(r)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Unsubscribers" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-xl font-semibold">Unsubscribers</h1>
                    <p className="text-muted-foreground text-sm">
                        {isAdmin
                            ? 'All recipients who have unsubscribed from campaigns.'
                            : 'Recipients who have unsubscribed from your campaigns.'}
                    </p>
                </div>

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">
                            {isAdmin ? 'All Unsubscribers' : 'My Unsubscribers'}
                            {unsubscribers.total !== undefined && ` (${unsubscribers.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <DataTable
                            columns={columns}
                            paginator={unsubscribers}
                            rowKey={(r) => r.id}
                            emptyMessage="No unsubscribers yet."
                        />
                    </CardContent>
                </Card>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remove Unsubscribe Record</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Remove <span className="text-foreground font-medium">{deletingRecord?.email}</span> from the unsubscribe list?
                        They will be able to receive emails again.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteForm.processing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Removing…' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
