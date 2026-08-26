import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { SenderNotConfiguredBanner } from '@/components/sender-not-configured-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, router, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, FileText, Loader2, Mail, Pause, Play, Plus, Send, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CampaignRow {
    id: string;
    db_id: number;
    type: 'manual' | 'automation';
    name: string;
    subject: string;
    status: 'sending' | 'sent' | 'failed' | null;
    schedule_status: 'active' | 'paused' | null;
    template_title: string | null;
    list_name: string | null;
    contact_count: number;
    sent_at: string | null;
    created_at: string;
    user: { name: string; email: string } | null;
    error_message: string | null;
    sendgrid_id: string | null;
    triggers: { weekday: number | null; time: string }[] | null;
}

interface Template {
    id: number;
    title: string;
    subject: string;
    body: string;
}

interface EmailList {
    id: number;
    list_name: string;
    email_count: number;
    sendgrid_list_id: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface Props {
    campaigns?: Paginator<CampaignRow>;
    templates: Template[];
    emailLists: EmailList[];
    isAdmin: boolean;
    users: UserOption[];
    filters: { user_id: number | null; type: string | null };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Campaigns', href: '/campaigns' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

function ManualStatusBadge({ status }: { status: CampaignRow['status'] }) {
    if (status === 'sent')
        return (
            <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
                <CheckCircle2 className="h-3 w-3" /> Sent
            </Badge>
        );
    if (status === 'failed')
        return (
            <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-3 w-3" /> Failed
            </Badge>
        );
    return (
        <Badge
            variant="outline"
            className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
        >
            <Loader2 className="h-3 w-3 animate-spin" /> Sending
        </Badge>
    );
}

function ScheduleStatusBadge({ status }: { status: 'active' | 'paused' }) {
    if (status === 'active')
        return (
            <Badge
                variant="outline"
                className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
            >
                <Play className="h-3 w-3" /> Active
            </Badge>
        );
    return (
        <Badge
            variant="outline"
            className="gap-1 border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400"
        >
            <Pause className="h-3 w-3" /> Paused
        </Badge>
    );
}

function TypeBadge({ type }: { type: CampaignRow['type'] }) {
    if (type === 'manual')
        return (
            <Badge variant="secondary" className="gap-1 text-xs">
                <Send className="h-2.5 w-2.5" /> Manual
            </Badge>
        );
    return (
        <Badge variant="secondary" className="gap-1 text-xs">
            <CalendarClock className="h-2.5 w-2.5" /> Automation
        </Badge>
    );
}

function formatTriggers(triggers: CampaignRow['triggers']): string {
    if (!triggers || triggers.length === 0) return '—';
    return triggers
        .map((t) => {
            const time = t.time?.slice(0, 5) ?? '';
            return t.weekday !== null ? `${WEEKDAYS[t.weekday]} ${time}` : `Daily ${time}`;
        })
        .join(', ');
}

type TypeFilter = 'all' | 'manual' | 'automation';

export default function CampaignsIndex({ campaigns, templates, emailLists, isAdmin, users, filters }: Props) {
    const { flash, auth } = usePage<SharedData>().props;
    const senderConfigured = !!auth.user.sendgrid_contact_id;

    const [sendOpen, setSendOpen] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedList, setSelectedList] = useState<EmailList | null>(null);

    const activeTypeFilter: TypeFilter = (filters.type as TypeFilter) ?? 'all';

    const form = useForm<{ name: string; template_id: string; email_list_id: string }>({
        name: '',
        template_id: '',
        email_list_id: '',
    });

    useEffect(() => {
        if (flash?.success && sendOpen) {
            form.reset();
            setSelectedTemplate(null);
            setSelectedList(null);
            setSendError(null);
            setSendOpen(false);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error && sendOpen) setSendError(flash.error);
    }, [flash?.error]);

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.name.trim() || !form.data.template_id || !form.data.email_list_id) return;
        setSendError(null);
        form.post(route('campaigns.store'));
    }

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.reset();
            form.clearErrors();
            setSelectedTemplate(null);
            setSelectedList(null);
            setSendError(null);
            setSendOpen(false);
        }
    }

    function applyFilter(patch: { user_id?: number | null; type?: string | null }) {
        router.get(
            route('campaigns.index'),
            { ...filters, ...patch, page: 1 },
            {
                preserveState: true,
                replace: true,
            },
        );
    }

    const columns: Column<CampaignRow>[] = [
        {
            key: 'name',
            header: 'Campaign',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                        {c.type === 'manual' ? (
                            <Send className="text-muted-foreground h-4 w-4" />
                        ) : (
                            <CalendarClock className="text-muted-foreground h-4 w-4" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{c.subject}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (c) => <TypeBadge type={c.type} />,
        },
        {
            key: 'status',
            header: 'Status',
            render: (c) => (
                <div className="flex flex-col gap-1">
                    {c.type === 'manual' && c.status && <ManualStatusBadge status={c.status} />}
                    {c.type === 'automation' && c.schedule_status && <ScheduleStatusBadge status={c.schedule_status} />}
                    {c.type === 'automation' && c.triggers && <p className="text-muted-foreground text-xs">{formatTriggers(c.triggers)}</p>}
                    {c.status === 'failed' && c.error_message && <p className="text-destructive line-clamp-2 max-w-48 text-xs"></p>}
                </div>
            ),
        },
        {
            key: 'template',
            header: 'Template',
            render: (c) => (
                <div className="flex items-center gap-1.5">
                    <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm">{c.template_title ?? '—'}</span>
                </div>
            ),
        },
        {
            key: 'list',
            header: 'List',
            render: (c) => (
                <div className="flex flex-col">
                    <span className="text-sm">{c.list_name ?? '—'}</span>
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        {c.contact_count.toLocaleString()} contacts
                    </div>
                </div>
            ),
        },
        ...(isAdmin
            ? [
                  {
                      key: 'user',
                      header: 'By',
                      render: (c: CampaignRow) => (
                          <div className="flex flex-col">
                              <span className="text-sm font-medium">{c.user?.name ?? '—'}</span>
                              <span className="text-muted-foreground text-xs">{c.user?.email}</span>
                          </div>
                      ),
                  },
              ]
            : []),
        {
            key: 'created_at',
            header: 'Date',
            render: (c) => (
                <div className="flex items-center gap-1.5">
                    <Clock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    <span className="text-muted-foreground text-sm">{c.sent_at ? formatDate(c.sent_at) : formatDate(c.created_at)}</span>
                </div>
            ),
        },
    ];

    const canSend = senderConfigured && templates.length > 0 && emailLists.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Campaigns" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Campaigns</h1>
                        <p className="text-muted-foreground text-sm">Manual sends and automated schedules in one view</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setSendOpen(true)}
                        disabled={!canSend}
                        title={
                            !senderConfigured
                                ? 'Sender ID not configured'
                                : !canSend
                                  ? 'You need at least one template and one synced email list'
                                  : undefined
                        }
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Campaign
                    </Button>
                </div>

                {/* Sender not configured warning */}
                {!senderConfigured && <SenderNotConfiguredBanner isAdmin={isAdmin} />}

                {/* Prerequisite nudge */}
                {senderConfigured && !canSend && (
                    <div className="bg-muted/40 flex items-start gap-3 rounded-lg border border-dashed p-4">
                        <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium">Before you can send a manual campaign:</p>
                            <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-4">
                                {templates.length === 0 && <li>Create at least one email template</li>}
                                {emailLists.length === 0 && <li>Upload and sync at least one email list to SendGrid</li>}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Type tabs */}
                    <div className="bg-muted flex items-center rounded-lg p-1 text-sm">
                        {(['all', 'manual', 'automation'] as TypeFilter[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => applyFilter({ type: t === 'all' ? null : t })}
                                className={`rounded-md px-3 py-1 capitalize transition-colors ${
                                    activeTypeFilter === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Admin user filter */}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Select
                                value={filters.user_id ? String(filters.user_id) : 'all'}
                                onValueChange={(v) => applyFilter({ user_id: v === 'all' ? null : Number(v) })}
                            >
                                <SelectTrigger className="h-8 w-52 text-sm">
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
                            {filters.user_id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => applyFilter({ user_id: null })}
                                    title="Clear user filter"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            {isAdmin ? 'All Campaigns' : 'Your Campaigns'}
                            {campaigns?.total !== undefined && ` (${campaigns.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Deferred data="campaigns" fallback={<DataTableSkeleton columns={isAdmin ? 8 : 7} />}>
                            <DataTable
                                columns={columns}
                                paginator={campaigns!}
                                rowKey={(c) => c.id}
                                emptyMessage="No campaigns found. Send a manual campaign or set up a schedule."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Send sheet */}
            <Sheet open={sendOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>New Campaign</SheetTitle>
                        <SheetDescription>Choose a template and a contact list. The email is dispatched to SendGrid immediately.</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSend} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="campaign-name">
                                Campaign Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="campaign-name"
                                placeholder="e.g. August Newsletter"
                                value={form.data.name}
                                onChange={(e) => {
                                    form.setData('name', e.target.value);
                                    setSendError(null);
                                }}
                                disabled={form.processing}
                            />
                            {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>
                                Template <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.data.template_id}
                                onValueChange={(id) => {
                                    form.setData('template_id', id);
                                    setSelectedTemplate(templates.find((t) => String(t.id) === id) ?? null);
                                }}
                                disabled={form.processing}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.template_id && <p className="text-destructive text-xs">{form.errors.template_id}</p>}
                            {selectedTemplate && (
                                <div className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
                                    <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium">Subject</p>
                                        <p className="text-muted-foreground truncate text-xs">{selectedTemplate.subject}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>
                                Contact List <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.data.email_list_id}
                                onValueChange={(id) => {
                                    form.setData('email_list_id', id);
                                    setSelectedList(emailLists.find((l) => String(l.id) === id) ?? null);
                                }}
                                disabled={form.processing}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a contact list…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {emailLists.map((l) => (
                                        <SelectItem key={l.id} value={String(l.id)}>
                                            {l.list_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.email_list_id && <p className="text-destructive text-xs">{form.errors.email_list_id}</p>}
                            {selectedList && (
                                <div className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
                                    <Mail className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium">{selectedList.list_name}</p>
                                        <p className="text-muted-foreground text-xs">{selectedList.email_count.toLocaleString()} contacts</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {sendError && (
                            <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-md border px-3 py-2.5">
                                <span className="text-destructive mt-0.5 shrink-0">⚠</span>
                                <p className="text-destructive text-sm">{sendError}</p>
                            </div>
                        )}

                        {selectedTemplate && selectedList && !sendError && (
                            <div className="bg-muted/30 space-y-1 rounded-lg border p-4 text-xs">
                                <p className="text-foreground font-medium">Ready to send</p>
                                <p className="text-muted-foreground">
                                    <span className="text-foreground font-medium">{selectedTemplate.subject}</span> will be sent to{' '}
                                    <span className="text-foreground font-medium">{selectedList.email_count.toLocaleString()}</span> contacts in{' '}
                                    <span className="text-foreground font-medium">{selectedList.list_name}</span>.
                                </p>
                            </div>
                        )}
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!form.data.name.trim() || !form.data.template_id || !form.data.email_list_id || form.processing}
                            onClick={handleSend}
                        >
                            {form.processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" /> Send Campaign
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
