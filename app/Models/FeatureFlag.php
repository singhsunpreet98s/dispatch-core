<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeatureFlag extends Model
{
    protected $fillable = ['name', 'description', 'enabled'];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public static function isEnabled(string $name): bool
    {
        return (bool) static::where('name', $name)->value('enabled');
    }
}
