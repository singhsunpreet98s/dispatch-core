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

    public function getDailyStats(string $startDate, string $endDate): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . '/stats', [
                'start_date'    => $startDate,
                'end_date'      => $endDate,
                'aggregated_by' => 'day',
            ]);

        if (! $response->successful()) {
            return [];
        }

        $days = [];
        foreach ($response->json() as $day) {
            $m = [];
            foreach ($day['stats'] ?? [] as $stat) {
                foreach ($stat['metrics'] ?? [] as $key => $value) {
                    $m[$key] = ($m[$key] ?? 0) + $value;
                }
            }
            $days[] = [
                'date'          => $day['date'],
                'requests'      => $m['requests']      ?? 0,
                'delivered'     => $m['delivered']     ?? 0,
                'undelivered'   => max(0, ($m['requests'] ?? 0) - ($m['delivered'] ?? 0)),
                'bounces'       => $m['bounces']       ?? 0,
                'opens'         => $m['opens']         ?? 0,
                'unique_opens'  => $m['unique_opens']  ?? 0,
                'clicks'        => $m['clicks']        ?? 0,
                'unique_clicks' => $m['unique_clicks'] ?? 0,
                'unsubscribes'  => $m['unsubscribes']  ?? 0,
                'spam_reports'  => $m['spam_reports']  ?? 0,
            ];
        }

        return $days;
    }

    public function getAggregateStats(string $startDate, string $endDate): array
    {
        $daily  = $this->getDailyStats($startDate, $endDate);
        $totals = $this->emptyStats();

        foreach ($daily as $day) {
            foreach ($totals as $key => $_) {
                $totals[$key] += $day[$key] ?? 0;
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

    public function getSingleSendDetail(string $singlesendId): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . "/marketing/singlesends/{$singlesendId}");

        if (! $response->successful()) {
            return [];
        }

        return $response->json();
    }

    public function getSingleSendStats(string $singlesendId): array
    {
        if (empty($this->apiKey)) {
            return $this->emptyStats();
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . "/marketing/stats/singlesends/{$singlesendId}");

        if (! $response->successful()) {
            return $this->emptyStats();
        }

        $totals = $this->emptyStats();

        foreach ($response->json('results', []) as $result) {
            foreach ($totals as $key => $_) {
                $totals[$key] += $result['stats'][$key] ?? 0;
            }
        }

        return $totals;
    }

    public function getAggregateStatsForSingleSends(array $singlesendIds): array
    {
        if (empty($singlesendIds)) {
            return $this->emptyStats();
        }

        $totals = $this->emptyStats();

        foreach (array_slice($singlesendIds, 0, 10) as $id) {
            $stats = $this->getSingleSendStats($id);
            foreach ($totals as $key => $_) {
                $totals[$key] += $stats[$key];
            }
        }

        return $totals;
    }

    public function getSingleSendsByIds(array $ids): array
    {
        if (empty($ids) || empty($this->apiKey)) {
            return [];
        }

        $all = $this->getRecentSingleSends(100);
        $idSet = array_flip($ids);

        return array_values(array_slice(
            array_filter($all, fn($send) => isset($idSet[$send['id'] ?? ''])),
            0,
            10,
        ));
    }

    /**
     * @param string[]|null $campaignIds  null = no filter; [] = user has no campaigns, return empty immediately
     */
    public function getEmailActivity(
        string $startDate,
        string $endDate,
        ?string $status = null,
        ?array $campaignIds = null,
        int $limit = 100,
    ): array {
        if (empty($this->apiKey)) {
            return [];
        }

        if ($campaignIds !== null && empty($campaignIds)) {
            return [];
        }

        $startTs = $startDate . 'T00:00:00.000Z';
        $endTs   = $endDate   . 'T23:59:59.000Z';
        $query   = "last_event_time BETWEEN TIMESTAMP \"{$startTs}\" AND TIMESTAMP \"{$endTs}\"";

        if ($status) {
            $query = "status={$status} AND {$query}";
        }

        if (! empty($campaignIds)) {
            $ids       = array_map(fn ($id) => "marketing_campaign_id={$id}", $campaignIds);
            $campaignQ = '(' . implode(' OR ', $ids) . ')';
            $query     = "{$campaignQ} AND {$query}";
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . '/messages', [
                'limit' => $limit,
                'query' => $query,
            ]);

        if (! $response->successful()) {
            return [];
        }

        $messages = $response->json('messages', []);

        usort($messages, fn ($a, $b) => strcmp(
            $b['last_event_time'] ?? '',
            $a['last_event_time'] ?? '',
        ));

        return $messages;
    }

    public function getVerifiedSenders(): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $response = Http::withToken($this->apiKey)
            ->get(self::BASE_URL . '/verified_senders');

        if (! $response->successful()) {
            return [];
        }

        return array_map(fn ($s) => [
            'id'         => $s['id'],
            'from_email' => $s['from_email'] ?? '',
            'from_name'  => $s['from_name'] ?? '',
        ], $response->json('results', []));
    }

    /**
     * Upsert contacts from an email list, create a single-send campaign, and send it immediately.
     *
     * @param  array{email: string, first_name?: string, last_name?: string}[]  $contacts
     * @return string  The SendGrid single-send ID
     *
     * @throws \RuntimeException on any API failure
     */
    public function sendMarketingCampaign(
        string $campaignName,
        string $subject,
        string $htmlContent,
        array $contacts,
    ): string {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('SendGrid API key is not configured.');
        }

        // 1. Upsert contacts so they exist in the Marketing Contacts store
        $contactsRes = Http::withToken($this->apiKey)
            ->put(self::BASE_URL . '/marketing/contacts', ['contacts' => $contacts]);

        if (! $contactsRes->successful()) {
            throw new \RuntimeException('Failed to upsert contacts: ' . $contactsRes->body());
        }

        // 2. Create a single-send
        $createRes = Http::withToken($this->apiKey)
            ->post(self::BASE_URL . '/marketing/singlesends', [
                'name'         => $campaignName,
                'send_to'      => ['all' => true],
                'email_config' => [
                    'subject'                => $subject,
                    'html_content'           => $htmlContent,
                    'generate_plain_content' => true,
                ],
            ]);

        if (! $createRes->successful()) {
            throw new \RuntimeException('Failed to create single-send: ' . $createRes->body());
        }

        $singlesendId = $createRes->json('id');

        // 3. Schedule it to send now
        $sendRes = Http::withToken($this->apiKey)
            ->put(self::BASE_URL . "/marketing/singlesends/{$singlesendId}/schedule", [
                'send_at' => 'now',
            ]);

        if (! $sendRes->successful()) {
            throw new \RuntimeException('Failed to send single-send: ' . $sendRes->body());
        }

        return $singlesendId;
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
