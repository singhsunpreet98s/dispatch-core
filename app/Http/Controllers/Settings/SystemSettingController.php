<?php

namespace App\Http\Controllers\Settings;

use App\Enums\FeatureFlag as FeatureFlagEnum;
use App\Http\Controllers\Controller;
use App\Models\AttendanceHoliday;
use App\Models\FeatureFlag;
use App\Models\ScheduleDispatchQueue;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingController extends Controller
{
    public function edit(): Response
    {
        $this->syncFeatureFlags();

        $logoPath = SystemSetting::get('logo_path');

        return Inertia::render('settings/system', [
            'logoUrl'            => $logoPath ? Storage::disk('public')->url($logoPath) : null,
            'featureFlags'       => FeatureFlag::orderBy('name')->get(),
            'attendanceSettings' => [
                'clock_in_start'    => SystemSetting::get('attendance_clock_in_start', ''),
                'clock_in_end'      => SystemSetting::get('attendance_clock_in_end', ''),
                'shift_end'         => SystemSetting::get('attendance_shift_end', ''),
                'min_break_minutes' => (int) SystemSetting::get('attendance_min_break_minutes', 15),
                'ip_whitelist'      => SystemSetting::get('attendance_ip_whitelist', ''),
            ],
            'holidays'           => AttendanceHoliday::orderBy('date')->get()->map(fn ($h) => [
                'id'   => $h->id,
                'date' => $h->date->format('Y-m-d'),
                'name' => $h->name,
            ]),
            'commandStatus'      => $this->buildCommandStatus(),
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

        return back()->with('success', 'Feature flag ' . ($featureFlag->enabled ? 'disabled' : 'enabled') . '.');
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
                'description'  => 'Picks pending queue items and sends them via SendGrid.',
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
