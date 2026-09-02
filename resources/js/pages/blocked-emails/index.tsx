import { type Column, DataTable, type Paginator } from '@/components/data-table';
import { FileDropzone } from '@/components/file-dropzone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FileUp, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type BlockedType = 'blocked' | 'bounced';

interface BlockedEmailImport {
    id: number;
    original_name: string;
}

interface BlockedEmail {
    id: number;
    email: string;
    type: BlockedType;
    import_id: number | null;
    import: BlockedEmailImport | null;
    created_at: string;
}

interface Props {
    blockedEmails: Paginator<BlockedEmail>;
    filters: { search: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Blocked Emails', href: '/blocked-emails' },
];

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

const typeVariant = (type: BlockedType): 'default' | 'secondary' | 'outline' => {
    if (type === 'bounced') return 'secondary';
    return 'outline';
};

type SheetMode = 'add' | 'upload' | null;

export default function BlockedEmailsIndex({ blockedEmails, filters }: Props) {
    const [sheetMode, setSheetMode] = useState<SheetMode>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRecord, setDeletingRecord] = useState<BlockedEmail | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const addForm = useForm<{ email: string; type: BlockedType }>({
        email: '',
        type: 'blocked',
    });

    const importForm = useForm<{ file: File | null; type: BlockedType }>({
        file: null,
        type: 'blocked',
    });

    const deleteForm = useForm({});

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(route('blocked-emails.index'), { search }, { preserveState: true, replace: true });
        }, 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    function openSheet(mode: SheetMode) {
        addForm.reset();
        addForm.clearErrors();
        importForm.reset();
        importForm.clearErrors();
        setSheetMode(mode);
    }

    function handleSheetClose(open: boolean) {
        if (!open && !addForm.processing && !importForm.processing) {
            setSheetMode(null);
        }
    }

    function handleAddSubmit(e: React.FormEvent) {
        e.preventDefault();
        addForm.post(route('blocked-emails.store'), { onSuccess: () => setSheetMode(null) });
    }

    function handleImportSubmit(e: React.FormEvent) {
        e.preventDefault();
        importForm.post(route('blocked-emails.import'), {
            forceFormData: true,
            onSuccess: () => setSheetMode(null),
        });
    }

    function handleDelete() {
        if (!deletingRecord) return;
        deleteForm.delete(route('blocked-emails.destroy', deletingRecord.id), {
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setDeletingRecord(null);
            },
        });
    }

    const columns: Column<BlockedEmail>[] = [
        {
            key: 'email',
            header: 'Email',
            render: (r) => <span className="font-medium">{r.email}</span>,
        },
        {
            key: 'type',
            header: 'Type',
            render: (r) => (
                <Badge variant={typeVariant(r.type)} className="capitalize">
                    {r.type}
                </Badge>
            ),
        },
        {
            key: 'source',
            header: 'Source',
            render: (r) =>
                r.import ? (
                    <span className="text-muted-foreground text-xs">
                        Import #{r.import.id} — {r.import.original_name}
                    </span>
                ) : (
                    <span className="text-muted-foreground italic text-xs">Manual</span>
                ),
        },
        {
            key: 'created_at',
            header: 'Added',
            render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (r) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                        setDeletingRecord(r);
                        setDeleteDialogOpen(true);
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Blocked Emails" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Blocked &amp; Bounced Emails</h1>
                        <p className="text-muted-foreground text-sm">Manage emails blocked from receiving campaigns</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openSheet('upload')}>
                            <FileUp className="mr-2 h-4 w-4" />
                            Upload File
                        </Button>
                        <Button size="sm" onClick={() => openSheet('add')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Email
                        </Button>
                    </div>
                </div>

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <CardTitle className="text-base font-semibold">
                                All Blocked Emails {blockedEmails.total !== undefined && `(${blockedEmails.total})`}
                            </CardTitle>
                            <div className="relative w-64">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search by email…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <DataTable
                            columns={columns}
                            paginator={blockedEmails}
                            rowKey={(r) => r.id}
                            emptyMessage="No blocked or bounced emails. Upload a file or add one manually."
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Add Email Sheet */}
            <Sheet open={sheetMode === 'add'} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add Email</SheetTitle>
                        <SheetDescription>Manually add a single email to the blocked or bounced list.</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleAddSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="add-email">Email Address</Label>
                            <Input
                                id="add-email"
                                type="email"
                                value={addForm.data.email}
                                onChange={(e) => addForm.setData('email', e.target.value)}
                                placeholder="recipient@example.com"
                                autoFocus
                            />
                            {addForm.errors.email && <p className="text-destructive text-xs">{addForm.errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={addForm.data.type}
                                onValueChange={(v) => addForm.setData('type', v as BlockedType)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="bounced">Bounced</SelectItem>
                                </SelectContent>
                            </Select>
                            {addForm.errors.type && <p className="text-destructive text-xs">{addForm.errors.type}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setSheetMode(null)} disabled={addForm.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSubmit} disabled={addForm.processing}>
                            {addForm.processing ? 'Adding…' : 'Add Email'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Upload File Sheet */}
            <Sheet open={sheetMode === 'upload'} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Upload File</SheetTitle>
                        <SheetDescription>
                            Upload a CSV or Excel file. The first column should contain email addresses. Duplicate emails are skipped automatically.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleImportSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={importForm.data.type}
                                onValueChange={(v) => importForm.setData('type', v as BlockedType)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="bounced">Bounced</SelectItem>
                                </SelectContent>
                            </Select>
                            {importForm.errors.type && <p className="text-destructive text-xs">{importForm.errors.type}</p>}
                        </div>

                        <FileDropzone
                            file={importForm.data.file}
                            onFileSelect={(f) => importForm.setData('file', f)}
                            onFileClear={() => importForm.setData('file', null)}
                            error={importForm.errors.file}
                            disabled={importForm.processing}
                        />
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setSheetMode(null)} disabled={importForm.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleImportSubmit} disabled={importForm.processing}>
                            {importForm.processing ? 'Uploading…' : 'Upload'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remove Email</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Remove <span className="text-foreground font-medium">{deletingRecord?.email}</span> from the blocked/bounced list? They will
                        be able to receive emails again.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteForm.processing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Removing…' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
