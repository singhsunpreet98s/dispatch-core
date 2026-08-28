<?php

namespace App\Http\Controllers;

use App\Helpers\AppTimezone;
use App\Models\AttendanceHoliday;
use App\Models\AttendanceNote;
use App\Models\LeaveRequest;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function index(Request $request): Response|RedirectResponse
    {
        if ($request->user()->role === 'admin') {
            return redirect()->route('attendance.admin.index');
        }

        $request->validate([
            'year'  => ['nullable', 'integer', 'min:2020', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $user     = $request->user();
        $settings = $this->attendance->settings();

        $tz    = AppTimezone::get();
        $year  = (int) ($request->year  ?? now($tz)->format('Y'));
        $month = (int) ($request->month ?? now($tz)->format('n'));

        $holidays      = $this->attendance->getMonthHolidays($year, $month);
        $todayShift    = $this->attendance->getTodayShift($user);
        $leaves        = LeaveRequest::where('user_id', $user->id)->orderByDesc('date_from')->get();
        $approvedLeaves = $leaves->where('status', 'approved');
        $heatmapDays   = $this->attendance->buildHeatmap($user, $year, $month, $holidays, $approvedLeaves);

        $ipAllowed  = $this->attendance->isIpWhitelisted($request->ip());
        $inWindow   = $this->attendance->isWithinClockInWindow();
        $canClockIn = $ipAllowed && $inWindow && $todayShift === null;

        $todayNote = AttendanceNote::where('user_id', $user->id)
            ->where('date', today($tz))
            ->first();

        return Inertia::render('attendance/index', [
            'heatmapDays'  => $heatmapDays,
            'currentShift' => $todayShift
                ? $this->attendance->serializeShift($todayShift->load('breaks'))
                : null,
            'settings'     => $settings,
            'serverTime'   => now()->toIso8601String(),
            'canClockIn'   => $canClockIn,
            'ipAllowed'    => $ipAllowed,
            'year'         => $year,
            'month'        => $month,
            'todayNote'    => $todayNote?->items ?? [],
            'leaveRequests' => $leaves->map(fn ($l) => [
                'id'        => $l->id,
                'date_from' => $l->date_from->format('Y-m-d'),
                'date_to'   => $l->date_to->format('Y-m-d'),
                'reason'    => $l->reason,
                'status'    => $l->status,
            ])->values(),
        ]);
    }

    public function clockIn(Request $request): RedirectResponse
    {
        $user = $request->user();
        $ip   = $request->ip();

        if (! $this->attendance->isIpWhitelisted($ip)) {
            return back()->with('error', 'Clock-in not allowed from your current IP address.');
        }

        if (! $this->attendance->isWithinClockInWindow()) {
            return back()->with('error', 'Clock-in is only allowed during the configured time window.');
        }

        if ($this->attendance->getTodayShift($user)) {
            return back()->with('error', 'You have already clocked in today.');
        }

        $this->attendance->clockIn($user, $ip);

        return back()->with('success', 'Clocked in successfully.');
    }

    public function clockOut(Request $request): RedirectResponse
    {
        $user  = $request->user();
        $shift = $this->attendance->getTodayShift($user);

        if (! $shift || ! $shift->isOpen()) {
            return back()->with('error', 'No open shift to clock out from.');
        }

        if ($shift->hasOpenBreak()) {
            return back()->with('error', 'Please end your current break before clocking out.');
        }

        $this->attendance->clockOut($shift);

        return back()->with('success', 'Clocked out successfully.');
    }

    public function startBreak(Request $request): RedirectResponse
    {
        $user  = $request->user();
        $shift = $this->attendance->getTodayShift($user);

        if (! $shift || ! $shift->isOpen()) {
            return back()->with('error', 'No active shift to start a break on.');
        }

        if ($shift->hasOpenBreak()) {
            return back()->with('error', 'A break is already in progress.');
        }

        $this->attendance->startBreak($shift);

        return back()->with('success', 'Break started.');
    }

    public function endBreak(Request $request): RedirectResponse
    {
        $user  = $request->user();
        $shift = $this->attendance->getTodayShift($user);

        if (! $shift) {
            return back()->with('error', 'No active shift.');
        }

        $break = $shift->load('breaks')->currentBreak();

        if (! $break) {
            return back()->with('error', 'No break is currently in progress.');
        }

        $minMinutes = (int) \App\Models\SystemSetting::get('attendance_min_break_minutes', 15);
        $elapsed    = (int) $break->started_at->diffInMinutes(now());
        
        if ($elapsed < $minMinutes) {
            $remaining = $minMinutes - $elapsed;

            return back()->with('error', "Break must be at least {$minMinutes} minutes. {$remaining} minute(s) remaining.");
        }

        $this->attendance->endBreak($break);

        return back()->with('success', 'Break ended.');
    }
}
