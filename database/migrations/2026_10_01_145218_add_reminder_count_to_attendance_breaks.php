<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance_breaks', function (Blueprint $table) {
            $table->unsignedSmallInteger('reminder_count')->default(0)->after('session_locked');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_breaks', function (Blueprint $table) {
            $table->dropColumn('reminder_count');
        });
    }
};
