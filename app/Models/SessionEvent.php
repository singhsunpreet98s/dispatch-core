<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionEvent extends Model
{
    protected $fillable = [
        'user_id',
        'serial_number',
        'event',
        'event_timestamp',
    ];

    protected $casts = [
        'event_timestamp' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
