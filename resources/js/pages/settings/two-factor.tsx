import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Copy, Download, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Two-factor authentication', href: '/settings/two-factor' },
];

interface Props {
    enabled: boolean;
    // when not yet enabled
    secret?: string;
    qrSvg?: string;
    // when enabled
    recoveryCodes?: string[];
}

function RecoveryCodeList({ codes }: { codes: string[] }) {
    const [revealed, setRevealed] = useState(false);

    function downloadCodes() {
        const text = codes.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recovery-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyAll() {
        navigator.clipboard.writeText(codes.join('\n'));
    }

    return (
        <div className="space-y-3">
            <div className="bg-muted rounded-lg p-4">
                <div className={`grid grid-cols-2 gap-2 font-mono text-sm ${!revealed ? 'select-none blur-sm' : ''}`}>
                    {codes.map((code, i) => (
                        <span key={i} className="tracking-wider">{code}</span>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRevealed((v) => !v)}>
                    {revealed ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                    {revealed ? 'Hide' : 'Reveal'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={copyAll}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy all
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={downloadCodes}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
            </div>
        </div>
    );
}

function SetupForm({ secret, qrSvg }: { secret: string; qrSvg: string }) {
    const form = useForm({ secret, code: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('two-factor.enable'), { onError: () => form.setData('code', '') });
    }

    const [showManual, setShowManual] = useState(false);

    const formatted = secret.match(/.{1,4}/g)?.join(' ') ?? secret;

    return (
        <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to activate.
            </p>

            <div className="flex justify-start">
                <div
                    className="rounded-lg border bg-white p-3"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
            </div>

            <div>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    onClick={() => setShowManual((v) => !v)}
                >
                    {showManual ? 'Hide manual entry code' : "Can't scan? Enter the code manually"}
                </button>
                {showManual && (
                    <p className="text-foreground mt-1 font-mono text-sm tracking-widest">{formatted}</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="secret" value={secret} />
                <div className="space-y-2">
                    <Label htmlFor="code">Verification code</Label>
                    <Input
                        id="code"
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        className="w-40"
                    />
                    {form.errors.code && <p className="text-destructive text-xs">{form.errors.code}</p>}
                </div>
                <Button type="submit" disabled={form.processing || form.data.code.length < 6}>
                    {form.processing ? 'Activating…' : 'Activate MFA'}
                </Button>
            </form>
        </div>
    );
}

function DisableDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const form = useForm({ password: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.delete(route('two-factor.disable'), {
            onSuccess: onClose,
            onError: () => form.setData('password', ''),
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Disable two-factor authentication</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">Enter your current password to confirm.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="disable-password">Password</Label>
                        <Input
                            id="disable-password"
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            autoFocus
                        />
                        {form.errors.password && <p className="text-destructive text-xs">{form.errors.password}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={form.processing}>
                            {form.processing ? 'Disabling…' : 'Disable MFA'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function TwoFactor({ enabled, secret, qrSvg, recoveryCodes: propCodes = [] }: Props) {
    const [disableDialogOpen, setDisableDialogOpen] = useState(false);
    const regenerateForm = useForm({});

    // Flash recovery codes (shown right after enable or regenerate)
    const { props } = usePage<SharedData & { recoveryCodes?: string[]; justEnabled?: boolean }>();
    const flashCodes = (props.recoveryCodes as string[] | undefined) ?? null;
    const justEnabled = props.justEnabled as boolean | undefined;

    const displayCodes = flashCodes ?? propCodes;

    function handleRegenerate() {
        regenerateForm.post(route('two-factor.recovery-codes'));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Two-factor authentication" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Two-factor authentication"
                        description="Add an extra layer of security to your account using an authenticator app."
                    />

                    {enabled ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <Badge variant="outline" className="border-green-500 text-green-600">MFA active</Badge>
                            </div>

                            {justEnabled && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-800">
                                    <p className="text-amber-800 dark:text-amber-300 text-sm font-medium mb-1">Save your recovery codes</p>
                                    <p className="text-amber-700 dark:text-amber-400 text-xs mb-3">
                                        Store these in a safe place. Each code can only be used once if you lose access to your authenticator app.
                                    </p>
                                    <RecoveryCodeList codes={displayCodes} />
                                </div>
                            )}

                            {!justEnabled && displayCodes.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Recovery codes</p>
                                    <p className="text-muted-foreground text-xs">
                                        Use these codes to access your account if you lose your authenticator device. Each code can only be used once.
                                    </p>
                                    <RecoveryCodeList codes={displayCodes} />
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRegenerate}
                                    disabled={regenerateForm.processing}
                                >
                                    {regenerateForm.processing ? 'Regenerating…' : 'Regenerate recovery codes'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDisableDialogOpen(true)}
                                >
                                    <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                                    Disable MFA
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <SetupForm secret={secret!} qrSvg={qrSvg!} />
                    )}
                </div>
            </SettingsLayout>

            <DisableDialog open={disableDialogOpen} onClose={() => setDisableDialogOpen(false)} />
        </AppLayout>
    );
}
