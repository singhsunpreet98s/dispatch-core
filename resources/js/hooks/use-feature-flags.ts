import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

/**
 * Known feature flag names — add new ones here as the enum grows.
 * These match the values in App\Enums\FeatureFlag.
 */
export const FLAGS = {
    ATTENDANCE:    'attendance_feature_flag',
    SALARY:        'salary_feature_flag',
    RATE_REQUEST:  'rate_request_feature_flag',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

export function useFeatureFlags() {
    const flags = usePage<SharedData>().props.featureFlags ?? {};

    function isEnabled(name: FlagName | string): boolean {
        return flags[name] === true;
    }

    return { flags, isEnabled };
}
