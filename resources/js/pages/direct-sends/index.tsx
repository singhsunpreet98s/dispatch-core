import { AiEmailAssistant } from '@/components/ai-email-assistant';
import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { EmailEditor } from '@/components/email-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, useForm, usePage } from '@inertiajs/react';
import { Mail, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DirectSend {
    id: number;
    user_id: number;
    email_list_id: number;
    subject: string;
    status: 'pending' | 'sending' | 'sent' | 'failed';
    email_count: number;
    sent_count: number;
    created_at: string;
    user?: { id: number; name: string; email: string };
    email_list?: { id: number; list_name: string };
}

interface EmailListOption {
    id: number;
    list_name: string;
    email_count: number;
}

interface Props {
    directSends?: Paginator<DirectSend>;
    availableLists: EmailListOption[];
    maxRecipients: number;
    isAdmin: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Direct Send', href: '/direct-sends' },
];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    sending: 'secondary',
    sent: 'default',
    failed: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    sending: 'Sending',
    sent: 'Sent',
    failed: 'Failed',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DirectSendsIndex({ directSends, availableLists, maxRecipients, isAdmin }: Props) {
    const { flash } = usePage<SharedData>().props;

    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetError, setSheetError] = useState<string | null>(null);

    const form = useForm<{ email_list_id: string; subject: string; body: string }>({
        email_list_id: '',
        subject: '',
        body: '',
    });

    const setEditorContent = useRef<((html: string) => void) | null>(null);

    useEffect(() => {
        if (flash?.success && sheetOpen) {
            form.reset();
            setSheetOpen(false);
            setSheetError(null);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error && sheetOpen) {
            setSheetError(flash.error);
        }
    }, [flash?.error]);

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!form.data.email_list_id || !form.data.subject.trim() || !form.data.body.trim()) return;
        setSheetError(null);
        form.post(route('direct-sends.store'));
    }

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.reset();
            form.clearErrors();
            setSheetError(null);
            setSheetOpen(false);
        }
    }

    const columns: Column<DirectSend>[] = [
        {
            key: 'subject',
            header: 'Subject',
            render: (r) => (
                <div className="min-w-0">
                    <p className="max-w-[260px] truncate font-medium">{r.subject}</p>
                    <p className="text-muted-foreground text-xs">{r.email_list?.list_name ?? '—'}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => (
                <Badge variant={STATUS_VARIANTS[r.status] ?? 'outline'}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
            ),
        },
        {
            key: 'recipients',
            header: 'Recipients',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <Mail className="text-muted-foreground h-3.5 w-3.5" />
                    <span className="tabular-nums">{r.email_count.toLocaleString()}</span>
                    {r.status === 'sent' && r.sent_count > 0 && (
                        <span className="text-muted-foreground text-xs">· {r.sent_count.toLocaleString()} sent</span>
                    )}
                </div>
            ),
        },
        ...(isAdmin
            ? [
                  {
                      key: 'sent_by',
                      header: 'Sent by',
                      render: (r: DirectSend) => (
                          <div className="flex flex-col">
                              <span className="text-sm font-medium">{r.user?.name ?? '—'}</span>
                              <span className="text-muted-foreground text-xs">{r.user?.email}</span>
                          </div>
                      ),
                  },
              ]
            : []),
        {
            key: 'created_at',
            header: 'Sent at',
            render: (r) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</span>,
        },
    ];

    const noListsAvailable = availableLists.length === 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Direct Send" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold">
                            <Send className="h-5 w-5" />
                            Direct Send
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Send bulk emails via the SendGrid Email API — lists up to {maxRecipients.toLocaleString()} recipients
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setSheetOpen(true)}
                        disabled={noListsAvailable}
                        title={noListsAvailable ? `No lists with ≤${maxRecipients} recipients available` : undefined}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Send Email
                    </Button>
                </div>

                {noListsAvailable && (
                    <div className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
                        <p className="text-amber-700 dark:text-amber-300">
                            No email lists with {maxRecipients.toLocaleString()} or fewer contacts are available. Upload a smaller list or ask an admin
                            to increase the limit via <code className="font-mono text-xs">SENDGRID_MAX_DIRECT_RECIPIENTS</code>.
                        </p>
                    </div>
                )}

                {/* Table */}
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">
                            Sent Emails
                            {directSends?.total !== undefined && ` (${directSends.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <Deferred data="directSends" fallback={<DataTableSkeleton columns={isAdmin ? 5 : 4} />}>
                            <DataTable
                                columns={columns}
                                paginator={directSends!}
                                rowKey={(r) => r.id}
                                emptyMessage='No emails sent yet. Click "Send Email" to get started.'
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Send Email Sheet */}
            <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Send Email
                        </SheetTitle>
                        <SheetDescription>
                            Compose and send a bulk email to your list. Emails are sent in the background via the SendGrid Email API.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSend} className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
                        {/* List select */}
                        <div className="space-y-2 px-1">
                            <Label htmlFor="email_list_id">
                                Email List <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.data.email_list_id}
                                onValueChange={(v) => {
                                    form.setData('email_list_id', v);
                                    setSheetError(null);
                                }}
                                disabled={form.processing}
                            >
                                <SelectTrigger id="email_list_id">
                                    <SelectValue placeholder="Choose a list…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableLists.map((list) => (
                                        <SelectItem key={list.id} value={String(list.id)}>
                                            {list.list_name}
                                            <span className="text-muted-foreground ml-1.5 text-xs">({list.email_count.toLocaleString()} contacts)</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.email_list_id && <p className="text-destructive text-xs">{form.errors.email_list_id}</p>}
                        </div>

                        {/* Subject */}
                        <div className="space-y-2 px-1">
                            <Label htmlFor="subject">
                                Subject <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="subject"
                                placeholder="e.g. Your weekly update"
                                value={form.data.subject}
                                onChange={(e) => {
                                    form.setData('subject', e.target.value);
                                    setSheetError(null);
                                }}
                                disabled={form.processing}
                            />
                            {form.errors.subject && <p className="text-destructive text-xs">{form.errors.subject}</p>}
                        </div>

                        {/* Email body */}
                        <div className="space-y-2 px-1">
                            <div className="flex items-center justify-between">
                                <Label>
                                    Email Body <span className="text-destructive">*</span>
                                </Label>
                                <AiEmailAssistant
                                    currentContent={form.data.body}
                                    onResult={(html) => {
                                        form.setData('body', html);
                                        setEditorContent.current?.(html);
                                    }}
                                />
                            </div>
                            <EmailEditor
                                content={form.data.body}
                                onChange={(html) => form.setData('body', html)}
                                onEditorReady={(fn) => {
                                    setEditorContent.current = fn;
                                }}
                                placeholder="Write your email content here…"
                            />
                            {form.errors.body && <p className="text-destructive text-xs">{form.errors.body}</p>}
                        </div>

                        {/* Error banner */}
                        {sheetError && (
                            <div className="border-destructive/30 bg-destructive/10 mx-1 flex items-start gap-2 rounded-md border px-3 py-2.5">
                                <span className="text-destructive mt-0.5 shrink-0">⚠</span>
                                <p className="text-destructive text-sm">{sheetError}</p>
                            </div>
                        )}
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!form.data.email_list_id || !form.data.subject.trim() || !form.data.body.trim() || form.processing}
                            onClick={handleSend}
                        >
                            {form.processing ? 'Queuing…' : 'Send Emails'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
