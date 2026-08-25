<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_dispatch_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('schedule_trigger_id')->constrained('schedule_triggers')->cascadeOnDelete();
            $table->enum('status', ['pending', 'processing', 'sent', 'failed'])->default('pending');
            $table->timestamp('queued_at');
            $table->timestamp('dispatched_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            // prevent duplicate queuing for the same trigger in the same minute
            $table->unique(['schedule_trigger_id', 'queued_at'], 'unique_trigger_queued_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_dispatch_queue');
    }
};
