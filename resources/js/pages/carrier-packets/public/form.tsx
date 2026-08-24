import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Head, useForm } from '@inertiajs/react';
import { FileUp, Package, Upload } from 'lucide-react';
import { useRef } from 'react';

interface PacketInfo { uuid: string; company_name: string; mc_number: string }
interface Props { packet: PacketInfo }

const DOC_FIELDS = [
    { key: 'mc_authority', label: 'MC Authority',                      desc: 'Operating authority certificate from FMCSA' },
    { key: 'w9',           label: 'W-9',                               desc: 'IRS W-9 tax form' },
    { key: 'coi',          label: 'COI / Certificate of Insurance',    desc: 'Current certificate of insurance' },
    { key: 'void_check',   label: 'Void Check / Notice of Assignment', desc: 'For payment setup' },
] as const;

type DocKey = typeof DOC_FIELDS[number]['key'];

interface FormData {
    full_name: string;
    address: string;
    phone: string;
    mc_authority: File | null;
    w9: File | null;
    coi: File | null;
    void_check: File | null;
    [key: string]: string | File | null;
}

export default function CarrierPacketForm({ packet }: Props) {
    const form = useForm<FormData>({
        full_name: '',
        address: '',
        phone: '',
        mc_authority: null,
        w9: null,
        coi: null,
        void_check: null,
    });

    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('packet.submit', packet.uuid), { forceFormData: true });
    }

    return (
        <>
            <Head title={`Carrier Packet — ${packet.company_name}`} />

            <div className="min-h-screen bg-background py-10">
                <div className="mx-auto max-w-2xl px-4">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <Package className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold">{packet.company_name}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">MC# {packet.mc_number} · Carrier Onboarding Packet</p>
                        <p className="mt-3 text-sm text-muted-foreground">
                            Please fill in your details and upload the required documents below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Info */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <h2 className="mb-4 text-base font-semibold">Your Information</h2>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="full_name"
                                        value={form.data.full_name}
                                        onChange={(e) => form.setData('full_name', e.target.value)}
                                        placeholder="John Smith"
                                        autoFocus
                                    />
                                    {form.errors.full_name && <p className="text-xs text-destructive">{form.errors.full_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="phone"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        type="tel"
                                    />
                                    {form.errors.phone && <p className="text-xs text-destructive">{form.errors.phone}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                                    <Textarea
                                        id="address"
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        placeholder="123 Main St, City, State, ZIP"
                                        rows={3}
                                    />
                                    {form.errors.address && <p className="text-xs text-destructive">{form.errors.address}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Document Uploads */}
                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-semibold">Required Documents</h2>
                                    <p className="text-sm text-muted-foreground">All four documents must be uploaded · PDF, JPG, or PNG · Max 10 MB each</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {DOC_FIELDS.map((field) => {
                                    const file = form.data[field.key] as File | null;
                                    return (
                                        <div key={field.key} className="space-y-1.5">
                                            <Label className="text-sm font-medium">
                                                {field.label} <span className="text-destructive">*</span>
                                            </Label>
                                            <p className="text-xs text-muted-foreground">{field.desc}</p>

                                            <div
                                                className={`relative flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/5 ${file ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20' : 'border-border'}`}
                                                onClick={() => fileRefs.current[field.key]?.click()}
                                            >
                                                <input
                                                    ref={(el) => { fileRefs.current[field.key] = el; }}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0] ?? null;
                                                        form.setData(field.key as DocKey, f);
                                                    }}
                                                />
                                                {file ? (
                                                    <>
                                                        <FileUp className="h-4 w-4 shrink-0 text-emerald-600" />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                                                            <p className="text-xs text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <p className="text-sm text-muted-foreground">Click to upload</p>
                                                    </>
                                                )}
                                            </div>
                                            {form.errors[field.key] && <p className="text-xs text-destructive">{form.errors[field.key] as string}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Continue to Agreement →'}
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}
