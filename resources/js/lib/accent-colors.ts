export interface AccentColor {
    name: string;
    value: string;
    light: string;
    dark: string;
}

export const ACCENT_COLORS: AccentColor[] = [
    { name: 'Indigo',   value: 'indigo',   light: 'hsl(243 75% 59%)', dark: 'hsl(237 88% 73%)' },
    { name: 'Violet',   value: 'violet',   light: 'hsl(258 90% 66%)', dark: 'hsl(255 91% 76%)' },
    { name: 'Purple',   value: 'purple',   light: 'hsl(271 81% 56%)', dark: 'hsl(271 76% 70%)' },
    { name: 'Pink',     value: 'pink',     light: 'hsl(330 81% 60%)', dark: 'hsl(330 81% 74%)' },
    { name: 'Rose',     value: 'rose',     light: 'hsl(351 89% 60%)', dark: 'hsl(351 89% 72%)' },
    { name: 'Orange',   value: 'orange',   light: 'hsl(25 95% 53%)',  dark: 'hsl(25 90% 68%)'  },
    { name: 'Amber',    value: 'amber',    light: 'hsl(38 92% 50%)',  dark: 'hsl(38 90% 65%)'  },
    { name: 'Emerald',  value: 'emerald',  light: 'hsl(152 69% 43%)', dark: 'hsl(152 69% 57%)' },
    { name: 'Teal',     value: 'teal',     light: 'hsl(172 66% 44%)', dark: 'hsl(172 66% 58%)' },
    { name: 'Cyan',     value: 'cyan',     light: 'hsl(188 86% 47%)', dark: 'hsl(188 86% 60%)' },
    { name: 'Sky',      value: 'sky',      light: 'hsl(199 89% 48%)', dark: 'hsl(199 89% 62%)' },
    { name: 'Blue',     value: 'blue',     light: 'hsl(213 94% 51%)', dark: 'hsl(213 94% 65%)' },
];

// Extracts H and S from "hsl(H S% L%)" and returns a very light tint at the given lightness
function toTint(hsl: string, lightness: number): string {
    const m = hsl.match(/hsl\((\d+)\s+(\d+)%/);
    return m ? `hsl(${m[1]} ${m[2]}% ${lightness}%)` : hsl;
}

export function applyAccentColor(slug: string | null, isDark: boolean): void {
    const root = document.documentElement;

    if (!slug) {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--ring');
        root.style.removeProperty('--sidebar-primary');
        root.style.removeProperty('--sidebar-accent');
        root.style.removeProperty('--sidebar-accent-foreground');
        return;
    }

    const color = ACCENT_COLORS.find((c) => c.value === slug);
    if (!color) return;

    const hsl = isDark ? color.dark : color.light;
    // Hover tint: same hue/saturation but very light (light mode ~93%, dark mode ~20%)
    const hoverTint = toTint(hsl, isDark ? 20 : 93);

    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    // Hover uses a light tint; active state is handled via inline style in nav-main
    root.style.setProperty('--sidebar-accent', hoverTint);
    root.style.setProperty('--sidebar-accent-foreground', hsl);
}
