import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { SenderNotConfiguredBanner } from '@/components/sender-not-configured-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, Link, usePage, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Template {
    id: number;
    user_id: number;
    title: string;
    subject: string;
    created_at: string;
    updated_at: string;
    user?: { id: number; name: string; email: string };
}

interface Props {
    templates?: Paginator<Template>;
    isAdmin: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Templates', href: '/templates' },
];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(dateStr),
    );
}

export default function TemplatesIndex({ templates, isAdmin }: Props) {
    const { auth } = usePage<SharedData>().props;
    const senderConfigured = !!auth.user.sendgrid_contact_id;
    const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
    const deleteForm = useForm({});

    function handleDelete() {
        if (!deletingTemplate) return;
        deleteForm.delete(route('templates.destroy', deletingTemplate.id), {
            onSuccess: () => setDeletingTemplate(null),
        });
    }

    const canEdit = (t: Template) => isAdmin || t.user_id === auth.user.id;

    const columns: Column<Template>[] = [
        {
            key: 'title',
            header: 'Title',
            render: (t) => <span className="font-medium">{t.title}</span>,
        },
        {
            key: 'subject',
            header: 'Subject',
            render: (t) => <span className="text-muted-foreground">{t.subject}</span>,
        },
        ...(isAdmin
            ? [
                  {
                      key: 'creator',
                      header: 'Created by',
                      render: (t: Template) => (
                          <div className="flex flex-col">
                              <span className="text-sm font-medium">{t.user?.name ?? '—'}</span>
                              <span className="text-xs text-muted-foreground">{t.user?.email}</span>
                          </div>
                      ),
                  },
              ]
            : []),
        {
            key: 'updated_at',
            header: 'Last updated',
            render: (t) => <span className="text-muted-foreground">{formatDate(t.updated_at)}</span>,
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (t) => <span className="text-muted-foreground">{formatDate(t.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (t) => (
                <div className="flex items-center justify-end gap-2">
                    {canEdit(t) && (
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={route('templates.edit', t.id)}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                    {canEdit(t) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingTemplate(t)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Templates" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Email Templates</h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin ? 'All templates across all users' : 'Your email templates'}
                        </p>
                    </div>
                    {senderConfigured ? (
                        <Button asChild size="sm">
                            <Link href={route('templates.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Template
                            </Link>
                        </Button>
                    ) : (
                        <Button size="sm" disabled title="Sender ID not configured">
                            <Plus className="mr-2 h-4 w-4" />
                            New Template
                        </Button>
                    )}
                </div>

                {!senderConfigured && <SenderNotConfiguredBanner isAdmin={isAdmin} />}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            Templates {templates?.total !== undefined && `(${templates.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Deferred data="templates" fallback={<DataTableSkeleton columns={6} />}>
                            <DataTable
                                columns={columns}
                                paginator={templates!}
                                rowKey={(t) => t.id}
                                emptyMessage="No templates yet. Create your first template to get started."
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Delete confirmation */}
            <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">"{deletingTemplate?.title}"</span>?
                        This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingTemplate(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteForm.processing}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
