import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Deferred, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type State } from './contacts-tab';

type LogStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RateRequestLog {
    id: number;
    user_name: string | null;
    user_email: string | null;
    state_id: number;
    state_code: string | null;
    state_name: string | null;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: LogStatus;
    created_at: string;
}

interface Props {
    logs?: Paginator<RateRequestLog>;
    filters?: { state_id: string | number; status: string; search: string };
    states?: State[];
}

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

const ALL_STATUSES: LogStatus[] = ['queued', 'processing', 'completed', 'failed'];

export default function SentRequestsTab({ logs, filters, states }: Props) {
    const hasFilters = !!filters;

    const [stateFilter, setStateFilter] = useState(filters?.state_id ? String(filters.state_id) : '');
    const [statusFilter, setStatusFilter] = useState(filters?.status ?? '');
    const [search, setSearch] = useState(filters?.search ?? '');

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef(search);
    searchRef.current = search;
    const stateFilterRef = useRef(stateFilter);
    stateFilterRef.current = stateFilter;
    const statusFilterRef = useRef(statusFilter);
    statusFilterRef.current = statusFilter;

    function pushFilters(overrides: Partial<{ state_id: string; status: string; search: string }> = {}) {
        router.get(
            route('rate-requests.history'),
            {
                state_id: stateFilterRef.current,
                status: statusFilterRef.current,
                search: searchRef.current,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    }

    useEffect(() => {
        if (!hasFilters) return;
        pushFilters({ state_id: stateFilter });
    }, [stateFilter]);

    useEffect(() => {
        if (!hasFilters) return;
        pushFilters({ status: statusFilter });
    }, [statusFilter]);

    useEffect(() => {
        if (!hasFilters) return;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => pushFilters({ search }), 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    const columns: Column<RateRequestLog>[] = [
        {
            key: 'user_name',
            header: 'Sent By',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.user_name ?? '—'}</p>
                    {r.user_email && <p className="text-muted-foreground text-xs">{r.user_email}</p>}
                </div>
            ),
        },
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
                r.failed_count > 0 ? (
                    <span className="text-destructive">{r.failed_count}</span>
                ) : (
                    <span className="text-muted-foreground">0</span>
                ),
        },
        {
            key: 'created_at',
            header: 'Sent On',
            render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
        },
    ];

    return (
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base font-semibold">
                        All Sent Requests {logs?.total !== undefined && `(${logs.total})`}
                    </CardTitle>
                    {hasFilters && (
                        <div className="flex items-center gap-2">
                            <Select value={stateFilter || 'all'} onValueChange={(v) => setStateFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="All states" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All states</SelectItem>
                                    {states?.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.state_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {ALL_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {statusLabel[s]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative w-56">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search by user…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <Deferred data="logs" fallback={<DataTableSkeleton columns={7} rows={10} />}>
                    <DataTable
                        columns={columns}
                        paginator={logs!}
                        rowKey={(r) => r.id}
                        emptyMessage="No rate requests have been sent yet."
                    />
                </Deferred>
            </CardContent>
        </Card>
    );
}
