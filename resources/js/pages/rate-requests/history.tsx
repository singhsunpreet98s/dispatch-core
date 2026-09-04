import { type Paginator } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { type State } from './tabs/contacts-tab';
import SentRequestsTab, { type RateRequestLog } from './tabs/sent-requests-tab';

interface Props {
    logs: Paginator<RateRequestLog>;
    filters: { state_id: string | number; status: string; search: string };
    states: State[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Rate Requests', href: '/rate-requests' },
    { title: 'History', href: '/rate-requests/history' },
];

export default function RateRequestsHistory({ logs, filters, states }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rate Requests History" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={route('rate-requests.index')}>
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">Sent Requests History</h1>
                        <p className="text-muted-foreground text-sm">All rate request emails that have been sent</p>
                    </div>
                </div>

                <SentRequestsTab logs={logs} filters={filters} states={states} />
            </div>
        </AppLayout>
    );
}
