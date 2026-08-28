<?php

namespace App\Console\Commands;

use App\Models\LeaveRequest;
use App\Models\MonthlySalary;
use App\Models\Salary;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class CalculateMonthlySalary extends Command
{
    protected $signature = 'salary:calculate-monthly
                            {--month= : Year-month to calculate (e.g. 2026-07); defaults to previous month}';

    protected $description = 'Calculate monthly salary for all users based on their attendance';

    // New attendance thresholds (worked seconds, excluding breaks)
    private const FULL_DAY_SECONDS  = 7 * 3600 + 40 * 60; // 7h 40m
    private const SHORT_LEAVE_SECONDS = 6 * 3600;           // 6h
    private const HALF_DAY_SECONDS  = 4 * 3600;             // 4h

    // Paid leaves allowed per month
    private const PAID_LEAVES_PER_MONTH = 1;

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
            $this->warn("Note: {$futureDays} future day(s) will not be counted (month is not yet complete).");
        }

        $salaries = Salary::with('user')->get();
        $holidays = $attendance->getMonthHolidays($year, $month);

        // Pre-compute working days for the month (shared across all users)
        $workingDays = 0;
        for ($d = 1; $d <= $totalDays; $d++) {
            $date = Carbon::create($year, $month, $d);
            $dateStr = $date->format('Y-m-d');
            if (!in_array($date->dayOfWeek, [0, 6]) && !$holidays->has($dateStr)) {
                $workingDays++;
            }
        }

        $this->line("  Working days this month: {$workingDays}");

        $count = 0;

        foreach ($salaries as $salary) {
            $user     = $salary->user;
            $perMonth = (float) $salary->per_month;
            $perDay   = $workingDays > 0 ? $perMonth / $workingDays : 0;

            $shifts = $attendance->getMonthShifts($user, $year, $month);

            // Load approved leave days for this user this month
            $approvedLeaveDays = $this->getApprovedLeaveDays($user->id, $year, $month);

            // Leave quota: 1 paid leave per month (consumed in calendar order)
            $paidLeaveQuota = self::PAID_LEAVES_PER_MONTH;

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
                    // Non-working day — only counts if the employee actually worked
                    if ($shift && $shift->clocked_in_at) {
                        $workedSeconds = $shift->totalWorkedSeconds();
                        if ($workedSeconds >= self::FULL_DAY_SECONDS) {
                            $status = 'extra_present';
                        } elseif ($workedSeconds >= self::SHORT_LEAVE_SECONDS) {
                            $status = 'extra_short_leave';
                        } elseif ($workedSeconds >= self::HALF_DAY_SECONDS) {
                            $status = 'extra_half_day';
                        } else {
                            $status = 'nonworking';
                        }
                    } else {
                        $status = 'nonworking';
                    }
                } elseif ($shift && $shift->clocked_in_at) {
                    // Attendance status is based on worked seconds (excluding breaks)
                    $workedSeconds = $shift->totalWorkedSeconds();
                    if ($workedSeconds >= self::FULL_DAY_SECONDS) {
                        $status = 'present';
                    } elseif ($workedSeconds >= self::SHORT_LEAVE_SECONDS) {
                        $status = 'short_leave';
                    } elseif ($workedSeconds >= self::HALF_DAY_SECONDS) {
                        $status = 'half_day';
                    } else {
                        $status = 'absent';
                    }
                } elseif ($approvedLeaveDays->contains($dateStr)) {
                    // No shift but approved leave — consume paid quota
                    if ($paidLeaveQuota > 0) {
                        $status = 'leave_paid';
                        $paidLeaveQuota--;
                    } else {
                        $status = 'leave_unpaid';
                    }
                } else {
                    $status = 'absent';
                }

                $dayMap[$dateStr] = [
                    'status'        => $status,
                    'is_nonworking' => $isWeekend || $isHoliday,
                ];
            }

            // Tally and compute gross
            $daysPresent     = 0;
            $daysHalfDay     = 0;
            $daysShortLeave  = 0;
            $daysAbsent      = 0;
            $daysLeavePaid   = 0;
            $daysLeaveUnpaid = 0;
            $daysExtra       = 0;
            $extraEarned     = 0.0;
            $gross           = 0.0;
            $breakdown       = [];

            foreach ($dayMap as $dateStr => $info) {
                if ($info['status'] === 'future') {
                    continue;
                }

                // Extra pay: nonworking day where employee clocked in enough hours
                if ($info['is_nonworking']) {
                    $status = $info['status'];
                    if ($status === 'extra_present') {
                        $daysExtra++;
                        $earned       = $perDay;
                        $extraEarned += $earned;
                        $gross       += $earned;
                        $breakdown[] = [
                            'date'      => $dateStr,
                            'status'    => 'extra_present',
                            'per_day'   => round($perDay, 2),
                            'earned'    => round($earned, 2),
                            'deduction' => 0.0,
                            'reason'    => 'Extra Day — worked on weekend/holiday (full day)',
                        ];
                    } elseif ($status === 'extra_short_leave') {
                        $daysExtra++;
                        $earned       = round($perDay * 0.75, 2);
                        $extraEarned += $earned;
                        $gross       += $earned;
                        $breakdown[] = [
                            'date'      => $dateStr,
                            'status'    => 'extra_short_leave',
                            'per_day'   => round($perDay, 2),
                            'earned'    => $earned,
                            'deduction' => 0.0,
                            'reason'    => 'Extra Day — worked on weekend/holiday (short, 75%)',
                        ];
                    } elseif ($status === 'extra_half_day') {
                        $daysExtra++;
                        $earned       = round($perDay * 0.5, 2);
                        $extraEarned += $earned;
                        $gross       += $earned;
                        $breakdown[] = [
                            'date'      => $dateStr,
                            'status'    => 'extra_half_day',
                            'per_day'   => round($perDay, 2),
                            'earned'    => $earned,
                            'deduction' => 0.0,
                            'reason'    => 'Extra Day — worked on weekend/holiday (half, 50%)',
                        ];
                    }
                    // nonworking with no/insufficient shift → no pay, skip
                    continue;
                }

                $status = $info['status'];

                if ($status === 'present') {
                    $daysPresent++;
                    $gross += $perDay;
                } elseif ($status === 'half_day') {
                    $daysHalfDay++;
                    $earned = round($perDay * 0.5, 2);
                    $gross += $earned;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'half_day',
                        'per_day'   => round($perDay, 2),
                        'earned'    => $earned,
                        'deduction' => round($perDay - $earned, 2),
                        'reason'    => 'Half Day — worked > 4h, earned 50%',
                    ];
                } elseif ($status === 'short_leave') {
                    $daysShortLeave++;
                    $earned = round($perDay * 0.75, 2);
                    $gross += $earned;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'short_leave',
                        'per_day'   => round($perDay, 2),
                        'earned'    => $earned,
                        'deduction' => round($perDay - $earned, 2),
                        'reason'    => 'Short Leave — worked > 6h, ¼ day deducted',
                    ];
                } elseif ($status === 'leave_paid') {
                    $daysLeavePaid++;
                    $gross += $perDay;
                    // no breakdown entry — paid leave is treated as present
                } elseif ($status === 'leave_unpaid') {
                    $daysLeaveUnpaid++;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'leave_unpaid',
                        'per_day'   => round($perDay, 2),
                        'earned'    => 0.0,
                        'deduction' => round($perDay, 2),
                        'reason'    => 'Unpaid Leave — paid leave quota already used this month',
                    ];
                } elseif ($status === 'absent') {
                    $daysAbsent++;
                    $breakdown[] = [
                        'date'      => $dateStr,
                        'status'    => 'absent',
                        'per_day'   => round($perDay, 2),
                        'earned'    => 0.0,
                        'deduction' => round($perDay, 2),
                        'reason'    => 'Absent — no attendance record',
                    ];
                }
            }

            MonthlySalary::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year, 'month' => $month],
                [
                    'per_month_salary'  => $perMonth,
                    'total_days'        => $totalDays,
                    'working_days'      => $workingDays,
                    'days_present'      => $daysPresent,
                    'days_half_day'     => $daysHalfDay,
                    'days_short_leave'  => $daysShortLeave,
                    'days_absent'       => $daysAbsent,
                    'days_leave_paid'   => $daysLeavePaid,
                    'days_leave_unpaid' => $daysLeaveUnpaid,
                    'days_extra'        => $daysExtra,
                    'extra_earned'      => round($extraEarned, 2),
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
     * Returns all working days (as Y-m-d strings) covered by the user's
     * approved leave requests in the given month.
     */
    private function getApprovedLeaveDays(int $userId, int $year, int $month): Collection
    {
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd   = $monthStart->copy()->endOfMonth();

        $leaves = LeaveRequest::where('user_id', $userId)
            ->where('status', 'approved')
            ->where('date_from', '<=', $monthEnd)
            ->where('date_to', '>=', $monthStart)
            ->get();

        $days = [];
        foreach ($leaves as $leave) {
            $from = $leave->date_from->max($monthStart);
            $to   = $leave->date_to->min($monthEnd);
            $cur  = $from->copy();
            while ($cur->lte($to)) {
                // Only count working days (Mon–Fri); salary command will
                // naturally skip weekends/holidays in its own loop anyway,
                // but this keeps the collection clean.
                if (!in_array($cur->dayOfWeek, [0, 6])) {
                    $days[] = $cur->format('Y-m-d');
                }
                $cur->addDay();
            }
        }

        return collect($days)->unique()->values();
    }

}
