import { cn } from '@/lib/utils';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './ui/button';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ACCEPTED_MIME = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() ?? '';
}

interface FileDropzoneProps {
    file: File | null;
    onFileSelect: (file: File) => void;
    onFileClear: () => void;
    error?: string;
    disabled?: boolean;
}

export function FileDropzone({ file, onFileSelect, onFileClear, error, disabled }: FileDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const displayError = error ?? localError;

    function validate(f: File): string | null {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            return `Unsupported format. Please upload ${ACCEPTED_EXTENSIONS.join(', ')} files only.`;
        }
        if (f.size > MAX_BYTES) {
            return 'File is too large. Maximum size is 10 MB.';
        }
        return null;
    }

    function handleFile(f: File) {
        const err = validate(f);
        if (err) {
            setLocalError(err);
            return;
        }
        setLocalError(null);
        onFileSelect(f);
    }

    function onDragOver(e: React.DragEvent) {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }

    function onDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFile(dropped);
    }

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0];
        if (selected) handleFile(selected);
        e.target.value = '';
    }

    if (file) {
        return (
            <div className="space-y-1.5">
                <div className={cn(
                    'flex items-center gap-4 rounded-lg border bg-muted/30 p-4',
                    displayError && 'border-destructive',
                )}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {getExtension(file.name)} · {formatBytes(file.size)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => { onFileClear(); setLocalError(null); }}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                {displayError && (
                    <p className="text-xs text-destructive">{displayError}</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={cn(
                    'flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                    isDragging
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/30',
                    disabled && 'cursor-not-allowed opacity-50',
                    displayError && 'border-destructive',
                )}
            >
                <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    isDragging ? 'bg-primary/10' : 'bg-muted',
                )}>
                    <Upload className={cn('h-5 w-5', isDragging && 'text-primary')} />
                </div>
                <div>
                    <p className="text-sm font-medium">
                        {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                    </p>
                    <p className="mt-1 text-xs">
                        or{' '}
                        <span className="font-medium text-primary underline-offset-2 hover:underline">
                            click to browse
                        </span>
                    </p>
                </div>
                <p className="text-xs text-muted-foreground/70">
                    Supports .xlsx, .xls, .csv · Max 10 MB
                </p>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={onInputChange}
                disabled={disabled}
            />

            {displayError && (
                <p className="text-xs text-destructive">{displayError}</p>
            )}
        </div>
    );
}
