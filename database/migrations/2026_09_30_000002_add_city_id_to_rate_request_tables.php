<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rate_request_contacts', function (Blueprint $table) {
            $table->unsignedBigInteger('city_id')->nullable()->after('import_id');
            $table->foreign('city_id')->references('id')->on('rate_request_cities')->nullOnDelete();
        });

        Schema::table('rate_request_imports', function (Blueprint $table) {
            $table->unsignedBigInteger('city_id')->nullable()->after('id');
            $table->foreign('city_id')->references('id')->on('rate_request_cities')->nullOnDelete();
        });

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('city_id')->nullable()->after('user_id');
            $table->foreign('city_id')->references('id')->on('rate_request_cities')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rate_request_contacts', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropColumn('city_id');
        });

        Schema::table('rate_request_imports', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropColumn('city_id');
        });

        Schema::table('rate_request_logs', function (Blueprint $table) {
            $table->dropForeign(['city_id']);
            $table->dropColumn('city_id');
        });
    }
};
