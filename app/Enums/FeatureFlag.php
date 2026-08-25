<?php

namespace App\Enums;

enum FeatureFlag: string
{
    case ATTENDANCE = 'attendance_feature_flag';

    public function label(): string
    {
        return match($this) {
            self::ATTENDANCE => 'Attendance',
        };
    }

    public function defaultDescription(): string
    {
        return match($this) {
            self::ATTENDANCE => 'Enables the attendance tracking module.',
        };
    }

    public function isEnabled(): bool
    {
        return \App\Models\FeatureFlag::isEnabled($this->value);
    }
}
