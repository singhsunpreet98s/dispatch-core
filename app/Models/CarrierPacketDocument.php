<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarrierPacketDocument extends Model
{
    protected $fillable = [
        'carrier_packet_id', 'type', 'path', 'disk', 'original_name', 'size',
    ];

    public function carrierPacket(): BelongsTo
    {
        return $this->belongsTo(CarrierPacket::class);
    }
}
