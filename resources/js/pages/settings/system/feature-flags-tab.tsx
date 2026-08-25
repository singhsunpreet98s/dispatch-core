import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

export interface FeatureFlag {
    id: number;
    name: string;
    description: string | null;
    enabled: boolean;
    updated_at: string;
}

interface Props {
    featureFlags: FeatureFlag[];
}

function formatFlagLabel(name: string): string {
    return name
        .replace(/_feature_flag$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(dateStr));
}

export default function FeatureFlagsTab({ featureFlags }: Props) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
    const editForm = useForm<{ description: string }>({ description: '' });
    const toggleForm = useForm({});

    function openEdit(flag: FeatureFlag) {
        editForm.setData('description', flag.description ?? '');
        editForm.clearErrors();
        setEditingFlag(flag);
        setEditDialogOpen(true);
    }

    function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingFlag) return;
        editForm.patch(route('system-settings.flags.update', editingFlag.id), {
            onSuccess: () => setEditDialogOpen(false),
        });
    }

    function handleToggle(flag: FeatureFlag) {
        toggleForm.patch(route('system-settings.flags.toggle', flag.id));
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Feature Flags</CardTitle>
                    <CardDescription>
                        Toggle features on or off. Flags are defined in code — contact a developer to add new ones.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 text-xs font-medium uppercase tracking-wider">
                                <TableHead className="px-6">Flag</TableHead>
                                <TableHead className="px-6">Description</TableHead>
                                <TableHead className="px-6">Status</TableHead>
                                <TableHead className="px-6">Last Modified</TableHead>
                                <TableHead className="px-6 text-right">Edit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {featureFlags.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground px-6 py-10 text-center text-sm">
                                        No feature flags defined yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                featureFlags.map((flag) => (
                                    <TableRow key={flag.id}>
                                        <TableCell className="px-6 py-3">
                                            <p className="text-sm font-medium">{formatFlagLabel(flag.name)}</p>
                                            <p className="text-muted-foreground font-mono text-xs">{flag.name}</p>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs px-6 py-3 text-sm">
                                            {flag.description || <span className="italic">No description</span>}
                                        </TableCell>
                                        <TableCell className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={flag.enabled}
                                                    onCheckedChange={() => handleToggle(flag)}
                                                    disabled={toggleForm.processing}
                                                />
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        flag.enabled
                                                            ? 'border-green-500 text-green-600 text-xs'
                                                            : 'border-zinc-400 text-zinc-500 text-xs'
                                                    }
                                                >
                                                    {flag.enabled ? 'Enabled' : 'Disabled'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground whitespace-nowrap px-6 py-3 text-xs">
                                            {formatDate(flag.updated_at)}
                                        </TableCell>
                                        <TableCell className="px-6 py-3 text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(flag)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    if (!open && !editForm.processing) setEditDialogOpen(false);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Flag Description</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
                        <div className="bg-muted/40 rounded-md px-3 py-2 text-sm">
                            <p className="font-medium">{editingFlag ? formatFlagLabel(editingFlag.name) : ''}</p>
                            <p className="text-muted-foreground font-mono text-xs">{editingFlag?.name}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="flag-description">Description</Label>
                            <Textarea
                                id="flag-description"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                placeholder="Describe what this flag controls…"
                                rows={3}
                                autoFocus
                            />
                            {editForm.errors.description && (
                                <p className="text-destructive text-xs">{editForm.errors.description}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                                disabled={editForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing ? 'Saving…' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
