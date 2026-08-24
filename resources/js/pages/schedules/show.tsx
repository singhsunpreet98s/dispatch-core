import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarClock, FileText, Mail, User } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Trigger {
    id: number;
    weekday: number | null;
    time: string;
}

interface Schedule {
    id: number;
    name: string;
    type: 'daily' | 'custom';
    status: 'active' | 'paused';
    created_at: string;
    template: { id: number; title: string; subject: string } | null;
    email_list: { id: number; original_name: string; email_count: number } | null;
    triggers: Trigger[];
    user?: { id: number; name: string; email: string };
}

interface Props {
    schedule: Schedule;
    isAdmin: boolean;
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(d: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
}

function weekdayBgColor(weekday: number): string {
    const colors = [
        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    ];
    return colors[weekday] ?? colors[0];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduleShow({ schedule, isAdmin }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Schedules', href: '/schedules' },
        { title: schedule.name, href: '#' },
    ];

    const dailyTriggers = schedule.triggers.filter((t) => t.weekday === null);
    const customTriggers = schedule.triggers.filter((t) => t.weekday !== null);

    // Group custom triggers by weekday
    const byWeekday = WEEKDAYS.map((day, i) => ({
        label: day,
        index: i,
        triggers: customTriggers.filter((t) => t.weekday === i),
    })).filter((g) => g.triggers.length > 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Schedule: ${schedule.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
                        <Link href={route('schedules.index')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>

                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold">{schedule.name}</h1>
                            <Badge variant={schedule.type === 'daily' ? 'secondary' : 'outline'}>
                                {schedule.type === 'daily' ? 'Daily' : 'Custom'}
                            </Badge>
                            <Badge variant={schedule.status === 'active' ? 'default' : 'outline'}>
                                {schedule.status === 'active' ? 'Active' : 'Paused'}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Created {formatDate(schedule.created_at)}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Template card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="h-4 w-4" /> Template
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {schedule.template ? (
                                <>
                                    <p className="font-semibold">{schedule.template.title}</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">{schedule.template.subject}</p>
                                </>
                            ) : (
                                <p className="italic text-muted-foreground">Template deleted</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Email list card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Mail className="h-4 w-4" /> Email List
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {schedule.email_list ? (
                                <>
                                    <p className="font-semibold">{schedule.email_list.original_name}</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {schedule.email_list.email_count.toLocaleString()} recipients
                                    </p>
                                </>
                            ) : (
                                <p className="italic text-muted-foreground">Email list deleted</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Created by card (admin only) */}
                    {isAdmin && schedule.user && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <User className="h-4 w-4" /> Created by
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-semibold">{schedule.user.name}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">{schedule.user.email}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Triggers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <CalendarClock className="h-4 w-4" />
                            Triggers
                            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {schedule.triggers.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {schedule.triggers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No triggers configured.</p>
                        ) : schedule.type === 'daily' ? (
                            /* Daily – just a list of times */
                            <div className="flex flex-wrap gap-2">
                                {dailyTriggers.map((t) => (
                                    <div key={t.id} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2">
                                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="font-mono text-sm font-medium">{t.time}</span>
                                        <span className="text-xs text-muted-foreground">every day</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Custom – grouped by weekday */
                            <div className="space-y-4">
                                {byWeekday.map((group) => (
                                    <div key={group.index}>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${weekdayBgColor(group.index)}`}>
                                                {group.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pl-2">
                                            {group.triggers.map((t) => (
                                                <div key={t.id} className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5">
                                                    <span className="font-mono text-sm font-medium">{t.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator className="mt-4" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
