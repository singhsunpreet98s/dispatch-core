import { SignaturePad } from '@/components/signature-pad';
import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, FileText, Package, PenLine } from 'lucide-react';
import { useState } from 'react';

interface PacketInfo { uuid: string; company_name: string; mc_number: string }
interface Customer { full_name: string | null; address: string | null; phone: string | null }
interface Props {
    packet: PacketInfo;
    customer: Customer;
    documentTypes: string[];
}

const DOC_LABELS: Record<string, string> = {
    mc_authority: 'MC Authority',
    w9:           'W-9',
    coi:          'COI / Certificate of Insurance',
    void_check:   'Void Check / Notice of Assignment',
};

const AGREEMENT = (company: string) => `
CARRIER AGREEMENT

This Carrier Agreement ("Agreement") is entered into between ${company} ("Carrier") and the Broker ("Broker").

1. CARRIER AUTHORITY
Carrier represents and warrants that it holds all necessary operating authority, permits, and licenses required by applicable federal, state, and local regulations, including a valid MC Number as provided.

2. INSURANCE REQUIREMENTS
Carrier shall maintain and keep in force, at its sole expense, the following minimum insurance coverage throughout the term of this Agreement:
  • Commercial Auto Liability: $1,000,000 per occurrence
  • Cargo Insurance: $100,000 per occurrence
  • General Liability: $1,000,000 per occurrence

3. COMPLIANCE
Carrier agrees to comply with all applicable federal, state, and local laws, rules, regulations, and ordinances governing the transportation of freight, including but not limited to DOT regulations and FMCSA requirements.

4. INDEPENDENT CONTRACTOR
Carrier is an independent contractor and not an employee, agent, or partner of Broker. Carrier is solely responsible for its drivers, equipment, and operations.

5. PAYMENT TERMS
Payment shall be made according to the agreed-upon terms as specified in individual load confirmations or rate agreements between the parties.

6. LIMITATION OF LIABILITY
Neither party shall be liable for indirect, incidental, or consequential damages arising out of or related to this Agreement.

7. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties regarding carrier onboarding and supersedes all prior discussions.

By signing below, Carrier acknowledges having read, understood, and agreed to all terms of this Agreement.
`.trim();

export default function CarrierAgreement({ packet, customer, documentTypes }: Props) {
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSign(e: React.FormEvent) {
        e.preventDefault();
        if (!signature || submitting) return;
        setSubmitting(true);
        router.post(
            route('packet.sign', packet.uuid),
            { signature },
            {
                onError: (errs) => { setErrors(errs); setSubmitting(false); },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <Head title={`Agreement — ${packet.company_name}`} />

            <div className="min-h-screen bg-background py-10">
                <div className="mx-auto max-w-2xl px-4">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold">{packet.company_name}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">MC# {packet.mc_number} · Carrier Agreement</p>
                    </div>

                    <form onSubmit={handleSign} className="space-y-6">
                        {/* Summary of submitted info */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Submitted Information</h2>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex gap-2">
                                    <dt className="w-28 shrink-0 text-muted-foreground">Name</dt>
                                    <dd className="font-medium">{customer.full_name ?? '—'}</dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="w-28 shrink-0 text-muted-foreground">Phone</dt>
                                    <dd className="font-medium">{customer.phone ?? '—'}</dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="w-28 shrink-0 text-muted-foreground">Address</dt>
                                    <dd className="font-medium">{customer.address ?? '—'}</dd>
                                </div>
                            </dl>

                            {documentTypes.length > 0 && (
                                <>
                                    <div className="my-3 border-t" />
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents uploaded</p>
                                    <ul className="space-y-1">
                                        {documentTypes.map((type) => (
                                            <li key={type} className="flex items-center gap-2 text-sm">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                {DOC_LABELS[type] ?? type}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>

                        {/* Agreement text */}
                        <div className="rounded-xl border bg-card shadow-sm">
                            <div className="border-b px-5 py-3">
                                <h2 className="flex items-center gap-2 text-sm font-semibold">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    Carrier Agreement
                                </h2>
                            </div>
                            <div className="max-h-72 overflow-y-auto px-5 py-4">
                                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                                    {AGREEMENT(packet.company_name)}
                                </pre>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <PenLine className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">Your Signature</h2>
                            </div>
                            <p className="mb-3 text-xs text-muted-foreground">
                                By signing below you confirm you have read and agree to the Carrier Agreement above.
                            </p>
                            <SignaturePad onChange={setSignature} />
                            {errors.signature && <p className="mt-1 text-xs text-destructive">{errors.signature}</p>}
                            {!signature && <p className="mt-1 text-xs text-muted-foreground">Please draw your signature to continue.</p>}
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={!signature || submitting}
                        >
                            {submitting ? 'Saving…' : 'Sign & Complete →'}
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}
