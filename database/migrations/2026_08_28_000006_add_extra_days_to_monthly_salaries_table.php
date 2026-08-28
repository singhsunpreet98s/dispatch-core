<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monthly_salaries', function (Blueprint $table) {
            $table->unsignedSmallInteger('days_extra')->default(0)->after('days_leave_unpaid');
            $table->decimal('extra_earned', 15, 2)->default(0)->after('days_extra');
        });
    }

    public function down(): void
    {
        Schema::table('monthly_salaries', function (Blueprint $table) {
            $table->dropColumn(['days_extra', 'extra_earned']);
        });
    }
};
