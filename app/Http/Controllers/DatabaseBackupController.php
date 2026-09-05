<?php

namespace App\Http\Controllers;

use App\Models\DatabaseBackup;
use App\Models\SystemSetting;
use App\Services\DropboxService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;

class DatabaseBackupController extends Controller
{
    public function index(): Response
    {
        $backups = DatabaseBackup::orderByDesc('backed_up_at')
            ->paginate(20)
            ->through(fn($b) => [
                'id'            => $b->id,
                'filename'      => $b->filename,
                'status'        => $b->status,
                'size_bytes'    => $b->size_bytes,
                'error_message' => $b->error_message,
                'backed_up_at'  => $b->backed_up_at?->toIso8601String(),
            ]);

        return Inertia::render('backups/index', [
            'backups'       => $backups,
            'dropboxStatus' => DropboxService::tokenStatus(),
        ]);
    }

    public function download(DatabaseBackup $backup): SymfonyRedirect|RedirectResponse
    {
        if ($backup->status !== 'completed' || ! $backup->dropbox_path) {
            return back()->with('error', 'Backup is not available for download.');
        }

        try {
            $link = DropboxService::fromSettings()->getTemporaryLink($backup->dropbox_path);

            return redirect()->away($link);
        } catch (RuntimeException $e) {
            return back()->with('error', 'Download failed: ' . $e->getMessage());
        }
    }

    public function destroy(DatabaseBackup $backup): RedirectResponse
    {
        if ($backup->dropbox_path && DropboxService::isConnected()) {
            try {
                DropboxService::fromSettings()->delete($backup->dropbox_path);
            } catch (RuntimeException $e) {
                logger()->warning('Dropbox delete failed for backup #' . $backup->id . ': ' . $e->getMessage());
            }
        }

        $backup->delete();

        return back()->with('success', 'Backup deleted.');
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'dropbox_app_key'       => ['nullable', 'string', 'max:200'],
            'dropbox_app_secret'    => ['nullable', 'string', 'max:200'],
            'backup_retention_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        // If app key or secret changed, clear existing OAuth tokens (connection must be re-established)
        $prevKey    = SystemSetting::get('dropbox_app_key');
        $prevSecret = SystemSetting::get('dropbox_app_secret');

        $keyChanged = $data['dropbox_app_key'] && $data['dropbox_app_key'] !== $prevKey;
        $secretChanged = $data['dropbox_app_secret'] && $data['dropbox_app_secret'] !== $prevSecret;

        if ($keyChanged || $secretChanged) {
            SystemSetting::set('dropbox_access_token', null);
            SystemSetting::set('dropbox_refresh_token', null);
            SystemSetting::set('dropbox_token_expires_at', null);
            SystemSetting::set('dropbox_connected_at', null);
        }

        if ($data['dropbox_app_key']) {
            SystemSetting::set('dropbox_app_key', $data['dropbox_app_key']);
        }
        if ($data['dropbox_app_secret']) {
            SystemSetting::set('dropbox_app_secret', $data['dropbox_app_secret']);
        }

        SystemSetting::set('backup_retention_days', (string) $data['backup_retention_days']);

        return back()->with('success', 'Backup settings saved.' . (($keyChanged || $secretChanged) ? ' Dropbox has been disconnected — please reconnect.' : ''));
    }
}
