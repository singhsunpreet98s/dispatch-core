import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

function HeaderClock({ timezone }: { timezone: string }) {
    const [time, setTime] = useState('');

    useEffect(() => {
        let fmt: Intl.DateTimeFormat;
        try {
            fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            });
        } catch {
            fmt = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            });
        }

        const tick = () => setTime(fmt.format(new Date()));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [timezone]);

    if (!time) return null;

    return (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">{time}</span>
        </div>
    );
}

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { appTimezone } = usePage<SharedData>().props;

    return (
        <header className="border-border bg-background sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between rounded-t-lg border-b px-4">
            <div className="flex items-center gap-1">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
                <div className="bg-border mx-1.5 h-4 w-px" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <HeaderClock timezone={appTimezone} />
        </header>
    );
}
