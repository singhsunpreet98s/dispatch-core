import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { SenderNotConfiguredBanner } from '@/components/sender-not-configured-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, Link, useForm, usePage } from '@inertiajs/react';
import { CalendarClock, Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ScheduleType = 'daily' | 'custom';
type ScheduleStatus = 'active' | 'paused';

interface Trigger {
    id?: number;
    weekday: number | null;
    time: string;
}

interface Template {
    id: number;
    title: string;
    subject: string;
}
interface EmailListOption {
    id: number;
    original_name: string;
    email_count: number;
}

interface Schedule {
    id: number;
    user_id: number;
    name: string;
    type: ScheduleType;
    status: ScheduleStatus;
    template_id: number;
    email_list_id: number;
    created_at: string;
    template: Template | null;
    email_list: EmailListOption | null;
    triggers: Trigger[];
    user?: { id: number; name: string; email: string };
}

interface Props {
    schedules?: Paginator<Schedule>;
    templates: Template[];
    emailLists: EmailListOption[];
    isAdmin: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Schedules', href: '/schedules' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
}

function triggerLabel(t: Trigger): string {
    if (t.weekday === null) return `Daily at ${t.time}`;
    return `${WEEKDAYS[t.weekday]} at ${t.time}`;
}

// ─── Trigger row editor ───────────────────────────────────────────────────────

interface TriggerInput {
    weekday: string;
    time: string;
}

interface TriggerRowProps {
    trigger: TriggerInput;
    index: number;
    type: ScheduleType;
    canRemove: boolean;
    onChange: (index: number, field: keyof TriggerInput, value: string) => void;
    onRemove: (index: number) => void;
}

function TriggerRow({ trigger, index, type, canRemove, onChange, onRemove }: TriggerRowProps) {
    return (
        <div className="flex items-center gap-2">
            {type === 'custom' && (
                <Select value={trigger.weekday} onValueChange={(v) => onChange(index, 'weekday', v)}>
                    <SelectTrigger className="w-36 shrink-0">
                        <SelectValue placeholder="Weekday" />
                    </SelectTrigger>
                    <SelectContent>
                        {WEEKDAYS.map((day, i) => (
                            <SelectItem key={i} value={String(i)}>
                                {day}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <Input type="time" value={trigger.time} onChange={(e) => onChange(index, 'time', e.target.value)} className="w-32 shrink-0" />
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                    onClick={() => onRemove(index)}
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormMode = 'create' | 'edit';

interface ScheduleFormData {
    name: string;
    type: ScheduleType;
    template_id: string;
    email_list_id: string;
    triggers: TriggerInput[];
    [key: string]: unknown;
}

export default function SchedulesIndex({ schedules, templates, emailLists, isAdmin }: Props) {
    const { auth } = usePage<SharedData>().props;
    const senderConfigured = !!auth.user.sendgrid_contact_id;

    const [sheetOpen, setSheetOpen] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>('create');
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

    const form = useForm<ScheduleFormData>({
        name: '',
        type: 'daily',
        template_id: '',
        email_list_id: '',
        triggers: [{ weekday: '', time: '09:00' }],
    });

    const deleteForm = useForm({});

    // ── Triggers local state helpers ──────────────────────────────────────────

    function addTrigger() {
        form.setData('triggers', [...form.data.triggers, { weekday: '', time: '09:00' }]);
    }

    function removeTrigger(i: number) {
        form.setData(
            'triggers',
            form.data.triggers.filter((_, idx) => idx !== i),
        );
    }

    function updateTrigger(i: number, field: keyof TriggerInput, value: string) {
        const updated = form.data.triggers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t));
        form.setData('triggers', updated);
    }

    function resetTriggersForType(type: ScheduleType) {
        form.setData({ ...form.data, type, triggers: [{ weekday: type === 'custom' ? '1' : '', time: '09:00' }] });
    }

    // ── Open sheet ────────────────────────────────────────────────────────────

    function openCreate() {
        form.reset();
        form.setData({ name: '', type: 'daily', template_id: '', email_list_id: '', triggers: [{ weekday: '', time: '09:00' }] });
        form.clearErrors();
        setEditingSchedule(null);
        setFormMode('create');
        setSheetOpen(true);
    }

    function openEdit(s: Schedule) {
        form.setData({
            name: s.name,
            type: s.type,
            template_id: String(s.template_id),
            email_list_id: String(s.email_list_id),
            triggers: s.triggers.map((t) => ({
                weekday: t.weekday !== null ? String(t.weekday) : '',
                time: t.time,
            })),
        });
        form.clearErrors();
        setEditingSchedule(s);
        setFormMode('edit');
        setSheetOpen(true);
    }

    function handleSheetClose(open: boolean) {
        if (!open && !form.processing) {
            form.clearErrors();
            setSheetOpen(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (formMode === 'create') {
            form.post(route('schedules.store'), { onSuccess: () => setSheetOpen(false) });
        } else if (editingSchedule) {
            form.put(route('schedules.update', editingSchedule.id), { onSuccess: () => setSheetOpen(false) });
        }
    }

    function handleDelete() {
        if (!deletingSchedule) return;
        deleteForm.delete(route('schedules.destroy', deletingSchedule.id), {
            onSuccess: () => setDeletingSchedule(null),
        });
    }

    // ── Table columns ─────────────────────────────────────────────────────────

    const columns: Column<Schedule>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (s) => (
                <div>
                    <p className="font-medium">{s.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                        {s.triggers.slice(0, 2).map((t, i) => (
                            <span key={i} className="text-muted-foreground text-xs">
                                {triggerLabel(t)}
                            </span>
                        ))}
                        {s.triggers.length > 2 && <span className="text-muted-foreground text-xs">+{s.triggers.length - 2} more</span>}
                    </div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (s) => <Badge variant={s.type === 'daily' ? 'secondary' : 'outline'}>{s.type === 'daily' ? 'Daily' : 'Custom'}</Badge>,
        },
        {
            key: 'template',
            header: 'Template',
            render: (s) => <span className="text-sm">{s.template?.title ?? <span className="text-muted-foreground italic">Deleted</span>}</span>,
        },
        {
            key: 'email_list',
            header: 'Email List',
            render: (s) =>
                s.email_list ? (
                    <div>
                        <p className="text-sm">{s.email_list.original_name}</p>
                        <p className="text-muted-foreground text-xs">{s.email_list.email_count.toLocaleString()} emails</p>
                    </div>
                ) : (
                    <span className="text-muted-foreground text-sm italic">Deleted</span>
                ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (s) => <Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status === 'active' ? 'Active' : 'Paused'}</Badge>,
        },
        ...(isAdmin
            ? [
                  {
                      key: 'created_by',
                      header: 'Created by',
                      render: (s: Schedule) => (
                          <div>
                              <p className="text-sm font-medium">{s.user?.name ?? '—'}</p>
                              <p className="text-muted-foreground text-xs">{s.user?.email}</p>
                          </div>
                      ),
                  },
              ]
            : []),
        {
            key: 'created_at',
            header: 'Created',
            render: (s) => <span className="text-muted-foreground">{formatDate(s.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (s) => (
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="View">
                        <Link href={route('schedules.show', s.id)}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingSchedule(s)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Schedules" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Schedules</h1>
                        <p className="text-muted-foreground text-sm">
                            {isAdmin ? 'All scheduled email campaigns' : 'Your scheduled email campaigns'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={openCreate}
                        disabled={!senderConfigured}
                        title={!senderConfigured ? 'Sender ID not configured' : undefined}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Schedule
                    </Button>
                </div>

                {!senderConfigured && <SenderNotConfiguredBanner isAdmin={isAdmin} />}

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-base font-semibold">
                            {isAdmin ? 'All Schedules' : 'Your Schedules'}{schedules?.total !== undefined && ` (${schedules.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <Deferred data="schedules" fallback={<DataTableSkeleton columns={8} />}>
                            <DataTable
                                columns={columns}
                                paginator={schedules!}
                                rowKey={(s) => s.id}
                                emptyMessage="No schedules yet. Click 'New Schedule' to create one."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* ── Add / Edit Sheet ── */}
            <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>
                            {formMode === 'create' ? (
                                <span className="flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4" /> New Schedule
                                </span>
                            ) : (
                                'Edit Schedule'
                            )}
                        </SheetTitle>
                        <SheetDescription>
                            {formMode === 'create'
                                ? 'Set up a recurring email campaign with a template and email list.'
                                : `Editing "${editingSchedule?.name}"`}
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="s-name">Schedule Name</Label>
                            <Input
                                id="s-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="e.g. Weekly Newsletter"
                                autoFocus
                            />
                            {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                        </div>

                        {/* Type */}
                        <div className="space-y-2">
                            <Label>Schedule Type</Label>
                            <div className="flex gap-2">
                                {(['daily', 'custom'] as ScheduleType[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => resetTriggersForType(t)}
                                        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${form.data.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'}`}
                                    >
                                        {t === 'daily' ? 'Daily' : 'Custom Weekdays'}
                                    </button>
                                ))}
                            </div>
                            {form.errors.type && <p className="text-destructive text-xs">{form.errors.type}</p>}
                        </div>

                        {/* Template */}
                        <div className="space-y-2">
                            <Label>Template</Label>
                            <Select value={form.data.template_id} onValueChange={(v) => form.setData('template_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.length === 0 ? (
                                        <SelectItem value="__none" disabled>
                                            No templates available
                                        </SelectItem>
                                    ) : (
                                        templates.map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>
                                                {t.title}
                                                <span className="text-muted-foreground ml-2 text-xs">— {t.subject}</span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {form.errors.template_id && <p className="text-destructive text-xs">{form.errors.template_id}</p>}
                        </div>

                        {/* Email List */}
                        <div className="space-y-2">
                            <Label>Email List</Label>
                            <Select value={form.data.email_list_id} onValueChange={(v) => form.setData('email_list_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an email list…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {emailLists.length === 0 ? (
                                        <SelectItem value="__none" disabled>
                                            No email lists available
                                        </SelectItem>
                                    ) : (
                                        emailLists.map((l) => (
                                            <SelectItem key={l.id} value={String(l.id)}>
                                                {l.original_name}
                                                <span className="text-muted-foreground ml-2 text-xs">— {l.email_count.toLocaleString()} emails</span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {form.errors.email_list_id && <p className="text-destructive text-xs">{form.errors.email_list_id}</p>}
                        </div>

                        {/* Triggers */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>{form.data.type === 'daily' ? 'Send Times' : 'Weekday & Time Slots'}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addTrigger}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {form.data.triggers.map((trigger, i) => (
                                    <TriggerRow
                                        key={i}
                                        trigger={trigger}
                                        index={i}
                                        type={form.data.type}
                                        canRemove={form.data.triggers.length > 1}
                                        onChange={updateTrigger}
                                        onRemove={removeTrigger}
                                    />
                                ))}
                            </div>

                            {form.errors.triggers && <p className="text-destructive text-xs">{form.errors.triggers as string}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => handleSheetClose(false)} disabled={form.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            {form.processing ? 'Saving…' : formMode === 'create' ? 'Create Schedule' : 'Save Changes'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Delete confirmation ── */}
            <Dialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Schedule</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete <span className="text-foreground font-medium">"{deletingSchedule?.name}"</span>? All triggers
                        will also be removed. This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingSchedule(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
