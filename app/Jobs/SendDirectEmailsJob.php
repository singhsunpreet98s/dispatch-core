<?php

namespace App\Jobs;

use App\Models\DirectSend;
use App\Services\SendGridService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendDirectEmailsJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(public readonly DirectSend $directSend) {}

    public function handle(SendGridService $sendGrid): void
    {
        $directSend = $this->directSend;

        $directSend->update(['status' => 'sending']);

        try {
            $contacts = $directSend->emailList->contacts()
                ->select('email', 'name')
                ->get()
                ->toArray();

            if (empty($contacts)) {
                $directSend->update([
                    'status'        => 'failed',
                    'error_message' => 'No contacts found in the email list.',
                ]);
                return;
            }

            $result = $sendGrid->sendBulkDirect(
                fromEmail:   $directSend->from_email,
                fromName:    $directSend->from_name ?: null,
                subject:     $directSend->subject,
                htmlContent: $directSend->body,
                contacts:    $contacts,
            );

            $directSend->update([
                'status'     => $result['status'] === 1 ? 'sent' : 'failed',
                'sent_count' => $result['sent_count'] ?? 0,
                'error_message' => $result['error'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error('SendDirectEmailsJob failed', [
                'direct_send_id' => $directSend->id,
                'error'          => $e->getMessage(),
            ]);

            $directSend->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
