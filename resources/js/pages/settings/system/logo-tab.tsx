import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from '@inertiajs/react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    logoUrl: string | null;
}

export default function LogoTab({ logoUrl }: Props) {
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const logoForm = useForm<{ logo: File | null }>({ logo: null });
    const deleteLogoForm = useForm({});

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

    const displayLogo = preview ?? logoUrl;

    return (
        <Card className="max-w-xl">
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
            </CardContent>
        </Card>
    );
}
