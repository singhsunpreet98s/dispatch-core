<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryHistory extends Model
{
    public $timestamps = false;

    const CREATED_AT = 'created_at';

    protected $fillable = [
        'user_id',
        'changed_by',
        'changed_field',
        'change_type',
        'direction',
        'change_value',
        'old_ctc',
        'new_ctc',
        'old_per_month',
        'new_per_month',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'change_value' => 'decimal:2',
            'old_ctc' => 'decimal:2',
            'new_ctc' => 'decimal:2',
            'old_per_month' => 'decimal:2',
            'new_per_month' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
