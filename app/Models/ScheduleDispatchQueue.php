<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleDispatchQueue extends Model
{
    protected $table = 'schedule_dispatch_queue';

    protected $fillable = [
        'schedule_id',
        'schedule_trigger_id',
        'status',
        'queued_at',
        'dispatched_at',
        'error_message',
    ];

    protected $casts = [
        'queued_at'      => 'datetime',
        'dispatched_at'  => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function trigger(): BelongsTo
    {
        return $this->belongsTo(ScheduleTrigger::class, 'schedule_trigger_id');
    }
}
