<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_list_id')
                ->constrained('email_lists')
                ->cascadeOnDelete();
            $table->string('email');
            $table->timestamps();

            $table->unique(['email_list_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_contacts');
    }
};
