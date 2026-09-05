<?php

namespace App\Http\Controllers\Settings;

use App\Enums\FeatureFlag as FeatureFlagEnum;
use App\Enums\GeofenceLookup;
use App\Helpers\AppTimezone;
use App\Http\Controllers\Controller;
use App\Models\AttendanceHoliday;
use App\Models\FeatureFlag;
use App\Models\Geofence;
use App\Models\ScheduleDispatchQueue;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingController extends Controller
{
    public function edit(Request $request): Response
    {
        $this->syncFeatureFlags();

        $logoPath = SystemSetting::get('logo_path');

        return Inertia::render('settings/system', [
            'logoUrl'            => $logoPath ? Storage::disk('public')->url($logoPath) : null,
            'companyInfo'        => [
                'company_name'    => SystemSetting::get('company_name', ''),
                'company_gst'     => SystemSetting::get('company_gst', ''),
                'company_address' => SystemSetting::get('company_address', ''),
                'company_phone'   => SystemSetting::get('company_phone', ''),
            ],
            'featureFlagList'    => FeatureFlag::orderBy('name')->get(),
            'attendanceSettings' => [
                'clock_in_start'    => SystemSetting::get('attendance_clock_in_start', ''),
                'clock_in_end'      => SystemSetting::get('attendance_clock_in_end', ''),
                'shift_end'         => SystemSetting::get('attendance_shift_end', ''),
                'min_break_minutes' => (int) SystemSetting::get('attendance_min_break_minutes', 15),
                'ip_whitelist'      => SystemSetting::get('attendance_ip_whitelist', ''),
                'current_ip'        => $request->ip(),
                'geofences'         => Geofence::orderBy('name')->get(['id', 'name', 'lookup']),
                'geofence_ids'      => Geofence::where('lookup', GeofenceLookup::Attendance)->pluck('id'),
            ],
            'holidays'           => AttendanceHoliday::orderBy('date')->get()->map(fn($h) => [
                'id'   => $h->id,
                'date' => $h->date->format('Y-m-d'),
                'name' => $h->name,
            ]),
            'commandStatus'      => $this->buildCommandStatus(),
            'timezone'           => AppTimezone::get(),
            'timezones'          => \DateTimeZone::listIdentifiers(),
            'apiToken'           => SystemSetting::get('api_bearer_token'),
            'backupSettings'     => [
                'has_app_key'           => (bool) SystemSetting::get('dropbox_app_key'),
                'has_app_secret'        => (bool) SystemSetting::get('dropbox_app_secret'),
                'backup_retention_days' => (int) SystemSetting::get('backup_retention_days', 10),
                'dropbox_status'        => \App\Services\DropboxService::tokenStatus(),
                'callback_url'          => url('/settings/system/dropbox/callback'),
            ],
        ]);
    }

    public function commandStatus(): JsonResponse
    {
        return response()->json($this->buildCommandStatus());
    }

    // ── Logo ──────────────────────────────────────────────────────────────────

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
        ]);

        $existing = SystemSetting::get('logo_path');
        if ($existing && Storage::disk('public')->exists($existing)) {
            Storage::disk('public')->delete($existing);
        }

        $path = $request->file('logo')->store('logos', 'public');
        SystemSetting::set('logo_path', $path);

        return back()->with('success', 'Logo updated successfully.');
    }

    public function removeLogo(): RedirectResponse
    {
        $existing = SystemSetting::get('logo_path');
        if ($existing && Storage::disk('public')->exists($existing)) {
            Storage::disk('public')->delete($existing);
        }

        SystemSetting::set('logo_path', null);

        return back()->with('success', 'Logo removed.');
    }

    // ── Company info ──────────────────────────────────────────────────────────

    public function updateCompany(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'company_name'    => ['nullable', 'string', 'max:255'],
            'company_gst'     => ['nullable', 'string', 'max:50'],
            'company_address' => ['nullable', 'string', 'max:1000'],
            'company_phone'   => ['nullable', 'string', 'max:50'],
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::set($key, $value);
        }

        return back()->with('success', 'Company information updated.');
    }

    // ── Timezone ──────────────────────────────────────────────────────────────

    public function updateTimezone(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'timezone' => ['required', 'string', 'timezone:all'],
        ]);

        SystemSetting::set('app_timezone', $data['timezone']);
        AppTimezone::forget();

        return back()->with('success', 'Timezone updated.');
    }

    // ── Feature flags ─────────────────────────────────────────────────────────

    public function updateFlag(Request $request, FeatureFlag $featureFlag): RedirectResponse
    {
        $data = $request->validate([
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $featureFlag->update($data);

        return back()->with('success', 'Feature flag updated.');
    }

    public function toggleFlag(FeatureFlag $featureFlag): RedirectResponse
    {
        $featureFlag->update(['enabled' => ! $featureFlag->enabled]);

        return back()->with('success', 'Feature flag ' . ($featureFlag->enabled ? 'enabled' : 'disabled') . '.');
    }

    // ── API bearer token ──────────────────────────────────────────────────────

    public function generateApiToken(): RedirectResponse
    {
        $token = Str::random(64);
        SystemSetting::set('api_bearer_token', $token);

        return back()->with('apiToken', $token);
    }

    public function revokeApiToken(): RedirectResponse
    {
        SystemSetting::set('api_bearer_token', null);

        return back()->with('success', 'API token revoked.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildCommandStatus(): array
    {
        $staleCutoff = Carbon::now()->subMinutes(3);

        $checkLastRun    = SystemSetting::get('cmd_check_schedules_last_run');
        $dispatchLastRun = SystemSetting::get('cmd_dispatch_campaigns_last_run');

        $queueCounts = ScheduleDispatchQueue::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        return [
            'check_schedules' => [
                'label'        => 'campaigns:check-schedules',
                'description'  => 'Checks active schedule triggers and enqueues campaigns for dispatch.',
                'last_run'     => $checkLastRun,
                'is_running'   => $checkLastRun && Carbon::parse($checkLastRun)->isAfter($staleCutoff),
            ],
            'dispatch_campaigns' => [
                'label'        => 'campaigns:dispatch-queue',
                'description'  => 'Picks pending queue items and sends them via Portal.',
                'last_run'     => $dispatchLastRun,
                'is_running'   => $dispatchLastRun && Carbon::parse($dispatchLastRun)->isAfter($staleCutoff),
            ],
            'queue' => [
                'pending'    => (int) ($queueCounts['pending']    ?? 0),
                'processing' => (int) ($queueCounts['processing'] ?? 0),
                'sent'       => (int) ($queueCounts['sent']       ?? 0),
                'failed'     => (int) ($queueCounts['failed']     ?? 0),
            ],
        ];
    }

    private function syncFeatureFlags(): void
    {
        foreach (FeatureFlagEnum::cases() as $case) {
            FeatureFlag::firstOrCreate(
                ['name' => $case->value],
                ['description' => $case->defaultDescription(), 'enabled' => false],
            );
        }
    }
}
