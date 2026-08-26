import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type DashboardUser } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Inbox, Loader2, MailOpen, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailMessage {
    msg_id: string;
    from_email: string;
    to_email: string;
    subject: string;
    status: string;
    opens_count: number;
    clicks_count: number;
    last_event_time: string;
}

interface Filters {
    date_from: string;
    date_to: string;
    status: string;
    to_email: string;
    from_email: string;
    user_id: number | null;
}

interface Props {
    emails?: EmailMessage[];
    filters: Filters;
    isAdmin: boolean;
    users: DashboardUser[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'dropped', label: 'Dropped' },
    { value: 'processed', label: 'Processed' },
];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    delivered: 'default',
    not_delivered: 'destructive',
    pending: 'outline',
    bounced: 'destructive',
    open: 'secondary',
    click: 'secondary',
    unsubscribe: 'outline',
    group_unsubscribe: 'outline',
    spamreport: 'destructive',
    deferred: 'outline',
    block: 'destructive',
    processed: 'outline',
    dropped: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
    delivered: 'Delivered',
    not_delivered: 'Not Delivered',
    pending: 'Pending',
    bounce: 'Bounced',
    bounced: 'Bounced',
    open: 'Opened',
    click: 'Clicked',
    unsubscribe: 'Unsubscribed',
    group_unsubscribe: 'Group Unsubscribed',
    spamreport: 'Spam Report',
    deferred: 'Deferred',
    block: 'Blocked',
    processed: 'Processed',
    dropped: 'Dropped',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Emails', href: '/emails' }];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

function fmtLabel(date: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date + 'T00:00:00'));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailsIndex({ emails, filters, isAdmin, users }: Props) {
    const today = new Date().toISOString().slice(0, 10);

    const [range, setRange] = useState<DateRange | undefined>({
        from: new Date(filters.date_from + 'T00:00:00'),
        to: new Date(filters.date_to + 'T00:00:00'),
    });

    // Filter sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [draftToEmail, setDraftToEmail] = useState(filters.to_email ?? '');
    const [draftFromEmail, setDraftFromEmail] = useState(filters.from_email ?? '');
    const [draftUserId, setDraftUserId] = useState<string>(filters.user_id ? String(filters.user_id) : 'all');

    function navigate(patch: {
        date_from?: string;
        date_to?: string;
        status?: string;
        to_email?: string;
        from_email?: string;
        user_id?: number | null;
    }) {
        const next = { ...filters, ...patch };
        const params: Record<string, string | number> = {
            date_from: next.date_from,
            date_to: next.date_to,
            status: next.status,
        };
        if (next.to_email) params.to_email = next.to_email;
        if (next.from_email) params.from_email = next.from_email;
        if (next.user_id != null) params.user_id = next.user_id;
        router.get(route('emails.index'), params, { preserveState: false });
    }

    function handleRangeChange(r: DateRange | undefined) {
        setRange(r);
        if (r?.from && r?.to) {
            navigate({
                date_from: r.from.toISOString().slice(0, 10),
                date_to: r.to.toISOString().slice(0, 10),
            });
        }
    }

    function openSheet() {
        setDraftToEmail(filters.to_email ?? '');
        setDraftFromEmail(filters.from_email ?? '');
        setDraftUserId(filters.user_id ? String(filters.user_id) : 'all');
        setSheetOpen(true);
    }

    function applyFilters() {
        navigate({
            to_email: draftToEmail.trim() || undefined,
            from_email: draftFromEmail.trim() || undefined,
            user_id: draftUserId !== 'all' ? Number(draftUserId) : null,
        });
        setSheetOpen(false);
    }

    function clearAdvancedFilters() {
        setDraftToEmail('');
        setDraftFromEmail('');
        setDraftUserId('all');
        navigate({ to_email: undefined, from_email: undefined, user_id: null });
        setSheetOpen(false);
    }

    const isTodayOnly = filters.date_from === today && filters.date_to === today;

    // Count active advanced filters for the badge
    const advancedActiveCount = [filters.to_email ? 1 : 0, isAdmin && filters.from_email ? 1 : 0, isAdmin && filters.user_id ? 1 : 0].reduce(
        (a, b) => a + b,
        0,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Emails" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-semibold">
                        <MailOpen className="h-5 w-5" />
                        Email Activity
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isTodayOnly ? 'Today · Live from SendGrid' : `${fmtLabel(filters.date_from)} – ${fmtLabel(filters.date_to)} · SendGrid`}
                        {isAdmin && filters.user_id && users.find((u) => u.id === filters.user_id) && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                · {users.find((u) => u.id === filters.user_id)!.name}
                                <button onClick={() => navigate({ user_id: null })} className="hover:text-foreground" aria-label="Clear user filter">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {filters.to_email && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                · to: {filters.to_email}
                                <button
                                    onClick={() => navigate({ to_email: undefined })}
                                    className="hover:text-foreground"
                                    aria-label="Clear recipient filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {isAdmin && filters.from_email && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                · from: {filters.from_email}
                                <button
                                    onClick={() => navigate({ from_email: undefined })}
                                    className="hover:text-foreground"
                                    aria-label="Clear sender filter"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </p>
                </div>

                {/* Filters row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Status chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => navigate({ status: s.value })}
                                className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    filters.status === s.value
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-transparent',
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Right controls: date picker + filter button */}
                    <div className="flex shrink-0 items-center gap-2">
                        <DatePickerWithRange value={range} onChange={handleRangeChange} disabled={{ after: new Date() }} align="end" />
                        <Button variant="outline" size="sm" className="relative h-9 gap-1.5" onClick={openSheet}>
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                            {advancedActiveCount > 0 && (
                                <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                                    {advancedActiveCount}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                            {emails === undefined
                                ? 'Loading…'
                                : emails.length === 0
                                  ? 'No emails found'
                                  : `${emails.length.toLocaleString()} email${emails.length === 1 ? '' : 's'}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {emails === undefined ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-16">
                                <Loader2 className="h-10 w-10 animate-spin opacity-40" />
                                <p className="text-sm">Loading email activity…</p>
                            </div>
                        ) : emails.length === 0 ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-16">
                                <Inbox className="h-10 w-10 opacity-30" />
                                <p className="text-sm">No email activity for the selected period.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-medium tracking-wider uppercase">
                                            <th className="px-6 py-3">To</th>
                                            <th className="px-6 py-3">From</th>
                                            <th className="px-6 py-3">Subject</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Opens</th>
                                            <th className="px-6 py-3 text-right">Clicks</th>
                                            <th className="px-6 py-3">Last Event</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {emails.map((email) => (
                                            <tr key={email.msg_id} className="hover:bg-muted/30 transition-colors">
                                                <td className="max-w-[200px] truncate px-6 py-3 font-medium">{email.to_email}</td>
                                                <td className="text-muted-foreground max-w-[180px] truncate px-6 py-3">{email.from_email}</td>
                                                <td className="max-w-[220px] truncate px-6 py-3">
                                                    {email.subject || <span className="text-muted-foreground italic">(no subject)</span>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Badge variant={STATUS_VARIANTS[email.status] ?? 'outline'}>
                                                        {STATUS_LABELS[email.status] ?? email.status}
                                                    </Badge>
                                                </td>
                                                <td className="text-muted-foreground px-6 py-3 text-right tabular-nums">{email.opens_count ?? 0}</td>
                                                <td className="text-muted-foreground px-6 py-3 text-right tabular-nums">{email.clicks_count ?? 0}</td>
                                                <td className="text-muted-foreground px-6 py-3 whitespace-nowrap">
                                                    {formatDateTime(email.last_event_time)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Filter sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
                        {/* Delivered to */}
                        <div className="space-y-2">
                            <Label htmlFor="filter-to-email">Delivered to</Label>
                            <Input
                                id="filter-to-email"
                                placeholder="Search recipient email…"
                                value={draftToEmail}
                                onChange={(e) => setDraftToEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            />
                            <p className="text-muted-foreground text-xs">Partial match on recipient address</p>
                        </div>

                        {/* From email — admin only */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="filter-from-email">Sent from</Label>
                                <Input
                                    id="filter-from-email"
                                    placeholder="Search sender email…"
                                    value={draftFromEmail}
                                    onChange={(e) => setDraftFromEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                />
                                <p className="text-muted-foreground text-xs">Partial match on sender address</p>
                            </div>
                        )}

                        {/* Sent by — admin only */}
                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="filter-user">Sent by</Label>
                                <Select value={draftUserId} onValueChange={setDraftUserId}>
                                    <SelectTrigger id="filter-user">
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
                                <p className="text-muted-foreground text-xs">Filter by the user who sent the campaign</p>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="flex-col gap-2 border-t pt-4 sm:flex-col">
                        <Button onClick={applyFilters} className="w-full">
                            Apply Filters
                        </Button>
                        {advancedActiveCount > 0 && (
                            <Button variant="ghost" className="text-muted-foreground w-full" onClick={clearAdvancedFilters}>
                                Clear filters
                            </Button>
                        )}
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
