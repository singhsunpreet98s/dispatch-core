<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedEmail extends Model
{
    protected $fillable = ['email', 'type', 'import_id'];

    public function import(): BelongsTo
    {
        return $this->belongsTo(BlockedEmailImport::class, 'import_id');
    }
}
