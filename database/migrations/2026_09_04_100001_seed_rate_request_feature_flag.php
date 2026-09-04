<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('feature_flags')->insertOrIgnore([
            'name'        => 'rate_request_feature_flag',
            'description' => 'Enables the rate request module for sending and managing rate requests.',
            'enabled'     => false,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('feature_flags')->where('name', 'rate_request_feature_flag')->delete();
    }
};
