<?php

namespace App\Console\Commands;

use App\Models\MonthlySalary;
use App\Models\Salary;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CalculateMonthlySalary extends Command
{
    protected $signature = 'salary:calculate-monthly
                            {--month= : Year-month to calculate (e.g. 2026-07); defaults to previous month}';

    protected $description = 'Calculate monthly salary for all users based on their attendance';

    public function handle(AttendanceService $attendance): int
    {
        $targetMonth = $this->option('month')
            ? Carbon::createFromFormat('Y-m', $this->option('month'))->startOfMonth()
            : now('UTC')->subMonth()->startOfMonth();

        $year      = (int) $targetMonth->format('Y');
        $month     = (int) $targetMonth->format('n');
        $totalDays = $targetMonth->daysInMonth;
        $today     = today()->format('Y-m-d');

        $isMidMonth = $targetMonth->format('Y-m') === now()->format('Y-m');

        $this->info("Calculating salary for {$targetMonth->format('F Y')} ({$totalDays} days)…");

        if ($isMidMonth) {
            $futureDays = $totalDays - (int) now()->format('j');
            $this->warn("Note: {$futureDays} future day(s) will not be counted (month is not yet complete). Run on {$targetMonth->copy()->addMonth()->format('M 1')} for the final figure.");
        }

        $salaries = Salary::with('user')->get();
        $holidays = $attendance->getMonthHolidays($year, $month);

        $count = 0;

        foreach ($salaries as $salary) {
            $user     = $salary->user;
            $perMonth = (float) $salary->per_month;
            $perDay   = $totalDays > 0 ? $perMonth / $totalDays : 0;

            $shifts = $attendance->getMonthShifts($user, $year, $month);

            // Pass 1 — resolve each calendar day independently.
            // Working days get their attendance-based status.
            // Non-working days (weekend / holiday) are marked as placeholders.
            $dayMap = [];
            for ($d = 1; $d <= $totalDays; $d++) {
                $date      = Carbon::create($year, $month, $d);
                $dateStr   = $date->format('Y-m-d');
                $shift     = $shifts->get($dateStr);
                $isWeekend = in_array($date->dayOfWeek, [0, 6]);
                $isHoliday = $holidays->has($dateStr);

                if ($dateStr > $today) {
                    $status = 'future';
                } elseif ($isWeekend || $isHoliday) {
                    $status = 'nonworking'; // resolved in pass 2
                } elseif ($shift && $shift->clocked_in_at) {
                    $seconds = $shift->totalShiftSeconds();
                    if ($seconds >= 9 * 3600)     $status = 'present';
                    elseif ($seconds >= 7 * 3600)  $status = 'short_leave';
                    elseif ($seconds >= 5 * 3600)  $status = 'half_day';
                    else                           $status = 'absent';
                } else {
                    $status = 'absent';
                }

                $dayMap[$dateStr] = [
                    'status'       => $status,
                    'is_nonworking' => $isWeekend || $isHoliday,
                ];
            }

            // Pass 2 — sandwich rule for weekends and holidays.
            // A non-working day is paid only when the employee was present
            // (any status other than 'absent') on BOTH the nearest working day
            // before AND after it. Absent on either side → non-working day is absent too.
            foreach ($dayMap as $dateStr => &$info) {
                if (!$info['is_nonworking'] || $info['status'] === 'future') {
                    continue;
                }

                $prevStatus = $this->nearestWorkdayStatus($dateStr, $dayMap, -1);
                $nextStatus = $this->nearestWorkdayStatus($dateStr, $dayMap, +1);

                $info['status'] = ($prevStatus === 'absent' && $nextStatus === 'absent')
                    ? 'absent'
                    : 'present';
            }
            unset($info);

            // Tally, compute gross, and build deduction breakdown
            $daysPresent    = 0;
            $daysHalfDay    = 0;
            $daysShortLeave = 0;
            $daysAbsent     = 0;
            $gross          = 0.0;
            $breakdown      = [];

            foreach ($dayMap as $dateStr => $info) {
                $status = $info['status'];

                if ($status === 'present') {
                    $daysPresent++;
                    $gross += $perDay;
                } elseif ($status === 'half_day') {
                    $daysHalfDay++;
                    $earned     = round($perDay * 0.5, 2);
                    $gross     += $earned;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'half_day',
                        'per_day'   => round($perDay, 2),
                        'earned'    => $earned,
                        'deduction' => round($perDay - $earned, 2),
                        'reason'    => 'Half Day — earned 50% of daily rate',
                    ];
                } elseif ($status === 'short_leave') {
                    $daysShortLeave++;
                    $earned     = round($perDay * 0.75, 2);
                    $gross     += $earned;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'short_leave',
                        'per_day'   => round($perDay, 2),
                        'earned'    => $earned,
                        'deduction' => round($perDay - $earned, 2),
                        'reason'    => 'Short Leave — ¼ day deducted',
                    ];
                } elseif ($status === 'absent') {
                    $daysAbsent++;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'absent',
                        'per_day'   => round($perDay, 2),
                        'earned'    => 0.0,
                        'deduction' => round($perDay, 2),
                        'reason'    => $info['is_nonworking']
                            ? 'Absent — no adjacent working day present'
                            : 'Absent — no attendance record',
                    ];
                }
                // future → ignored
            }

            MonthlySalary::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year, 'month' => $month],
                [
                    'per_month_salary'  => $perMonth,
                    'total_days'        => $totalDays,
                    'days_present'      => $daysPresent,
                    'days_half_day'     => $daysHalfDay,
                    'days_short_leave'  => $daysShortLeave,
                    'days_absent'       => $daysAbsent,
                    'gross_earned'      => round($gross, 2),
                    'breakdown'         => $breakdown,
                    'calculated_at'     => now(),
                ]
            );

            $count++;
            $this->line(sprintf('  %-30s ₹%s', $user->name, number_format(round($gross, 2), 2)));
        }

        $this->info("Done. Processed {$count} user(s).");

        return Command::SUCCESS;
    }

    /**
     * Walk in the given direction (+1 forward, -1 backward) until we find
     * a working day within the month. Returns 'present' if we hit the month
     * boundary (employee gets benefit of the doubt for cross-month boundaries).
     */
    private function nearestWorkdayStatus(string $dateStr, array $dayMap, int $direction): string
    {
        $date = Carbon::parse($dateStr);

        for ($i = 1; $i <= 14; $i++) {
            $checkStr = $date->copy()->addDays($direction * $i)->format('Y-m-d');

            if (! isset($dayMap[$checkStr])) {
                return 'present'; // outside month — assume present
            }

            if (! $dayMap[$checkStr]['is_nonworking']) {
                return $dayMap[$checkStr]['status']; // first working day found
            }
        }

        return 'present';
    }
}
