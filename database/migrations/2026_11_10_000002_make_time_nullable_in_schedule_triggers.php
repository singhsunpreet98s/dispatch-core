<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_triggers', function (Blueprint $table) {
            $table->string('time', 5)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('schedule_triggers', function (Blueprint $table) {
            $table->string('time', 5)->nullable(false)->change();
        });
    }
};
