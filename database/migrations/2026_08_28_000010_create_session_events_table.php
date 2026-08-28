<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('serial_number');
            $table->string('event'); // lock | unlock
            $table->dateTime('event_timestamp');
            $table->timestamps();

            $table->index('serial_number');
            $table->index('event_timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_events');
    }
};
