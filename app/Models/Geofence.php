<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Geofence extends Model
{
    protected $fillable = [
        'name',
        'type',
        'color',
        'center_lat',
        'center_lng',
        'radius',
        'coordinates',
        'created_by',
    ];

    protected $casts = [
        'center_lat'  => 'float',
        'center_lng'  => 'float',
        'radius'      => 'float',
        'coordinates' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Returns true if the given coordinates fall inside this geofence.
     */
    public function pointIn(float $lat, float $lng): bool
    {
        return $this->type === 'circle'
            ? $this->pointInCircle($lat, $lng)
            : $this->pointInPolygon($lat, $lng);
    }

    private function pointInCircle(float $lat, float $lng): bool
    {
        if ($this->center_lat === null || $this->center_lng === null || $this->radius === null) {
            return false;
        }

        return $this->haversineMetres($lat, $lng, $this->center_lat, $this->center_lng) <= $this->radius;
    }

    private function pointInPolygon(float $lat, float $lng): bool
    {
        $coords = $this->coordinates ?? [];
        $n      = count($coords);

        if ($n < 3) {
            return false;
        }

        $inside = false;
        $j      = $n - 1;

        for ($i = 0; $i < $n; $i++) {
            $xi = $coords[$i][0];
            $yi = $coords[$i][1];
            $xj = $coords[$j][0];
            $yj = $coords[$j][1];

            if ((($yi > $lng) !== ($yj > $lng)) && ($lat < ($xj - $xi) * ($lng - $yi) / ($yj - $yi) + $xi)) {
                $inside = ! $inside;
            }

            $j = $i;
        }

        return $inside;
    }

    private function haversineMetres(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // metres
        $dLat        = deg2rad($lat2 - $lat1);
        $dLng        = deg2rad($lng2 - $lng1);
        $a           = sin($dLat / 2) ** 2
                     + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
