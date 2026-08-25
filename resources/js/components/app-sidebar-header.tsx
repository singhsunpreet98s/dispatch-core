import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-border bg-background sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between rounded-t-lg border-b px-4">
            <div className="flex items-center gap-1">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
                <div className="bg-border mx-1.5 h-4 w-px" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
