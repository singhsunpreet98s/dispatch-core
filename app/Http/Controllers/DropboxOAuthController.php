<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use App\Services\DropboxService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class DropboxOAuthController extends Controller
{
    private function redirectUri(): string
    {
        return url('/settings/system/dropbox/callback');
    }

    public function redirect(Request $request): RedirectResponse
    {
        $appKey    = SystemSetting::get('dropbox_app_key');
        $appSecret = SystemSetting::get('dropbox_app_secret');

        if (! $appKey || ! $appSecret) {
            return back()->with('error', 'Save your Dropbox App Key and App Secret before connecting.');
        }

        $state = Str::random(40);
        $request->session()->put('dropbox_oauth_state', $state);

        $url = DropboxService::authorizationUrl($appKey, $this->redirectUri(), $state);

        return redirect()->away($url);
    }

    public function callback(Request $request): RedirectResponse
    {
        $stored = $request->session()->pull('dropbox_oauth_state');

        if (! $stored || $request->input('state') !== $stored) {
            return redirect()->route('system-settings.edit')
                ->with('error', 'Invalid OAuth state. Please try the connection again.');
        }

        $code = $request->input('code');

        if (! $code) {
            $desc = $request->input('error_description', 'Authorization denied.');
            return redirect()->route('system-settings.edit')
                ->with('error', "Dropbox connection failed: {$desc}");
        }

        $appKey    = SystemSetting::get('dropbox_app_key');
        $appSecret = SystemSetting::get('dropbox_app_secret');

        try {
            $data = DropboxService::exchangeCode($appKey, $appSecret, $code, $this->redirectUri());

            $expiresAt = Carbon::now('UTC')->addSeconds($data['expires_in'] ?? 14400);

            SystemSetting::set('dropbox_access_token', $data['access_token']);
            SystemSetting::set('dropbox_refresh_token', $data['refresh_token']);
            SystemSetting::set('dropbox_token_expires_at', $expiresAt->toIso8601String());
            SystemSetting::set('dropbox_connected_at', Carbon::now('UTC')->toIso8601String());
        } catch (RuntimeException $e) {
            return redirect()->route('system-settings.edit')
                ->with('error', $e->getMessage());
        }

        return redirect()->route('system-settings.edit')
            ->with('success', 'Dropbox connected successfully.');
    }

    public function disconnect(): RedirectResponse
    {
        SystemSetting::set('dropbox_access_token', null);
        SystemSetting::set('dropbox_refresh_token', null);
        SystemSetting::set('dropbox_token_expires_at', null);
        SystemSetting::set('dropbox_connected_at', null);

        return back()->with('success', 'Dropbox disconnected.');
    }
}
