<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_request_log_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('log_id')->constrained('rate_request_logs')->cascadeOnDelete();
            $table->string('to_email');
            $table->string('company_name')->nullable();
            $table->string('mc_number')->nullable();
            $table->string('status')->default('pending'); // pending | sent | failed
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_request_log_entries');
    }
};
