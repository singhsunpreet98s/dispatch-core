import { type Column, DataTable, type Paginator } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock, Database, Download, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { DropboxStatus } from '../settings/system/backup-tab';

export interface Backup {
    id: number;
    filename: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    size_bytes: number | null;
    error_message: string | null;
    backed_up_at: string | null;
}

interface Props {
    backups: Paginator<Backup>;
    dropboxStatus: DropboxStatus;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Database Backups', href: '/backups' },
];

function formatBytes(bytes: number | null): string {
    if (bytes === null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(iso));
}

function formatSecondsLeft(seconds: number | null | undefined): string {
    if (seconds == null || seconds <= 0) return 'Expired';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function StatusBadge({ status }: { status: Backup['status'] }) {
    switch (status) {
        case 'completed':
            return (
                <Badge className="gap-1 border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" variant="outline">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                </Badge>
            );
        case 'failed':
            return (
                <Badge className="gap-1 border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" variant="outline">
                    <XCircle className="h-3 w-3" />
                    Failed
                </Badge>
            );
        case 'uploading':
            return (
                <Badge className="gap-1 border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" variant="outline">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading
                </Badge>
            );
        case 'pending':
            return (
                <Badge className="gap-1 border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" variant="outline">
                    <Clock className="h-3 w-3" />
                    Pending
                </Badge>
            );
    }
}

function DropboxStatusBar({ status }: { status: DropboxStatus }) {
    if (!status.connected) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-400">
                    Dropbox is not connected — backups cannot be uploaded.{' '}
                    <Link href={route('system-settings.edit')} className="font-medium underline">
                        Configure in System Settings
                    </Link>
                    .
                </p>
            </div>
        );
    }

    const isExpired = (status.seconds_left ?? 1) <= 0;

    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-300">
                    <span className="font-medium">Dropbox connected</span>
                    {status.expires_at && (
                        <span className="text-green-700/80 dark:text-green-400/80 ml-2">
                            — access token{' '}
                            {isExpired ? (
                                <span className="text-yellow-600 dark:text-yellow-400">expired (will auto-refresh on next backup)</span>
                            ) : (
                                <>
                                    refreshes in <span className="font-medium">{formatSecondsLeft(status.seconds_left)}</span>
                                    <span className="ml-1 opacity-70 text-xs">(expires {formatDate(status.expires_at)})</span>
                                </>
                            )}
                        </span>
                    )}
                </p>
            </div>
            <Badge variant="outline" className="shrink-0 gap-1 border-green-500 bg-white text-green-700 dark:bg-transparent dark:text-green-400">
                <RefreshCw className="h-3 w-3" />
                Auto-refresh
            </Badge>
        </div>
    );
}

export default function BackupsIndex({ backups, dropboxStatus }: Props) {
    const [deletingBackup, setDeletingBackup] = useState<Backup | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    function handleDeleteConfirm() {
        if (!deletingBackup) return;
        setDeleteProcessing(true);
        router.delete(route('backups.destroy', deletingBackup.id), {
            onSuccess: () => setDeletingBackup(null),
            onFinish: () => setDeleteProcessing(false),
        });
    }

    const columns: Column<Backup>[] = [
        {
            key: 'filename',
            header: 'Filename',
            render: (b) => <span className="font-mono text-sm">{b.filename}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (b) => (
                <div className="flex flex-col gap-1">
                    <StatusBadge status={b.status} />
                    {b.status === 'failed' && b.error_message && (
                        <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="max-w-xs truncate" title={b.error_message}>
                                {b.error_message}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'size_bytes',
            header: 'Size',
            render: (b) => <span className="text-muted-foreground">{formatBytes(b.size_bytes)}</span>,
        },
        {
            key: 'backed_up_at',
            header: 'Backed Up At',
            render: (b) => <span className="text-muted-foreground">{formatDate(b.backed_up_at)}</span>,
        },
        {
            key: 'actions',
            header: '',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (b) => (
                <div className="flex items-center justify-end gap-1">
                    {b.status === 'completed' && (
                        <Button variant="ghost" size="icon" asChild title="Download">
                            <a href={route('backups.download', b.id)}>
                                <Download className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingBackup(b)}
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
            <Head title="Database Backups" />

            <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Database Backups</h1>
                        <p className="text-muted-foreground text-sm">Automatic daily backups uploaded to Dropbox at 23:59 UTC</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('system-settings.edit')}>Configure</Link>
                    </Button>
                </div>

                <DropboxStatusBar status={dropboxStatus} />

                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <CardTitle className="text-base font-semibold">
                                Backup History {backups.total > 0 && `(${backups.total})`}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                        <DataTable
                            columns={columns}
                            paginator={backups}
                            rowKey={(b) => b.id}
                            emptyMessage="No backups yet. The first backup will run at 23:59 UTC."
                        />
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!deletingBackup} onOpenChange={(open) => !open && setDeletingBackup(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Backup</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete{' '}
                        <span className="text-foreground font-mono font-medium">{deletingBackup?.filename}</span>? This will also remove it from
                        Dropbox and cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingBackup(null)} disabled={deleteProcessing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteProcessing}>
                            {deleteProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
