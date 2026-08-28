<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlySalary extends Model
{
    protected $fillable = [
        'user_id',
        'year',
        'month',
        'per_month_salary',
        'total_days',
        'working_days',
        'days_present',
        'days_half_day',
        'days_short_leave',
        'days_absent',
        'days_leave_paid',
        'days_leave_unpaid',
        'days_extra',
        'extra_earned',
        'gross_earned',
        'breakdown',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'per_month_salary' => 'decimal:2',
            'extra_earned'     => 'decimal:2',
            'gross_earned'     => 'decimal:2',
            'breakdown'        => 'array',
            'calculated_at'    => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
