import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { isoToTimeInput, timeToSeconds } from './helpers';
import type { BreakRow, EditBreakShiftContext } from './types';

export function EditBreakSheet({
    breakRow, open, onClose, tz, shift,
}: {
    breakRow: BreakRow | null;
    open: boolean;
    onClose: () => void;
    tz: string;
    shift: EditBreakShiftContext | null;
}) {
    const [startedAt, setStartedAt] = useState('');
    const [endedAt, setEndedAt] = useState('');
    const [errors, setErrors] = useState<{ start?: string; end?: string }>({});
    const [busy, setBusy] = useState(false);

    const shiftStart = shift?.clocked_in_at  ? isoToTimeInput(shift.clocked_in_at,  tz) : null;
    const shiftEnd   = shift?.clocked_out_at ? isoToTimeInput(shift.clocked_out_at, tz) : null;

    useEffect(() => {
        if (open && breakRow) {
            setStartedAt(isoToTimeInput(breakRow.started_at, tz));
            setEndedAt(isoToTimeInput(breakRow.ended_at, tz));
            setErrors({});
        }
    }, [open, breakRow]);

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) onClose();
    }

    function toHis(val: string): string { return val.length === 5 ? val + ':00' : val; }

    function validate(): boolean {
        const errs: { start?: string; end?: string } = {};
        const startSec      = startedAt  ? timeToSeconds(startedAt)  : null;
        const endSec        = endedAt    ? timeToSeconds(endedAt)    : null;
        const shiftStartSec = shiftStart ? timeToSeconds(shiftStart) : null;
        const shiftEndSec   = shiftEnd   ? timeToSeconds(shiftEnd)   : null;

        if (startSec !== null && shiftStartSec !== null && startSec < shiftStartSec) {
            errs.start = `Cannot be before shift start (${shiftStart})`;
        }
        if (startSec !== null && shiftEndSec !== null && startSec > shiftEndSec) {
            errs.start = `Cannot be after shift end (${shiftEnd})`;
        }
        if (endSec !== null && startSec !== null && endSec <= startSec) {
            errs.end = 'End time must be after start time';
        }
        if (endSec !== null && shiftEndSec !== null && endSec > shiftEndSec) {
            errs.end = `Cannot be after shift end (${shiftEnd})`;
        }
        if (endSec !== null && shiftStartSec !== null && endSec < shiftStartSec) {
            errs.end = `Cannot be before shift start (${shiftStart})`;
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function submit() {
        if (!breakRow || !validate()) return;
        setBusy(true);
        router.patch(
            route('attendance.breaks.update', { break: breakRow.id }),
            { started_at: toHis(startedAt), ended_at: endedAt ? toHis(endedAt) : null },
            { preserveScroll: true, onFinish: () => { setBusy(false); onClose(); } },
        );
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="flex w-80 flex-col gap-0 p-0">
                <SheetHeader className="border-b px-6 py-4">
                    <SheetTitle className="text-base">Edit Break</SheetTitle>
                </SheetHeader>
                <div className="flex-1 space-y-5 px-6 py-5">
                    {(shiftStart || shiftEnd) && (
                        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                            Shift: <span className="font-mono font-medium text-foreground">{shiftStart ?? '—'}</span>
                            {' → '}
                            <span className="font-mono font-medium text-foreground">{shiftEnd ?? 'open'}</span>
                        </p>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="break-start">Start time</Label>
                        <Input
                            id="break-start"
                            type="time"
                            step="1"
                            value={startedAt}
                            onChange={(e) => { setStartedAt(e.target.value); setErrors((p) => ({ ...p, start: undefined })); }}
                            className={errors.start ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {errors.start && <p className="text-xs text-destructive">{errors.start}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="break-end">
                            End time <span className="font-normal text-xs text-muted-foreground">(leave blank if open)</span>
                        </Label>
                        <Input
                            id="break-end"
                            type="time"
                            step="1"
                            value={endedAt}
                            onChange={(e) => { setEndedAt(e.target.value); setErrors((p) => ({ ...p, end: undefined })); }}
                            className={errors.end ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {errors.end && <p className="text-xs text-destructive">{errors.end}</p>}
                    </div>
                </div>
                <SheetFooter className="border-t px-6 py-4">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button size="sm" onClick={submit} disabled={busy}>Save</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
