<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlockedEmailImport extends Model
{
    protected $fillable = ['original_name', 'email_count', 'type'];

    public function blockedEmails(): HasMany
    {
        return $this->hasMany(BlockedEmail::class, 'import_id');
    }
}
