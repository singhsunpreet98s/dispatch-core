<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class RateRequestImportService
{
    private const EMAIL_KEYWORDS   = ['email', 'e-mail', 'email address', 'emailaddress', 'mail', 'correo'];
    private const COMPANY_KEYWORDS = ['company', 'company_name', 'company name', 'business', 'carrier', 'company/dba'];
    private const MC_KEYWORDS      = ['mc', 'mc_number', 'mc number', 'mc#', 'mc no', 'motor carrier', 'mc no.'];

    /**
     * Parse a spreadsheet/CSV and return contacts as
     * [['email' => string, 'company_name' => string|null, 'mc_number' => string|null], ...].
     */
    public function extractFromFile(string $filePath): array
    {
        try {
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($filePath);
        } catch (\Throwable $e) {
            Log::warning('RateRequestImportService: failed to load file', [
                'path'  => $filePath,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Could not read the uploaded file. Make sure it is a valid .xlsx, .xls, or .csv file.');
        }

        $worksheet = $spreadsheet->getActiveSheet();
        $rows      = $worksheet->toArray(null, true, true, false);

        if (empty($rows)) {
            return [];
        }

        $headers = array_map(fn ($v) => strtolower(trim((string) ($v ?? ''))), $rows[0]);

        $emailIdx   = $this->findColumnIndex($headers, self::EMAIL_KEYWORDS);
        $companyIdx = $this->findColumnIndex($headers, self::COMPANY_KEYWORDS);
        $mcIdx      = $this->findColumnIndex($headers, self::MC_KEYWORDS);

        $dataRows = $emailIdx !== null ? array_slice($rows, 1) : $rows;

        $seen     = [];
        $contacts = [];

        foreach ($dataRows as $row) {
            $email = $emailIdx !== null
                ? trim((string) ($row[$emailIdx] ?? ''))
                : $this->scanRowForEmail($row);

            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            $email = strtolower($email);
            if (isset($seen[$email])) {
                continue;
            }
            $seen[$email] = true;

            $contacts[] = [
                'email'        => $email,
                'company_name' => $companyIdx !== null ? ($this->cellValue($row[$companyIdx]) ?: null) : null,
                'mc_number'    => $mcIdx !== null ? ($this->cellValue($row[$mcIdx]) ?: null) : null,
            ];
        }

        return $contacts;
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

    private function cellValue(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }
}
