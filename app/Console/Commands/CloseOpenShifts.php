<?php

namespace App\Console\Commands;

use App\Services\AttendanceService;
use Illuminate\Console\Command;

class CloseOpenShifts extends Command
{
    protected $signature   = 'attendance:close-open-shifts';

    protected $description = 'Auto-close open attendance shifts once the configured shift-end time is reached';

    public function handle(AttendanceService $attendance): int
    {
        $closed = $attendance->autoCloseOpenShifts();

        if ($closed > 0) {
            $this->info("Closed {$closed} open shift(s).");
        }

        return Command::SUCCESS;
    }
}
