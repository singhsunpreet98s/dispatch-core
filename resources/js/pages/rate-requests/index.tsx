import { type Paginator } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { History } from 'lucide-react';
import ContactsTab, { type City, type RateRequestContact } from './tabs/contacts-tab';

interface Props {
    contacts?: Paginator<RateRequestContact>;
    filters: { city_id: string | number; search: string };
    cities: City[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Rate Requests', href: '/rate-requests' },
];

export default function RateRequestsIndex({ contacts, filters, cities }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rate Requests" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Rate Requests</h1>
                        <p className="text-muted-foreground text-sm">Manage contacts for bulk rate request emails</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('rate-requests.history')}>
                            <History className="mr-2 h-4 w-4" />
                            History
                        </Link>
                    </Button>
                </div>

                <ContactsTab contacts={contacts} filters={filters} cities={cities} />
            </div>
        </AppLayout>
    );
}
