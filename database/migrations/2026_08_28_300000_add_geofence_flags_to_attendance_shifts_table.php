<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_shifts', function (Blueprint $table) {
            $table->boolean('clock_in_outside_geofence')->nullable()->after('clock_out_lng');
            $table->boolean('clock_out_outside_geofence')->nullable()->after('clock_in_outside_geofence');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_shifts', function (Blueprint $table) {
            $table->dropColumn(['clock_in_outside_geofence', 'clock_out_outside_geofence']);
        });
    }
};
