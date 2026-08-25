import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface CommandStatus {
    label: string;
    description: string;
    last_run: string | null;
    is_running: boolean;
}

export interface QueueCounts {
    pending: number;
    processing: number;
    sent: number;
    failed: number;
}

export interface CampaignCommandStatus {
    check_schedules: CommandStatus;
    dispatch_campaigns: CommandStatus;
    queue: QueueCounts;
}

interface Props {
    commandStatus: CampaignCommandStatus;
}

function formatRelative(iso: string | null): string {
    if (!iso) return 'Never';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
}

function StatusBadge({ running }: { running: boolean }) {
    if (running) {
        return (
            <Badge className="gap-1 border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" variant="outline">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Running
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 border-zinc-300 text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            Idle
        </Badge>
    );
}

function CommandCard({ cmd }: { cmd: CommandStatus }) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
                <Activity className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                    <p className="font-mono text-sm font-medium">{cmd.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{cmd.description}</p>
                    <p className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        Last run: {formatRelative(cmd.last_run)}
                    </p>
                </div>
            </div>
            <StatusBadge running={cmd.is_running} />
        </div>
    );
}

export default function CampaignsTab({ commandStatus: initial }: Props) {
    const [status, setStatus] = useState<CampaignCommandStatus>(initial);
    const [refreshing, setRefreshing] = useState(false);

    async function refresh() {
        setRefreshing(true);
        try {
            const res = await fetch(route('system-settings.command-status'), {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                setStatus(await res.json());
            }
        } finally {
            setRefreshing(false);
        }
    }

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const id = setInterval(refresh, 30_000);
        return () => clearInterval(id);
    }, []);

    const { check_schedules, dispatch_campaigns, queue } = status;

    return (
        <div className="space-y-6">
            {/* Command status cards */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-semibold">Background Commands</CardTitle>
                        <CardDescription>
                            These artisan commands must be running via the Laravel scheduler (
                            <code className="text-xs">php artisan schedule:run</code>
                            &nbsp;every minute via cron) for scheduled campaigns to be dispatched.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="shrink-0">
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    <CommandCard cmd={check_schedules} />
                    <CommandCard cmd={dispatch_campaigns} />
                </CardContent>
            </Card>

            {/* Queue stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Dispatch Queue</CardTitle>
                    <CardDescription>Current state of the campaign dispatch queue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatTile label="Pending" value={queue.pending} icon={<Clock className="h-4 w-4 text-yellow-500" />} />
                        <StatTile label="Processing" value={queue.processing} icon={<Activity className="h-4 w-4 text-blue-500" />} />
                        <StatTile label="Sent" value={queue.sent} icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} />
                        <StatTile label="Failed" value={queue.failed} icon={<AlertCircle className="h-4 w-4 text-red-500" />} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3">
            {icon}
            <div>
                <p className="text-lg font-semibold">{value.toLocaleString()}</p>
                <p className="text-muted-foreground text-xs">{label}</p>
            </div>
        </div>
    );
}
