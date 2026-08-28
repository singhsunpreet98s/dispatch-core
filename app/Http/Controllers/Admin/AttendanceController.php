<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\AppTimezone;
use App\Http\Controllers\Controller;
use App\Models\AppExitEvent;
use App\Models\AttendanceBreak;
use App\Models\AttendanceShift;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $dateFrom = $request->date_from ?? now(AppTimezone::get())->startOfMonth()->format('Y-m-d');
        $dateTo   = $request->date_to   ?? now(AppTimezone::get())->endOfMonth()->format('Y-m-d');

        $request->validate([
            'user_id'   => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $shifts = AttendanceShift::with(['user', 'breaks'])
            ->when($request->user_id, fn($q) => $q->where('user_id', $request->user_id))
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->orderBy('user_id')
            ->get();

        $summary = $shifts
            ->groupBy('user_id')
            ->map(function ($userShifts) {
                $user = $userShifts->first()->user;

                return [
                    'user'                 => ['id' => $user->id, 'name' => $user->name],
                    'days_worked'          => $userShifts->count(),
                    'total_worked_seconds' => $userShifts->sum(fn($s) => $s->totalWorkedSeconds()),
                    'total_break_seconds'  => $userShifts->sum(fn($s) => $s->totalBreakSeconds()),
                    'total_breaks'         => $userShifts->sum(fn($s) => $s->breaks->count()),
                ];
            })
            ->values();

        return Inertia::render('attendance/admin', [
            'summary' => $summary,
            'users'   => User::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'user_id'   => $request->user_id,
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
            ],
        ]);
    }

    public function live(): Response
    {
        $today        = now(AppTimezone::get())->toDateString();
        $clockInEnd   = SystemSetting::get('attendance_clock_in_end', '');

        $users = User::where('role', '!=', 'admin')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'system_id']);

        $shifts = AttendanceShift::with(['breaks'])
            ->where('date', $today)
            ->get()
            ->keyBy('user_id');

        $liveData = $users->map(function (User $user) use ($shifts, $clockInEnd) {
            /** @var AttendanceShift|null $shift */
            $shift = $shifts->get($user->id);

            if (! $shift) {
                return [
                    'user'   => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'system_id' => $user->system_id],
                    'status' => 'absent',
                    'shift'  => null,
                ];
            }

            $onBreak = $shift->hasOpenBreak();
            $isOpen  = $shift->isOpen();

            $status = match (true) {
                $onBreak => 'on_break',
                $isOpen  => 'present',
                default  => 'clocked_out',
            };

            $completedBreakSeconds = (int) $shift->breaks
                ->filter(fn (AttendanceBreak $b) => $b->ended_at !== null)
                ->sum(fn (AttendanceBreak $b) => $b->started_at->diffInSeconds($b->ended_at));

            return [
                'user'   => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'system_id' => $user->system_id],
                'status' => $status,
                'shift'  => [
                    'clocked_in_at'            => $shift->clocked_in_at?->toIso8601String(),
                    'clocked_out_at'           => $shift->clocked_out_at?->toIso8601String(),
                    'ip_address'               => $shift->ip_address,
                    'clock_in_lat'             => $shift->clock_in_lat,
                    'clock_in_lng'             => $shift->clock_in_lng,
                    'clock_out_lat'            => $shift->clock_out_lat,
                    'clock_out_lng'            => $shift->clock_out_lng,
                    'auto_closed'              => $shift->auto_closed,
                    'is_late'                  => $shift->is_late,
                    'current_break_started_at' => $shift->currentBreak()?->started_at?->toIso8601String(),
                    'completed_break_seconds'  => $completedBreakSeconds,
                    'total_worked_seconds'     => $shift->totalWorkedSeconds(),
                    'break_count'              => $shift->breaks->count(),
                    'breaks'                   => $shift->breaks->map(fn (AttendanceBreak $b) => [
                        'id'               => $b->id,
                        'started_at'       => $b->started_at?->toIso8601String(),
                        'ended_at'         => $b->ended_at?->toIso8601String(),
                        'duration_seconds' => $b->ended_at
                            ? (int) $b->started_at->diffInSeconds($b->ended_at)
                            : null,
                        'is_open'          => $b->ended_at === null,
                    ]),
                ],
            ];
        })->values();

        $exitEvents = AppExitEvent::with('user')
            ->whereDate('event_timestamp', $today)
            ->whereNull('acknowledged_at')
            ->orderBy('event_timestamp', 'desc')
            ->get()
            ->map(fn (AppExitEvent $e) => [
                'id'              => $e->id,
                'user_name'       => $e->user?->name ?? 'Unknown ('.$e->serial_number.')',
                'serial_number'   => $e->serial_number,
                'event_timestamp' => $e->event_timestamp->toIso8601String(),
            ])
            ->values();

        return Inertia::render('attendance/live', [
            'liveData'    => $liveData,
            'today'       => $today,
            'appTimezone' => AppTimezone::get(),
            'clockInEnd'  => $clockInEnd,
            'exitEvents'  => $exitEvents,
        ]);
    }

    public function acknowledgeExitEvent(AppExitEvent $exitEvent): RedirectResponse
    {
        $exitEvent->update(['acknowledged_at' => now()]);

        return back();
    }

    public function show(Request $request, User $user): Response
    {
        $dateFrom = $request->date_from ?? now(AppTimezone::get())->startOfMonth()->format('Y-m-d');
        $dateTo   = $request->date_to   ?? now(AppTimezone::get())->endOfMonth()->format('Y-m-d');

        $shifts = AttendanceShift::with('breaks')
            ->where('user_id', $user->id)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->orderBy('date')
            ->get()
            ->map(function (AttendanceShift $s) {
                $totalShift = $s->totalShiftSeconds();
                if ($totalShift >= 9 * 3600) {
                    $dayStatus = 'present';
                } elseif ($totalShift >= 7 * 3600) {
                    $dayStatus = 'short_leave';
                } elseif ($totalShift >= 5 * 3600) {
                    $dayStatus = 'half_day';
                } else {
                    $dayStatus = 'absent';
                }

                return [
                    'id'                   => $s->id,
                    'date'                 => $s->date->format('Y-m-d'),
                    'clocked_in_at'        => $s->clocked_in_at?->format('H:i:s'),
                    'clocked_out_at'       => $s->clocked_out_at?->format('H:i:s'),
                    'total_worked_seconds' => $s->totalWorkedSeconds(),
                    'total_break_seconds'  => $s->totalBreakSeconds(),
                    'total_shift_seconds'  => $totalShift,
                    'day_status'           => $dayStatus,
                    'break_count'          => $s->breaks->count(),
                    'auto_closed'          => $s->auto_closed,
                    'is_late'              => $s->is_late,
                    'breaks'               => $s->breaks->map(fn(AttendanceBreak $b) => [
                        'id'               => $b->id,
                        'started_at'       => $b->started_at?->format('H:i:s'),
                        'ended_at'         => $b->ended_at?->format('H:i:s'),
                        'duration_seconds' => $b->ended_at
                            ? (int) $b->started_at->diffInSeconds($b->ended_at)
                            : null,
                    ]),
                ];
            });
        return Inertia::render('attendance/admin-detail', [
            'user'     => ['id' => $user->id, 'name' => $user->name],
            'shifts'   => $shifts,
            'dateFrom' => $dateFrom,
            'dateTo'   => $dateTo,
        ]);
    }
}
