import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Inbox, MailOpen } from 'lucide-react';
import { useState } from 'react';

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
}

interface Props {
    emails: EmailMessage[];
    filters: Filters;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
    { value: 'all',               label: 'All' },
    { value: 'delivered',         label: 'Delivered' },
    { value: 'bounce',            label: 'Bounced' },
    { value: 'open',              label: 'Opened' },
    { value: 'click',             label: 'Clicked' },
    { value: 'unsubscribe',       label: 'Unsubscribed' },
    { value: 'group_unsubscribe', label: 'Group Unsubscribed' },
    { value: 'spam_report',       label: 'Spam Reports' },
    { value: 'deferred',          label: 'Deferred' },
    { value: 'blocked',           label: 'Blocked' },
    { value: 'processed',         label: 'Processed' },
];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    delivered:         'default',
    bounce:            'destructive',
    open:              'secondary',
    click:             'secondary',
    unsubscribe:       'outline',
    group_unsubscribe: 'outline',
    spam_report:       'destructive',
    deferred:          'outline',
    blocked:           'destructive',
    processed:         'outline',
};

const STATUS_LABELS: Record<string, string> = {
    delivered:         'Delivered',
    bounce:            'Bounced',
    open:              'Opened',
    click:             'Clicked',
    unsubscribe:       'Unsubscribed',
    group_unsubscribe: 'Group Unsubscribed',
    spam_report:       'Spam Report',
    deferred:          'Deferred',
    blocked:           'Blocked',
    processed:         'Processed',
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Emails', href: '/emails' }];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
        hour:  '2-digit',
        minute:'2-digit',
    }).format(new Date(iso));
}

function fmtLabel(date: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
    }).format(new Date(date + 'T00:00:00'));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmailsIndex({ emails, filters }: Props) {
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo]     = useState(filters.date_to);

    const today = new Date().toISOString().slice(0, 10);

    function navigate(params: Partial<Filters>) {
        router.get(route('emails.index'), { ...filters, ...params }, { preserveState: false });
    }

    function handleDateChange(from: string, to: string) {
        if (from && to && to >= from) {
            navigate({ date_from: from, date_to: to });
        }
    }

    const isTodayOnly = filters.date_from === today && filters.date_to === today;

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
                        {isTodayOnly
                            ? 'Today · Live from SendGrid'
                            : `${fmtLabel(filters.date_from)} – ${fmtLabel(filters.date_to)} · SendGrid`}
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
                                        : 'border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground',
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Date range pickers */}
                    <div className="flex shrink-0 flex-wrap items-end gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="date-from" className="text-xs">From</Label>
                            <Input
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                max={dateTo}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    handleDateChange(e.target.value, dateTo);
                                }}
                                className="w-[160px]"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="date-to" className="text-xs">To</Label>
                            <Input
                                id="date-to"
                                type="date"
                                value={dateTo}
                                min={dateFrom}
                                max={today}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    handleDateChange(dateFrom, e.target.value);
                                }}
                                className="w-[160px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                            {emails.length === 0
                                ? 'No emails found'
                                : `${emails.length.toLocaleString()} email${emails.length === 1 ? '' : 's'}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {emails.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                                <Inbox className="h-10 w-10 opacity-30" />
                                <p className="text-sm">No email activity for the selected period.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                                            <tr key={email.msg_id} className="transition-colors hover:bg-muted/30">
                                                <td className="max-w-[200px] truncate px-6 py-3 font-medium">
                                                    {email.to_email}
                                                </td>
                                                <td className="max-w-[180px] truncate px-6 py-3 text-muted-foreground">
                                                    {email.from_email}
                                                </td>
                                                <td className="max-w-[220px] truncate px-6 py-3">
                                                    {email.subject || <span className="italic text-muted-foreground">(no subject)</span>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Badge variant={STATUS_VARIANTS[email.status] ?? 'outline'}>
                                                        {STATUS_LABELS[email.status] ?? email.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                                                    {email.opens_count ?? 0}
                                                </td>
                                                <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                                                    {email.clicks_count ?? 0}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-3 text-muted-foreground">
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
        </AppLayout>
    );
}
