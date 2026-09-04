<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('states', function (Blueprint $table) {
            $table->id();
            $table->string('state_code', 2)->unique();
            $table->string('state_name');
            $table->timestamps();
        });

        $now = now();
        DB::table('states')->insert([
            ['state_code' => 'AL', 'state_name' => 'Alabama',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'AK', 'state_name' => 'Alaska',        'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'AZ', 'state_name' => 'Arizona',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'AR', 'state_name' => 'Arkansas',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'CA', 'state_name' => 'California',    'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'CO', 'state_name' => 'Colorado',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'CT', 'state_name' => 'Connecticut',   'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'DE', 'state_name' => 'Delaware',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'FL', 'state_name' => 'Florida',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'GA', 'state_name' => 'Georgia',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'HI', 'state_name' => 'Hawaii',        'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'ID', 'state_name' => 'Idaho',         'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'IL', 'state_name' => 'Illinois',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'IN', 'state_name' => 'Indiana',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'IA', 'state_name' => 'Iowa',          'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'KS', 'state_name' => 'Kansas',        'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'KY', 'state_name' => 'Kentucky',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'LA', 'state_name' => 'Louisiana',     'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'ME', 'state_name' => 'Maine',         'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MD', 'state_name' => 'Maryland',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MA', 'state_name' => 'Massachusetts', 'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MI', 'state_name' => 'Michigan',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MN', 'state_name' => 'Minnesota',     'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MS', 'state_name' => 'Mississippi',   'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MO', 'state_name' => 'Missouri',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'MT', 'state_name' => 'Montana',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NE', 'state_name' => 'Nebraska',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NV', 'state_name' => 'Nevada',        'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NH', 'state_name' => 'New Hampshire', 'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NJ', 'state_name' => 'New Jersey',    'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NM', 'state_name' => 'New Mexico',    'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NY', 'state_name' => 'New York',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'NC', 'state_name' => 'North Carolina','created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'ND', 'state_name' => 'North Dakota',  'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'OH', 'state_name' => 'Ohio',          'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'OK', 'state_name' => 'Oklahoma',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'OR', 'state_name' => 'Oregon',        'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'PA', 'state_name' => 'Pennsylvania',  'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'RI', 'state_name' => 'Rhode Island',  'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'SC', 'state_name' => 'South Carolina','created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'SD', 'state_name' => 'South Dakota',  'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'TN', 'state_name' => 'Tennessee',     'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'TX', 'state_name' => 'Texas',         'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'UT', 'state_name' => 'Utah',          'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'VT', 'state_name' => 'Vermont',       'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'VA', 'state_name' => 'Virginia',      'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'WA', 'state_name' => 'Washington',    'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'WV', 'state_name' => 'West Virginia', 'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'WI', 'state_name' => 'Wisconsin',     'created_at' => $now, 'updated_at' => $now],
            ['state_code' => 'WY', 'state_name' => 'Wyoming',       'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('states');
    }
};
