import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { useAccentColor } from '@/hooks/use-accent-color';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { ACCENT_COLORS } from '@/lib/accent-colors';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    const { accentColor, updateAccentColor } = useAccentColor();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />

                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-medium">Accent color</p>
                            <p className="text-muted-foreground text-sm">Choose a color used across buttons, links, and highlights.</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {ACCENT_COLORS.map((color) => {
                                const isSelected = (accentColor ?? 'indigo') === color.value;
                                return (
                                    <button
                                        key={color.value}
                                        title={color.name}
                                        onClick={() => updateAccentColor(color.value === 'indigo' ? null : color.value)}
                                        className={cn(
                                            'h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none',
                                            isSelected && 'ring-2 ring-offset-2 ring-offset-background',
                                        )}
                                        style={{
                                            backgroundColor: color.light,
                                            ...(isSelected ? { boxShadow: `0 0 0 2px ${color.light}` } : {}),
                                        }}
                                        aria-pressed={isSelected}
                                        aria-label={color.name}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
