<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SendGridService
{
    private const BASE_URL = 'https://api.sendgrid.com/v3';

    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.sendgrid.api_key', '');
    }

    public function getAggregateStats(int $days = 30): array
    {
        if (empty($this->apiKey)) {
            return $this->emptyStats();
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . '/stats', [
                'start_date' => now()->subDays($days)->format('Y-m-d'),
                'end_date' => now()->format('Y-m-d'),
                'aggregated_by' => 'day',
            ]);

        if (! $response->successful()) {
            return $this->emptyStats();
        }

        $totals = $this->emptyStats();

        foreach ($response->json() as $day) {
            foreach ($day['stats'] ?? [] as $stat) {
                foreach ($totals as $key => $_) {
                    $totals[$key] += $stat['metrics'][$key] ?? 0;
                }
            }
        }

        return $totals;
    }

    public function getRecentSingleSends(int $limit = 10): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . '/marketing/singlesends', [
                'page_size' => $limit,
            ]);

        if (! $response->successful()) {
            return [];
        }

        return $response->json('result', []);
    }

    private function emptyStats(): array
    {
        return [
            'requests' => 0,
            'delivered' => 0,
            'opens' => 0,
            'unique_opens' => 0,
            'clicks' => 0,
            'unique_clicks' => 0,
            'bounces' => 0,
            'spam_reports' => 0,
            'unsubscribes' => 0,
        ];
    }
}
