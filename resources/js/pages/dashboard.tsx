import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Mail,
    MousePointerClick,
    Eye,
    TrendingDown,
    TrendingUp,
    UserMinus,
} from 'lucide-react';

interface Stats {
    requests: number;
    delivered: number;
    undelivered: number;
    opens: number;
    unique_opens: number;
    clicks: number;
    unique_clicks: number;
    bounces: number;
    spam_reports: number;
    unsubscribes: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
}

interface SingleSend {
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'triggered' | 'canceled' | string;
    send_at?: string | null;
    updated_at?: string;
}

interface Props {
    stats: Stats;
    recentCampaigns: SingleSend[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (status === 'triggered') return 'default';
    if (status === 'scheduled') return 'secondary';
    if (status === 'canceled') return 'destructive';
    return 'outline';
};

const statusLabel: Record<string, string> = {
    triggered: 'Sent',
    scheduled: 'Scheduled',
    draft: 'Draft',
    canceled: 'Canceled',
};

function StatCard({
    title,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    title: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    accent?: 'green' | 'red' | 'indigo' | 'amber' | 'muted';
}) {
    const accentBorder: Record<string, string> = {
        green:  'border-l-2 border-l-emerald-500',
        red:    'border-l-2 border-l-red-500',
        indigo: 'border-l-2 border-l-indigo-500',
        amber:  'border-l-2 border-l-amber-500',
        muted:  'border-l-2 border-l-transparent',
    };
    const iconColors: Record<string, string> = {
        green:  'text-emerald-500',
        red:    'text-red-500',
        indigo: 'text-indigo-500',
        amber:  'text-amber-500',
        muted:  'text-muted-foreground',
    };

    return (
        <Card className={`overflow-hidden ${accentBorder[accent ?? 'muted']}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className={`h-3.5 w-3.5 ${iconColors[accent ?? 'muted']}`} />
            </CardHeader>
            <CardContent className="pb-4">
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(dateStr));
}

export default function Dashboard({ stats, recentCampaigns }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Period label */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Overview</h1>
                        <p className="text-sm text-muted-foreground">Last 30 days · SendGrid stats</p>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Sent"
                        value={fmt(stats.requests)}
                        sub="emails requested"
                        icon={Mail}
                        accent="indigo"
                    />
                    <StatCard
                        title="Delivered"
                        value={fmt(stats.delivered)}
                        sub={`${stats.delivery_rate}% delivery rate`}
                        icon={CheckCircle2}
                        accent="green"
                    />
                    <StatCard
                        title="Undelivered"
                        value={fmt(stats.undelivered)}
                        sub="bounces + drops"
                        icon={TrendingDown}
                        accent="red"
                    />
                    <StatCard
                        title="Bounces"
                        value={fmt(stats.bounces)}
                        sub="hard + soft bounces"
                        icon={AlertTriangle}
                        accent="amber"
                    />
                    <StatCard
                        title="Unique Opens"
                        value={fmt(stats.unique_opens)}
                        sub={`${stats.open_rate}% open rate`}
                        icon={Eye}
                        accent="indigo"
                    />
                    <StatCard
                        title="Unique Clicks"
                        value={fmt(stats.unique_clicks)}
                        sub={`${stats.click_rate}% click rate`}
                        icon={MousePointerClick}
                        accent="green"
                    />
                    <StatCard
                        title="Spam Reports"
                        value={fmt(stats.spam_reports)}
                        icon={TrendingUp}
                        accent="red"
                    />
                    <StatCard
                        title="Unsubscribes"
                        value={fmt(stats.unsubscribes)}
                        icon={UserMinus}
                        accent="muted"
                    />
                </div>

                {/* Recent campaigns */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Recent Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentCampaigns.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                                No campaigns found. Create your first campaign to get started.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            <th className="px-6 py-3">Campaign</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Send Date</th>
                                            <th className="px-6 py-3">Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {recentCampaigns.map((campaign) => (
                                            <tr
                                                key={campaign.id}
                                                className="transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-6 py-4 font-medium">
                                                    {campaign.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={statusVariant(campaign.status)}>
                                                        {statusLabel[campaign.status] ?? campaign.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {formatDate(campaign.send_at)}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {formatDate(campaign.updated_at)}
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
