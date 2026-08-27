<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->constrained('users')->cascadeOnDelete();
            $table->string('changed_field'); // 'ctc' or 'per_month'
            $table->string('change_type');   // 'percentage', 'amount', 'absolute'
            $table->string('direction')->nullable(); // 'increase', 'decrease', null for absolute
            $table->decimal('change_value', 15, 2);
            $table->decimal('old_ctc', 15, 2);
            $table->decimal('new_ctc', 15, 2);
            $table->decimal('old_per_month', 15, 2);
            $table->decimal('new_per_month', 15, 2);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_histories');
    }
};
