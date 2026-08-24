import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ChallengeForm {
    code: string;
    recovery_code: string;
    [key: string]: string;
}

const DIGITS = 6;

function OtpInput({ onComplete, error, disabled }: { onComplete: (code: string) => void; error?: string; disabled: boolean }) {
    const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    // Reset on error
    useEffect(() => {
        if (error) {
            setDigits(Array(DIGITS).fill(''));
            refs.current[0]?.focus();
        }
    }, [error]);

    function focusNext(index: number) {
        refs.current[index + 1]?.focus();
    }

    function focusPrev(index: number) {
        refs.current[index - 1]?.focus();
    }

    function handleChange(index: number, value: string) {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = digit;
        setDigits(next);

        if (digit) {
            if (index < DIGITS - 1) {
                focusNext(index);
            }
            const filled = next.join('');
            if (filled.length === DIGITS) {
                onComplete(filled);
            }
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            } else {
                focusPrev(index);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focusPrev(index);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focusNext(index);
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
        if (!pasted) return;
        const next = [...Array(DIGITS).fill('')];
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        const focusIdx = Math.min(pasted.length, DIGITS - 1);
        refs.current[focusIdx]?.focus();
        if (pasted.length === DIGITS) {
            onComplete(pasted);
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => { refs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        autoFocus={i === 0}
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        disabled={disabled}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                            'h-14 w-11 rounded-lg border text-center text-xl font-semibold tracking-widest',
                            'bg-background text-foreground',
                            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                            'transition-colors',
                            error ? 'border-destructive focus:ring-destructive' : 'border-input',
                            disabled && 'opacity-50 cursor-not-allowed',
                        )}
                    />
                ))}
            </div>
            {error && <p className="text-destructive text-xs text-center">{error}</p>}
        </div>
    );
}

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);
    const pendingCode = useRef('');
    const form = useForm<ChallengeForm>({ code: '', recovery_code: '' });

    // transform runs synchronously at post time — reads from ref, not stale state
    form.transform((data) => ({ ...data, code: pendingCode.current }));

    function submitCode(code: string) {
        pendingCode.current = code;
        form.post(route('two-factor.challenge'), {
            onError: () => { pendingCode.current = ''; },
        });
    }

    function handleRecoverySubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('two-factor.challenge'), {
            onError: () => form.setData('recovery_code', ''),
        });
    }

    function toggleMode() {
        setUseRecovery((v) => !v);
        form.clearErrors();
        form.setData({ code: '', recovery_code: '' });
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <Head title="Two-factor authentication" />

            <div className="w-full max-w-sm space-y-8">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Two-factor authentication</h1>
                    <p className="text-muted-foreground text-sm">
                        {useRecovery
                            ? 'Enter one of your recovery codes to continue.'
                            : 'Enter the 6-digit code from your authenticator app.'}
                    </p>
                </div>

                {useRecovery ? (
                    <form onSubmit={handleRecoverySubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="recovery_code">Recovery code</Label>
                            <Input
                                id="recovery_code"
                                value={form.data.recovery_code}
                                onChange={(e) => form.setData('recovery_code', e.target.value)}
                                placeholder="xxxxx-xxxxx"
                                autoFocus
                                autoComplete="one-time-code"
                                disabled={form.processing}
                            />
                            {form.errors.code && <p className="text-destructive text-xs">{form.errors.code}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={form.processing}>
                            {form.processing ? 'Verifying…' : 'Continue'}
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <OtpInput
                            onComplete={submitCode}
                            error={form.errors.code}
                            disabled={form.processing}
                        />
                        {form.processing && (
                            <p className="text-muted-foreground text-center text-sm">Verifying…</p>
                        )}
                    </div>
                )}

                <div className="text-center">
                    <button
                        type="button"
                        onClick={toggleMode}
                        disabled={form.processing}
                        className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                        {useRecovery ? 'Use authenticator code instead' : "Don't have access? Use a recovery code"}
                    </button>
                </div>
            </div>
        </div>
    );
}
