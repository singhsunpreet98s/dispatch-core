import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type AttendanceHoliday } from '@/types';
import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

interface Props {
    holidays: AttendanceHoliday[];
}

export default function HolidaysTab({ holidays }: Props) {
    const addForm = useForm({ date: '', name: '' });
    const deleteForm = useForm({});

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        addForm.post(route('attendance.holidays.store'), {
            onSuccess: () => addForm.reset(),
        });
    }

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Holidays</CardTitle>
                <CardDescription>
                    Holidays are excluded from attendance calculations. Add or remove dates below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                            type="date"
                            value={addForm.data.date}
                            onChange={(e) => addForm.setData('date', e.target.value)}
                            className="w-40"
                            required
                        />
                        {addForm.errors.date && <p className="text-destructive text-xs">{addForm.errors.date}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Independence Day"
                            value={addForm.data.name}
                            onChange={(e) => addForm.setData('name', e.target.value)}
                            className="w-52"
                            required
                        />
                        {addForm.errors.name && <p className="text-destructive text-xs">{addForm.errors.name}</p>}
                    </div>
                    <Button type="submit" size="sm" disabled={addForm.processing}>
                        {addForm.processing ? 'Adding…' : 'Add Holiday'}
                    </Button>
                </form>

                {holidays.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No holidays added yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Remove</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays.map((h) => (
                                <TableRow key={h.id}>
                                    <TableCell className="font-mono text-sm">{h.date}</TableCell>
                                    <TableCell className="text-sm">{h.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive h-7 w-7"
                                            onClick={() => deleteForm.delete(route('attendance.holidays.destroy', h.id))}
                                            disabled={deleteForm.processing}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
