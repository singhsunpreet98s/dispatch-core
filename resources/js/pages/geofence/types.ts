export interface Geofence {
    id: number;
    name: string;
    type: 'circle' | 'polygon';
    color: string;
    center_lat: number | null;
    center_lng: number | null;
    radius: number | null;
    coordinates: [number, number][] | null;
    created_by: number;
    creator?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}
