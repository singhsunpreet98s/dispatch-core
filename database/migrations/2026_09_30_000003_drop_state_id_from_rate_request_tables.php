<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove rows that have no city assigned (legacy state-only data).
        DB::table('rate_request_contacts')->whereNull('city_id')->delete();
        DB::table('rate_request_imports')->whereNull('city_id')->delete();
        DB::table('rate_request_logs')->whereNull('city_id')->delete();

        Schema::table('rate_request_contacts', function (Blueprint $table) {
            $table->dropColumn('state_id');
        });

        Schema::table('rate_request_imports', function (Blueprint $table) {
            $table->dropColumn('state_id');
        });

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->dropColumn('state_id');
        });
    }

    public function down(): void
    {
        Schema::table('rate_request_contacts', function (Blueprint $table) {
            $table->unsignedBigInteger('state_id')->nullable()->after('import_id');
        });

        Schema::table('rate_request_imports', function (Blueprint $table) {
            $table->unsignedBigInteger('state_id')->nullable()->after('city_id');
        });

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('state_id')->nullable()->after('city_id');
        });
    }
};
