<?php

namespace App\Console\Commands;

use App\Enums\FeatureFlag;
use App\Helpers\AppTimezone;
use App\Mail\BreakReminderMail;
use App\Models\AttendanceBreak;
use App\Models\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendBreakReminders extends Command
{
    protected $signature   = 'attendance:send-break-reminders';

    protected $description = 'Send reminder emails to employees whose break has been open too long';

    public function handle(): int
    {
        if (! FeatureFlag::BREAK_REMINDER->isEnabled()) {
            return Command::SUCCESS;
        }

        $thresholdMinutes = (int) SystemSetting::get('attendance_break_reminder_threshold_minutes', 30);
        $intervalMinutes  = (int) SystemSetting::get('attendance_break_reminder_interval_minutes', 10);
        $maxEmails        = (int) SystemSetting::get('attendance_break_reminder_max_emails', 10);

        if ($intervalMinutes < 1) {
            $intervalMinutes = 1;
        }

        $tz = AppTimezone::get();

        // Scope to breaks that started today in the app timezone.
        $todayStart = now($tz)->startOfDay()->utc();
        $todayEnd   = now($tz)->endOfDay()->utc();

        // Find open breaks that have exceeded the threshold and haven't hit the max reminder count.
        // We only load breaks whose shift is also open (not closed yet).
        $openBreaks = AttendanceBreak::with(['shift.user'])
            ->whereNull('ended_at')
            ->where('reminder_count', '<', $maxEmails)
            ->whereBetween('started_at', [$todayStart, $todayEnd])
            ->whereHas('shift', fn($q) => $q->whereNull('clocked_out_at'))
            ->get();

        $sent = 0;

        foreach ($openBreaks as $break) {
            $minutesElapsed = (int) $break->started_at->diffInMinutes(now());

            // Skip if break hasn't reached the initial threshold yet.
            if ($minutesElapsed < $thresholdMinutes) {
                continue;
            }

            // How many reminders *should* have been sent by now?
            $minutesOverThreshold = $minutesElapsed - $thresholdMinutes;
            $dueCount             = (int) floor($minutesOverThreshold / $intervalMinutes) + 1;
            $dueCount             = min($dueCount, $maxEmails);

            // Only send if we're behind on reminders.
            if ($break->reminder_count >= $dueCount) {
                continue;
            }

            $employee = $break->shift->user;

            if (! $employee || ! $employee->email) {
                continue;
            }

            $nextReminder = $break->reminder_count + 1;

            Mail::to($employee->email)->send(new BreakReminderMail($employee, $break, $nextReminder));

            $break->increment('reminder_count');
            $sent++;
        }

        if ($sent > 0) {
            $this->info("Sent {$sent} break reminder(s).");
        }

        return Command::SUCCESS;
    }
}
