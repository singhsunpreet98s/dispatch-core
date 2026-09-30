<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RateRequestImport extends Model
{
    protected $fillable = ['city_id', 'original_name', 'email_count'];

    public function city(): BelongsTo
    {
        return $this->belongsTo(RateRequestCity::class, 'city_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(RateRequestContact::class, 'import_id');
    }
}
