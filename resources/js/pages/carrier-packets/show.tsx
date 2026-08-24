import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, Download, FileText, Package, User } from 'lucide-react';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PacketStatus = 'pending' | 'opened' | 'submitted' | 'signed';

interface Document {
    id: number;
    type: string;
    original_name: string;
    size: number;
}

interface CarrierPacket {
    id: number;
    uuid: string;
    email: string;
    mc_number: string;
    company_name: string;
    status: PacketStatus;
    full_name: string | null;
    address: string | null;
    phone: string | null;
    signature_path: string | null;
    opened_at: string | null;
    submitted_at: string | null;
    signed_at: string | null;
    created_at: string;
    public_url: string;
    documents: Document[];
    user?: { name: string; email: string };
}

interface Props {
    packet: CarrierPacket;
    isAdmin: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
    mc_authority: 'MC Authority',
    w9:           'W-9',
    coi:          'COI / Certificate of Insurance',
    void_check:   'Void Check / Notice of Assignment',
};

const STATUS_CONFIG: Record<PacketStatus, { label: string; className: string }> = {
    pending:   { label: 'Pending',   className: 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400' },
    opened:    { label: 'Opened',    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
    submitted: { label: 'Submitted', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
    signed:    { label: 'Signed',    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
};

function StatusBadge({ status }: { status: PacketStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
        </span>
    );
}

function fmt(d: string | null) {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CarrierPacketShow({ packet, isAdmin }: Props) {
    const [copied, setCopied] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Carrier Packets', href: '/carrier-packets' },
        { title: packet.company_name, href: '#' },
    ];

    function copyLink() {
        navigator.clipboard.writeText(packet.public_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Packet — ${packet.company_name}`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
                        <Link href={route('carrier-packets.index')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold">{packet.company_name}</h1>
                            <StatusBadge status={packet.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">MC# {packet.mc_number} · {packet.email}</p>
                    </div>
                </div>

                {/* Public Link */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Public Onboarding Link</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                            <code className="flex-1 truncate text-xs text-muted-foreground">{packet.public_url}</code>
                            <Button variant="ghost" size="sm" onClick={copyLink} className="shrink-0 gap-1.5 text-xs">
                                {copied ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Share this link with the carrier. They can only complete it once.
                        </p>
                    </CardContent>
                </Card>

                {/* Status timeline */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Packet created', time: packet.created_at, done: true },
                                { label: 'Link opened by carrier', time: packet.opened_at, done: !!packet.opened_at },
                                { label: 'Details submitted', time: packet.submitted_at, done: !!packet.submitted_at },
                                { label: 'Agreement signed', time: packet.signed_at, done: !!packet.signed_at },
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${step.done ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}>
                                        {step.done ? '✓' : ''}
                                    </div>
                                    <div>
                                        <p className={`text-sm ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                                        {step.time && <p className="text-xs text-muted-foreground">{fmt(step.time)}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Customer details */}
                {(packet.full_name || packet.address || packet.phone) && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <User className="h-4 w-4" /> Carrier Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-3">
                            {packet.full_name && (
                                <div><p className="text-xs text-muted-foreground">Full Name</p><p className="text-sm font-medium">{packet.full_name}</p></div>
                            )}
                            {packet.phone && (
                                <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{packet.phone}</p></div>
                            )}
                            {packet.address && (
                                <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm font-medium">{packet.address}</p></div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Documents + Signature */}
                {packet.documents.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <FileText className="h-4 w-4" /> Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {packet.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium">{DOC_LABELS[doc.type] ?? doc.type}</p>
                                        <p className="text-xs text-muted-foreground">{doc.original_name} · {fmtBytes(doc.size)}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                                        <a href={route('carrier-packets.documents.download', { carrierPacket: packet.id, document: doc.id })}>
                                            <Download className="h-3.5 w-3.5" /> Download
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Signature */}
                {packet.signature_path && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Signature</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border bg-white p-4 dark:bg-zinc-950">
                                <img
                                    src={`/storage/${packet.signature_path}`}
                                    alt="Carrier signature"
                                    className="max-h-32 w-auto"
                                />
                            </div>
                            {packet.signed_at && (
                                <p className="mt-2 text-xs text-muted-foreground">Signed on {fmt(packet.signed_at)}</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Admin — created by */}
                {isAdmin && packet.user && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Created by</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium">{packet.user.name}</p>
                            <p className="text-sm text-muted-foreground">{packet.user.email}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
