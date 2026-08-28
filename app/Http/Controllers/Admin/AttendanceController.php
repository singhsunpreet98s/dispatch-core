<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\AppTimezone;
use App\Http\Controllers\Controller;
use App\Models\AttendanceBreak;
use App\Models\AttendanceShift;
use App\Models\User;
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
