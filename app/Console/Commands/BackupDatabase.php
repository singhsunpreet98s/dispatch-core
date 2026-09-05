<?php

namespace App\Console\Commands;

use App\Models\DatabaseBackup;
use App\Models\SystemSetting;
use App\Services\DropboxService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BackupDatabase extends Command
{
    protected $signature   = 'db:backup';
    protected $description = 'Dump the database and upload the backup to Dropbox';

    public function handle(): int
    {
        $retentionDays = (int) SystemSetting::get('backup_retention_days', 10);

        if (! DropboxService::isConnected()) {
            $this->error('Dropbox is not connected. Configure it in System Settings → Backup.');
            return Command::FAILURE;
        }

        $now      = Carbon::now('UTC');
        $filename = 'backup_' . $now->format('Y-m-d_H-i-s') . '.sql';
        $tempPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $filename;

        $backup = DatabaseBackup::create([
            'filename'    => $filename,
            'status'      => 'pending',
            'backed_up_at' => $now,
        ]);

        try {
            $this->dumpDatabase($tempPath);

            $backup->update(['status' => 'uploading']);

            $dropbox      = DropboxService::fromSettings();
            $dropboxPath  = '/database-backups/' . $filename;

            $dropbox->upload($tempPath, $dropboxPath);

            $backup->update([
                'status'       => 'completed',
                'dropbox_path' => $dropboxPath,
                'size_bytes'   => filesize($tempPath) ?: null,
            ]);

            $this->info("Backup uploaded: {$dropboxPath}");

            $this->pruneOldBackups($dropbox, $retentionDays);
        } catch (\Throwable $e) {
            $backup->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            $this->error('Backup failed: ' . $e->getMessage());

            return Command::FAILURE;
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }

        return Command::SUCCESS;
    }

    private function dumpDatabase(string $outputPath): void
    {
        $driver = config('database.default');
        $config = config("database.connections.{$driver}");

        match ($driver) {
            'mysql', 'mariadb' => $this->dumpMysql($config, $outputPath),
            'sqlite'           => $this->dumpSqlite($config, $outputPath),
            'pgsql'            => $this->dumpPgsql($config, $outputPath),
            default            => throw new RuntimeException("Unsupported database driver: {$driver}"),
        };
    }

    private function dumpMysql(array $config, string $outputPath): void
    {
        $host     = escapeshellarg($config['host'] ?? '127.0.0.1');
        $port     = (int) ($config['port'] ?? 3306);
        $database = escapeshellarg($config['database']);
        $username = escapeshellarg($config['username']);
        $password = $config['password'] ?? '';
        $out      = escapeshellarg($outputPath);

        $passwordFlag = $password ? '-p' . escapeshellarg($password) : '';

        $cmd = "mysqldump --host={$host} --port={$port} --user={$username} {$passwordFlag} {$database} > {$out} 2>&1";

        exec($cmd, $output, $code);

        if ($code !== 0) {
            throw new RuntimeException('mysqldump failed: ' . implode("\n", $output));
        }
    }

    private function dumpSqlite(array $config, string $outputPath): void
    {
        $database = $config['database'];

        if (! file_exists($database)) {
            throw new RuntimeException("SQLite file not found: {$database}");
        }

        $db     = escapeshellarg($database);
        $out    = escapeshellarg($outputPath);
        $cmd    = "sqlite3 {$db} .dump > {$out} 2>&1";

        exec($cmd, $output, $code);

        if ($code !== 0) {
            // Fallback: copy the raw SQLite file as .sql
            if (! copy($database, $outputPath)) {
                throw new RuntimeException('Failed to copy SQLite database file.');
            }
        }
    }

    private function dumpPgsql(array $config, string $outputPath): void
    {
        $host     = escapeshellarg($config['host'] ?? '127.0.0.1');
        $port     = (int) ($config['port'] ?? 5432);
        $database = escapeshellarg($config['database']);
        $username = escapeshellarg($config['username']);
        $out      = escapeshellarg($outputPath);

        $env = '';
        if (! empty($config['password'])) {
            $env = 'PGPASSWORD=' . escapeshellarg($config['password']) . ' ';
        }

        $cmd = "{$env}pg_dump --host={$host} --port={$port} --username={$username} {$database} > {$out} 2>&1";

        exec($cmd, $output, $code);

        if ($code !== 0) {
            throw new RuntimeException('pg_dump failed: ' . implode("\n", $output));
        }
    }

    private function pruneOldBackups(DropboxService $dropbox, int $retentionDays): void
    {
        $cutoff = Carbon::now('UTC')->subDays($retentionDays);

        $old = DatabaseBackup::where('status', 'completed')
            ->where('backed_up_at', '<', $cutoff)
            ->get();

        foreach ($old as $backup) {
            try {
                if ($backup->dropbox_path) {
                    $dropbox->delete($backup->dropbox_path);
                }
                $backup->delete();
            } catch (\Throwable $e) {
                $this->warn("Could not prune backup #{$backup->id}: " . $e->getMessage());
            }
        }

        if ($old->count() > 0) {
            $this->info("Pruned {$old->count()} old backup(s) (retention: {$retentionDays} days).");
        }
    }
}
