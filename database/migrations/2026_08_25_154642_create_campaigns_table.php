<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('email_templates')->restrictOnDelete();
            $table->foreignId('email_list_id')->constrained('email_lists')->restrictOnDelete();
            $table->string('name');
            $table->string('subject');
            $table->string('sendgrid_singlesend_id')->nullable();
            $table->enum('status', ['sending', 'sent', 'failed'])->default('sending');
            $table->text('error_message')->nullable();
            $table->unsignedInteger('contact_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
