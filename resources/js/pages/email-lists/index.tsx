import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { FileDropzone } from '@/components/file-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Deferred, Head, useForm, usePage } from '@inertiajs/react';
import { Download, FileSpreadsheet, Mail, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmailListFile {
    id: number;
    user_id: number;
    original_name: string;
    size: number;
    email_count: number;
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
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr));
}

export default function EmailListsIndex({ emailLists, isAdmin }: Props) {
    const { flash } = usePage<SharedData>().props;

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingFile, setDeletingFile] = useState<EmailListFile | null>(null);

    const uploadForm = useForm<{ file: File | null }>({ file: null });
    const deleteForm = useForm({});

    // Close the sheet when upload succeeds
    useEffect(() => {
        if (flash?.success && uploadOpen) {
            uploadForm.setData('file', null);
            setUploadOpen(false);
        }
    }, [flash?.success]);

    // Show error inline when upload fails (flash.error set by server)
    useEffect(() => {
        if (flash?.error && uploadOpen) {
            setUploadError(flash.error);
        }
    }, [flash?.error]);

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!uploadForm.data.file) return;
        setUploadError(null);
        uploadForm.post(route('email-lists.store'), { forceFormData: true });
    }

    function handleSheetClose(open: boolean) {
        if (!open && !uploadForm.processing) {
            uploadForm.setData('file', null);
            uploadForm.clearErrors();
            setUploadError(null);
            setUploadOpen(false);
        }
    }

    function handleDelete() {
        if (!deletingFile) return;
        deleteForm.delete(route('email-lists.destroy', deletingFile.id), {
            onSuccess: () => setDeletingFile(null),
        });
    }

    const columns: Column<EmailListFile>[] = [
        {
            key: 'original_name',
            header: 'File',
            render: (f) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-medium">{f.original_name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
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
            header: 'Emails',
            render: (f) => (
                <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{f.email_count.toLocaleString()}</span>
                </div>
            ),
        },
        ...(isAdmin
            ? [{
                key: 'uploaded_by',
                header: 'Uploaded by',
                render: (f: EmailListFile) => (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{f.user?.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{f.user?.email}</span>
                    </div>
                ),
            }]
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
                        <p className="text-sm text-muted-foreground">
                            Upload Excel or CSV files containing email addresses
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setUploadOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Upload File
                    </Button>
                </div>

                {/* Files table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            {isAdmin ? 'All Uploaded Files' : 'Your Files'}{emailLists?.total !== undefined && ` (${emailLists.total})`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Deferred data="emailLists" fallback={<DataTableSkeleton columns={6} />}>
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
                            Upload a .xlsx, .xls, or .csv file. Emails are extracted automatically from
                            an "email" column, or detected from any column.
                        </SheetDescription>
                    </SheetHeader>

                    <form
                        onSubmit={handleUpload}
                        className="flex flex-1 flex-col gap-6 overflow-y-auto py-6"
                    >
                        <FileDropzone
                            file={uploadForm.data.file}
                            onFileSelect={(f) => { uploadForm.setData('file', f); setUploadError(null); }}
                            onFileClear={() => { uploadForm.setData('file', null); setUploadError(null); }}
                            error={uploadForm.errors.file}
                            disabled={uploadForm.processing}
                        />

                        {uploadError && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                                <span className="mt-0.5 shrink-0 text-destructive">⚠</span>
                                <p className="text-sm text-destructive">{uploadError}</p>
                            </div>
                        )}

                        <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">Tips for best results</p>
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>Name your email column <span className="font-mono">email</span>, <span className="font-mono">e-mail</span>, or <span className="font-mono">mail</span></li>
                                <li>If no column is named, all cells are scanned for valid emails</li>
                                <li>Duplicate emails within the same file are ignored</li>
                                <li>Files without any valid emails will not be saved</li>
                            </ul>
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={() => handleSheetClose(false)}
                            disabled={uploadForm.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!uploadForm.data.file || uploadForm.processing}
                            onClick={handleUpload}
                        >
                            {uploadForm.processing ? 'Uploading…' : 'Upload & Extract'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation */}
            <Dialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete File</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">"{deletingFile?.original_name}"</span>?
                        This will also permanently delete all{' '}
                        <span className="font-medium text-foreground">
                            {deletingFile?.email_count.toLocaleString()}
                        </span>{' '}
                        extracted email(s). This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingFile(null)}>
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
