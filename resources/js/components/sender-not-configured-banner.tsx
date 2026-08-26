import { AlertTriangle } from 'lucide-react';

interface Props {
    isAdmin: boolean;
}

export function SenderNotConfiguredBanner({ isAdmin }: Props) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">SendGrid Sender ID not configured</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                    {isAdmin
                        ? 'Your account does not have a SendGrid Sender ID set. Go to the Users page and set your own Sender ID to enable templates, email lists, and campaigns.'
                        : 'Your account does not have a SendGrid Sender ID configured. Ask an admin to set your Sender ID in the Users settings before you can create templates, upload email lists, or send campaigns.'}
                </p>
            </div>
        </div>
    );
}
