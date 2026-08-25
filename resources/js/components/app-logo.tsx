import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Truck } from 'lucide-react';

export default function AppLogo() {
    const { logoUrl } = usePage<SharedData>().props;

    return (
        <>
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="size-8 object-contain" />
            ) : (
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                    <Truck />
                </div>
            )}
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">Dispatch Core</span>
            </div>
        </>
    );
}
