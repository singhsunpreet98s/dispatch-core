<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MotusService
{
    private const BASE_URL = 'https://motus.dot.gov/api/carriers/search';

    /**
     * Look up a carrier by MC/DOT number and return the entity name, or null if not found.
     */
    public function lookupByMcNumber(string $mcNumber): ?string
    {
        $query = preg_replace('/^MC-?/i', '', trim($mcNumber));

        if ($query === '') {
            return null;
        }

        try {
            $response = Http::timeout(8)->get(self::BASE_URL, [
                'query' => $query,
                'limit' => 25,
            ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json('data', []);

            return isset($data[0]['entityName']) ? $data[0]['entityName'] : null;
        } catch (\Throwable $e) {
            Log::warning('MotusService lookup failed', ['mc' => $mcNumber, 'error' => $e->getMessage()]);

            return null;
        }
    }
}
