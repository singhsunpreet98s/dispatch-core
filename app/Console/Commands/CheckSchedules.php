<?php

namespace App\Console\Commands;

use App\Models\Schedule;
use App\Models\ScheduleDispatchQueue;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckSchedules extends Command
{
    protected $signature   = 'campaigns:check-schedules';
    protected $description = 'Check active schedules for due triggers and enqueue them for dispatch';

    public function handle(): int
    {
        $now = Carbon::now('Asia/Kolkata');
        $currentMinute = $now->format('H:i');
        $currentWeekday = (int) $now->format('w'); // 0=Sun … 6=Sat
        $queuedAt = $now->startOfMinute()->copy();


        Schedule::with(['triggers'])
            ->where('status', 'active')
            ->each(function (Schedule $schedule) use ($currentMinute, $currentWeekday, $queuedAt, &$queued) {
                foreach ($schedule->triggers as $trigger) {
                    if ($trigger->time !== $currentMinute) {
                        continue;
                    }

                    // daily: weekday is null — always matches
                    // custom: weekday must match today
                    if ($trigger->weekday !== null && $trigger->weekday !== $currentWeekday) {
                        continue;
                    }

                    $alreadyQueued = ScheduleDispatchQueue::where('schedule_trigger_id', $trigger->id)
                        ->where('queued_at', $queuedAt)
                        ->exists();

                    if ($alreadyQueued) {
                        continue;
                    }

                    ScheduleDispatchQueue::create([
                        'schedule_id'         => $schedule->id,
                        'schedule_trigger_id' => $trigger->id,
                        'status'              => 'pending',
                        'queued_at'           => $queuedAt,
                    ]);

                    $queued++;
                }
            });

        SystemSetting::set('cmd_check_schedules_last_run', $now->toIso8601String());

        if ($queued > 0) {
            $this->info("Queued {$queued} campaign(s) for dispatch.");
        }

        return Command::SUCCESS;
    }
}
