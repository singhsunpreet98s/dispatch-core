<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('attendance:close-open-shifts')->everyMinute();

Schedule::command('salary:calculate-monthly')->monthlyOn(1, '12:00');

Schedule::command('campaigns:check-schedules')->everyMinute();
Schedule::command('campaigns:dispatch-queue')->everyMinute();

Schedule::command('db:backup')->dailyAt('23:59')->timezone('UTC');
