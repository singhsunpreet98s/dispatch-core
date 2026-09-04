<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RateRequestLog extends Model
{
    protected $fillable = [
        'user_id',
        'state_id',
        'email_body',
        'total_recipients',
        'sent_count',
        'failed_count',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(RateRequestLogEntry::class, 'log_id');
    }
}
