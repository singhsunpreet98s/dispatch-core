<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_shifts', function (Blueprint $table) {
            $table->decimal('clock_in_lat',  10, 7)->nullable()->after('ip_address');
            $table->decimal('clock_in_lng',  10, 7)->nullable()->after('clock_in_lat');
            $table->decimal('clock_out_lat', 10, 7)->nullable()->after('clock_in_lng');
            $table->decimal('clock_out_lng', 10, 7)->nullable()->after('clock_out_lat');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_shifts', function (Blueprint $table) {
            $table->dropColumn(['clock_in_lat', 'clock_in_lng', 'clock_out_lat', 'clock_out_lng']);
        });
    }
};
