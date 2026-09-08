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
        $tempDir  = storage_path('app/backups-tmp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0700, true);
        }
        $tempPath = $tempDir . DIRECTORY_SEPARATOR . $filename;

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
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'] ?? '127.0.0.1',
            (int) ($config['port'] ?? 3306),
            $config['database'],
            $config['charset'] ?? 'utf8mb4',
        );

        $dump = new \Ifsnop\Mysqldump\Mysqldump(
            $dsn,
            $config['username'],
            $config['password'] ?? '',
        );

        $dump->start($outputPath);
    }

    private function dumpSqlite(array $config, string $outputPath): void
    {
        $database = $config['database'];

        if (! file_exists($database)) {
            throw new RuntimeException("SQLite file not found: {$database}");
        }

        if (! copy($database, $outputPath)) {
            throw new RuntimeException('Failed to copy SQLite database file.');
        }
    }

    private function dumpPgsql(array $config, string $outputPath): void
    {
        $connection = config('database.default');
        $pdo        = DB::connection($connection)->getPdo();

        $fh = fopen($outputPath, 'w');
        if (! $fh) {
            throw new RuntimeException("Cannot open temp file for writing: {$outputPath}");
        }

        try {
            fwrite($fh, "-- dispatch-core PostgreSQL dump\n");
            fwrite($fh, "-- Generated: " . date('Y-m-d H:i:s') . " UTC\n\n");

            $tables = $pdo->query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )->fetchAll(\PDO::FETCH_COLUMN);

            foreach ($tables as $table) {
                $rows = $pdo->query("SELECT * FROM \"{$table}\"")->fetchAll(\PDO::FETCH_ASSOC);
                if (! empty($rows)) {
                    $columns = '"' . implode('", "', array_keys($rows[0])) . '"';
                    fwrite($fh, "INSERT INTO \"{$table}\" ({$columns}) VALUES\n");

                    $lastIdx = count($rows) - 1;
                    foreach ($rows as $idx => $row) {
                        $values = array_map(function ($val) use ($pdo) {
                            return $val === null ? 'NULL' : $pdo->quote((string) $val);
                        }, array_values($row));

                        $separator = ($idx === $lastIdx) ? ';' : ',';
                        fwrite($fh, '(' . implode(', ', $values) . ')' . $separator . "\n");
                    }
                    fwrite($fh, "\n");
                }
            }
        } finally {
            fclose($fh);
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
