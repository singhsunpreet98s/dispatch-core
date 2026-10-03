<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('feature_flags')->insertOrIgnore([
            'name'        => 'break_reminder_feature_flag',
            'description' => 'Enables automatic reminder emails to employees whose break has been open too long.',
            'enabled'     => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('feature_flags')->where('name', 'break_reminder_feature_flag')->delete();
    }
};
