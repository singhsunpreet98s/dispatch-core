import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function DCMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
            {/* D — hollow letterform, radius 7, spans y 3–17 */}
            <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M1 3h4a7 7 0 0 1 0 14H1V3zm2.25 2.5v9H5a4.5 4.5 0 0 0 0-9H3.25z" />
            {/* C — same radius 7, center at (17,10) overlapping D's bowl */}
            <path stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" d="M19.5 7.94A7 6 0 1 0 19.5 12.06" />
        </svg>
    );
}

export default function AppLogo() {
    const { logoUrl } = usePage<SharedData>().props;

    return (
        <>
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="size-8 object-contain" />
            ) : (
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-linear-to-br">
                    <DCMark className="text-primary size-8" />
                </div>
            )}
            <div className="ml-1.5 grid flex-1 text-left leading-none">
                <span className="truncate text-sm font-bold tracking-tight">Dispatch Core</span>
            </div>
        </>
    );
}
