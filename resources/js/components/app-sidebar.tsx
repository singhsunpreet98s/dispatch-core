import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CalendarClock, ClipboardList, Clock, FileText, LayoutGrid, MailOpen, Package, Settings2, Upload, Users } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const role = auth.user?.role;

    const mainNavItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
        { title: 'Attendance', url: '/attendance', icon: Clock },
        { title: 'Email Lists', url: '/email-lists', icon: Upload },
        { title: 'Templates', url: '/templates', icon: FileText },
        { title: 'Schedules', url: '/schedules', icon: CalendarClock },
        { title: 'Carrier Packets', url: '/carrier-packets', icon: Package },
        { title: 'Emails', url: '/emails', icon: MailOpen },
        ...(role === 'admin'
            ? [
                  { title: 'Attendance Admin', url: '/attendance/admin', icon: ClipboardList },
                  { title: 'Users', url: '/users', icon: Users },
                  { title: 'System Settings', url: '/settings/system', icon: Settings2 },
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent! active:bg-transparent! cursor-default">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
