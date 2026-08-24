import { EmailEditor } from '@/components/email-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Templates', href: '/templates' },
    { title: 'New Template', href: '/templates/create' },
];

interface FormData {
    title: string;
    subject: string;
    body: string;
    [key: string]: string;
}

export default function CreateTemplate() {
    const form = useForm<FormData>({ title: '', subject: '', body: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('templates.store'));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Template" />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">New Template</h1>
                        <p className="text-sm text-muted-foreground">Create a reusable email template</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('templates.index')}>Cancel</Link>
                        </Button>
                        <Button onClick={handleSubmit} disabled={form.processing}>
                            Save Template
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="title">Template Title</Label>
                            <Input
                                id="title"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="e.g. Monthly Newsletter"
                            />
                            {form.errors.title && (
                                <p className="text-xs text-destructive">{form.errors.title}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Email Subject</Label>
                            <Input
                                id="subject"
                                value={form.data.subject}
                                onChange={(e) => form.setData('subject', e.target.value)}
                                placeholder="e.g. Your monthly update is here"
                            />
                            {form.errors.subject && (
                                <p className="text-xs text-destructive">{form.errors.subject}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email Body</Label>
                        <EmailEditor
                            content={form.data.body}
                            onChange={(html) => form.setData('body', html)}
                            placeholder="Write your email content here…"
                        />
                        {form.errors.body && (
                            <p className="text-xs text-destructive">{form.errors.body}</p>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
