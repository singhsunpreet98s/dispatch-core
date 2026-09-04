import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { FLAGS, useFeatureFlags } from '@/hooks/use-feature-flags';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Banknote,
    CalendarClock,
    ClipboardList,
    Clock,
    FileSpreadsheet,
    FileText,
    Filter,
    LayoutGrid,
    Mail,
    MailOpen,
    MailX,
    Package,
    Send,
    Settings2,
    ShieldX,
    Upload,
    UserRound,
    Users,
    Zap,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const role = auth.user?.role;
    const { isEnabled } = useFeatureFlags();
    const attendanceEnabled = isEnabled(FLAGS.ATTENDANCE);
    const salaryEnabled = isEnabled(FLAGS.SALARY);
    const rateRequestEnabled = isEnabled(FLAGS.RATE_REQUEST);

    const mainNavItems: NavItem[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutGrid },
        ...(attendanceEnabled
            ? [
                  {
                      title: 'Attendance',
                      url: role === 'admin' ? '/attendance/admin' : '/attendance',
                      icon: role === 'admin' ? ClipboardList : Clock,
                  },
                  ...(role === 'admin' ? [{ title: 'Live View', url: '/attendance/live', icon: Activity }] : []),
              ]
            : []),
        { title: 'Email Lists', url: '/email-lists', icon: Upload },
        { title: 'Templates', url: '/templates', icon: FileText },
        ...(role === 'admin' || role === 'manager'
            ? [
                  {
                      title: 'Send Email',
                      url: '/campaigns',
                      icon: Send,
                      children: [
                          { title: 'Campaigns', url: '/campaigns', icon: Mail },
                          { title: 'Direct Send', url: '/direct-sends', icon: Zap },
                      ],
                  },
              ]
            : [{ title: 'Campaigns', url: '/campaigns', icon: Mail }]),
        { title: 'Schedules', url: '/schedules', icon: CalendarClock },
        { title: 'Carrier Packets', url: '/carrier-packets', icon: Package },
        { title: 'Email Filter', url: '/email-filter', icon: Filter },
        { title: 'Email Activity', url: '/emails', icon: MailOpen },
        ...(role === 'admin'
            ? [
                  {
                      title: 'Suppressions',
                      url: '/unsubscribers',
                      icon: ShieldX,
                      children: [
                          { title: 'Unsubscribers', url: '/unsubscribers', icon: MailX },
                          { title: 'Blocked Emails', url: '/blocked-emails', icon: ShieldX },
                      ],
                  },
                  ...(rateRequestEnabled ? [{ title: 'Rate Requests', url: '/rate-requests', icon: FileSpreadsheet }] : []),
                  { title: 'Customers', url: '/customers', icon: UserRound },
                  { title: 'Users', url: '/users', icon: Users },
                  { title: 'System Settings', url: '/settings/system', icon: Settings2 },
              ]
            : [
                  ...(rateRequestEnabled ? [{ title: 'Rate Requests', url: '/rate-requests/send', icon: FileSpreadsheet }] : []),
                  ...(salaryEnabled ? [{ title: 'Remuneration', url: '/remuneration', icon: Banknote }] : []),
              ]),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="cursor-default hover:bg-transparent! active:bg-transparent!">
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
