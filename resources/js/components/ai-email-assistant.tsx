import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface AiEmailAssistantProps {
    currentContent: string;
    onResult: (html: string) => void;
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : ''
}

async function callGemini(action: 'write' | 'improve', payload: { prompt?: string; content?: string }): Promise<string> {
    const res = await fetch(route('ai.email'), {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Accept':        'application/json',
            'X-XSRF-TOKEN':  xsrfToken(),
        },
        body: JSON.stringify({ action, ...payload }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
    }

    return data.html as string;
}

export function AiEmailAssistant({ currentContent, onResult }: AiEmailAssistantProps) {
    const [showWriteDialog, setShowWriteDialog] = useState(false);
    const [prompt, setPrompt]                   = useState('');
    const [loading, setLoading]                 = useState(false);
    const [error, setError]                     = useState<string | null>(null);
    const textareaRef                           = useRef<HTMLTextAreaElement>(null);

    function openWriteDialog() {
        setError(null);
        setShowWriteDialog(true);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    function closeWriteDialog() {
        if (loading) return;
        setShowWriteDialog(false);
        setPrompt('');
        setError(null);
    }

    async function handleWrite() {
        if (!prompt.trim() || loading) return;
        setError(null);
        setLoading(true);
        try {
            const html = await callGemini('write', { prompt: prompt.trim() });
            onResult(html);
            closeWriteDialog();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function handleImprove() {
        if (!currentContent.trim() || loading) return;
        setError(null);
        setLoading(true);
        try {
            const html = await callGemini('improve', { content: currentContent });
            onResult(html);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    const hasContent = currentContent.replace(/<[^>]*>/g, '').trim().length > 0;

    return (
        <>
            {/* Buttons */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openWriteDialog}
                    disabled={loading}
                    className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    Write Email
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImprove}
                    disabled={loading || !hasContent}
                    className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                    {loading && !showWriteDialog ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Pencil className="h-3.5 w-3.5" />
                    )}
                    Improve
                </Button>

                {/* Inline error for Improve */}
                {error && !showWriteDialog && (
                    <p className="text-xs text-destructive">{error}</p>
                )}
            </div>

            {/* Write Email Dialog */}
            {showWriteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeWriteDialog}
                    />

                    {/* Panel */}
                    <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <h2 className="text-sm font-semibold">Write Email with AI</h2>
                            </div>
                            <button
                                onClick={closeWriteDialog}
                                disabled={loading}
                                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Describe the email you want to write. Be specific about the purpose, tone, and key points to include.
                            </p>
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleWrite();
                                    if (e.key === 'Escape') closeWriteDialog();
                                }}
                                disabled={loading}
                                rows={5}
                                maxLength={1000}
                                placeholder="e.g. Write a welcome email for new customers who just signed up, thank them and explain the next steps…"
                                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">{prompt.length}/1000</span>
                            </div>

                            {error && (
                                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                            <Button type="button" variant="outline" size="sm" onClick={closeWriteDialog} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleWrite}
                                disabled={loading || !prompt.trim()}
                                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                {loading ? 'Generating…' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
