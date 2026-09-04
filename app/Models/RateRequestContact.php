<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RateRequestContact extends Model
{
    protected $fillable = ['import_id', 'state_id', 'email', 'company_name', 'mc_number'];

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(RateRequestImport::class, 'import_id');
    }
}
