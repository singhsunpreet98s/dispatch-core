<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->decimal('per_month_salary', 15, 2);
            $table->unsignedSmallInteger('total_days');
            $table->unsignedSmallInteger('days_present')->default(0);
            $table->unsignedSmallInteger('days_half_day')->default(0);
            $table->unsignedSmallInteger('days_short_leave')->default(0);
            $table->unsignedSmallInteger('days_absent')->default(0);
            $table->decimal('gross_earned', 15, 2);
            $table->timestamp('calculated_at');
            $table->timestamps();
            $table->unique(['user_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_salaries');
    }
};
