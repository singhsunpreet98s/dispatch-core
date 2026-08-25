<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceBreak extends Model
{
    protected $fillable = ['attendance_shift_id', 'started_at', 'ended_at'];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
    ];

    public function shift(): BelongsTo
    {
        return $this->belongsTo(AttendanceShift::class, 'attendance_shift_id');
    }

    public function isOpen(): bool
    {
        return $this->ended_at === null;
    }

    public function durationSeconds(): int
    {
        $end = $this->ended_at ?? now();

        return (int) $end->diffInSeconds($this->started_at);
    }
}
