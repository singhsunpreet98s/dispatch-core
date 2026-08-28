<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceShift extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'clocked_in_at',
        'clocked_out_at',
        'ip_address',
        'clock_in_lat',
        'clock_in_lng',
        'clock_out_lat',
        'clock_out_lng',
        'auto_closed',
        'is_late',
        'clock_in_outside_geofence',
        'clock_out_outside_geofence',
    ];

    protected $casts = [
        'date'                       => 'date',
        'clocked_in_at'              => 'datetime',
        'clocked_out_at'             => 'datetime',
        'auto_closed'                => 'boolean',
        'is_late'                    => 'boolean',
        'clock_in_lat'               => 'float',
        'clock_in_lng'               => 'float',
        'clock_out_lat'              => 'float',
        'clock_out_lng'              => 'float',
        'clock_in_outside_geofence'  => 'boolean',
        'clock_out_outside_geofence' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function breaks(): HasMany
    {
        return $this->hasMany(AttendanceBreak::class);
    }

    public function isOpen(): bool
    {
        return $this->clocked_in_at !== null && $this->clocked_out_at === null;
    }

    public function hasOpenBreak(): bool
    {
        return $this->breaks->contains(fn($b) => $b->ended_at === null);
    }

    public function currentBreak(): ?AttendanceBreak
    {
        return $this->breaks->first(fn($b) => $b->ended_at === null);
    }

    public function totalShiftSeconds(): int
    {
        if (! $this->clocked_in_at) {
            return 0;
        }
        $end = $this->clocked_out_at ?? now();

        return (int) $this->clocked_in_at->diffInSeconds($end);
    }

    public function totalBreakSeconds(): int
    {
        return (int) $this->breaks->sum(function (AttendanceBreak $break) {
            if (! $break->started_at) {
                return 0;
            }
            $end = $break->ended_at ?? now();

            return $break->started_at->diffInSeconds($end);
        });
    }

    public function totalWorkedSeconds(): int
    {
        if (! $this->clocked_in_at) {
            return 0;
        }
        $end = $this->clocked_out_at ?? now();

        return max(0, $this->clocked_in_at->diffInSeconds($end) - $this->totalBreakSeconds());
    }
}
