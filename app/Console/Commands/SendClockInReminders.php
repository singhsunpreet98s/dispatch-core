<?php

namespace App\Console\Commands;

use App\Enums\FeatureFlag;
use App\Helpers\AppTimezone;
use App\Mail\ClockInReminderMail;
use App\Models\AttendanceHoliday;
use App\Models\AttendanceShift;
use App\Models\ClockInReminderLog;
use App\Models\LeaveRequest;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SendClockInReminders extends Command
{
    protected $signature   = 'attendance:send-clock-in-reminders';

    protected $description = 'Send reminder emails to employees who have not clocked in on a working day';

    // Offsets (in minutes from clock_in_start) at which each reminder fires.
    private const REMINDER_OFFSETS = [0, 30, 45];

    public function handle(): int
    {
        if (! FeatureFlag::CLOCK_IN_REMINDER->isEnabled()) {
            return Command::SUCCESS;
        }

        $clockInStart = SystemSetting::get('attendance_clock_in_start', '');

        if ($clockInStart === '') {
            return Command::SUCCESS;
        }

        $tz    = AppTimezone::get();
        $today = today($tz);
        $now   = now($tz);

        // Skip weekends (Sunday = 0, Saturday = 6)
        if (in_array($today->dayOfWeek, [0, 6], true)) {
            return Command::SUCCESS;
        }

        // Skip public holidays
        $isHoliday = AttendanceHoliday::where('date', $today->format('Y-m-d'))->exists();
        if ($isHoliday) {
            return Command::SUCCESS;
        }

        $startTime    = Carbon::parse($today->format('Y-m-d') . ' ' . $clockInStart, $tz);
        $minutesElapsed = (int) $startTime->diffInMinutes($now, false); // negative = before start

        if ($minutesElapsed < 0) {
            return Command::SUCCESS; // Too early — start time hasn't arrived yet
        }

        // IDs of users who have already clocked in today
        $clockedInUserIds = AttendanceShift::where('date', $today->format('Y-m-d'))
            ->whereNotNull('clocked_in_at')
            ->pluck('user_id')
            ->all();

        // IDs of users with an applied (pending or approved) leave that covers today
        $onLeaveUserIds = LeaveRequest::where('date_from', '<=', $today->format('Y-m-d'))
            ->where('date_to', '>=', $today->format('Y-m-d'))
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('user_id')
            ->all();

        $excludedIds = array_unique(array_merge($clockedInUserIds, $onLeaveUserIds));

        $users = User::whereNotIn('id', $excludedIds)
            ->whereNotNull('email')
            ->where('role', '!=', 'admin')
            ->get();

        $sent = 0;

        foreach ($users as $user) {
            // Claim only the single next due reminder inside a locked transaction.
            // One reminder per run prevents batch-sending (e.g. reminders 2 and 3
            // together) if a previous run was missed or delayed.
            $nextReminder = DB::transaction(function () use ($user, $today, $minutesElapsed) {
                $log = ClockInReminderLog::where('user_id', $user->id)
                    ->where('date', $today->format('Y-m-d'))
                    ->lockForUpdate()
                    ->first();

                $currentCount = $log?->reminder_count ?? 0;
                $next         = $currentCount + 1;

                if ($next > count(self::REMINDER_OFFSETS)) {
                    return null; // all reminders already sent
                }

                $requiredOffset = self::REMINDER_OFFSETS[$next - 1];

                if ($minutesElapsed < $requiredOffset) {
                    return null; // not yet time for the next reminder
                }

                if (! $log) {
                    ClockInReminderLog::create([
                        'user_id'        => $user->id,
                        'date'           => $today->format('Y-m-d'),
                        'reminder_count' => 1,
                    ]);
                } else {
                    $log->update(['reminder_count' => $next]);
                }

                return $next;
            });

            if ($nextReminder === null) {
                continue;
            }

            $offset      = self::REMINDER_OFFSETS[$nextReminder - 1];
            $minutesLate = max(0, $minutesElapsed - $offset);

            Mail::to($user->email)->send(new ClockInReminderMail($user, $nextReminder, $minutesLate));
            $sent++;
        }

        if ($sent > 0) {
            $this->info("Sent {$sent} clock-in reminder(s).");
        }

        return Command::SUCCESS;
    }
}
