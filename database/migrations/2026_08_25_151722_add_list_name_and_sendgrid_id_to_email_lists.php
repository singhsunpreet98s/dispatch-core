<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_lists', function (Blueprint $table) {
            $table->string('list_name')->after('original_name');
            $table->string('sendgrid_list_id')->nullable()->after('email_count');
        });
    }

    public function down(): void
    {
        Schema::table('email_lists', function (Blueprint $table) {
            $table->dropColumn(['list_name', 'sendgrid_list_id']);
        });
    }
};
