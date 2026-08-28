import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';
import { Copy, Eye, EyeOff, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    apiToken: string | null;
}

export default function ApiTokenTab({ apiToken: initialToken }: Props) {
    const [token, setToken] = useState<string | null>(initialToken);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateForm = useForm({});
    const revokeForm = useForm({});

    function generate() {
        generateForm.post(route('system-settings.api-token.generate'), {
            preserveScroll: true,
            onSuccess: (page) => {
                const newToken = (page.props as { apiToken?: string }).apiToken ?? null;
                setToken(newToken);
                setRevealed(true);
            },
        });
    }

    function revoke() {
        if (!confirm('Are you sure you want to revoke the bearer token? Any integrations using it will stop working.')) return;
        revokeForm.delete(route('system-settings.api-token.revoke'), {
            preserveScroll: true,
            onSuccess: () => {
                setToken(null);
                setRevealed(false);
            },
        });
    }

    function copy() {
        if (!token) return;
        navigator.clipboard.writeText(token).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const masked = token ? `${token.slice(0, 8)}${'•'.repeat(24)}${token.slice(-8)}` : '';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    <CardTitle className="text-base font-semibold">API Bearer Token</CardTitle>
                </div>
                <CardDescription>
                    Use this token to authenticate requests to the system API. Include it as{' '}
                    <code className="bg-muted rounded px-1 py-0.5 text-xs">Authorization: Bearer &lt;token&gt;</code> in your request headers.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {token ? (
                    <>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    readOnly
                                    value={revealed ? token : masked}
                                    className="font-mono text-sm pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setRevealed((r) => !r)}
                                    className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
                                >
                                    {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button type="button" variant="outline" size="icon" onClick={copy} title="Copy token">
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">{copied ? 'Copied!' : 'Copy'}</span>
                            </Button>
                        </div>
                        {copied && <p className="text-muted-foreground text-xs">Copied to clipboard!</p>}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={generate}
                                disabled={generateForm.processing}
                            >
                                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generateForm.processing ? 'animate-spin' : ''}`} />
                                Regenerate
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={revoke}
                                disabled={revokeForm.processing}
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Revoke
                            </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Regenerating issues a new token and immediately invalidates the old one. Revoking removes the token entirely.
                        </p>
                    </>
                ) : (
                    <div className="flex flex-col items-start gap-3">
                        <p className="text-muted-foreground text-sm">No bearer token has been generated yet.</p>
                        <Button type="button" size="sm" onClick={generate} disabled={generateForm.processing}>
                            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                            Generate Token
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
