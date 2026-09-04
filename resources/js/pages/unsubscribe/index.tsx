import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CheckCircle, MailX, RefreshCw } from 'lucide-react';

interface Props {
    userId: number | null;
    email: string | null;
    senderName: string | null;
    resubscribed: boolean;
    valid: boolean;
}

export default function UnsubscribePage({ userId, email, senderName, resubscribed, valid }: Props) {
    const { logoUrl } = usePage<SharedData>().props;

    const resubForm = useForm({ user_id: userId ?? 0, email: email ?? '' });

    function handleResubscribe(e: React.FormEvent) {
        e.preventDefault();
        resubForm.delete(route('unsubscribe.resubscribe'));
    }

    return (
        <>
            <Head title="Unsubscribe" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
                    <div className="mb-8 flex justify-center">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Company logo" className="max-h-16 max-w-[200px] object-contain" />
                        ) : (
                            <div className="text-lg font-bold tracking-tight text-gray-800">Uniship Cargo LLC</div>
                        )}
                    </div>

                    {!valid ? (
                        <div className="text-center">
                            <MailX className="mx-auto mb-4 h-12 w-12 text-red-400" />
                            <h1 className="mb-2 text-xl font-semibold text-gray-900">Invalid Link</h1>
                            <p className="text-sm text-gray-500">This unsubscribe link is invalid or has expired.</p>
                        </div>
                    ) : resubscribed ? (
                        <div className="text-center">
                            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                            <h1 className="mb-2 text-xl font-semibold text-gray-900">You're back!</h1>
                            <p className="text-sm text-gray-500">
                                <span className="font-medium text-gray-800">{email}</span> has been re-subscribed to updates
                                {senderName ? (
                                    <> from <span className="font-medium text-gray-800">{senderName}</span></>
                                ) : ''}.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                            <h1 className="mb-2 text-xl font-semibold text-gray-900">You've been unsubscribed</h1>
                            <p className="mb-6 text-sm text-gray-500">
                                <span className="font-medium text-gray-800">{email}</span> will no longer receive emails
                                {senderName ? (
                                    <> from <span className="font-medium text-gray-800">{senderName}</span></>
                                ) : ''}.
                            </p>
                            <form onSubmit={handleResubscribe}>
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    disabled={resubForm.processing}
                                    className="mx-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    {resubForm.processing ? 'Processing…' : 'Subscribe again'}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
