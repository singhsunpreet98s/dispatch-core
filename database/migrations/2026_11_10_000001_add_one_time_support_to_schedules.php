<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_triggers', function (Blueprint $table) {
            $table->dateTime('send_at')->nullable()->after('time');
        });

        // Widen the type enum to include one_time (MySQL/Postgres only; SQLite stores as text)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE schedules MODIFY COLUMN type ENUM('daily', 'custom', 'one_time')");
        }
    }

    public function down(): void
    {
        Schema::table('schedule_triggers', function (Blueprint $table) {
            $table->dropColumn('send_at');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE schedules MODIFY COLUMN type ENUM('daily', 'custom')");
        }
    }
};
