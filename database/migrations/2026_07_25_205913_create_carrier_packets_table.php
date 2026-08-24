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
        Schema::create('carrier_packets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique();
            $table->string('email');
            $table->string('mc_number');
            $table->string('company_name');
            $table->enum('status', ['pending', 'opened', 'submitted', 'signed'])->default('pending');

            // Filled by the carrier/customer
            $table->string('full_name')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('signature_path')->nullable();

            $table->timestamp('opened_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carrier_packets');
    }
};
