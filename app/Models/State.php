<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class State extends Model
{
    protected $fillable = ['state_code', 'state_name'];

    public function rateRequestContacts(): HasMany
    {
        return $this->hasMany(RateRequestContact::class);
    }

    public function rateRequestLogs(): HasMany
    {
        return $this->hasMany(RateRequestLog::class);
    }
}
