<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_request_cities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        $cities = [
            'Anchorage',
            'Birmingham',
            'Huntsville',
            'Mobile',
            'Phoenix/Tucson',
            'Los Angeles/Long Beach',
            'Port Hueneme',
            'San Bernardino',
            'San Fran./Oakland',
            'Stockton/Lathrop',
            'Denver',
            'Wilmington, DE',
            'Jacksonville',
            'Miami/Ft. Lauderdale',
            'Panama City',
            'Tampa',
            'Titusville',
            'Winter Haven',
            'Atlanta',
            'Cordele',
            'Crandall/ARP',
            'Gainesville/GIP',
            'Savannah',
            'Honolulu',
            'Pocatello',
            'Chicago',
            'Decatur',
            'Indianapolis',
            'Georgetown',
            'Louisville',
            'New Orleans',
            'Boston',
            'Springfield',
            'Worcester/Ayer',
            'Baltimore',
            'Portland (Maine)',
            'Detroit',
            'Minne/St. Paul',
            'Kansas City',
            'St. Louis',
            'Gulfport',
            'Jackson',
            'Charlotte',
            'Greensboro',
            'Rocky Mount',
            'Wilmington, NC',
            'Minot',
            'Omaha',
            'Albuquerque',
            'Las Vegas',
            'Reno',
            'Albany',
            'Buffalo',
            'New York City/NJ',
            'Syracuse',
            'Cincinnati',
            'Cleveland',
            'Columbus',
            'Toledo/North Balt.',
            'Oklahoma City',
            'Portland',
            'Allentown/Beth.',
            'Chambersburg',
            'Harrisburg/Rutherford',
            'Philadelphia',
            'Pittsburgh',
            'Scranton/Taylor',
            'Charleston',
            'Dillon',
            'Greer',
            'Memphis',
            'Nashville',
            'Dallas/Ft. Worth',
            'El Paso/Santa Teresa',
            'Freeport',
            'Houston',
            'Laredo',
            'Rio Valley/McAllen',
            'San Antonio',
            'Salt Lake City',
            'Front Royal',
            'Norfolk',
            'Richmond',
            'Quincy',
            'Seattle/Tacoma',
            'Spokane',
            'Wallula (Tri-Cities)',
            'Chippewa Falls',
        ];

        $now  = now();
        $rows = array_map(fn ($name) => [
            'name'       => $name,
            'created_at' => $now,
            'updated_at' => $now,
        ], $cities);

        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('rate_request_cities')->insertOrIgnore($chunk);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_request_cities');
    }
};
