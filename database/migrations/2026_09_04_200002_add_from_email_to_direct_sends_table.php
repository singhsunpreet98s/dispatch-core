<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('direct_sends', function (Blueprint $table) {
            $table->string('from_email')->after('email_list_id');
            $table->string('from_name')->nullable()->after('from_email');
        });
    }

    public function down(): void
    {
        Schema::table('direct_sends', function (Blueprint $table) {
            $table->dropColumn(['from_email', 'from_name']);
        });
    }
};
