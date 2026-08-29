<?php

use App\Services\MicrosoftGraphService;

if (! function_exists('getEasternFormattedDate')) {
    function getEasternFormattedDate(): string
    {
        return now('America/New_York')->format('F j, Y');
    }
}

if (! function_exists('sendEmail')) {
    /**
     * Send an email via Microsoft Graph API.
     *
     * @param  array<array{name: string, contentType: string, contentBytes: string}>  $attachments
     *         Each item: name (filename), contentType (MIME), contentBytes (base64-encoded data)
     *
     * @return array{status: int, error?: string}   status 1 = sent, 0 = failed
     */
    function sendEmail(
        string $toEmail,
        string $fromEmail,
        string $subject,
        string $content,
        array $attachments = [],
    ): array {
        return app(MicrosoftGraphService::class)->sendEmail(
            $toEmail,
            $fromEmail,
            $subject,
            $content,
            $attachments,
        );
    }
}
