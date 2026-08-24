<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class EmailExtractionService
{
    private const EMAIL_COLUMN_KEYWORDS = ['email', 'e-mail', 'email address', 'emailaddress', 'mail', 'correo'];

    /**
     * Parse a spreadsheet/CSV file and return unique valid email addresses.
     */
    public function extractFromFile(string $filePath): array
    {
        try {
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($filePath);
        } catch (\Throwable $e) {
            Log::warning('EmailExtractionService: failed to load file', [
                'path' => $filePath,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Could not read the uploaded file. Make sure it is a valid .xlsx, .xls, or .csv file.');
        }

        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray(null, true, true, false);

        if (empty($rows)) {
            return [];
        }

        // Normalise header row
        $headers = array_map(fn ($v) => strtolower(trim((string) ($v ?? ''))), $rows[0]);
        $emailColIndex = $this->findEmailColumnIndex($headers);

        $emails = [];
        // Skip row 0 (headers) only if we identified a column by name
        $dataRows = $emailColIndex !== null ? array_slice($rows, 1) : $rows;

        foreach ($dataRows as $row) {
            $email = $emailColIndex !== null
                ? trim((string) ($row[$emailColIndex] ?? ''))
                : $this->scanRowForEmail($row);

            if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[] = strtolower($email);
            }
        }

        return array_values(array_unique($emails));
    }

    /**
     * Bulk-insert extracted emails for a given EmailList, in chunks.
     */
    public function persistEmails(int $emailListId, array $emails): void
    {
        $now = now();

        foreach (array_chunk($emails, 500) as $chunk) {
            DB::table('email_contacts')->insertOrIgnore(
                array_map(fn ($email) => [
                    'email_list_id' => $emailListId,
                    'email' => $email,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $chunk)
            );
        }
    }

    private function findEmailColumnIndex(array $headers): ?int
    {
        foreach (self::EMAIL_COLUMN_KEYWORDS as $keyword) {
            $index = array_search($keyword, $headers, true);
            if ($index !== false) {
                return (int) $index;
            }
        }

        return null;
    }

    private function scanRowForEmail(array $row): ?string
    {
        foreach ($row as $cell) {
            $value = trim((string) ($cell ?? ''));
            if ($value && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                return $value;
            }
        }

        return null;
    }
}
