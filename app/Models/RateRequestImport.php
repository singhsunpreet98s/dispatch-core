<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RateRequestImport extends Model
{
    protected $fillable = ['state_id', 'original_name', 'email_count'];

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(RateRequestContact::class, 'import_id');
    }
}
