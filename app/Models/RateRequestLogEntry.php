<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RateRequestLogEntry extends Model
{
    protected $fillable = [
        'log_id',
        'to_email',
        'company_name',
        'mc_number',
        'status',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function log(): BelongsTo
    {
        return $this->belongsTo(RateRequestLog::class, 'log_id');
    }
}
