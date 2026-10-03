<?php

namespace App\Enums;

enum FeatureFlag: string
{
    case ATTENDANCE      = 'attendance_feature_flag';
    case SALARY          = 'salary_feature_flag';
    case RATE_REQUEST    = 'rate_request_feature_flag';
    case BREAK_REMINDER  = 'break_reminder_feature_flag';

    public function label(): string
    {
        return match($this) {
            self::ATTENDANCE     => 'Attendance',
            self::SALARY         => 'Salary',
            self::RATE_REQUEST   => 'Rate Request',
            self::BREAK_REMINDER => 'Break Reminder Emails',
        };
    }

    public function defaultDescription(): string
    {
        return match($this) {
            self::ATTENDANCE     => 'Enables the attendance tracking module.',
            self::SALARY         => 'Enables salary management, remuneration page, and monthly salary calculation.',
            self::RATE_REQUEST   => 'Enables the rate request module for sending and managing rate requests.',
            self::BREAK_REMINDER => 'Enables automatic reminder emails to employees whose break has been open too long.',
        };
    }

    public function isEnabled(): bool
    {
        return \App\Models\FeatureFlag::isEnabled($this->value);
    }
}
