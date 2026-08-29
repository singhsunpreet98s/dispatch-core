<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CarrierPacket extends Model
{
    protected $fillable = [
        'user_id', 'uuid', 'email', 'mc_number', 'company_name',
        'status', 'email_status', 'full_name', 'address', 'phone', 'signature_path',
        'opened_at', 'submitted_at', 'signed_at',
    ];

    protected $casts = [
        'opened_at'   => 'datetime',
        'submitted_at' => 'datetime',
        'signed_at'   => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CarrierPacketDocument::class);
    }

    public function publicUrl(): string
    {
        return url('/p/'.$this->uuid);
    }
}
