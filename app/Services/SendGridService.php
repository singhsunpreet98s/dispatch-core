<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class SendGridService
{
    private const BASE_URL = 'https://api.sendgrid.com/v3';

    private string $apiKey;
    private ?int $unsubscribeGroupId;

    public function __construct()
    {
        $this->apiKey             = config('services.sendgrid.api_key', '');
        $unsubGroupId             = config('services.sendgrid.unsubscribe_group_id');
        $this->unsubscribeGroupId = $unsubGroupId ? (int) $unsubGroupId : null;
    }

    /**
     * Build the email_config block required by every single-send.
     *
     * @param  int  $senderId  The numeric SendGrid sender ID from the sending user's profile.
     */
    private function buildEmailConfig(string $subject, string $htmlContent, int $senderId): array
    {
        $config = [
            'subject'                => $subject,
            'html_content'           => $htmlContent,
            'generate_plain_content' => true,
            'sender_id'              => $senderId,
            "ip_pool_id" => "new_192"
        ];

        if ($this->unsubscribeGroupId) {
            $config['suppression_group_id'] = $this->unsubscribeGroupId;
        } else {
            $config['custom_unsubscribe_url'] = config('app.url') . '/unsubscribe';
        }

        return $config;
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
        ?string $toEmail = null,
        ?string $fromEmail = null,
        int $limit = 200,
    ): array {
        if (empty($this->apiKey)) {
            return [];
        }



        $startTs = $startDate . 'T00:00:00.000Z';
        $endTs   = $endDate   . 'T23:59:59.000Z';
        $now = Carbon::now('UTC');

        if (Carbon::parse($endDate, 'UTC')->isSameDay($now)) {
            // Start date is today → use today's date with current UTC time
            $endTs = Carbon::parse($endDate, 'UTC')
                ->setTime($now->hour, $now->minute, $now->second, $now->micro)
                ->format('Y-m-d\TH:i:s.v\Z');
        }

        $query = $this->buildEmailFilter(
            $toEmail,
            $fromEmail,
            $status,
            $startTs,
            $endTs
        );
        $response = Http::withToken($this->apiKey)
            ->post(self::BASE_URL . '/logs', [
                'limit' => $limit,
                'query' => $query,
            ]);

        if ($response->failed()) {
            return [];
        }
        if (! $response->successful()) {
            return [];
        }

        $messages = $response->json('messages', []);

        usort($messages, fn($a, $b) => strcmp(
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

        return array_map(fn($s) => [
            'id'         => $s['id'],
            'from_email' => $s['from_email'] ?? '',
            'from_name'  => $s['from_name'] ?? '',
        ], $response->json('results', []));
    }

    /**
     * Delete a SendGrid Marketing Contacts list by its ID.
     *
     * @throws \RuntimeException on API failure
     */
    public function deleteMarketingList(string $listId): void
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('SendGrid API key is not configured.');
        }

        $response = Http::withToken($this->apiKey)
            ->delete(self::BASE_URL . '/marketing/lists/' . $listId, [
                'delete_contacts' => false,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Failed to delete SendGrid list: ' . $response->body());
        }
    }

    /**
     * Create a SendGrid Marketing Contacts list and return its ID.
     *
     * @throws \RuntimeException on API failure
     */
    public function createMarketingList(string $name): string
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('SendGrid API key is not configured.');
        }

        $response = Http::withToken($this->apiKey)
            ->post(self::BASE_URL . '/marketing/lists', ['name' => $name]);

        if (! $response->successful()) {
            throw new \RuntimeException('Failed to create SendGrid list: ' . $response->body());
        }

        return $response->json('id');
    }

    /**
     * Upsert contacts into the Marketing Contacts store and assign them to a list.
     *
     * @param  array{email: string, name?: string|null}[]  $contacts
     *
     * @throws \RuntimeException on API failure
     */
    public function addContactsToList(string $listId, array $contacts): void
    {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('SendGrid API key is not configured.');
        }

        $payload = array_map(function (array $c) {
            $contact = ['email' => $c['email']];
            if (! empty($c['name'])) {
                $parts = explode(' ', $c['name'], 2);
                $contact['first_name'] = $parts[0];
                if (isset($parts[1])) {
                    $contact['last_name'] = $parts[1];
                }
            }
            return $contact;
        }, $contacts);

        foreach (array_chunk($payload, 1000) as $chunk) {
            $response = Http::withToken($this->apiKey)
                ->put(self::BASE_URL . '/marketing/contacts', [
                    'list_ids' => [$listId],
                    'contacts' => $chunk,
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException('Failed to add contacts to SendGrid list: ' . $response->body());
            }
        }
    }

    /**
     * Create a single-send targeting a specific marketing list and dispatch it immediately.
     *
     * @return string  The SendGrid single-send ID
     *
     * @throws \RuntimeException on any API failure
     */
    public function sendToList(
        string $campaignName,
        string $subject,
        string $htmlContent,
        string $listId,
        int $senderId,
    ): string {
        if (empty($this->apiKey)) {
            throw new \RuntimeException('SendGrid API key is not configured.');
        }

        $createRes = Http::withToken($this->apiKey)
            ->post(self::BASE_URL . '/marketing/singlesends', [
                'name'         => $campaignName,
                'send_to'      => ['list_ids' => [$listId]],
                'email_config' => $this->buildEmailConfig($subject, $htmlContent, $senderId),
            ]);

        if (! $createRes->successful()) {
            throw new \RuntimeException('Failed to create single-send: ' . $createRes->body());
        }

        $singlesendId = $createRes->json('id');

        $sendRes = Http::withToken($this->apiKey)
            ->put(self::BASE_URL . "/marketing/singlesends/{$singlesendId}/schedule", [
                'send_at' => 'now',
            ]);

        if (! $sendRes->successful()) {
            throw new \RuntimeException('Failed to schedule single-send: ' . $sendRes->body());
        }

        return $singlesendId;
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
        int $senderId,
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
                'email_config' => $this->buildEmailConfig($subject, $htmlContent, $senderId),
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

    /**
     * Send a one-to-one transactional email via the SendGrid Email API (/v3/mail/send).
     *
     * The `from` address is the verified SendGrid sender from config.
     * Pass `$replyToEmail` to set a Reply-To header (e.g. the requesting user's address).
     *
     * @return array{status: int, error?: string}  status 1 = success, 0 = failure
     */
    public function sendTransactionalEmail(
        string $toEmail,
        string $fromEmail,
        string $subject,
        string $htmlContent,
        ?string $fromName = null,
    ): array {
        if (empty($this->apiKey)) {
            return ['status' => 0, 'error' => 'SendGrid API key is not configured.'];
        }

        $payload = [
            'personalizations' => [
                ['to' => [['email' => $toEmail]]],
            ],
            'from'    => array_filter(['email' => $fromEmail, 'name' => $fromName]),
            'subject' => $subject,
            'content' => [
                ['type' => 'text/html', 'value' => $htmlContent],
            ],
        ];

        $response = Http::withToken($this->apiKey)
            ->post(self::BASE_URL . '/mail/send', $payload);

        // SendGrid returns 202 Accepted on success
        if ($response->successful()) {
            return ['status' => 1];
        }

        $errors = $response->json('errors', []);
        $error  = ! empty($errors) ? $errors[0]['message'] : $response->body();

        \Illuminate\Support\Facades\Log::error('SendGridService::sendTransactionalEmail failed', [
            'to'     => $toEmail,
            'status' => $response->status(),
            'error'  => $error,
        ]);

        return ['status' => 0, 'error' => $error];
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
    private function buildEmailFilter(
        ?string $toEmail = null,
        ?string $fromEmail = null,
        ?string $statuses = null,
        ?string $startDate = null,
        ?string $endDate = null
    ): string {
        $conditions = [];

        if ($statuses === "all") {
            $statuses = [
                'processed',
                'delivered',
                'deferred',
                'dropped',
                'bounced',
                'blocked',
            ];
        } elseif (!empty($statuses)) {
            $statuses = [$statuses];
        } else {
            $statuses = [];
        }

        if (!empty($toEmail)) {
            $conditions[] = "to_email LIKE '" . addslashes($toEmail) . "%'";
        }

        if (!empty($fromEmail)) {
            $conditions[] = "from_email LIKE '" . addslashes($fromEmail) . "%'";
        }

        if (!empty($statuses)) {
            $statusList = implode(
                ', ',
                array_map(
                    fn($status) => "'" . addslashes($status) . "'",
                    $statuses
                )
            );

            $conditions[] = "status IN ($statusList)";
        }

        if (!empty($startDate)) {
            $conditions[] = 'sg_message_id_created_at > TIMESTAMP "' . $startDate . '"';
        }

        if (!empty($endDate)) {
            $conditions[] = 'sg_message_id_created_at < TIMESTAMP "' . $endDate . '"';
        }

        return implode(' AND ', $conditions);
    }
}
