import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { FileDropzone } from '@/components/file-dropzone';
import { SenderNotConfiguredBanner } from '@/components/sender-not-configured-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Download, FileSpreadsheet, Mail, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmailListFile {
    id: number;
    user_id: number;
    original_name: string;
    list_name: string;
    size: number;
    email_count: number;
    sendgrid_list_id: string | null;
    created_at: string;
    user?: { id: number; name: string; email: string };
}

interface Props {
    emailLists?: Paginator<EmailListFile>;
    isAdmin: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Email Lists', href: '/email-lists' },
];

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtBadgeColor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    if (ext === 'xlsx') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
}

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

export default function EmailListsIndex({ emailLists, isAdmin }: Props) {
    const { flash, auth } = usePage<SharedData>().props;
    const senderConfigured = !!auth.user.sendgrid_contact_id;

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingFile, setDeletingFile] = useState<EmailListFile | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const uploadForm = useForm<{ list_name: string; file: File | null }>({ list_name: '', file: null });
    const deleteForm = useForm({});

    // Close the sheet when upload succeeds
    useEffect(() => {
        if (flash?.success && uploadOpen) {
            uploadForm.setData({ list_name: '', file: null });
            setUploadOpen(false);
        }
    }, [flash?.success]);

    // Show error inline when upload fails
    useEffect(() => {
        if (flash?.error && uploadOpen) {
            setUploadError(flash.error);
        }
        if (flash?.error && deletingFile) {
            setDeleteError(flash.error);
        }
    }, [flash?.error]);

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadForm.data.file || !uploadForm.data.list_name.trim()) return;
        setUploadError(null);
        uploadForm.post(route('email-lists.store'), { forceFormData: true });
    }

    function handleSheetClose(open: boolean) {
        if (!open && !uploadForm.processing) {
            uploadForm.setData({ list_name: '', file: null });
            uploadForm.clearErrors();
            setUploadError(null);
            setUploadOpen(false);
        }
    }

    function handleDelete() {
        if (!deletingFile) return;
        setDeleteError(null);
        deleteForm.delete(route('email-lists.destroy', deletingFile.id), {
            onSuccess: () => {
                setDeletingFile(null);
                setDeleteError(null);
            },
        });
    }

    const columns: Column<EmailListFile>[] = [
        {
            key: 'list_name',
            header: 'List Name',
            render: (f) => (
                <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                        <FileSpreadsheet className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-medium">{f.list_name}</p>
                        <p className="text-muted-foreground text-xs">
                            {f.original_name} · {formatBytes(f.size)}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'format',
            header: 'Format',
            render: (f) => {
                const ext = f.original_name.split('.').pop()?.toUpperCase() ?? '';
                return (
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${getExtBadgeColor(f.original_name)}`}>
                        {ext}
                    </span>
                );
            },
        },
        {
            key: 'email_count',
            header: 'Contacts',
            render: (f) => (
                <div className="flex items-center gap-1.5">
                    <Mail className="text-muted-foreground h-3.5 w-3.5" />
                    <span className="font-medium">{f.email_count.toLocaleString()}</span>
                </div>
            ),
        },
        {
            key: 'sendgrid_list_id',
            header: 'Portal',
            render: (f) =>
                f.sendgrid_list_id ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Synced</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                ),
        },
        ...(isAdmin
            ? [
                  {
                      key: 'uploaded_by',
                      header: 'Uploaded by',
                      render: (f: EmailListFile) => (
                          <div className="flex flex-col">
                              <span className="text-sm font-medium">{f.user?.name ?? '—'}</span>
                              <span className="text-muted-foreground text-xs">{f.user?.email}</span>
                          </div>
                      ),
                  },
              ]
            : []),
        {
            key: 'created_at',
            header: 'Uploaded',
            render: (f) => <span className="text-muted-foreground">{formatDate(f.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (f) => (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild title="Download">
                        <a href={route('email-lists.download', f.id)} download>
                            <Download className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingFile(f)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email Lists" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Email Lists</h1>
                        <p className="text-muted-foreground text-sm">Upload Excel or CSV files — contacts are synced to Portal automatically</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setUploadOpen(true)}
                        disabled={!senderConfigured}
                        title={!senderConfigured ? 'Sender ID not configured' : undefined}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Upload File
                    </Button>
                </div>

                {!senderConfigured && <SenderNotConfiguredBanner isAdmin={isAdmin} />}

                {/* Files table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            {isAdmin ? 'All Uploaded Files' : 'Your Files'}
                            {emailLists?.total !== undefined && ` (${emailLists.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Deferred data="emailLists" fallback={<DataTableSkeleton columns={7} />}>
                            <DataTable
                                columns={columns}
                                paginator={emailLists!}
                                rowKey={(f) => f.id}
                                emptyMessage='No files uploaded yet. Click "Upload File" to get started.'
                            />
                        </Deferred>
                    </CardContent>
                </Card>
            </div>

            {/* Upload sheet */}
            <Sheet open={uploadOpen} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Upload Email List</SheetTitle>
                        <SheetDescription>
                            Name your list, then upload a .xlsx, .xls, or .csv file. Contacts are synced to a new Portal marketing list automatically.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleUpload} className="flex flex-1 flex-col gap-5 overflow-y-auto py-6">
                        {/* List name field */}
                        <div className="p1 flex flex-col gap-1.5 p-1">
                            <Label htmlFor="list_name">
                                List Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="list_name"
                                placeholder="e.g. Newsletter Subscribers Q3"
                                value={uploadForm.data.list_name}
                                onChange={(e) => {
                                    uploadForm.setData('list_name', e.target.value);
                                    setUploadError(null);
                                }}
                                disabled={uploadForm.processing}
                            />
                            {uploadForm.errors.list_name && <p className="text-destructive text-xs">{uploadForm.errors.list_name}</p>}
                        </div>

                        <FileDropzone
                            file={uploadForm.data.file}
                            onFileSelect={(f) => {
                                uploadForm.setData('file', f);
                                setUploadError(null);
                            }}
                            onFileClear={() => {
                                uploadForm.setData('file', null);
                                setUploadError(null);
                            }}
                            error={uploadForm.errors.file}
                            disabled={uploadForm.processing}
                        />

                        {uploadError && (
                            <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-md border px-3 py-2.5">
                                <span className="text-destructive mt-0.5 shrink-0">⚠</span>
                                <p className="text-destructive text-sm">{uploadError}</p>
                            </div>
                        )}

                        <div className="bg-muted/30 text-muted-foreground space-y-1 rounded-lg border p-4 text-xs">
                            <p className="text-foreground font-medium">Tips for best results</p>
                            <ul className="list-disc space-y-0.5 pl-4">
                                <li>
                                    Name your email column <span className="font-mono">email</span>, <span className="font-mono">e-mail</span>, or{' '}
                                    <span className="font-mono">mail</span>
                                </li>
                                <li>
                                    Include a <span className="font-mono">name</span>, <span className="font-mono">first_name</span>, or{' '}
                                    <span className="font-mono">last_name</span> column to sync names to Portal
                                </li>
                                <li>Duplicate emails within the same file are ignored</li>
                                <li>Contacts are created in a new Portal marketing list with the name you provide</li>
                            </ul>
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => handleSheetClose(false)} disabled={uploadForm.processing}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!uploadForm.data.file || !uploadForm.data.list_name.trim() || uploadForm.processing}
                            onClick={handleUpload}
                        >
                            {uploadForm.processing ? 'Uploading & Syncing…' : 'Upload & Sync to Portal'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation */}
            <Dialog
                open={!!deletingFile}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingFile(null);
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete List</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete <span className="text-foreground font-medium">"{deletingFile?.list_name}"</span>? This will
                        permanently remove the list from{' '}
                        {deletingFile?.sendgrid_list_id ? (
                            <>
                                <span className="text-foreground font-medium">Portal</span> and the local database
                            </>
                        ) : (
                            <>the local database</>
                        )}
                        , along with all <span className="text-foreground font-medium">{deletingFile?.email_count.toLocaleString()}</span> contact(s).
                        This action cannot be undone.
                    </p>
                    {deleteError && (
                        <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-md border px-3 py-2.5">
                            <span className="text-destructive mt-0.5 shrink-0">⚠</span>
                            <p className="text-destructive text-sm">{deleteError}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeletingFile(null);
                                setDeleteError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
