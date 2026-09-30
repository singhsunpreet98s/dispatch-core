<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RateRequestCity extends Model
{
    protected $fillable = ['name'];

    public function contacts(): HasMany
    {
        return $this->hasMany(RateRequestContact::class, 'city_id');
    }

    public function imports(): HasMany
    {
        return $this->hasMany(RateRequestImport::class, 'city_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(RateRequestLog::class, 'city_id');
    }
}
