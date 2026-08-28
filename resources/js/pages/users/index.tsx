import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { FLAGS, useFeatureFlags } from '@/hooks/use-feature-flags';
import { Banknote, Check, ChevronsUpDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Role = 'admin' | 'manager' | 'user';

interface SendGridSender {
    id: number;
    from_email: string;
    from_name: string;
}

interface User {
    id: number;
    name: string;
    other_name: string | null;
    designation: string | null;
    system_id: string | null;
    email: string;
    role: Role;
    sendgrid_contact_id: string | null;
    two_factor_confirmed_at: string | null;
    mfa_required: boolean;
    created_at: string;
}

interface Props {
    users?: Paginator<User>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Users', href: '/users' },
];

const roleVariant = (role: Role): 'default' | 'secondary' | 'outline' => {
    if (role === 'admin') return 'default';
    if (role === 'manager') return 'secondary';
    return 'outline';
};

const roleLabel: Record<Role, string> = { admin: 'Admin', manager: 'Manager', user: 'User' };

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

type FormMode = 'create' | 'edit';

interface UserFormData {
    name: string;
    other_name: string;
    designation: string;
    system_id: string;
    email: string;
    password: string;
    role: Role;
    sendgrid_contact_id: string;
    mfa_required: boolean;
    [key: string]: string | boolean;
}

export default function UsersIndex({ users }: Props) {
    const { isEnabled } = useFeatureFlags();
    const salaryEnabled = isEnabled(FLAGS.SALARY);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [mode, setMode] = useState<FormMode>('create');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const [senders, setSenders] = useState<SendGridSender[]>([]);
    const [sendersLoading, setSendersLoading] = useState(false);
    const sendersLoaded = useRef(false);

    const [senderOpen, setSenderOpen] = useState(false);

    useEffect(() => {
        if (!sheetOpen || sendersLoaded.current) return;
        setSendersLoading(true);
        fetch(route('users.senders'))
            .then((r) => r.json())
            .then((data: SendGridSender[]) => {
                setSenders(data);
                sendersLoaded.current = true;
            })
            .catch(() => {})
            .finally(() => setSendersLoading(false));
    }, [sheetOpen]);

    const form = useForm<UserFormData>({
        name: '',
        other_name: '',
        designation: '',
        system_id: '',
        email: '',
        password: '',
        role: 'user',
        sendgrid_contact_id: '',
        mfa_required: false,
    });

    const deleteForm = useForm({});

    function openCreate() {
        form.reset();
        form.clearErrors();
        setEditingUser(null);
        setMode('create');
        setSheetOpen(true);
    }

    function openEdit(user: User) {
        form.setData({
            name: user.name,
            other_name: user.other_name ?? '',
            designation: user.designation ?? '',
            system_id: user.system_id ?? '',
            email: user.email,
            password: '',
            role: user.role,
            sendgrid_contact_id: user.sendgrid_contact_id ?? '',
            mfa_required: user.mfa_required,
        });
        form.clearErrors();
        setEditingUser(user);
        setMode('edit');
        setSheetOpen(true);
    }

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.reset();
            form.clearErrors();
            setSenderOpen(false);
            setSheetOpen(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (mode === 'create') {
            form.post(route('users.store'), { onSuccess: () => setSheetOpen(false) });
        } else if (editingUser) {
            form.put(route('users.update', editingUser.id), { onSuccess: () => setSheetOpen(false) });
        }
    }

    function handleDelete() {
        if (!deletingUser) return;
        deleteForm.delete(route('users.destroy', deletingUser.id), {
            onSuccess: () => setDeleteDialogOpen(false),
        });
    }

    const columns: Column<User>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (u) => <span className="font-medium">{u.name}</span>,
        },
        {
            key: 'email',
            header: 'Email',
            render: (u) => <span className="text-muted-foreground">{u.email}</span>,
        },
        {
            key: 'role',
            header: 'Role',
            render: (u) => <Badge variant={roleVariant(u.role)}>{roleLabel[u.role]}</Badge>,
        },
        {
            key: 'sendgrid_contact_id',
            header: 'SendGrid Contact ID',
            render: (u) =>
                u.sendgrid_contact_id ? (
                    <span className="font-mono text-xs">{u.sendgrid_contact_id}</span>
                ) : (
                    <span className="text-muted-foreground italic">Not set</span>
                ),
        },
        {
            key: 'mfa_status',
            header: 'MFA',
            render: (u) => {
                if (u.two_factor_confirmed_at) {
                    return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Enabled</Badge>;
                }
                if (u.mfa_required) {
                    return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Required</Badge>;
                }
                return <span className="text-muted-foreground text-xs">Not set up</span>;
            },
        },
        {
            key: 'created_at',
            header: 'Joined',
            render: (u) => <span className="text-muted-foreground">{formatDate(u.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (u) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    {salaryEnabled && u.role !== 'admin' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.visit(route('users.salary.show', u.id))}
                            title="Manage Salary"
                        >
                            <Banknote className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                            setDeletingUser(u);
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
            <Head title="Users" />

            <div className="flex flex-1 flex-col min-h-0 gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Users</h1>
                        <p className="text-muted-foreground text-sm">Manage user accounts and permissions</p>
                    </div>
                    <Button onClick={openCreate} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New User
                    </Button>
                </div>

                <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">
                            All Users {users?.total !== undefined && `(${users.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 min-h-0 p-0">
                        <Deferred data="users" fallback={<DataTableSkeleton columns={7} rows={10} />}>
                            <DataTable
                                columns={columns}
                                paginator={users!}
                                rowKey={(u) => u.id}
                                emptyMessage="No users found. Add the first user to get started."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Create / Edit sheet */}
            <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{mode === 'create' ? 'New User' : 'Edit User'}</SheetTitle>
                        <SheetDescription>
                            {mode === 'create'
                                ? 'Fill in the details below to create a new user account.'
                                : `Editing ${editingUser?.name}. Leave password blank to keep the current one.`}
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
                            <Label htmlFor="other_name">
                                Print Name
                                <span className="text-muted-foreground ml-1 text-xs">(shown on pay slip)</span>
                            </Label>
                            <Input
                                id="other_name"
                                value={form.data.other_name}
                                onChange={(e) => form.setData('other_name', e.target.value)}
                                placeholder="Name to print on pay slip"
                            />
                            {form.errors.other_name && <p className="text-destructive text-xs">{form.errors.other_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="designation">Designation</Label>
                            <Input
                                id="designation"
                                value={form.data.designation}
                                onChange={(e) => form.setData('designation', e.target.value)}
                                placeholder="e.g. Software Engineer"
                            />
                            {form.errors.designation && <p className="text-destructive text-xs">{form.errors.designation}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="system_id">System ID</Label>
                            <Input
                                id="system_id"
                                value={form.data.system_id}
                                onChange={(e) => form.setData('system_id', e.target.value)}
                                placeholder="e.g. EMP-001"
                            />
                            {form.errors.system_id && <p className="text-destructive text-xs">{form.errors.system_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="user@example.com"
                            />
                            {form.errors.email && <p className="text-destructive text-xs">{form.errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">
                                Password
                                {mode === 'edit' && <span className="text-muted-foreground ml-1 text-xs">(leave blank to keep current)</span>}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.data.password}
                                onChange={(e) => form.setData('password', e.target.value)}
                                placeholder={mode === 'edit' ? '••••••••' : 'Password'}
                            />
                            {form.errors.password && <p className="text-destructive text-xs">{form.errors.password}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={form.data.role} onValueChange={(v) => form.setData('role', v as Role)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.role && <p className="text-destructive text-xs">{form.errors.role}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>SendGrid Sender</Label>
                            <div className="relative">
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={senderOpen}
                                    className="w-full justify-between font-normal"
                                    disabled={sendersLoading}
                                    onClick={() => setSenderOpen((o) => !o)}
                                >
                                    <span className="truncate">
                                        {sendersLoading
                                            ? 'Loading senders…'
                                            : form.data.sendgrid_contact_id
                                            ? senders.find((s) => String(s.id) === form.data.sendgrid_contact_id)?.from_name ?? form.data.sendgrid_contact_id
                                            : 'Select a sender…'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                {senderOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setSenderOpen(false)} />
                                        <div className="bg-popover text-popover-foreground absolute bottom-full left-0 right-0 z-50 mb-1 max-h-56 overflow-y-auto rounded-md border py-1 shadow-md">
                                            {senders.length === 0 && (
                                                <p className="text-muted-foreground p-3 text-center text-sm">No senders found.</p>
                                            )}
                                            <button
                                                type="button"
                                                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                                                onMouseDown={(e) => { e.preventDefault(); form.setData('sendgrid_contact_id', ''); setSenderOpen(false); }}
                                            >
                                                <Check className={`h-4 w-4 shrink-0 ${!form.data.sendgrid_contact_id ? 'opacity-100' : 'opacity-0'}`} />
                                                <span className="text-muted-foreground">None</span>
                                            </button>
                                            {senders.map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                                                    onMouseDown={(e) => { e.preventDefault(); form.setData('sendgrid_contact_id', String(s.id)); setSenderOpen(false); }}
                                                >
                                                    <Check className={`h-4 w-4 shrink-0 ${String(s.id) === form.data.sendgrid_contact_id ? 'opacity-100' : 'opacity-0'}`} />
                                                    {s.from_name}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {form.errors.sendgrid_contact_id && <p className="text-destructive text-xs">{form.errors.sendgrid_contact_id}</p>}
                        </div>

                        {mode === 'edit' && (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">Require MFA</p>
                                    <p className="text-muted-foreground text-xs">User must set up two-factor authentication before accessing the app.</p>
                                </div>
                                <Switch
                                    checked={form.data.mfa_required as boolean}
                                    onCheckedChange={(checked) => form.setData('mfa_required', checked)}
                                />
                            </div>
                        )}
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            {form.processing ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete <span className="text-foreground font-medium">{deletingUser?.name}</span>? This action cannot
                        be undone.
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
