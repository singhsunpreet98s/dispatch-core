import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Deferred, Head, useForm, usePage } from '@inertiajs/react';
import { Eye, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type LogStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface State {
    id: number;
    state_code: string;
    state_name: string;
}

interface RateRequestLog {
    id: number;
    state_id: number;
    state_code: string | null;
    state_name: string | null;
    email_body: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: LogStatus;
    created_at: string;
}

interface LogEntry {
    id: number;
    to_email: string;
    company_name: string | null;
    mc_number: string | null;
    status: 'sent' | 'failed';
    error_message: string | null;
    sent_at: string | null;
}

interface LogDetail extends RateRequestLog {
    state_name: string | null;
    entries: LogEntry[];
}

interface Props {
    logs?: Paginator<RateRequestLog>;
    states: State[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Rate Requests', href: '/rate-requests/send' },
];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

const statusVariant = (status: LogStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (status === 'completed') return 'default';
    if (status === 'processing') return 'secondary';
    if (status === 'failed') return 'destructive';
    return 'outline';
};

const statusLabel: Record<LogStatus, string> = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
};

export default function RateRequestSend({ logs, states }: Props) {
    const { flash } = usePage<{ flash: { success?: string; error?: string } }>().props;

    const [sheetOpen, setSheetOpen] = useState(false);
    const sheetOpenRef = useRef(sheetOpen);
    sheetOpenRef.current = sheetOpen;

    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<LogDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    async function openDetail(log: RateRequestLog) {
        setDetailOpen(true);
        setDetail(null);
        setDetailLoading(true);
        try {
            const res = await fetch(route('rate-requests.send.show', log.id), {
                headers: { Accept: 'application/json' },
            });
            const data: LogDetail = await res.json();
            setDetail(data);
        } finally {
            setDetailLoading(false);
        }
    }

    const form = useForm<{ state_id: string; email_body: string }>({
        state_id: '',
        email_body: '',
    });
    const formRef = useRef(form);
    formRef.current = form;

    useEffect(() => {
        if (flash?.success && sheetOpenRef.current) {
            formRef.current.reset();
            setSheetOpen(false);
        }
    }, [flash?.success]);

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.reset();
            form.clearErrors();
            setSheetOpen(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('rate-requests.send.store'));
    }

    const selectedState = states.find((s) => String(s.id) === form.data.state_id);

    const columns: Column<RateRequestLog>[] = [
        {
            key: 'state_name',
            header: 'State',
            render: (r) => <span className="font-medium">{r.state_name ?? r.state_code ?? r.state_id}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => (
                <Badge variant={statusVariant(r.status)} className="capitalize">
                    {statusLabel[r.status]}
                </Badge>
            ),
        },
        {
            key: 'total_recipients',
            header: 'Recipients',
            render: (r) => (r.total_recipients > 0 ? r.total_recipients : <span className="text-muted-foreground">—</span>),
        },
        {
            key: 'sent_count',
            header: 'Sent',
            render: (r) => <span className="text-green-600 dark:text-green-400">{r.sent_count}</span>,
        },
        {
            key: 'failed_count',
            header: 'Failed',
            render: (r) =>
                r.failed_count > 0 ? <span className="text-destructive">{r.failed_count}</span> : <span className="text-muted-foreground">0</span>,
        },
        {
            key: 'created_at',
            header: 'Sent On',
            render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
        },
        {
            key: 'id',
            header: '',
            render: (r) => (
                <button
                    onClick={() => openDetail(r)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
                    title="View details"
                >
                    <Eye className="h-4 w-4" />
                </button>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rate Requests" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Rate Requests</h1>
                        <p className="text-muted-foreground text-sm">Send rate requests to carriers and brokers by state</p>
                    </div>
                    <Button size="sm" onClick={() => setSheetOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Rate Request
                    </Button>
                </div>

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">Sent Requests {logs?.total !== undefined && `(${logs.total})`}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <Deferred data="logs" fallback={<DataTableSkeleton columns={6} rows={10} />}>
                            <DataTable columns={columns} paginator={logs!} rowKey={(r) => r.id} emptyMessage="No rate requests sent yet." />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>New Rate Request</SheetTitle>
                        <SheetDescription>
                            Select a state, write your message, and send it to all contacts in that state. The email will be sent from your account.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label>State</Label>
                            <Select
                                value={form.data.state_id}
                                onValueChange={(v) => {
                                    form.setData('state_id', v);
                                    form.clearErrors('state_id');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.state_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.state_id && <p className="text-destructive text-xs">{form.errors.state_id}</p>}
                        </div>

                        {form.data.state_id && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email-body">Email Message</Label>
                                    <Textarea
                                        id="email-body"
                                        value={form.data.email_body}
                                        onChange={(e) => form.setData('email_body', e.target.value)}
                                        placeholder="Write your rate request message here…"
                                        rows={10}
                                        className="resize-none"
                                    />
                                    {form.errors.email_body && <p className="text-destructive text-xs">{form.errors.email_body}</p>}
                                    <p className="text-muted-foreground text-xs">
                                        This message will be sent to all contacts in {selectedState?.state_name} from your email address.
                                    </p>
                                </div>
                            </>
                        )}
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing || !form.data.state_id || !form.data.email_body.trim()}>
                            {form.processing ? (
                                'Sending…'
                            ) : (
                                <>
                                    <Send className="mr-1.5 h-3.5 w-3.5" />
                                    Send
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            {/* ── Detail sheet ── */}
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent side="right" className="flex flex-col sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>Rate Request Detail</SheetTitle>
                        <SheetDescription>
                            {detail ? `${detail.state_name ?? detail.state_code} — ${formatDate(detail.created_at)}` : ' '}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
                        {detailLoading && <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">Loading…</div>}

                        {detail && !detailLoading && (
                            <>
                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Recipients', value: detail.total_recipients },
                                        { label: 'Sent', value: detail.sent_count, className: 'text-green-600 dark:text-green-400' },
                                        { label: 'Failed', value: detail.failed_count, className: detail.failed_count > 0 ? 'text-destructive' : '' },
                                    ].map(({ label, value, className }) => (
                                        <div key={label} className="bg-muted/30 rounded-lg border px-4 py-3 text-center">
                                            <p className="text-muted-foreground text-xs">{label}</p>
                                            <p className={`text-xl font-semibold ${className ?? ''}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Status:</span>
                                    <Badge variant={statusVariant(detail.status as LogStatus)} className="capitalize">
                                        {statusLabel[detail.status as LogStatus]}
                                    </Badge>
                                </div>

                                {/* Email body */}
                                <div className="space-y-1.5">
                                    <p className="text-sm font-medium">Email Message</p>
                                    <div className="bg-muted/20 rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                                        {detail.email_body}
                                    </div>
                                </div>

                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}
