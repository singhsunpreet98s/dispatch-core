import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import GeofencePanel from './geofence-panel';
import type { Geofence } from './types';

const GeofenceMap = lazy(() => import('./geofence-map'));

interface Props {
    geofences: Geofence[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Geofence', href: '/geofence' },
];

export type Step =
    | 'idle'
    | 'form'        // creating: fill name/type/color
    | 'drawing'     // creating: drawing on map
    | 'drawn'       // creating: shape drawn, ready to save
    | 'editing'     // editing: change name/color, or trigger redraw
    | 'edit-drawing'// editing: drawing new shape on map
    | 'edit-drawn'; // editing: new shape drawn, ready to save

export interface DrawnShape {
    centerLat?: number;
    centerLng?: number;
    radius?: number;
    coordinates?: [number, number][];
}

function isDarkMode(): boolean {
    const appearance = localStorage.getItem('appearance') || 'system';
    return appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function GeofencePage({ geofences }: Props) {
    const [dark, setDark]           = useState(false);
    const [step, setStep]           = useState<Step>('idle');
    const [drawMode, setDrawMode]   = useState<'circle' | 'polygon' | null>(null);
    const [drawnShape, setDrawnShape] = useState<DrawnShape | null>(null);
    const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

    useEffect(() => {
        setDark(isDarkMode());
        const observer = new MutationObserver(() => setDark(isDarkMode()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    function startEdit(g: Geofence) {
        setEditingGeofence(g);
        setDrawnShape(null);
        setDrawMode(null);
        setStep('editing');
    }

    function startEditDraw(type: 'circle' | 'polygon') {
        setDrawnShape(null);
        setDrawMode(type);
        setStep('edit-drawing');
    }

    function handleDrawn(shape: DrawnShape) {
        setDrawMode(null);
        setDrawnShape(shape);
        setStep((prev) => (prev === 'edit-drawing' ? 'edit-drawn' : 'drawn'));
    }

    function handleStepChange(s: Step) {
        if (s === 'idle') {
            setDrawMode(null);
            setDrawnShape(null);
            setEditingGeofence(null);
        }
        setStep(s);
    }

    function handleStartDraw(type: 'circle' | 'polygon') {
        setDrawnShape(null);
        setDrawMode(type);
    }

    function handleCancelDraw() {
        setDrawMode(null);
        setDrawnShape(null);
    }

    // When user cancels drawing during the create flow, go back to form
    function handleMapDrawCancel() {
        setDrawMode(null);
        if (step === 'edit-drawing') {
            setStep('editing');
        } else {
            setStep('form');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Geofence" />
            <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
                <div className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-r bg-background">
                    <GeofencePanel
                        geofences={geofences}
                        step={step}
                        onStepChange={handleStepChange}
                        drawnShape={drawnShape}
                        onStartDraw={handleStartDraw}
                        onCancelDraw={handleCancelDraw}
                        onStartEditDraw={startEditDraw}
                        editingGeofence={editingGeofence}
                        onEditRequest={startEdit}
                    />
                </div>

                <div className="relative flex-1">
                    <Suspense
                        fallback={
                            <div className="flex h-full w-full items-center justify-center bg-muted/20">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        }
                    >
                        <GeofenceMap
                            geofences={geofences}
                            isDark={dark}
                            drawMode={drawMode}
                            onDrawn={handleDrawn}
                            onDrawCancel={handleMapDrawCancel}
                        />
                    </Suspense>
                </div>
            </div>
        </AppLayout>
    );
}
