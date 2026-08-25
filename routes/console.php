<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('attendance:close-open-shifts')->everyMinute();

Schedule::command('campaigns:check-schedules')->everyMinute();
Schedule::command('campaigns:dispatch-queue')->everyMinute();
