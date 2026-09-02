import { FileDropzone } from '@/components/file-dropzone';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle2, Download, FileSpreadsheet, RotateCcw, ScanSearch, ShieldX, UserMinus, Users } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    isAdmin: boolean;
}

interface ScanResult {
    total: number;
    total_removed: number;
    removed_unsubscribed: number;
    removed_blocked: number;
    removed_customers?: number;
    clean: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Email Filter', href: '/email-filter' },
];

type Stage = 'idle' | 'scanning' | 'done';

export default function EmailFilterIndex({ isAdmin }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | undefined>(undefined);
    const [stage, setStage] = useState<Stage>('idle');
    const [scanError, setScanError] = useState<string | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function reset() {
        setFile(null);
        setFileError(undefined);
        setStage('idle');
        setResult(null);
        setScanError(null);
    }

    async function handleScan() {
        if (!file) return;
        setStage('scanning');
        setScanError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        // Minimum animation time so all filter gates complete their animation
        const minDelay = isAdmin ? 3200 : 2400;

        try {
            const [data] = await Promise.all([
                fetch(route('email-filter.scan'), {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken },
                    body: formData,
                    signal: ctrl.signal,
                }).then(async (res) => {
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error ?? 'Something went wrong.');
                    return json as ScanResult;
                }),
                new Promise<void>((resolve) => setTimeout(resolve, minDelay)),
            ]);

            setResult(data);
            setStage('done');
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setScanError(err instanceof Error ? err.message : 'Network error. Please try again.');
            setStage('idle');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email Filter" />

            <style>{`
                @keyframes gateProgress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
                @keyframes checkPop {
                    from { opacity: 0; transform: scale(0.4) rotate(-20deg); }
                    to   { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes heroCount {
                    from { opacity: 0; transform: translateY(8px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .gate-fill {
                    animation: gateProgress 0.9s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                .gate-check {
                    animation: checkPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
                }
                .stat-tile {
                    animation: fadeSlideUp 0.5s ease forwards;
                }
                .hero-count {
                    animation: heroCount 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
                }
            `}</style>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
                <div className="w-full max-w-[520px]">

                    {/* ── Stage: idle / file selected ────────────────────── */}
                    {stage !== 'scanning' && stage !== 'done' && (
                        <div>
                            <div className="mb-7 text-center">
                                <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-widest">
                                    Email Filter
                                </p>
                                <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                                    Clean your list before sending
                                </h1>
                                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                                    Upload a CSV or Excel file. We'll strip every address that shouldn't receive your campaign.
                                </p>
                            </div>

                            <FileDropzone
                                file={file}
                                onFileSelect={(f) => { setFile(f); setScanError(null); }}
                                onFileClear={reset}
                                error={fileError}
                                disabled={false}
                            />

                            {scanError && (
                                <div className="border-destructive/30 bg-destructive/10 mt-4 flex items-start gap-2 rounded-lg border px-3.5 py-2.5">
                                    <span className="text-destructive mt-px shrink-0 text-sm">⚠</span>
                                    <p className="text-destructive text-sm">{scanError}</p>
                                </div>
                            )}

                            {file && (
                                <Button
                                    onClick={handleScan}
                                    className="mt-4 w-full gap-2"
                                    size="lg"
                                >
                                    <ScanSearch className="h-4 w-4" />
                                    Scan &amp; Filter
                                </Button>
                            )}

                            {/* What gets checked */}
                            {!file && (
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                                    <span className="text-muted-foreground/60 text-xs">Checks against</span>
                                    <CheckPill label="Unsubscribers" color="#f59e0b" />
                                    <CheckPill label="Blocked / Bounced" color="#ef4444" />
                                    {isAdmin && <CheckPill label="Customers" color="#3b82f6" />}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Stage: scanning ────────────────────────────────── */}
                    {stage === 'scanning' && file && (
                        <ScanningPanel filename={file.name} isAdmin={isAdmin} />
                    )}

                    {/* ── Stage: done ────────────────────────────────────── */}
                    {stage === 'done' && result && (
                        <ResultPanel
                            result={result}
                            isAdmin={isAdmin}
                            filename={file?.name ?? ''}
                            onReset={reset}
                        />
                    )}

                </div>
            </div>
        </AppLayout>
    );
}

// ── Check pill (idle state hint) ──────────────────────────────────────────────

function CheckPill({ label, color }: { label: string; color: string }) {
    return (
        <span className="flex items-center gap-1.5 text-xs" style={{ color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="text-muted-foreground">{label}</span>
        </span>
    );
}

// ── Scanning panel ────────────────────────────────────────────────────────────

const GATES = [
    { label: 'Unsubscribers',   color: '#f59e0b', delay: 0 },
    { label: 'Blocked / Bounced', color: '#ef4444', delay: 1000 },
];
const ADMIN_GATE = { label: 'Customers', color: '#3b82f6', delay: 2000 };

function ScanningPanel({ filename, isAdmin }: { filename: string; isAdmin: boolean }) {
    const gates = isAdmin ? [...GATES, ADMIN_GATE] : GATES;

    return (
        <div>
            {/* File chip */}
            <div className="bg-muted/40 mb-6 flex items-center gap-3 rounded-xl border px-4 py-3.5">
                <div className="bg-primary/8 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <FileSpreadsheet className="text-primary h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{filename}</p>
                    <p className="text-muted-foreground text-xs">Filtering your list…</p>
                </div>
                <ScanSearch className="text-primary h-4 w-4 animate-pulse" />
            </div>

            {/* Filter gates */}
            <div className="space-y-5">
                {gates.map((gate, i) => (
                    <GateRow key={gate.label} {...gate} index={i} />
                ))}
            </div>
        </div>
    );
}

function GateRow({ label, color, delay, index }: { label: string; color: string; delay: number; index: number }) {
    // Fill completes 900ms after start; check appears 950ms after start
    const checkDelay = delay + 950;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ background: color, fontSize: 10, fontWeight: 700 }}
                    >
                        {index + 1}
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                </div>
                {/* Checkmark — appears after fill */}
                <span
                    className="gate-check"
                    style={{ opacity: 0, animationDelay: `${checkDelay}ms`, animationFillMode: 'forwards' }}
                >
                    <CheckCircle2 className="h-4 w-4" style={{ color }} />
                </span>
            </div>

            {/* Progress track */}
            <div className="relative h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                    className="gate-fill absolute top-0 left-0 h-full rounded-full"
                    style={{
                        width: 0,
                        background: color,
                        animationDelay: `${delay}ms`,
                        animationFillMode: 'forwards',
                        opacity: 0.85,
                    }}
                />
            </div>
        </div>
    );
}

// ── Result panel ──────────────────────────────────────────────────────────────

interface ResultPanelProps {
    result: ScanResult;
    isAdmin: boolean;
    filename: string;
    onReset: () => void;
}

function ResultPanel({ result, isAdmin, filename, onReset }: ResultPanelProps) {
    const unsubCount = isAdmin
        ? result.removed_unsubscribed
        : result.removed_unsubscribed + (result.removed_customers ?? 0);
    const blockedCount = result.removed_blocked;
    const custCount = isAdmin ? (result.removed_customers ?? 0) : 0;

    const cleanPct = result.total > 0 ? (result.clean / result.total) * 100 : 100;

    const removedTiles = [
        { label: 'Unsubscribed', value: unsubCount, color: '#f59e0b', icon: <UserMinus className="h-3.5 w-3.5" /> },
        { label: 'Blocked / Bounced', value: blockedCount, color: '#ef4444', icon: <ShieldX className="h-3.5 w-3.5" /> },
        ...(isAdmin ? [{ label: 'Customers', value: custCount, color: '#3b82f6', icon: <Users className="h-3.5 w-3.5" /> }] : []),
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6 text-center">
                <div className="mb-3 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Scan complete</span>
                </div>
                <p className="text-muted-foreground truncate text-xs">{filename}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                    {result.total.toLocaleString()} emails scanned · {result.total_removed.toLocaleString()} removed
                </p>
            </div>

            {/* Removed category tiles */}
            <div className={`mb-5 grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {removedTiles.map((tile, i) => (
                    <div
                        key={tile.label}
                        className="stat-tile rounded-xl border px-4 py-3.5 text-center"
                        style={{
                            opacity: 0,
                            animationDelay: `${i * 80}ms`,
                            animationFillMode: 'forwards',
                            borderColor: tile.color + '33',
                            background: tile.color + '0d',
                        }}
                    >
                        <div
                            className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full"
                            style={{ background: tile.color + '20', color: tile.color }}
                        >
                            {tile.icon}
                        </div>
                        <p
                            className="text-2xl font-bold tabular-nums leading-none"
                            style={{ color: tile.color }}
                        >
                            {tile.value.toLocaleString()}
                        </p>
                        <p className="text-muted-foreground mt-1.5 text-xs leading-tight">{tile.label}</p>
                    </div>
                ))}
            </div>

            {/* Progress bar */}
            <div className="mb-5">
                <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Removed</span>
                    <span className="text-muted-foreground">Clean</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-border/40">
                    {result.total_removed > 0 && (
                        <div
                            className="h-full rounded-l-full bg-rose-400/60 transition-all duration-1000"
                            style={{ width: `${100 - cleanPct}%` }}
                        />
                    )}
                    <div
                        className="h-full rounded-r-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${cleanPct}%` }}
                    />
                </div>
            </div>

            {/* Hero clean count */}
            <div className="hero-count mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 py-7 text-center dark:border-emerald-800/40 dark:bg-emerald-950/20"
                 style={{ opacity: 0, animationDelay: '200ms', animationFillMode: 'forwards' }}>
                <p className="text-6xl font-bold tabular-nums leading-none tracking-tight text-emerald-600 dark:text-emerald-400">
                    {result.clean.toLocaleString()}
                </p>
                <p className="text-muted-foreground mt-2 text-sm font-medium">
                    clean emails ready to send
                </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
                <a href={route('email-filter.download')} download="filtered-emails.csv">
                    <Button className="w-full gap-2" size="lg">
                        <Download className="h-4 w-4" />
                        Download filtered list
                    </Button>
                </a>
                <Button variant="ghost" className="w-full gap-2 text-sm" onClick={onReset}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Filter another list
                </Button>
            </div>
        </div>
    );
}
