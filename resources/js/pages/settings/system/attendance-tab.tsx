import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type AttendanceSettings } from '@/types';
import { useForm } from '@inertiajs/react';

interface Props {
    attendanceSettings: AttendanceSettings;
}

export default function AttendanceTab({ attendanceSettings }: Props) {
    const attendanceForm = useForm({
        clock_in_start: attendanceSettings.clock_in_start,
        clock_in_end: attendanceSettings.clock_in_end,
        shift_end: attendanceSettings.shift_end,
        min_break_minutes: attendanceSettings.min_break_minutes,
        ip_whitelist: attendanceSettings.ip_whitelist,
    });

    const currentIp = attendanceSettings.current_ip;

    const isCurrentIpWhitelisted = currentIp
        ? attendanceForm.data.ip_whitelist
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .includes(currentIp)
        : false;

    function addCurrentIp() {
        if (!currentIp || isCurrentIpWhitelisted) return;
        const existing = attendanceForm.data.ip_whitelist.trimEnd();
        attendanceForm.setData('ip_whitelist', existing ? `${existing}\n${currentIp}` : currentIp);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        attendanceForm.patch(route('attendance-settings.update'));
    }

    return (
        <Card className="max-w-xxl">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Attendance Settings</CardTitle>
                <CardDescription>Configure clock-in windows, shift end time, break minimums, and IP restrictions.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="clock_in_start">Clock-in opens</Label>
                            <Input
                                id="clock_in_start"
                                type="time"
                                value={attendanceForm.data.clock_in_start}
                                onChange={(e) => attendanceForm.setData('clock_in_start', e.target.value)}
                            />
                            {attendanceForm.errors.clock_in_start && (
                                <p className="text-destructive text-xs">{attendanceForm.errors.clock_in_start}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="clock_in_end">Clock-in closes</Label>
                            <Input
                                id="clock_in_end"
                                type="time"
                                value={attendanceForm.data.clock_in_end}
                                onChange={(e) => attendanceForm.setData('clock_in_end', e.target.value)}
                            />
                            {attendanceForm.errors.clock_in_end && <p className="text-destructive text-xs">{attendanceForm.errors.clock_in_end}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="shift_end">Shift auto-end time</Label>
                            <Input
                                id="shift_end"
                                type="time"
                                value={attendanceForm.data.shift_end}
                                onChange={(e) => attendanceForm.setData('shift_end', e.target.value)}
                                className="max-w-[180px]"
                            />
                            <p className="text-muted-foreground text-xs">All open shifts are automatically closed at this time.</p>
                            {attendanceForm.errors.shift_end && <p className="text-destructive text-xs">{attendanceForm.errors.shift_end}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="min_break_minutes">Minimum break (minutes)</Label>
                            <Input
                                id="min_break_minutes"
                                type="number"
                                min={1}
                                max={120}
                                value={attendanceForm.data.min_break_minutes}
                                onChange={(e) => attendanceForm.setData('min_break_minutes', parseInt(e.target.value, 10) || 15)}
                                className="max-w-[120px]"
                            />
                            {attendanceForm.errors.min_break_minutes && (
                                <p className="text-destructive text-xs">{attendanceForm.errors.min_break_minutes}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="ip_whitelist">Allowed IPs / CIDR ranges</Label>
                            {currentIp && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">
                                        Your IP: <span className="text-foreground font-mono font-medium">{currentIp}</span>
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isCurrentIpWhitelisted ? 'secondary' : 'outline'}
                                        onClick={addCurrentIp}
                                        disabled={isCurrentIpWhitelisted}
                                        className="h-7 text-xs"
                                    >
                                        {isCurrentIpWhitelisted ? 'Already whitelisted' : 'Whitelist my IP'}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Textarea
                            id="ip_whitelist"
                            rows={5}
                            placeholder={'192.168.1.0/24\n10.0.0.1'}
                            value={attendanceForm.data.ip_whitelist}
                            onChange={(e) => attendanceForm.setData('ip_whitelist', e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">One IP address or CIDR range per line. Leave blank to allow all IPs.</p>
                        {attendanceForm.errors.ip_whitelist && <p className="text-destructive text-xs">{attendanceForm.errors.ip_whitelist}</p>}
                    </div>

                    <Button type="submit" disabled={attendanceForm.processing}>
                        {attendanceForm.processing ? 'Saving…' : 'Save attendance settings'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
