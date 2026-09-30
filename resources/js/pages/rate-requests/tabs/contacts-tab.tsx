import { type Column, DataTable, DataTableSkeleton, type Paginator } from '@/components/data-table';
import { FileDropzone } from '@/components/file-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Deferred, router, useForm } from '@inertiajs/react';
import { FileUp, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface City {
    id: number;
    name: string;
}

export interface RateRequestContact {
    id: number;
    city_id: number | null;
    city_name: string | null;
    email: string;
    company_name: string | null;
    mc_number: string | null;
    created_at: string;
}

interface Props {
    contacts?: Paginator<RateRequestContact>;
    filters: { city_id: string | number; search: string };
    cities: City[];
}

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

type SheetMode = 'add' | 'upload' | 'addCity' | null;

export default function ContactsTab({ contacts, filters, cities }: Props) {
    const [sheetMode, setSheetMode] = useState<SheetMode>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRecord, setDeletingRecord] = useState<RateRequestContact | null>(null);

    const [cityFilter, setCityFilter] = useState(filters.city_id ? String(filters.city_id) : '');
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef(search);
    searchRef.current = search;
    const cityFilterRef = useRef(cityFilter);
    cityFilterRef.current = cityFilter;

    const addForm = useForm<{ city_id: string; email: string; company_name: string; mc_number: string }>({
        city_id: '',
        email: '',
        company_name: '',
        mc_number: '',
    });

    const importForm = useForm<{ city_id: string; file: File | null }>({
        city_id: '',
        file: null,
    });

    const addCityForm = useForm<{ name: string }>({ name: '' });

    const deleteForm = useForm({});

    useEffect(() => {
        router.get(route('rate-requests.index'), { city_id: cityFilter, search: searchRef.current }, { preserveState: true, replace: true });
    }, [cityFilter]);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(route('rate-requests.index'), { city_id: cityFilterRef.current, search }, { preserveState: true, replace: true });
        }, 400);
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current);
        };
    }, [search]);

    function openSheet(mode: SheetMode) {
        addForm.reset();
        addForm.clearErrors();
        importForm.reset();
        importForm.clearErrors();
        addCityForm.reset();
        addCityForm.clearErrors();
        setSheetMode(mode);
    }

    function handleSheetClose(open: boolean) {
        if (!open && !addForm.processing && !importForm.processing && !addCityForm.processing) {
            setSheetMode(null);
        }
    }

    function handleAddSubmit(e: React.FormEvent) {
        e.preventDefault();
        addForm.post(route('rate-requests.store'), { onSuccess: () => setSheetMode(null) });
    }

    function handleImportSubmit(e: React.FormEvent) {
        e.preventDefault();
        importForm.post(route('rate-requests.import'), {
            forceFormData: true,
            onSuccess: () => setSheetMode(null),
        });
    }

    function handleAddCitySubmit(e: React.FormEvent) {
        e.preventDefault();
        addCityForm.post(route('rate-requests.cities.store'), { onSuccess: () => setSheetMode(null) });
    }

    function handleDelete() {
        if (!deletingRecord) return;
        deleteForm.delete(route('rate-requests.destroy', deletingRecord.id), {
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setDeletingRecord(null);
            },
        });
    }

    const columns: Column<RateRequestContact>[] = [
        {
            key: 'city_name',
            header: 'City',
            render: (r) => <span className="font-medium">{r.city_name ?? r.city_id ?? '—'}</span>,
        },
        {
            key: 'email',
            header: 'Email',
            render: (r) => <span className="font-medium">{r.email}</span>,
        },
        {
            key: 'company_name',
            header: 'Company',
            render: (r) =>
                r.company_name ? r.company_name : <span className="text-muted-foreground italic text-xs">—</span>,
        },
        {
            key: 'mc_number',
            header: 'MC #',
            render: (r) =>
                r.mc_number ? r.mc_number : <span className="text-muted-foreground italic text-xs">—</span>,
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
        <>
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openSheet('addCity')}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Add City
                </Button>
                <Button variant="outline" size="sm" onClick={() => openSheet('upload')}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload File
                </Button>
                <Button size="sm" onClick={() => openSheet('add')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                </Button>
            </div>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <CardHeader className="shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base font-semibold">
                            All Contacts {contacts?.total !== undefined && `(${contacts.total})`}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Select
                                value={cityFilter || 'all'}
                                onValueChange={(v) => setCityFilter(v === 'all' ? '' : v)}
                            >
                                <SelectTrigger className="w-52">
                                    <SelectValue placeholder="All cities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All cities</SelectItem>
                                    {cities.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative w-64">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search email, company, MC…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                    <Deferred data="contacts" fallback={<DataTableSkeleton columns={6} rows={10} />}>
                        <DataTable
                            columns={columns}
                            paginator={contacts!}
                            rowKey={(r) => r.id}
                            emptyMessage="No contacts yet. Upload a file or add one manually."
                        />
                    </Deferred>
                </CardContent>
            </Card>

            {/* Add Contact Sheet */}
            <Sheet open={sheetMode === 'add'} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add Contact</SheetTitle>
                        <SheetDescription>Manually add a single carrier or broker contact.</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleAddSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Select
                                value={addForm.data.city_id}
                                onValueChange={(v) => addForm.setData('city_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {addForm.errors.city_id && <p className="text-destructive text-xs">{addForm.errors.city_id}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-email">
                                Email Address <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="add-email"
                                type="email"
                                value={addForm.data.email}
                                onChange={(e) => addForm.setData('email', e.target.value)}
                                placeholder="contact@carrier.com"
                                autoFocus
                            />
                            {addForm.errors.email && <p className="text-destructive text-xs">{addForm.errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-company">Company Name</Label>
                            <Input
                                id="add-company"
                                value={addForm.data.company_name}
                                onChange={(e) => addForm.setData('company_name', e.target.value)}
                                placeholder="Acme Trucking LLC"
                            />
                            {addForm.errors.company_name && <p className="text-destructive text-xs">{addForm.errors.company_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-mc">MC Number</Label>
                            <Input
                                id="add-mc"
                                value={addForm.data.mc_number}
                                onChange={(e) => addForm.setData('mc_number', e.target.value)}
                                placeholder="MC-123456"
                            />
                            {addForm.errors.mc_number && <p className="text-destructive text-xs">{addForm.errors.mc_number}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setSheetMode(null)} disabled={addForm.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddSubmit} disabled={addForm.processing}>
                            {addForm.processing ? 'Adding…' : 'Add Contact'}
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
                            Upload a CSV or Excel file with columns: <strong>email</strong>, <strong>company_name</strong> (optional),{' '}
                            <strong>mc_number</strong> (optional). Select the city these contacts belong to.{' '}
                            <strong>All existing contacts for the selected city will be replaced.</strong>
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleImportSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label>
                                City <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={importForm.data.city_id}
                                onValueChange={(v) => importForm.setData('city_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {importForm.errors.city_id && <p className="text-destructive text-xs">{importForm.errors.city_id}</p>}
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

            {/* Add City Sheet */}
            <Sheet open={sheetMode === 'addCity'} onOpenChange={handleSheetClose}>
                <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add City</SheetTitle>
                        <SheetDescription>Add a new city to the rate request contacts list.</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleAddCitySubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-1 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="city-name">
                                City Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="city-name"
                                value={addCityForm.data.name}
                                onChange={(e) => addCityForm.setData('name', e.target.value)}
                                placeholder="e.g. Denver"
                                autoFocus
                            />
                            {addCityForm.errors.name && <p className="text-destructive text-xs">{addCityForm.errors.name}</p>}
                        </div>
                    </form>

                    <SheetFooter className="border-t pt-4">
                        <Button type="button" variant="outline" onClick={() => setSheetMode(null)} disabled={addCityForm.processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddCitySubmit} disabled={addCityForm.processing}>
                            {addCityForm.processing ? 'Adding…' : 'Add City'}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remove Contact</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Remove <span className="text-foreground font-medium">{deletingRecord?.email}</span> from rate request contacts? This action
                        cannot be undone.
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
        </>
    );
}
