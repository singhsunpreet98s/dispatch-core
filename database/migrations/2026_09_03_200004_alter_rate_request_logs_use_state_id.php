<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('state_id')->nullable()->after('user_id');
        });

        DB::statement(
            'UPDATE rate_request_logs SET state_id = (SELECT id FROM states WHERE state_code = rate_request_logs.state)'
        );

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('state_id')->nullable(false)->change();
        });

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->dropColumn('state');
        });
    }

    public function down(): void
    {
        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->string('state', 2)->nullable()->after('user_id');
        });

        DB::statement(
            'UPDATE rate_request_logs SET state = (SELECT state_code FROM states WHERE id = rate_request_logs.state_id)'
        );

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->dropColumn('state_id');
        });
    }
};
