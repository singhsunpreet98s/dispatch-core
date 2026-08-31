import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, Link, router, useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Check, Copy, Eye, Filter, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

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

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface Filters {
    search?: string;
    status?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    packets?: Paginator<CarrierPacket>;
    isAdmin: boolean;
    filters: Filters;
    users: UserOption[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Carrier Packets', href: '/carrier-packets' },
];

const statusConfig: Record<PacketStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'text-muted-foreground' },
    opened: { label: 'Opened', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
    submitted: {
        label: 'Submitted',
        className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    },
    signed: {
        label: 'Signed',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
};

const STATUS_OPTIONS: { value: PacketStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'opened', label: 'Opened' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'signed', label: 'Signed' },
];

function StatusBadge({ status }: { status: PacketStatus }) {
    const cfg = statusConfig[status];
    return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
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

interface CreateFormData {
    email: string;
    mc_number: string;
    company_name: string;
    [key: string]: string;
}

export default function CarrierPacketsIndex({ packets, isAdmin, filters, users }: Props) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [deleting, setDeleting] = useState<CarrierPacket | null>(null);
    const [mcLookupLoading, setMcLookupLoading] = useState(false);

    // ── Search (debounced) ──────────────────────────────────────────────────
    const [searchValue, setSearchValue] = useState(filters.search ?? '');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            applyFilters({ search: searchValue || undefined });
        }, 400);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchValue]);

    // ── Filter sheet state (pending until Apply) ────────────────────────────
    const [draftStatus, setDraftStatus] = useState(filters.status ?? '');
    const [draftUserId, setDraftUserId] = useState(filters.user_id ?? '');
    const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(
        filters.date_from ? { from: parseISO(filters.date_from), to: filters.date_to ? parseISO(filters.date_to) : undefined } : undefined,
    );

    function openFilterSheet() {
        setDraftStatus(filters.status ?? '');
        setDraftUserId(filters.user_id ?? '');
        setDraftDateRange(
            filters.date_from ? { from: parseISO(filters.date_from), to: filters.date_to ? parseISO(filters.date_to) : undefined } : undefined,
        );
        setFilterOpen(true);
    }

    function applyFilters(patch: Partial<Filters>) {
        const next: Record<string, string> = {};
        const merged = { ...filters, ...patch };
        if (merged.search) next.search = merged.search;
        if (merged.status) next.status = merged.status;
        if (merged.user_id) next.user_id = merged.user_id;
        if (merged.date_from) next.date_from = merged.date_from;
        if (merged.date_to) next.date_to = merged.date_to;
        router.get(route('carrier-packets.index'), { ...next, page: 1 }, { preserveState: true, replace: true });
    }

    function applyFilterSheet() {
        applyFilters({
            status: draftStatus || undefined,
            user_id: draftUserId || undefined,
            date_from: draftDateRange?.from ? format(draftDateRange.from, 'yyyy-MM-dd') : undefined,
            date_to: draftDateRange?.to ? format(draftDateRange.to, 'yyyy-MM-dd') : undefined,
        });
        setFilterOpen(false);
    }

    function clearFilters() {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setSearchValue('');
        setDraftStatus('');
        setDraftUserId('');
        setDraftDateRange(undefined);
        router.get(route('carrier-packets.index'), { page: 1 }, { preserveState: true, replace: true });
        setFilterOpen(false);
    }

    const activeFilterCount = [filters.status, filters.user_id, filters.date_from, filters.date_to].filter(Boolean).length;

    // ── Create form ─────────────────────────────────────────────────────────
    const form = useForm<CreateFormData>({ email: '', mc_number: '', company_name: '' });
    const deleteForm = useForm({});

    async function handleMcBlur() {
        const mc = form.data.mc_number.trim();
        if (!mc || form.data.company_name) return;
        setMcLookupLoading(true);
        try {
            const res = await fetch(route('carrier-packets.lookup-mc') + `?mc=${encodeURIComponent(mc)}`);
            if (res.ok) {
                const json = await res.json();
                if (json.company_name) form.setData('company_name', json.company_name);
            }
        } catch {
            /* ignore */
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
        deleteForm.delete(route('carrier-packets.destroy', deleting.id), { onSuccess: () => setDeleting(null) });
    }

    // ── Columns ─────────────────────────────────────────────────────────────
    const columns: Column<CarrierPacket>[] = [
        {
            key: 'company',
            header: 'Company',
            render: (p) => (
                <div className="max-w-[180px]">
                    <p className="truncate font-medium" title={p.company_name}>
                        {p.company_name}
                    </p>
                    <p className="text-muted-foreground text-xs">MC# {p.mc_number}</p>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            render: (p) => (
                <span className="text-muted-foreground block max-w-[200px] truncate" title={p.email}>
                    {p.email}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (p) => <StatusBadge status={p.status} />,
        },
        {
            key: 'created_by',
            header: 'Created by',
            render: (p) => (
                <div className="max-w-[160px]">
                    <p className="truncate text-sm font-medium" title={p.user?.name}>
                        {p.user?.name ?? '—'}
                    </p>
                    <p className="text-muted-foreground truncate text-xs" title={p.user?.email}>
                        {p.user?.email}
                    </p>
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (p) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(p.created_at)}</span>,
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(p)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Carrier Packets" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Carrier Packets</h1>
                        <p className="text-muted-foreground text-sm">All carrier onboarding packets</p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Packet
                    </Button>
                </div>

                {/* Search + Filters row */}
                <div className="flex items-center gap-2">
                    <div className="relative max-w-sm flex-1">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            className="h-8 pl-9 text-sm"
                            placeholder="Search company or USDOT…"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                        {searchValue && (
                            <button
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                                onClick={() => {
                                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                                    setSearchValue('');
                                    applyFilters({ search: undefined });
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <Button variant="outline" size="sm" className="h-8 shrink-0 gap-2" onClick={openFilterSheet}>
                        <Filter className="h-3.5 w-3.5" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge className="flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]">{activeFilterCount}</Badge>
                        )}
                    </Button>

                    {(activeFilterCount > 0 || filters.search) && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground h-8 gap-1.5" onClick={clearFilters}>
                            <X className="h-3.5 w-3.5" /> Clear
                        </Button>
                    )}
                </div>

                {/* Table */}
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Package className="text-muted-foreground h-4 w-4" />
                            All Packets{packets?.total !== undefined && ` (${packets.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <Deferred data="packets" fallback={<DataTableSkeleton columns={6} />}>
                            <DataTable columns={columns} paginator={packets!} rowKey={(p) => p.id} compact emptyMessage="No carrier packets found." />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* ── Filter Sheet ── */}
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent side="right" className="flex flex-col sm:max-w-sm">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Filters
                        </SheetTitle>
                        <SheetDescription>Narrow down the packet list.</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={draftStatus || 'all'} onValueChange={(v) => setDraftStatus(v === 'all' ? '' : v)}>
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Created by */}
                        <div className="space-y-2">
                            <Label>Created by</Label>
                            <Select value={draftUserId || 'all'} onValueChange={(v) => setDraftUserId(v === 'all' ? '' : v)}>
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="All users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        {/* Date range */}
                        <div className="space-y-2">
                            <Label>Date range</Label>
                            <DatePickerWithRange
                                value={draftDateRange}
                                onChange={setDraftDateRange}
                                numberOfMonths={1}
                                placeholder="Pick a date range"
                                disabled={{ after: new Date() }}
                                className="w-full"
                                triggerClassName="w-full"
                            />
                            {draftDateRange && (
                                <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setDraftDateRange(undefined)}>
                                    Clear dates
                                </button>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="gap-2 border-t pt-4">
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                            Clear all
                        </Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={() => setFilterOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={applyFilterSheet}>Apply</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

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
                            <Label htmlFor="cp-mc">USDOT Number</Label>
                            <Input
                                id="cp-mc"
                                value={form.data.mc_number}
                                onChange={(e) => form.setData('mc_number', e.target.value)}
                                onBlur={handleMcBlur}
                                placeholder="1234567"
                                autoFocus
                            />
                            {form.errors.mc_number && <p className="text-destructive text-xs">{form.errors.mc_number}</p>}
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
                                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                                )}
                            </div>
                            {form.errors.company_name && <p className="text-destructive text-xs">{form.errors.company_name}</p>}
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
                            {form.errors.email && <p className="text-destructive text-xs">{form.errors.email}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            {form.processing ? 'Creating…' : 'Create Packet'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Delete Dialog ── */}
            <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Carrier Packet</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Delete the packet for <span className="text-foreground font-medium">"{deleting?.company_name}"</span>? All uploaded documents
                        and signatures will be permanently removed.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
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
