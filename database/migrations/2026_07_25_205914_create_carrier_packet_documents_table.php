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
        Schema::create('carrier_packet_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carrier_packet_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // mc_authority, w9, coi, void_check
            $table->string('path');
            $table->string('disk')->default('public');
            $table->string('original_name');
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carrier_packet_documents');
    }
};
