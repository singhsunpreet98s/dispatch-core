<?php

namespace App\Listeners;

use App\Events\RateRequestSubmitted;
use App\Models\RateRequestContact;
use App\Models\RateRequestLogEntry;
use App\Services\SendGridService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class ProcessRateRequest implements ShouldQueue
{
    public function __construct(private SendGridService $sendgrid) {}

    public function handle(RateRequestSubmitted $event): void
    {
        $log  = $event->log->load(['user', 'state']);
        $user = $log->user;

        $contacts = RateRequestContact::where('state_id', $log->state_id)->get();

        if ($contacts->isEmpty()) {
            $log->update(['status' => 'completed']);
            return;
        }

        $log->update([
            'status'           => 'processing',
            'total_recipients' => $contacts->count(),
        ]);

        $stateName = $log->state?->state_name ?? $log->state_id;
        $subject   = "Rate Request — {$stateName}";
        $htmlBody  = $this->buildEmailHtml($log->email_body, $user->name, $user->email);

        $sentCount   = 0;
        $failedCount = 0;

        foreach ($contacts as $contact) {
            $result = $this->sendgrid->sendTransactionalEmail(
                toEmail: $contact->email,
                fromEmail: $user->email,
                subject: $subject,
                htmlContent: $htmlBody,
                fromName: $user->name,
            );

            $success = $result['status'] === 1;

            RateRequestLogEntry::create([
                'log_id'        => $log->id,
                'to_email'      => $contact->email,
                'company_name'  => $contact->company_name,
                'mc_number'     => $contact->mc_number,
                'status'        => $success ? 'sent' : 'failed',
                'error_message' => $success ? null : ($result['error'] ?? 'Unknown error'),
                'sent_at'       => $success ? now() : null,
            ]);

            $success ? $sentCount++ : $failedCount++;

            Log::info('RateRequest email', [
                'log_id'  => $log->id,
                'from'    => $user->email,
                'to'      => $contact->email,
                'company' => $contact->company_name,
                'mc'      => $contact->mc_number,
                'status'  => $success ? 'sent' : 'failed',
                'error'   => $result['error'] ?? null,
            ]);
        }

        $finalStatus = $sentCount === 0 ? 'failed' : 'completed';

        $log->update([
            'sent_count'   => $sentCount,
            'failed_count' => $failedCount,
            'status'       => $finalStatus,
        ]);
    }

    private function buildEmailHtml(string $body, string $fromName, string $fromEmail): string
    {
        $escaped = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));

        return <<<HTML
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
            <p>{$escaped}</p>
        </div>
        HTML;
    }
}
