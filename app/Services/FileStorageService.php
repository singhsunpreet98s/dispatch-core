<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileStorageService
{
    private const DISK = 'local';
    private const DIRECTORY = 'email-lists';

    public function store(UploadedFile $file): string
    {
        return $file->store(self::DIRECTORY, self::DISK);
    }

    public function delete(string $storedPath, string $disk = self::DISK): void
    {
        if (Storage::disk($disk)->exists($storedPath)) {
            Storage::disk($disk)->delete($storedPath);
        }
    }

    public function download(string $storedPath, string $originalName, string $disk = self::DISK): StreamedResponse
    {
        abort_unless(Storage::disk($disk)->exists($storedPath), 404);

        return Storage::disk($disk)->download($storedPath, $originalName);
    }

    public function fullPath(string $storedPath, string $disk = self::DISK): string
    {
        return Storage::disk($disk)->path($storedPath);
    }
}
