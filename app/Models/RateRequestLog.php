<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RateRequestLog extends Model
{
    protected $fillable = [
        'user_id',
        'city_id',
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

    public function city(): BelongsTo
    {
        return $this->belongsTo(RateRequestCity::class, 'city_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(RateRequestLogEntry::class, 'log_id');
    }
}
