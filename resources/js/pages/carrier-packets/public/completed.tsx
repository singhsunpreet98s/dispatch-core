import { Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

interface Props { packet: { company_name: string; mc_number: string } }

export default function CarrierPacketCompleted({ packet }: Props) {
    return (
        <>
            <Head title="Packet Complete" />
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold">All done!</h1>
                    <p className="mt-2 text-muted-foreground">
                        Your carrier packet for <span className="font-medium text-foreground">{packet.company_name}</span> has been submitted and signed successfully.
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">
                        MC# {packet.mc_number} · You may now close this window.
                    </p>
                </div>
            </div>
        </>
    );
}
