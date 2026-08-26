import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, Link, useForm } from '@inertiajs/react';
import { Check, Copy, Eye, Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PacketStatus = 'pending' | 'opened' | 'submitted' | 'signed';

interface CarrierPacket {
    id: number;
    uuid: string;
    email: string;
    mc_number: string;
    company_name: string;
    status: PacketStatus;
    created_at: string;
    user?: { id: number; name: string; email: string };
}

interface Props {
    packets?: Paginator<CarrierPacket>;
    isAdmin: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Carrier Packets', href: '/carrier-packets' },
];

const statusConfig: Record<PacketStatus, { label: string; variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    pending:   { label: 'Pending',   variant: 'outline',   className: 'text-muted-foreground' },
    opened:    { label: 'Opened',    variant: 'secondary', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
    submitted: { label: 'Submitted', variant: 'secondary', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
    signed:    { label: 'Signed',    variant: 'secondary', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
};

function StatusBadge({ status }: { status: PacketStatus }) {
    const cfg = statusConfig[status];
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function formatDate(d: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
}

function CopyLinkButton({ uuid }: { uuid: string }) {
    const [copied, setCopied] = useState(false);
    const url = `${window.location.origin}/p/${uuid}`;

    function copy() {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <Button variant="ghost" size="icon" onClick={copy} title="Copy public link" className="text-muted-foreground hover:text-foreground">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </Button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FormData { email: string; mc_number: string; company_name: string; [key: string]: string }

export default function CarrierPacketsIndex({ packets, isAdmin }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [deleting, setDeleting] = useState<CarrierPacket | null>(null);
    const [mcLookupLoading, setMcLookupLoading] = useState(false);

    const form = useForm<FormData>({ email: '', mc_number: '', company_name: '' });
    const deleteForm = useForm({});

    async function handleMcBlur() {
        const mc = form.data.mc_number.trim();
        if (!mc || form.data.company_name) return;

        setMcLookupLoading(true);
        try {
            const res = await fetch(route('carrier-packets.lookup-mc') + `?mc=${encodeURIComponent(mc)}`);
            if (res.ok) {
                const json = await res.json();
                if (json.company_name) {
                    form.setData('company_name', json.company_name);
                }
            }
        } catch {
            // silently ignore lookup failures
        } finally {
            setMcLookupLoading(false);
        }
    }

    function openCreate() {
        form.reset();
        form.clearErrors();
        setSheetOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('carrier-packets.store'), { onSuccess: () => setSheetOpen(false) });
    }

    function handleDelete() {
        if (!deleting) return;
        deleteForm.delete(route('carrier-packets.destroy', deleting.id), {
            onSuccess: () => setDeleting(null),
        });
    }

    const columns: Column<CarrierPacket>[] = [
        {
            key: 'company',
            header: 'Company',
            render: (p) => (
                <div>
                    <p className="font-medium">{p.company_name}</p>
                    <p className="text-xs text-muted-foreground">MC# {p.mc_number}</p>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            render: (p) => <span className="text-muted-foreground">{p.email}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (p) => <StatusBadge status={p.status} />,
        },
        ...(isAdmin ? [{
            key: 'created_by',
            header: 'Created by',
            render: (p: CarrierPacket) => (
                <div>
                    <p className="text-sm font-medium">{p.user?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                </div>
            ),
        }] : []),
        {
            key: 'created_at',
            header: 'Created',
            render: (p) => <span className="text-muted-foreground">{formatDate(p.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (p) => (
                <div className="flex items-center justify-end gap-1">
                    <CopyLinkButton uuid={p.uuid} />
                    <Button variant="ghost" size="icon" asChild title="View details" className="text-muted-foreground hover:text-foreground">
                        <Link href={route('carrier-packets.show', p.id)}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleting(p)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Carrier Packets" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Carrier Packets</h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin ? 'All carrier onboarding packets' : 'Your carrier onboarding packets'}
                        </p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Packet
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {isAdmin ? 'All Packets' : 'Your Packets'}{packets?.total !== undefined && ` (${packets.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Deferred data="packets" fallback={<DataTableSkeleton columns={6} />}>
                            <DataTable
                                columns={columns}
                                paginator={packets!}
                                rowKey={(p) => p.id}
                                emptyMessage="No carrier packets yet. Click 'New Packet' to create one."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* ── Create Sheet ── */}
            <Sheet open={sheetOpen} onOpenChange={(o) => !o && !form.processing && setSheetOpen(false)}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Package className="h-4 w-4" /> New Carrier Packet
                        </SheetTitle>
                        <SheetDescription>
                            Enter the carrier's details. A unique link will be generated for them to complete the packet.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="cp-mc">MC Number</Label>
                            <Input
                                id="cp-mc"
                                value={form.data.mc_number}
                                onChange={(e) => form.setData('mc_number', e.target.value)}
                                onBlur={handleMcBlur}
                                placeholder="MC-123456"
                                autoFocus
                            />
                            {form.errors.mc_number && <p className="text-xs text-destructive">{form.errors.mc_number}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cp-company">Company Name</Label>
                            <div className="relative">
                                <Input
                                    id="cp-company"
                                    value={form.data.company_name}
                                    onChange={(e) => form.setData('company_name', e.target.value)}
                                    placeholder={mcLookupLoading ? 'Looking up carrier…' : 'Acme Trucking LLC'}
                                    disabled={mcLookupLoading}
                                    className={mcLookupLoading ? 'pr-9' : ''}
                                />
                                {mcLookupLoading && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            {form.errors.company_name && <p className="text-xs text-destructive">{form.errors.company_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cp-email">Carrier Email</Label>
                            <Input
                                id="cp-email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="dispatch@carrier.com"
                            />
                            {form.errors.email && <p className="text-xs text-destructive">{form.errors.email}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={form.processing}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            {form.processing ? 'Creating…' : 'Create Packet'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Delete Dialog ── */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Delete Carrier Packet</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Delete the packet for <span className="font-medium text-foreground">"{deleting?.company_name}"</span>?
                        All uploaded documents and signatures will be permanently removed.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
