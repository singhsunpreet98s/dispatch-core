<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Salary extends Model
{
    protected $fillable = [
        'user_id',
        'ctc',
        'per_month',
    ];

    protected function casts(): array
    {
        return [
            'ctc' => 'decimal:2',
            'per_month' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(SalaryHistory::class, 'user_id', 'user_id');
    }
}
