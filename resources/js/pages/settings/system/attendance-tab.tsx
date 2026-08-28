import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { type AttendanceSettings } from '@/types';
import { useForm } from '@inertiajs/react';
import { Check, MapPin, Plus, X } from 'lucide-react';
import { useState } from 'react';

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
        geofence_ids: attendanceSettings.geofence_ids as number[],
    });

    const [geofenceOpen, setGeofenceOpen] = useState(false);

    const currentIp = attendanceSettings.current_ip;
    const allGeofences = attendanceSettings.geofences ?? [];

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

    function toggleGeofence(id: number) {
        const current = attendanceForm.data.geofence_ids;
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        attendanceForm.setData('geofence_ids', next);
    }

    function removeGeofence(id: number) {
        attendanceForm.setData(
            'geofence_ids',
            attendanceForm.data.geofence_ids.filter((x) => x !== id),
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        attendanceForm.patch(route('attendance-settings.update'));
    }

    const selectedGeofences = allGeofences.filter((g) => attendanceForm.data.geofence_ids.includes(g.id));
    const unselectedGeofences = allGeofences.filter((g) => !attendanceForm.data.geofence_ids.includes(g.id));

    return (
        <Card className="max-w-xxl">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Attendance Settings</CardTitle>
                <CardDescription>Configure clock-in windows, shift end time, break minimums, IP restrictions, and geofences.</CardDescription>
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

                    {/* Whitelisted Geofences */}
                    <div className="space-y-2">
                        <Label>Whitelisted Geofences</Label>

                        {/* Selected geofence tags */}
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedGeofences.map((g) => (
                                <Badge key={g.id} variant="secondary" className="flex items-center gap-1 pr-1">
                                    <MapPin className="h-3 w-3" />
                                    {g.name}
                                    <button
                                        type="button"
                                        onClick={() => removeGeofence(g.id)}
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}

                            {/* + Add button */}
                            {unselectedGeofences.length > 0 && (
                                <Popover open={geofenceOpen} onOpenChange={setGeofenceOpen}>
                                    <PopoverTrigger asChild>
                                        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                            <Plus className="h-3.5 w-3.5" />
                                            Add geofence
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search geofences…" />
                                            <CommandList>
                                                <CommandEmpty>No geofences found.</CommandEmpty>
                                                <CommandGroup>
                                                    {unselectedGeofences.map((g) => (
                                                        <CommandItem
                                                            key={g.id}
                                                            value={g.name}
                                                            onSelect={() => {
                                                                toggleGeofence(g.id);
                                                                setGeofenceOpen(false);
                                                            }}
                                                        >
                                                            <Check className="mr-2 h-4 w-4 opacity-0" />
                                                            <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                            {g.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}

                            {allGeofences.length === 0 && (
                                <p className="text-muted-foreground text-xs">No geofences available. Create one on the Geofence page first.</p>
                            )}
                        </div>

                        <p className="text-muted-foreground text-xs">
                            Selected geofences will be marked as <span className="font-medium">Attendance</span> lookup. Leave empty to allow all locations.
                        </p>
                        {attendanceForm.errors.geofence_ids && (
                            <p className="text-destructive text-xs">{attendanceForm.errors.geofence_ids}</p>
                        )}
                    </div>

                    <Button type="submit" disabled={attendanceForm.processing}>
                        {attendanceForm.processing ? 'Saving…' : 'Save attendance settings'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
