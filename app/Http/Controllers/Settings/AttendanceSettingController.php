<?php

namespace App\Http\Controllers\Settings;

use App\Enums\GeofenceLookup;
use App\Http\Controllers\Controller;
use App\Models\Geofence;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AttendanceSettingController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'clock_in_start'    => ['nullable', 'date_format:H:i'],
            'clock_in_end'      => ['nullable', 'date_format:H:i'],
            'shift_end'         => ['nullable', 'date_format:H:i'],
            'min_break_minutes' => ['required', 'integer', 'min:1', 'max:120'],
            'ip_whitelist'      => ['nullable', 'string', 'max:5000'],
            'geofence_ids'      => ['nullable', 'array'],
            'geofence_ids.*'    => ['integer', 'exists:geofences,id'],
        ]);

        SystemSetting::set('attendance_clock_in_start', $data['clock_in_start'] ?? '');
        SystemSetting::set('attendance_clock_in_end', $data['clock_in_end'] ?? '');
        SystemSetting::set('attendance_shift_end', $data['shift_end'] ?? '');
        SystemSetting::set('attendance_min_break_minutes', (string) $data['min_break_minutes']);
        SystemSetting::set('attendance_ip_whitelist', $data['ip_whitelist'] ?? '');

        $selectedIds = $data['geofence_ids'] ?? [];

        Geofence::query()->update(['lookup' => GeofenceLookup::General->value]);
        if (! empty($selectedIds)) {
            Geofence::whereIn('id', $selectedIds)->update(['lookup' => GeofenceLookup::Attendance->value]);
        }

        return back()->with('success', 'Attendance settings saved.');
    }
}
