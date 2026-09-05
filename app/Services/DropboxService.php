<?php

namespace App\Services;

use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class DropboxService
{
    private const TOKEN_URL    = 'https://api.dropboxapi.com/oauth2/token';
    private const AUTH_URL     = 'https://www.dropbox.com/oauth2/authorize';
    private const CONTENT_BASE = 'https://content.dropboxapi.com/2';
    private const API_BASE     = 'https://api.dropboxapi.com/2';

    private string $accessToken;
    private Carbon $expiresAt;

    public function __construct(
        private readonly string $appKey,
        private readonly string $appSecret,
        string $accessToken,
        private readonly string $refreshToken,
        string $expiresAt,
    ) {
        $this->accessToken = $accessToken;
        $this->expiresAt   = Carbon::parse($expiresAt, 'UTC');
    }

    public static function fromSettings(): static
    {
        $appKey       = SystemSetting::get('dropbox_app_key');
        $appSecret    = SystemSetting::get('dropbox_app_secret');
        $accessToken  = SystemSetting::get('dropbox_access_token', '');
        $refreshToken = SystemSetting::get('dropbox_refresh_token');
        $expiresAt    = SystemSetting::get('dropbox_token_expires_at', now('UTC')->subMinute()->toIso8601String());

        if (! $appKey || ! $appSecret || ! $refreshToken) {
            throw new RuntimeException('Dropbox is not connected. Configure it in System Settings → Backup.');
        }

        return new static($appKey, $appSecret, $accessToken, $refreshToken, $expiresAt);
    }

    public static function isConnected(): bool
    {
        return (bool) SystemSetting::get('dropbox_refresh_token');
    }

    public static function tokenStatus(): array
    {
        $expiresAt = SystemSetting::get('dropbox_token_expires_at');
        $connectedAt = SystemSetting::get('dropbox_connected_at');

        if (! SystemSetting::get('dropbox_refresh_token')) {
            return ['connected' => false];
        }

        $expiry     = $expiresAt ? Carbon::parse($expiresAt, 'UTC') : null;
        $secondsLeft = $expiry ? max(0, (int) now('UTC')->diffInSeconds($expiry, false)) : null;

        return [
            'connected'    => true,
            'expires_at'   => $expiresAt,
            'seconds_left' => $secondsLeft,
            'connected_at' => $connectedAt,
        ];
    }

    // ── OAuth helpers ─────────────────────────────────────────────────────────

    public static function authorizationUrl(string $appKey, string $redirectUri, string $state): string
    {
        return self::AUTH_URL . '?' . http_build_query([
            'client_id'         => $appKey,
            'response_type'     => 'code',
            'redirect_uri'      => $redirectUri,
            'token_access_type' => 'offline',
            'state'             => $state,
        ]);
    }

    public static function exchangeCode(string $appKey, string $appSecret, string $code, string $redirectUri): array
    {
        $response = Http::asForm()->post(self::TOKEN_URL, [
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'client_id'     => $appKey,
            'client_secret' => $appSecret,
            'redirect_uri'  => $redirectUri,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Dropbox token exchange failed: ' . $response->body());
        }

        return $response->json();
    }

    // ── Token management ──────────────────────────────────────────────────────

    private function getAccessToken(): string
    {
        // Refresh proactively 5 minutes before expiry
        if (now('UTC')->gte($this->expiresAt->copy()->subMinutes(5))) {
            $this->refreshAccessToken();
        }

        return $this->accessToken;
    }

    private function refreshAccessToken(): void
    {
        $response = Http::asForm()->post(self::TOKEN_URL, [
            'grant_type'    => 'refresh_token',
            'refresh_token' => $this->refreshToken,
            'client_id'     => $this->appKey,
            'client_secret' => $this->appSecret,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Failed to refresh Dropbox token: ' . $response->body());
        }

        $data              = $response->json();
        $this->accessToken = $data['access_token'];
        $this->expiresAt   = now('UTC')->addSeconds($data['expires_in'] ?? 14400);

        SystemSetting::set('dropbox_access_token', $this->accessToken);
        SystemSetting::set('dropbox_token_expires_at', $this->expiresAt->toIso8601String());
    }

    // ── File operations ───────────────────────────────────────────────────────

    public function upload(string $localPath, string $dropboxPath): array
    {
        if (filesize($localPath) === false) {
            throw new RuntimeException("Cannot read file: {$localPath}");
        }

        $arg = json_encode([
            'path'       => $dropboxPath,
            'mode'       => 'overwrite',
            'autorename' => false,
        ]);

        $response = Http::withToken($this->getAccessToken())
            ->withHeaders([
                'Dropbox-API-Arg' => $arg,
                'Content-Type'    => 'application/octet-stream',
            ])
            ->withBody(fopen($localPath, 'rb'), 'application/octet-stream')
            ->post(self::CONTENT_BASE . '/files/upload');

        if (! $response->successful()) {
            throw new RuntimeException('Dropbox upload failed: ' . $response->body());
        }

        return $response->json();
    }

    public function getTemporaryLink(string $dropboxPath): string
    {
        $response = Http::withToken($this->getAccessToken())
            ->post(self::API_BASE . '/files/get_temporary_link', [
                'path' => $dropboxPath,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Failed to get Dropbox link: ' . $response->body());
        }

        return $response->json('link');
    }

    public function delete(string $dropboxPath): void
    {
        $response = Http::withToken($this->getAccessToken())
            ->post(self::API_BASE . '/files/delete_v2', [
                'path' => $dropboxPath,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Dropbox delete failed: ' . $response->body());
        }
    }
}
