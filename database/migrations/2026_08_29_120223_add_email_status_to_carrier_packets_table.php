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
        Schema::table('carrier_packets', function (Blueprint $table) {
            $table->enum('email_status', ['pending', 'sent', 'failed'])
                  ->default('pending')
                  ->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('carrier_packets', function (Blueprint $table) {
            $table->dropColumn('email_status');
        });
    }
};
