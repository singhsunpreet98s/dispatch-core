import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';

interface Point { x: number; y: number }

interface SignaturePadProps {
    onChange: (dataUrl: string | null) => void;
    className?: string;
}

export function SignaturePad({ onChange, className = '' }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPoint = useRef<Point | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    function getPoint(e: React.MouseEvent | React.TouchEvent): Point {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    function startDrawing(e: React.MouseEvent | React.TouchEvent) {
        e.preventDefault();
        isDrawing.current = true;
        lastPoint.current = getPoint(e);
        setIsEmpty(false);
    }

    function draw(e: React.MouseEvent | React.TouchEvent) {
        e.preventDefault();
        if (!isDrawing.current || !lastPoint.current) return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const point = getPoint(e);

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        lastPoint.current = point;
    }

    function stopDrawing() {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        lastPoint.current = null;
        onChange(canvasRef.current?.toDataURL('image/png') ?? null);
    }

    function clear() {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        onChange(null);
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-white dark:bg-zinc-950">
                <canvas
                    ref={canvasRef}
                    width={700}
                    height={180}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {isEmpty && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <p className="select-none text-sm text-muted-foreground">Draw your signature here</p>
                    </div>
                )}
            </div>
            {!isEmpty && (
                <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
                    Clear and redo
                </Button>
            )}
        </div>
    );
}
