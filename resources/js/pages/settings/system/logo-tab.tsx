import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface Props {
    logoUrl: string | null;
    timezone: string;
    timezones: string[];
}

function getTzOffset(tz: string): string {
    try {
        const now = new Date();
        const utcMs = Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
        );
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const diffMin = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
        const sign = diffMin >= 0 ? '+' : '-';
        const abs = Math.abs(diffMin);
        const h = Math.floor(abs / 60).toString().padStart(2, '0');
        const m = (abs % 60).toString().padStart(2, '0');
        return `${sign}${h}:${m}`;
    } catch {
        return '+00:00';
    }
}

export default function LogoTab({ logoUrl, timezone, timezones }: Props) {
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const logoForm = useForm<{ logo: File | null }>({ logo: null });
    const deleteLogoForm = useForm({});
    const tzForm = useForm({ timezone });
    const [search, setSearch] = useState('');

    const tzOptions = useMemo(() => {
        return timezones.map((tz) => ({
            tz,
            offset: getTzOffset(tz),
            label: `(UTC${getTzOffset(tz)}) ${tz}`,
        })).sort((a, b) => a.offset.localeCompare(b.offset));
    }, [timezones]);

    const filtered = search.trim()
        ? tzOptions.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : tzOptions;

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;
        logoForm.setData('logo', file);
        setPreview(URL.createObjectURL(file));
    }

    function handleLogoSubmit(e: React.FormEvent) {
        e.preventDefault();
        logoForm.post(route('system-settings.logo'), {
            forceFormData: true,
            onSuccess: () => {
                setPreview(null);
                if (fileInput.current) fileInput.current.value = '';
            },
        });
    }

    function cancelPreview() {
        setPreview(null);
        logoForm.setData('logo', null);
        if (fileInput.current) fileInput.current.value = '';
    }

    function handleTzSubmit(e: React.FormEvent) {
        e.preventDefault();
        tzForm.patch(route('system-settings.timezone'));
    }

    const displayLogo = preview ?? logoUrl;
    const selectedOffset = useMemo(() => getTzOffset(tzForm.data.timezone), [tzForm.data.timezone]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Application Logo</CardTitle>
                <CardDescription>
                    Shown on the login screen and in the sidebar. Recommended: 200×60 px. PNG, JPG, SVG, or WebP — max 2 MB.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="bg-muted/40 border-border flex h-28 w-full items-center justify-center rounded-lg border border-dashed">
                    {displayLogo ? (
                        <img src={displayLogo} alt="Logo preview" className="max-h-20 max-w-full object-contain" />
                    ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-sm">
                            <ImageIcon className="h-8 w-8 opacity-40" />
                            <span>No logo uploaded</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleLogoSubmit} className="space-y-4">
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            {displayLogo ? 'Replace logo' : 'Upload logo'}
                        </Button>
                        {preview && (
                            <>
                                <Button type="submit" size="sm" disabled={logoForm.processing}>
                                    {logoForm.processing ? 'Saving…' : 'Save logo'}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={cancelPreview}>
                                    Cancel
                                </Button>
                            </>
                        )}
                        {logoUrl && !preview && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteLogoForm.delete(route('system-settings.logo.remove'))}
                                disabled={deleteLogoForm.processing}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove logo
                            </Button>
                        )}
                    </div>
                    {logoForm.errors.logo && <p className="text-destructive text-xs">{logoForm.errors.logo}</p>}
                </form>

                <div className="border-border border-t pt-4">
                    <form onSubmit={handleTzSubmit} className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="tz-search">Application Timezone</Label>
                            <input
                                id="tz-search"
                                type="search"
                                placeholder="Search timezone…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring mb-1 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
                            />
                            <select
                                id="timezone"
                                value={tzForm.data.timezone}
                                onChange={(e) => { tzForm.setData('timezone', e.target.value); setSearch(''); }}
                                className="border-input bg-background text-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                                size={6}
                            >
                                {filtered.map((o) => (
                                    <option key={o.tz} value={o.tz}>{o.label}</option>
                                ))}
                            </select>
                            <p className="text-muted-foreground text-xs">
                                Selected: <strong>{tzForm.data.timezone}</strong>
                                <span className="text-primary ml-1 font-semibold">(UTC{selectedOffset})</span>
                                — all scheduled emails and shift times use this timezone.
                                UTC timestamps are stored in the DB unchanged.
                            </p>
                            {tzForm.errors.timezone && <p className="text-destructive text-xs">{tzForm.errors.timezone}</p>}
                        </div>
                        <Button type="submit" size="sm" disabled={tzForm.processing}>
                            {tzForm.processing ? 'Saving…' : 'Save Timezone'}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
