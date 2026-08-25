<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class EmailExtractionService
{
    private const EMAIL_COLUMN_KEYWORDS = ['email', 'e-mail', 'email address', 'emailaddress', 'mail', 'correo'];
    private const NAME_COLUMN_KEYWORDS  = ['name', 'full_name', 'fullname', 'full name', 'contact name'];
    private const FIRST_NAME_KEYWORDS   = ['first_name', 'firstname', 'first name', 'given name', 'given_name'];
    private const LAST_NAME_KEYWORDS    = ['last_name', 'lastname', 'last name', 'surname', 'family name', 'family_name'];

    /**
     * Parse a spreadsheet/CSV and return contacts as [['email' => string, 'name' => string|null], ...].
     */
    public function extractFromFile(string $filePath): array
    {
        try {
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($filePath);
        } catch (\Throwable $e) {
            Log::warning('EmailExtractionService: failed to load file', [
                'path'  => $filePath,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Could not read the uploaded file. Make sure it is a valid .xlsx, .xls, or .csv file.');
        }

        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray(null, true, true, false);

        if (empty($rows)) {
            return [];
        }

        $headers = array_map(fn ($v) => strtolower(trim((string) ($v ?? ''))), $rows[0]);

        $emailColIndex     = $this->findColumnIndex($headers, self::EMAIL_COLUMN_KEYWORDS);
        $nameColIndex      = $this->findColumnIndex($headers, self::NAME_COLUMN_KEYWORDS);
        $firstNameColIndex = $this->findColumnIndex($headers, self::FIRST_NAME_KEYWORDS);
        $lastNameColIndex  = $this->findColumnIndex($headers, self::LAST_NAME_KEYWORDS);

        $dataRows = $emailColIndex !== null ? array_slice($rows, 1) : $rows;

        $seen     = [];
        $contacts = [];

        foreach ($dataRows as $row) {
            $email = $emailColIndex !== null
                ? trim((string) ($row[$emailColIndex] ?? ''))
                : $this->scanRowForEmail($row);

            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            $email = strtolower($email);
            if (isset($seen[$email])) {
                continue;
            }
            $seen[$email] = true;

            $name = $this->resolveName($row, $nameColIndex, $firstNameColIndex, $lastNameColIndex);

            $contacts[] = ['email' => $email, 'name' => $name];
        }

        return $contacts;
    }

    /**
     * Bulk-insert extracted contacts for a given EmailList, in chunks.
     */
    public function persistContacts(int $emailListId, array $contacts): void
    {
        $now = now();

        foreach (array_chunk($contacts, 500) as $chunk) {
            DB::table('email_contacts')->insertOrIgnore(
                array_map(fn ($c) => [
                    'email_list_id' => $emailListId,
                    'email'         => $c['email'],
                    'name'          => $c['name'] ?? null,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ], $chunk)
            );
        }
    }

    private function findColumnIndex(array $headers, array $keywords): ?int
    {
        foreach ($keywords as $keyword) {
            $index = array_search($keyword, $headers, true);
            if ($index !== false) {
                return (int) $index;
            }
        }
        return null;
    }

    private function resolveName(array $row, ?int $nameIdx, ?int $firstIdx, ?int $lastIdx): ?string
    {
        if ($nameIdx !== null) {
            $name = trim((string) ($row[$nameIdx] ?? ''));
            return $name !== '' ? $name : null;
        }

        $parts = [];
        if ($firstIdx !== null) {
            $first = trim((string) ($row[$firstIdx] ?? ''));
            if ($first !== '') {
                $parts[] = $first;
            }
        }
        if ($lastIdx !== null) {
            $last = trim((string) ($row[$lastIdx] ?? ''));
            if ($last !== '') {
                $parts[] = $last;
            }
        }

        return count($parts) > 0 ? implode(' ', $parts) : null;
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
