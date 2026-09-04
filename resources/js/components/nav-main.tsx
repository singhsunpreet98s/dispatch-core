import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

function isItemActive(url: string, currentPath: string, exact?: boolean, children?: NavItem[]) {
    if (children) return children.some((c) => currentPath === c.url || currentPath.startsWith(c.url + '/'));
    return exact ? currentPath === url : currentPath === url || currentPath.startsWith(url + '/');
}

function GroupedNavItem({ item, currentPath }: { item: NavItem; currentPath: string }) {
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const isActive = isItemActive(item.url, currentPath, item.exact, item.children);
    const children = item.children!;

    if (isCollapsed) {
        return (
            <SidebarMenuItem>
                <Popover>
                    <PopoverTrigger asChild>
                        <SidebarMenuButton
                            tooltip={item.title}
                            isActive={isActive}
                            style={isActive ? { backgroundColor: 'var(--primary)', color: 'white' } : undefined}
                            className="cursor-pointer"
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={10}
                        className="w-auto p-0 overflow-hidden"
                        style={{
                            borderRadius: '8px',
                            border: '1px solid var(--ng-border)',
                            background: 'var(--ng-bg)',
                            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
                            minWidth: '160px',
                        }}
                    >
                        <style>{`
                            :root {
                                --ng-bg: #ffffff;
                                --ng-border: #e4e4e7;
                                --ng-hover: #f4f4f5;
                                --ng-text: #18181b;
                                --ng-icon: #71717a;
                                --ng-active-bg: color-mix(in srgb, var(--primary) 10%, transparent);
                                --ng-active-text: var(--primary);
                                --ng-active-icon: var(--primary);
                            }
                            @media (prefers-color-scheme: dark) {
                                :root:not([data-theme="light"]) {
                                    --ng-bg: #1c1c1e;
                                    --ng-border: #2d2d2f;
                                    --ng-hover: #27272a;
                                    --ng-text: #fafafa;
                                    --ng-icon: #71717a;
                                    --ng-active-bg: color-mix(in srgb, var(--primary) 15%, transparent);
                                    --ng-active-text: var(--primary);
                                    --ng-active-icon: var(--primary);
                                }
                            }
                            :root[data-theme="dark"] {
                                --ng-bg: #1c1c1e;
                                --ng-border: #2d2d2f;
                                --ng-hover: #27272a;
                                --ng-text: #fafafa;
                                --ng-icon: #71717a;
                                --ng-active-bg: color-mix(in srgb, var(--primary) 15%, transparent);
                                --ng-active-text: var(--primary);
                                --ng-active-icon: var(--primary);
                            }
                            .ng-item {
                                display: flex;
                                align-items: center;
                                gap: 9px;
                                padding: 8px 14px;
                                text-decoration: none;
                                color: var(--ng-text);
                                font-size: 13px;
                                font-weight: 500;
                                letter-spacing: -0.005em;
                                transition: background 0.1s ease;
                                cursor: pointer;
                            }
                            .ng-item:hover { background: var(--ng-hover); }
                            .ng-item.active {
                                background: var(--ng-active-bg);
                                color: var(--ng-active-text);
                            }
                            .ng-item svg {
                                width: 15px;
                                height: 15px;
                                color: var(--ng-icon);
                                flex-shrink: 0;
                            }
                            .ng-item.active svg { color: var(--ng-active-icon); }
                            .ng-item + .ng-item {
                                border-top: 1px solid var(--ng-border);
                            }
                        `}</style>

                        {children.map((child) => {
                            const childActive = currentPath === child.url || currentPath.startsWith(child.url + '/');
                            return (
                                <Link
                                    key={child.url}
                                    href={child.url}
                                    prefetch
                                    className={`ng-item${childActive ? ' active' : ''}`}
                                >
                                    {child.icon && <child.icon />}
                                    <span>{child.title}</span>
                                </Link>
                            );
                        })}
                    </PopoverContent>
                </Popover>
            </SidebarMenuItem>
        );
    }

    return (
        <>
            {children.map((child) => {
                const childActive = currentPath === child.url || currentPath.startsWith(child.url + '/');
                return (
                    <SidebarMenuItem key={child.url}>
                        <SidebarMenuButton
                            asChild
                            isActive={childActive}
                            tooltip={child.title}
                            style={childActive ? { backgroundColor: 'var(--primary)', color: 'white' } : undefined}
                        >
                            <Link href={child.url} prefetch>
                                {child.icon && <child.icon />}
                                <span>{child.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </>
    );
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const currentPath = page.url.split('?')[0];

    return (
        <SidebarGroup className="px-2 py-2">
            <SidebarMenu>
                {items.map((item) => {
                    if (item.children?.length) {
                        return <GroupedNavItem key={item.title} item={item} currentPath={currentPath} />;
                    }

                    const isActive = isItemActive(item.url, currentPath, item.exact);
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={item.title}
                                style={isActive ? { backgroundColor: 'var(--primary)', color: 'white' } : undefined}
                            >
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
