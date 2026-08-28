import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Geofence } from './types';

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PendingDraw {
    type: 'circle' | 'polygon';
    centerLat?: number;
    centerLng?: number;
    radius?: number;
    coordinates?: [number, number][];
}

interface Props {
    geofences: Geofence[];
    isDark: boolean;
    drawMode: 'circle' | 'polygon' | null;
    onDrawn: (pending: PendingDraw) => void;
    onDrawCancel: () => void;
}

const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export default function GeofenceMap({ geofences, isDark, drawMode, onDrawn, onDrawCancel }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<L.Map | null>(null);
    const tileRef      = useRef<L.TileLayer | null>(null);
    const drawRef      = useRef<L.Control.Draw | null>(null);
    const drawnLayersRef = useRef<L.FeatureGroup | null>(null);
    const geofenceLayersRef = useRef<L.FeatureGroup | null>(null);
    const activeHandlerRef = useRef<L.Draw.Circle | L.Draw.Polygon | null>(null);
    const locationMarkerRef = useRef<L.CircleMarker | null>(null);
    const locationRingRef   = useRef<L.Circle | null>(null);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    // Init map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, { zoomControl: true }).setView([20, 0], 2);
        mapRef.current = map;

        const tile = L.tileLayer(isDark ? DARK_TILE : LIGHT_TILE, { attribution: ATTRIBUTION, maxZoom: 19 });
        tile.addTo(map);
        tileRef.current = tile;

        const drawnLayers = new L.FeatureGroup();
        drawnLayers.addTo(map);
        drawnLayersRef.current = drawnLayers;

        const geofenceLayers = new L.FeatureGroup();
        geofenceLayers.addTo(map);
        geofenceLayersRef.current = geofenceLayers;

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Swap tile layer on theme change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !tileRef.current) return;
        tileRef.current.remove();
        const tile = L.tileLayer(isDark ? DARK_TILE : LIGHT_TILE, { attribution: ATTRIBUTION, maxZoom: 19 });
        tile.addTo(map);
        tileRef.current = tile;
    }, [isDark]);

    // Re-render geofence layers when data changes
    useEffect(() => {
        const fg = geofenceLayersRef.current;
        if (!fg) return;
        fg.clearLayers();

        geofences.forEach((g) => {
            const opts = { color: g.color, fillColor: g.color, fillOpacity: 0.25, weight: 2 };
            if (g.type === 'circle' && g.center_lat != null && g.center_lng != null && g.radius != null) {
                L.circle([g.center_lat, g.center_lng], { radius: g.radius, ...opts }).bindTooltip(g.name).addTo(fg);
            } else if (g.type === 'polygon' && g.coordinates) {
                L.polygon(g.coordinates as L.LatLngExpression[], opts).bindTooltip(g.name).addTo(fg);
            }
        });
    }, [geofences]);

    // Start/stop draw handler based on drawMode prop
    useEffect(() => {
        const map = mapRef.current;
        const fg  = drawnLayersRef.current;
        if (!map || !fg) return;

        // Stop any active handler first
        if (activeHandlerRef.current) {
            activeHandlerRef.current.disable();
            activeHandlerRef.current = null;
        }

        if (!drawMode) return;

        let handler: L.Draw.Circle | L.Draw.Polygon;

        if (drawMode === 'circle') {
            handler = new (L.Draw as unknown as { Circle: new (map: L.Map, opts: object) => L.Draw.Circle }).Circle(map, {
                shapeOptions: { color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.25 },
            });
        } else {
            handler = new (L.Draw as unknown as { Polygon: new (map: L.Map, opts: object) => L.Draw.Polygon }).Polygon(map, {
                shapeOptions: { color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.25 },
            });
        }

        handler.enable();
        activeHandlerRef.current = handler;

        function onCreated(e: L.LeafletEvent) {
            const event = e as unknown as { layerType: string; layer: L.Circle | L.Polygon };
            if (activeHandlerRef.current) {
                activeHandlerRef.current.disable();
                activeHandlerRef.current = null;
            }
            const layer = event.layer;

            if (event.layerType === 'circle') {
                const circle = layer as L.Circle;
                const latlng  = circle.getLatLng();
                fg!.addLayer(circle);
                onDrawn({ type: 'circle', centerLat: latlng.lat, centerLng: latlng.lng, radius: circle.getRadius() });
            } else {
                const polygon = layer as L.Polygon;
                const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
                const coords: [number, number][] = latlngs.map((ll) => [ll.lat, ll.lng]);
                fg!.addLayer(polygon);
                onDrawn({ type: 'polygon', coordinates: coords });
            }
        }

        map.on(L.Draw.Event.CREATED, onCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, onCreated);
            if (activeHandlerRef.current) {
                activeHandlerRef.current.disable();
                activeHandlerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [drawMode]);

    function locateMe() {
        const map = mapRef.current;
        if (!map || locating) return;
        setLocateError(null);
        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                const { latitude: lat, longitude: lng, accuracy } = pos.coords;

                // Remove previous location layers
                locationMarkerRef.current?.remove();
                locationRingRef.current?.remove();

                // Blue dot for the position
                const dot = L.circleMarker([lat, lng], {
                    radius: 8,
                    color: '#fff',
                    weight: 2,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                }).addTo(map);

                // Accuracy ring
                const ring = L.circle([lat, lng], {
                    radius: accuracy,
                    color: '#3b82f6',
                    weight: 1,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.08,
                }).addTo(map);

                locationMarkerRef.current = dot;
                locationRingRef.current   = ring;

                map.flyTo([lat, lng], 16, { duration: 1.2 });
            },
            (err) => {
                setLocating(false);
                setLocateError(err.code === 1 ? 'Location permission denied.' : 'Could not get location.');
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }

    return (
        <div className="relative h-full w-full">
            <div ref={containerRef} className="h-full w-full" />

            {/* Locate button */}
            <button
                onClick={locateMe}
                disabled={locating}
                title="Go to my location"
                className="absolute bottom-8 right-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-md hover:bg-muted disabled:opacity-60"
            >
                {locating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Crosshair className="h-4 w-4 text-foreground" />}
            </button>

            {locateError && (
                <div className="absolute bottom-20 right-3 z-[1000] rounded-md border bg-background/90 px-3 py-1.5 text-xs text-destructive shadow backdrop-blur">
                    {locateError}
                </div>
            )}

            {drawMode && (
                <div className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
                    <div className="flex items-center gap-3 rounded-lg border bg-background/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
                        <span>
                            {drawMode === 'circle' ? 'Click and drag to draw a circle' : 'Click to place vertices, double-click to finish'}
                        </span>
                        <button onClick={onDrawCancel} className="ml-2 rounded px-2 py-0.5 text-muted-foreground hover:bg-muted">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
