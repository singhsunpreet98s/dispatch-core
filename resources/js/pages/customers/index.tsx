import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Customer {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface Props {
    customers?: Paginator<Customer>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Customers', href: '/customers' },
];

type FormMode = 'create' | 'edit';

interface CustomerFormData {
    name: string;
    email: string;
    [key: string]: string;
}

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

export default function CustomersIndex({ customers }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [mode, setMode] = useState<FormMode>('create');
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

    const form = useForm<CustomerFormData>({ name: '', email: '' });
    const deleteForm = useForm({});

    function openCreate() {
        form.reset();
        form.clearErrors();
        setEditingCustomer(null);
        setMode('create');
        setSheetOpen(true);
    }

    function openEdit(customer: Customer) {
        form.setData({ name: customer.name, email: customer.email });
        form.clearErrors();
        setEditingCustomer(customer);
        setMode('edit');
        setSheetOpen(true);
    }

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.reset();
            form.clearErrors();
            setSheetOpen(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === 'create') {
            form.post(route('customers.store'), { onSuccess: () => setSheetOpen(false) });
        } else if (editingCustomer) {
            form.put(route('customers.update', editingCustomer.id), { onSuccess: () => setSheetOpen(false) });
        }
    }

    function handleDelete() {
        if (!deletingCustomer) return;
        deleteForm.delete(route('customers.destroy', deletingCustomer.id), {
            onSuccess: () => setDeleteDialogOpen(false),
        });
    }

    const columns: Column<Customer>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (c) => <span className="font-medium">{c.name}</span>,
        },
        {
            key: 'email',
            header: 'Email',
            render: (c) => <span className="text-muted-foreground">{c.email}</span>,
        },
        {
            key: 'created_at',
            header: 'Added',
            render: (c) => <span className="text-muted-foreground">{formatDate(c.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (c) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                            setDeletingCustomer(c);
                            setDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Customers</h1>
                        <p className="text-muted-foreground text-sm">Manage customer contacts</p>
                    </div>
                    <Button onClick={openCreate} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Customer
                    </Button>
                </div>

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">
                            All Customers {customers?.total !== undefined && `(${customers.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <Deferred data="customers" fallback={<DataTableSkeleton columns={4} rows={10} />}>
                            <DataTable
                                columns={columns}
                                paginator={customers!}
                                rowKey={(c) => c.id}
                                emptyMessage="No customers yet. Add the first customer to get started."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Create / Edit sheet */}
            <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{mode === 'create' ? 'New Customer' : 'Edit Customer'}</SheetTitle>
                        <SheetDescription>
                            {mode === 'create'
                                ? 'Fill in the details below to add a new customer.'
                                : `Editing ${editingCustomer?.name}.`}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Full name"
                                autoFocus
                            />
                            {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="customer@example.com"
                            />
                            {form.errors.email && <p className="text-destructive text-xs">{form.errors.email}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            {form.processing ? 'Saving…' : mode === 'create' ? 'Add Customer' : 'Save Changes'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Customer</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete <span className="text-foreground font-medium">{deletingCustomer?.name}</span>? This action
                        cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
