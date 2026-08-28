<?php

namespace App\Services;

use App\Models\AttendanceBreak;
use App\Models\AttendanceHoliday;
use App\Models\AttendanceShift;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AttendanceService
{
    public function settings(): array
    {
        return [
            'clock_in_start'    => SystemSetting::get('attendance_clock_in_start', ''),
            'clock_in_end'      => SystemSetting::get('attendance_clock_in_end', ''),
            'shift_end'         => SystemSetting::get('attendance_shift_end', ''),
            'min_break_minutes' => (int) SystemSetting::get('attendance_min_break_minutes', 15),
            'ip_whitelist'      => SystemSetting::get('attendance_ip_whitelist', ''),
        ];
    }

    public function isIpWhitelisted(string $ip): bool
    {
        $raw = SystemSetting::get('attendance_ip_whitelist', '');
        if (trim($raw) === '') {
            return true;
        }

        $entries = array_filter(array_map('trim', explode("\n", $raw)));

        foreach ($entries as $entry) {
            if (str_contains($entry, '/')) {
                if ($this->ipInCidr($ip, $entry)) {
                    return true;
                }
            } elseif ($ip === $entry) {
                return true;
            }
        }

        return false;
    }

    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $prefixLen] = explode('/', $cidr, 2);
        $bits = (int) $prefixLen;

        $ipLong     = ip2long($ip);
        $subnetLong = ip2long($subnet);

        if ($ipLong === false || $subnetLong === false) {
            return false;
        }

        $mask = $bits === 0 ? 0 : (~0 << (32 - $bits));

        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    public function isWithinClockInWindow(): bool
    {
        $start = SystemSetting::get('attendance_clock_in_start', '');
        $end   = SystemSetting::get('attendance_clock_in_end', '');

        if ($start === '' || $end === '') {
            return true;
        }

        $now = now()->format('H:i');

        return $now >= $start && $now <= $end;
    }

    public function getTodayShift(User $user): ?AttendanceShift
    {
        return AttendanceShift::with('breaks')
            ->where('user_id', $user->id)
            ->where('date', today())
            ->first();
    }

    public function getMonthShifts(User $user, int $year, int $month): Collection
    {
        return AttendanceShift::with('breaks')
            ->where('user_id', $user->id)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get()
            ->keyBy(fn ($s) => $s->date->format('Y-m-d'));
    }

    public function getMonthHolidays(int $year, int $month): Collection
    {
        return AttendanceHoliday::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get()
            ->keyBy(fn ($h) => $h->date->format('Y-m-d'));
    }

    public function buildHeatmap(User $user, int $year, int $month, Collection $holidays, Collection $approvedLeaves = new Collection): array
    {
        $shifts      = $this->getMonthShifts($user, $year, $month);
        $settings    = $this->settings();
        $today       = today()->format('Y-m-d');
        $daysInMonth = Carbon::create($year, $month)->daysInMonth;
        $days        = [];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $date      = Carbon::create($year, $month, $d);
            $dateStr   = $date->format('Y-m-d');
            $shift     = $shifts->get($dateStr);
            $isWeekend = in_array($date->dayOfWeek, [0, 6]);
            $holiday   = $holidays->get($dateStr);
            $isLeave   = $approvedLeaves->contains(
                fn ($l) => $dateStr >= $l->date_from->format('Y-m-d') && $dateStr <= $l->date_to->format('Y-m-d')
            );
            $status    = $this->computeDayStatus($dateStr, $shift, $settings, $today, $isWeekend, $holiday !== null, $isLeave);
            $days[]    = [
                'date'         => $dateStr,
                'status'       => $status,
                'shift'        => $shift ? $this->serializeShift($shift) : null,
                'holiday_name' => $holiday?->name,
            ];
        }

        return $days;
    }

    private function computeDayStatus(
        string $dateStr,
        ?AttendanceShift $shift,
        array $settings,
        string $today,
        bool $isWeekend,
        bool $isHoliday,
        bool $isLeave = false
    ): string {
        if ($dateStr > $today) {
            return 'future';
        }

        // If worked (shift has clock-in), show work status regardless of weekend/holiday/leave
        if ($shift && $shift->clocked_in_at) {
            if ($dateStr === $today && $shift->isOpen()) {
                return 'open';
            }

            // Use worked seconds (excluding breaks) for status thresholds
            $workedSeconds = $shift->totalWorkedSeconds();

            if ($workedSeconds >= 7 * 3600 + 40 * 60) { // > 7h 40m
                return 'present';
            }
            if ($workedSeconds >= 6 * 3600) { // > 6h
                return 'short_leave';
            }
            if ($workedSeconds >= 4 * 3600) { // > 4h
                return 'half_day';
            }

            return 'absent';
        }

        // No shift — check holiday > leave > weekend > absent
        if ($isHoliday) {
            return 'holiday';
        }

        if ($isLeave) {
            return 'leave';
        }

        if ($isWeekend) {
            return 'weekend';
        }

        return 'absent';
    }

    public function serializeShift(AttendanceShift $shift): array
    {
        return [
            'id'                   => $shift->id,
            'date'                 => $shift->date->format('Y-m-d'),
            'clocked_in_at'        => $shift->clocked_in_at?->toIso8601String(),
            'clocked_out_at'       => $shift->clocked_out_at?->toIso8601String(),
            'ip_address'           => $shift->ip_address,
            'auto_closed'          => $shift->auto_closed,
            'total_worked_seconds' => $shift->totalWorkedSeconds(),
            'total_break_seconds'  => $shift->totalBreakSeconds(),
            'total_shift_seconds'  => $shift->totalShiftSeconds(),
            'breaks'               => $shift->breaks->map(fn ($b) => [
                'id'               => $b->id,
                'started_at'       => $b->started_at->toIso8601String(),
                'ended_at'         => $b->ended_at?->toIso8601String(),
                'duration_seconds' => $b->durationSeconds(),
            ])->all(),
        ];
    }

    public function clockIn(User $user, string $ip): AttendanceShift
    {
        return AttendanceShift::create([
            'user_id'       => $user->id,
            'date'          => today(),
            'clocked_in_at' => now(),
            'ip_address'    => $ip,
        ]);
    }

    public function clockOut(AttendanceShift $shift): AttendanceShift
    {
        $shift->update(['clocked_out_at' => now()]);

        return $shift;
    }

    public function startBreak(AttendanceShift $shift): AttendanceBreak
    {
        return $shift->breaks()->create(['started_at' => now()]);
    }

    public function endBreak(AttendanceBreak $break): AttendanceBreak
    {
        $break->update(['ended_at' => now()]);

        return $break;
    }

    public function autoCloseOpenShifts(): int
    {
        $shiftEndStr = SystemSetting::get('attendance_shift_end', '');

        if ($shiftEndStr === '') {
            return 0;
        }

        $shiftEndTime = Carbon::parse(today()->format('Y-m-d').' '.$shiftEndStr);
        if (now()->lt($shiftEndTime)) {
            return 0;
        }

        $openShifts = AttendanceShift::with('breaks')
            ->where('date', today())
            ->whereNotNull('clocked_in_at')
            ->whereNull('clocked_out_at')
            ->get();

        foreach ($openShifts as $shift) {
            $shift->breaks
                ->filter(fn ($b) => $b->ended_at === null)
                ->each(fn ($b) => $b->update(['ended_at' => $shiftEndTime]));

            $shift->update([
                'clocked_out_at' => $shiftEndTime,
                'auto_closed'    => true,
            ]);
        }

        return $openShifts->count();
    }
}
