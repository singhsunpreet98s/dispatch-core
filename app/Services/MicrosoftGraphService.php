<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MicrosoftGraphService
{
    private const TOKEN_URL      = 'https://login.microsoftonline.com/%s/oauth2/v2.0/token';
    private const SEND_MAIL_URL  = 'https://graph.microsoft.com/v1.0/users/%s/sendMail';
    private const TOKEN_CACHE_KEY = 'microsoft_graph_access_token';
    private const TOKEN_TTL_MINUTES = 60;

    private string $tenantId;
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        $this->tenantId     = config('services.microsoft_graph.tenant_id', '');
        $this->clientId     = config('services.microsoft_graph.client_id', '');
        $this->clientSecret = config('services.microsoft_graph.client_secret', '');
    }

    /**
     * Return a valid access token, fetching and caching a new one when needed.
     *
     * @throws \RuntimeException when credentials are missing or the token request fails
     */
    public function getAccessToken(): string
    {
        $cached = Cache::get(self::TOKEN_CACHE_KEY);
        if ($cached) {
            return $cached;
        }

        if (empty($this->tenantId) || empty($this->clientId) || empty($this->clientSecret)) {
            throw new \RuntimeException('Microsoft Graph credentials are not fully configured.');
        }

        $response = Http::asForm()->post(
            sprintf(self::TOKEN_URL, $this->tenantId),
            [
                'grant_type'    => 'client_credentials',
                'client_id'     => $this->clientId,
                'client_secret' => $this->clientSecret,
                'scope'         => 'https://graph.microsoft.com/.default',
            ]
        );

        if (! $response->successful()) {
            throw new \RuntimeException(
                'Failed to obtain Microsoft Graph access token: ' . $response->body()
            );
        }

        $token = $response->json('access_token');

        Cache::put(self::TOKEN_CACHE_KEY, $token, now()->addMinutes(self::TOKEN_TTL_MINUTES));

        return $token;
    }

    /**
     * Send an email via Microsoft Graph API.
     *
     * @param  string       $toEmail      Recipient address
     * @param  string       $fromEmail    Sender address (must be a mailbox in the tenant)
     * @param  string       $subject      Email subject
     * @param  string       $content      HTML body content
     * @param  array<array{name: string, contentType: string, contentBytes: string}>  $attachments
     *         Each item must have: name (filename), contentType (MIME type), contentBytes (base64-encoded data)
     *
     * @return array{status: int, error?: string}
     */
    public function sendEmail(
        string $toEmail,
        string $fromEmail,
        string $subject,
        string $content,
        array $attachments = [],
    ): array {
        try {
            $token = $this->getAccessToken();
        } catch (\RuntimeException $e) {
            return ['status' => 0, 'error' => $e->getMessage()];
        }

        $payload = [
            'message' => [
                'subject' => $subject,
                'body'    => [
                    'contentType' => 'HTML',
                    'content'     => $content,
                ],
                'toRecipients' => [
                    ['emailAddress' => ['address' => $toEmail]],
                ],
            ],
            'saveToSentItems' => true,
        ];

        if (! empty($attachments)) {
            $payload['message']['attachments'] = array_map(
                fn(array $a) => [
                    '@odata.type'  => '#microsoft.graph.fileAttachment',
                    'name'         => $a['name'],
                    'contentType'  => $a['contentType'],
                    'contentBytes' => $a['contentBytes'],
                ],
                $attachments,
            );
        }

        $response = Http::withToken($token)
            ->post(sprintf(self::SEND_MAIL_URL, urlencode($fromEmail)), $payload);

        // Graph returns 202 Accepted on success
        if ($response->successful()) {
            return ['status' => 1];
        }

        $error = $response->json('error.message') ?? $response->body();
        Log::error('MicrosoftGraphService::sendEmail failed', [
            'to'     => $toEmail,
            'from'   => $fromEmail,
            'status' => $response->status(),
            'error'  => $error,
        ]);

        return ['status' => 0, 'error' => $error];
    }
}
