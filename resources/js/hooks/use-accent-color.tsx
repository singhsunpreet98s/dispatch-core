import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { applyAccentColor } from '@/lib/accent-colors';
import type { SharedData } from '@/types';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function isDarkMode(): boolean {
    const appearance = localStorage.getItem('appearance') || 'system';
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
}

export function useAccentColor() {
    const { auth } = usePage<SharedData>().props;
    const serverAccent = (auth.user?.accent_color as string | null | undefined) ?? null;

    const [accentColor, setAccentColor] = useState<string | null>(serverAccent);

    useEffect(() => {
        applyAccentColor(serverAccent, isDarkMode());
        setAccentColor(serverAccent);
    }, [serverAccent]);

    // Re-apply when dark/light mode changes (class toggled on <html>)
    useEffect(() => {
        const observer = new MutationObserver(() => {
            applyAccentColor(accentColor, isDarkMode());
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [accentColor]);

    const updateAccentColor = (slug: string | null) => {
        setAccentColor(slug);
        applyAccentColor(slug, isDarkMode());

        router.patch(route('appearance.update'), { accent_color: slug }, { preserveScroll: true });
    };

    return { accentColor, updateAccentColor };
}
