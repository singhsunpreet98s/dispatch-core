<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppExitEvent extends Model
{
    protected $fillable = [
        'user_id',
        'serial_number',
        'event_timestamp',
        'acknowledged_at',
    ];

    protected $casts = [
        'event_timestamp' => 'datetime',
        'acknowledged_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isPending(): bool
    {
        return $this->acknowledged_at === null;
    }
}
