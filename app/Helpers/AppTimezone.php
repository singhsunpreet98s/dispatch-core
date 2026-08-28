<?php

namespace App\Helpers;

use App\Models\SystemSetting;

class AppTimezone
{
    public static function get(): string
    {
        $tz = SystemSetting::get('app_timezone', 'UTC');

        return in_array($tz, \DateTimeZone::listIdentifiers(), true) ? $tz : 'UTC';
    }
}
