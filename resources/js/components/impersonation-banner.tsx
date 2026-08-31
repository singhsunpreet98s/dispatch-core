import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { LogOut, UserCheck } from 'lucide-react';

export function ImpersonationBanner() {
    const { impersonating } = usePage<SharedData>().props;

    if (!impersonating) return null;

    function stopImpersonating() {
        router.post(route('impersonate.stop'));
    }

    return (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-white dark:bg-amber-600">
            <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 shrink-0" />
                <span>
                    You are logged in as <strong>{impersonating.as}</strong>
                </span>
            </div>
            <button
                onClick={stopImpersonating}
                className="flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium hover:bg-white/30 transition-colors"
            >
                <LogOut className="h-3.5 w-3.5" />
                Switch Back
            </button>
        </div>
    );
}
