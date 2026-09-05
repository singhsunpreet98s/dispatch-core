import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock, Copy, Database, ExternalLink, KeyRound, Link2, Link2Off, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';

export interface DropboxStatus {
    connected: boolean;
    expires_at?: string | null;
    seconds_left?: number | null;
    connected_at?: string | null;
}

export interface BackupSettings {
    has_app_key: boolean;
    has_app_secret: boolean;
    backup_retention_days: number;
    dropbox_status: DropboxStatus;
    callback_url: string;
}

interface Props {
    backupSettings: BackupSettings;
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

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    }).format(new Date(iso));
}

function TokenExpiryBadge({ secondsLeft }: { secondsLeft: number | null | undefined }) {
    if (secondsLeft == null) return null;
    const isExpired = secondsLeft <= 0;
    const isWarning = secondsLeft < 3600; // < 1 hour

    if (isExpired) {
        return (
            <Badge variant="outline" className="gap-1 border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                <XCircle className="h-3 w-3" />
                Access token expired (will auto-refresh)
            </Badge>
        );
    }
    if (isWarning) {
        return (
            <Badge variant="outline" className="gap-1 border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
                <Clock className="h-3 w-3" />
                Expires in {formatSecondsLeft(secondsLeft)} (will auto-refresh)
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
            <RefreshCw className="h-3 w-3" />
            Token refreshes in {formatSecondsLeft(secondsLeft)}
        </Badge>
    );
}

export default function BackupTab({ backupSettings }: Props) {
    const { dropbox_status, has_app_key, has_app_secret, callback_url } = backupSettings;
    const [copied, setCopied] = useState(false);

    const credForm = useForm({
        dropbox_app_key: '',
        dropbox_app_secret: '',
        backup_retention_days: backupSettings.backup_retention_days,
    });

    function submitCredentials(e: React.FormEvent) {
        e.preventDefault();
        credForm.patch(route('system-settings.backup'));
    }

    function disconnect() {
        if (!confirm('Disconnect Dropbox? Backups will stop uploading until you reconnect.')) return;
        router.delete(route('dropbox.disconnect'));
    }

    function copyCallbackUrl() {
        navigator.clipboard.writeText(callback_url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const canConnect = has_app_key && has_app_secret;

    return (
        <div className="space-y-6">
            {/* App credentials */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        <CardTitle className="text-base font-semibold">Dropbox App Credentials</CardTitle>
                    </div>
                    <CardDescription>
                        Create a Dropbox app at the{' '}
                        <a
                            href="https://www.dropbox.com/developers/apps"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 underline"
                        >
                            Dropbox App Console
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        , then paste the App Key and App Secret below. Set the <strong>OAuth 2 redirect URI</strong> in your Dropbox app to the
                        callback URL shown below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Callback URL */}
                    <div className="space-y-1.5">
                        <Label>Redirect URI (add this in your Dropbox app)</Label>
                        <div className="flex items-center gap-2">
                            <code className="bg-muted flex-1 rounded border px-3 py-1.5 font-mono text-xs break-all">{callback_url}</code>
                            <Button type="button" variant="outline" size="sm" onClick={copyCallbackUrl} className="shrink-0">
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={submitCredentials} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="dropbox_app_key">
                                    App Key
                                    {has_app_key && (
                                        <Badge variant="outline" className="ml-2 gap-1 border-green-500 bg-green-50 text-green-700 text-xs dark:bg-green-950 dark:text-green-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Saved
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="dropbox_app_key"
                                    placeholder={has_app_key ? 'Enter new key to replace…' : 'Paste App Key…'}
                                    value={credForm.data.dropbox_app_key}
                                    onChange={(e) => credForm.setData('dropbox_app_key', e.target.value)}
                                    autoComplete="off"
                                />
                                {credForm.errors.dropbox_app_key && <p className="text-destructive text-xs">{credForm.errors.dropbox_app_key}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="dropbox_app_secret">
                                    App Secret
                                    {has_app_secret && (
                                        <Badge variant="outline" className="ml-2 gap-1 border-green-500 bg-green-50 text-green-700 text-xs dark:bg-green-950 dark:text-green-400">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Saved
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="dropbox_app_secret"
                                    type="password"
                                    placeholder={has_app_secret ? 'Enter new secret to replace…' : 'Paste App Secret…'}
                                    value={credForm.data.dropbox_app_secret}
                                    onChange={(e) => credForm.setData('dropbox_app_secret', e.target.value)}
                                    autoComplete="off"
                                />
                                {credForm.errors.dropbox_app_secret && <p className="text-destructive text-xs">{credForm.errors.dropbox_app_secret}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="backup_retention_days">Retention Period (days)</Label>
                            <Input
                                id="backup_retention_days"
                                type="number"
                                min={1}
                                max={365}
                                className="w-32"
                                value={credForm.data.backup_retention_days}
                                onChange={(e) => credForm.setData('backup_retention_days', Number(e.target.value))}
                            />
                            {credForm.errors.backup_retention_days && <p className="text-destructive text-xs">{credForm.errors.backup_retention_days}</p>}
                            <p className="text-muted-foreground text-xs">Backups older than this many days are automatically deleted from Dropbox.</p>
                        </div>

                        <Button type="submit" size="sm" disabled={credForm.processing}>
                            Save Settings
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Connection status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        <CardTitle className="text-base font-semibold">Dropbox Connection</CardTitle>
                    </div>
                    <CardDescription>
                        Connect your Dropbox account to enable automatic backup uploads. Backups run daily at 23:59 UTC. View and manage backups on
                        the{' '}
                        <Link href={route('backups.index')} className="underline">
                            Backups page
                        </Link>
                        .
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dropbox_status.connected ? (
                        <div className="space-y-4">
                            <div className="bg-muted/40 rounded-lg border p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="font-medium text-sm">Connected to Dropbox</span>
                                        </div>
                                        {dropbox_status.connected_at && (
                                            <p className="text-muted-foreground text-xs">
                                                Connected on {formatDate(dropbox_status.connected_at)}
                                            </p>
                                        )}
                                        <div className="pt-1">
                                            <TokenExpiryBadge secondsLeft={dropbox_status.seconds_left} />
                                        </div>
                                        {dropbox_status.expires_at && (
                                            <p className="text-muted-foreground text-xs">
                                                Access token expires: {formatDate(dropbox_status.expires_at)}
                                                <span className="ml-1 text-[10px] opacity-70">(auto-refreshes before expiry)</span>
                                            </p>
                                        )}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={disconnect} className="shrink-0 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950">
                                        <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                                        Disconnect
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-muted/40 rounded-lg border border-dashed p-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-muted-foreground">Not connected to Dropbox</span>
                                </div>
                                {!canConnect && (
                                    <p className="text-muted-foreground mt-2 text-xs">Save your App Key and App Secret above to enable the connect button.</p>
                                )}
                            </div>
                            <Button
                                size="sm"
                                disabled={!canConnect}
                                onClick={() => (window.location.href = route('dropbox.connect'))}
                            >
                                <Link2 className="mr-1.5 h-4 w-4" />
                                Connect to Dropbox
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
