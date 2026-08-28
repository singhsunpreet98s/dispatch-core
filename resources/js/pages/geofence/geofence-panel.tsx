import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCENT_COLORS } from '@/lib/accent-colors';
import { router } from '@inertiajs/react';
import { Edit2, Loader2, MapPin, PencilRuler, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DrawnShape, Step } from './index';
import type { Geofence } from './types';

interface Props {
    geofences: Geofence[];
    step: Step;
    onStepChange: (s: Step) => void;
    drawnShape: DrawnShape | null;
    onStartDraw: (type: 'circle' | 'polygon') => void;
    onCancelDraw: () => void;
    onStartEditDraw: (type: 'circle' | 'polygon') => void;
    editingGeofence: Geofence | null;
    onEditRequest: (g: Geofence) => void;
}

export default function GeofencePanel({
    geofences,
    step,
    onStepChange,
    drawnShape,
    onStartDraw,
    onCancelDraw,
    onStartEditDraw,
    editingGeofence,
    onEditRequest,
}: Props) {
    // ── Create form state ──
    const [name, setName]   = useState('');
    const [type, setType]   = useState<'circle' | 'polygon'>('circle');
    const [color, setColor] = useState(ACCENT_COLORS[0].light);
    const [saving, setSaving] = useState(false);

    // ── Edit form state ──
    const [editName, setEditName]   = useState('');
    const [editColor, setEditColor] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Populate edit form whenever the target geofence changes
    useEffect(() => {
        if (editingGeofence) {
            setEditName(editingGeofence.name);
            setEditColor(editingGeofence.color);
            setEditSaving(false);
        }
    }, [editingGeofence?.id]);

    function resetCreate() {
        setName('');
        setType('circle');
        setColor(ACCENT_COLORS[0].light);
        setSaving(false);
        onStepChange('idle');
        onCancelDraw();
    }

    function resetEdit() {
        setEditSaving(false);
        onStepChange('idle');
        onCancelDraw();
    }

    // ── Create handlers ──
    function handleCreateDraw() {
        onStepChange('drawing');
        onStartDraw(type);
    }

    function handleCreate() {
        if (!drawnShape || saving) return;
        setSaving(true);
        router.post(
            route('geofence.store'),
            {
                name: name.trim(),
                type,
                color,
                center_lat: drawnShape.centerLat ?? null,
                center_lng: drawnShape.centerLng ?? null,
                radius: drawnShape.radius ?? null,
                coordinates: drawnShape.coordinates ?? null,
            },
            { preserveScroll: true, onSuccess: resetCreate, onError: () => setSaving(false) },
        );
    }

    // ── Edit handlers ──
    // Save name/color only — keep existing coordinates
    function handleEditSave() {
        if (!editingGeofence || !editName.trim() || editSaving) return;
        setEditSaving(true);
        router.put(
            route('geofence.update', { geofence: editingGeofence.id }),
            {
                name: editName.trim(),
                type: editingGeofence.type,
                color: editColor,
                center_lat: editingGeofence.center_lat,
                center_lng: editingGeofence.center_lng,
                radius: editingGeofence.radius,
                coordinates: editingGeofence.coordinates,
            },
            { preserveScroll: true, onSuccess: resetEdit, onError: () => setEditSaving(false) },
        );
    }

    // Save name/color + new drawn shape
    function handleEditSaveWithShape() {
        if (!editingGeofence || !drawnShape || editSaving) return;
        setEditSaving(true);
        router.put(
            route('geofence.update', { geofence: editingGeofence.id }),
            {
                name: editName.trim(),
                type: editingGeofence.type,
                color: editColor,
                center_lat: drawnShape.centerLat ?? null,
                center_lng: drawnShape.centerLng ?? null,
                radius: drawnShape.radius ?? null,
                coordinates: drawnShape.coordinates ?? null,
            },
            { preserveScroll: true, onSuccess: resetEdit, onError: () => setEditSaving(false) },
        );
    }

    const deletingGeofence = deleteId ? geofences.find((g) => g.id === deleteId) : null;
    const isAttendanceLookup = deletingGeofence?.lookup === 'attendance';

    function handleDelete() {
        if (!deleteId) return;
        router.delete(route('geofence.destroy', { geofence: deleteId }), {
            preserveScroll: true,
            onSuccess: () => setDeleteId(null),
        });
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b p-4">
                <h2 className="text-base font-semibold">Geofences</h2>
            </div>

            {/* ── idle: show Add button ── */}
            {step === 'idle' && (
                <div className="p-4">
                    <Button size="sm" className="w-full gap-2" onClick={() => onStepChange('form')}>
                        <Plus className="h-4 w-4" /> Add Geofence
                    </Button>
                </div>
            )}

            {/* ── form: create — fill details ── */}
            {step === 'form' && (
                <div className="space-y-4 border-b p-4">
                    <p className="text-sm font-semibold">New Geofence</p>

                    <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input placeholder="e.g. Office zone" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as 'circle' | 'polygon')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="circle">Circle</SelectItem>
                                <SelectItem value="polygon">Polygon</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <ColorPicker color={color} onChange={setColor} />

                    <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={handleCreateDraw} disabled={!name.trim()}>
                            Draw on Map
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetCreate}>Cancel</Button>
                    </div>
                </div>
            )}

            {/* ── drawing: create ── */}
            {step === 'drawing' && (
                <DrawingHint type={type} label="Drawing new shape" onCancel={resetCreate} />
            )}

            {/* ── drawn: create ── */}
            {step === 'drawn' && (
                <div className="space-y-3 border-b bg-muted/40 p-4">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Shape drawn ✓</p>
                    <p className="text-xs text-muted-foreground">Saving as <span className="font-medium">{name}</span></p>
                    <SaveCancel saving={saving} onSave={handleCreate} onCancel={resetCreate} />
                </div>
            )}

            {/* ── editing: edit name/color + optional redraw ── */}
            {(step === 'editing' || step === 'edit-drawing' || step === 'edit-drawn') && editingGeofence && (
                <div className="space-y-4 border-b p-4">
                    <p className="text-sm font-semibold">
                        Edit — <span className="text-muted-foreground font-normal capitalize">{editingGeofence.type}</span>
                    </p>

                    <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={editSaving}
                        />
                    </div>

                    <ColorPicker color={editColor} onChange={setEditColor} disabled={editSaving} />

                    {/* Coordinates section */}
                    <div className="rounded-md border p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coordinates</p>

                        {step === 'editing' && (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    Current shape is saved. Click below to draw a new one on the map.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full gap-2"
                                    disabled={editSaving}
                                    onClick={() => onStartEditDraw(editingGeofence.type)}
                                >
                                    <PencilRuler className="h-3.5 w-3.5" />
                                    Redraw on Map
                                </Button>
                            </>
                        )}

                        {step === 'edit-drawing' && (
                            <DrawingHint type={editingGeofence.type} label="Drawing replacement shape" onCancel={() => onStepChange('editing')} inline />
                        )}

                        {step === 'edit-drawn' && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">New shape drawn ✓</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    {(step === 'editing' || step === 'edit-drawn') && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 gap-2"
                                disabled={!editName.trim() || editSaving}
                                onClick={step === 'edit-drawn' ? handleEditSaveWithShape : handleEditSave}
                            >
                                {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {editSaving ? 'Saving…' : 'Save'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={resetEdit} disabled={editSaving}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Geofence list ── */}
            <div className="flex-1 overflow-y-auto">
                {geofences.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No geofences yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {geofences.map((g) => (
                            <li
                                key={g.id}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${editingGeofence?.id === g.id ? 'bg-muted/50' : ''}`}
                            >
                                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{g.name}</p>
                                    <p className="text-xs capitalize text-muted-foreground">{g.type}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditRequest(g)}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(g.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Delete confirm */}
            <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete geofence?</DialogTitle></DialogHeader>
                    {isAttendanceLookup && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <span className="font-semibold">Warning:</span> This geofence is used as an{' '}
                            <span className="font-semibold">Attendance</span> lookup. Deleting it will remove it from
                            the attendance whitelist.
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Small shared sub-components ──────────────────────────────────────────────

function ColorPicker({ color, onChange, disabled }: { color: string; onChange: (c: string) => void; disabled?: boolean }) {
    return (
        <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((c) => (
                    <button
                        key={c.value}
                        title={c.name}
                        onClick={() => onChange(c.light)}
                        disabled={disabled}
                        className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none disabled:pointer-events-none"
                        style={{
                            backgroundColor: c.light,
                            boxShadow: color === c.light ? `0 0 0 2px white, 0 0 0 4px ${c.light}` : undefined,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function DrawingHint({ type, label, onCancel, inline }: { type: 'circle' | 'polygon'; label: string; onCancel: () => void; inline?: boolean }) {
    const hint = type === 'circle' ? 'Click and drag to set size.' : 'Click to place points, double-click to finish.';
    if (inline) {
        return (
            <div className="space-y-1">
                <p className="text-xs font-medium text-primary">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
                <button onClick={onCancel} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                    Cancel redraw
                </button>
            </div>
        );
    }
    return (
        <div className="space-y-2 border-b bg-muted/40 p-4">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <Button size="sm" variant="ghost" className="w-full" onClick={onCancel}>Cancel</Button>
        </div>
    );
}

function SaveCancel({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
    return (
        <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-2" onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
    );
}
