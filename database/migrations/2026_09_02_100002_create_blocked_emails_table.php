<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_emails', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('type'); // blocked | bounced
            $table->foreignId('import_id')->nullable()->constrained('blocked_email_imports')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_emails');
    }
};
