<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleTrigger extends Model
{
    protected $fillable = ['schedule_id', 'weekday', 'time', 'send_at'];

    protected $casts = [
        'send_at' => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}
