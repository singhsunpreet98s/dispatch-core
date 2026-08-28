<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monthly_salaries', function (Blueprint $table) {
            $table->unsignedSmallInteger('working_days')->default(0)->after('total_days');
            $table->unsignedSmallInteger('days_leave_paid')->default(0)->after('days_absent');
            $table->unsignedSmallInteger('days_leave_unpaid')->default(0)->after('days_leave_paid');
        });
    }

    public function down(): void
    {
        Schema::table('monthly_salaries', function (Blueprint $table) {
            $table->dropColumn(['working_days', 'days_leave_paid', 'days_leave_unpaid']);
        });
    }
};
