<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('feature_flags')->insertOrIgnore([
            'name'        => 'clock_in_reminder_feature_flag',
            'description' => 'Sends up to 3 escalating reminder emails to employees who have not clocked in on a working day (at clock-in time, +30 min, +45 min).',
            'enabled'     => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('feature_flags')->where('name', 'clock_in_reminder_feature_flag')->delete();
    }
};
