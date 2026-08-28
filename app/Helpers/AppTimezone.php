<?php

namespace App\Helpers;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class AppTimezone
{
    private const CACHE_KEY = 'app_timezone';
    private const CACHE_TTL = 300; // 5 minutes

    public static function get(): string
    {
        $tz = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return SystemSetting::get('app_timezone', 'UTC');
        });

        return in_array($tz, \DateTimeZone::listIdentifiers(), true) ? $tz : 'UTC';
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
