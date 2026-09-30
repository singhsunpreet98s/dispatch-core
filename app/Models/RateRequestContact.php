<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RateRequestContact extends Model
{
    protected $fillable = ['import_id', 'city_id', 'email', 'company_name', 'mc_number'];

    public function city(): BelongsTo
    {
        return $this->belongsTo(RateRequestCity::class, 'city_id');
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(RateRequestImport::class, 'import_id');
    }
}
