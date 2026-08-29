<?php

namespace App\Jobs;

use App\Models\CarrierPacket;
use App\Models\SystemSetting;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SendCarrierPacketInvitation implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public readonly CarrierPacket $packet,
        public readonly string $senderName,
    ) {}

    public function handle(): void
    {
        $fromEmail = config('services.microsoft_graph.from_email', '');

        if (empty($fromEmail)) {
            Log::warning('SendCarrierPacketInvitation: MICROSOFT_GRAPH_FROM_EMAIL not set, aborting job.', [
                'packet_id' => $this->packet->id,
            ]);
            // Not a retriable error — mark failed and stop
            $this->packet->update(['email_status' => 'failed']);
            $this->fail('MICROSOFT_GRAPH_FROM_EMAIL is not configured.');
            return;
        }

        $logoPath = SystemSetting::get('logo_path');
        $logoUrl  = $logoPath && Storage::disk('public')->exists($logoPath)
            ? Storage::disk('public')->url($logoPath)
            : null;

        $html = view('emails.carrier-packet-invite', [
            'logoUrl'           => $logoUrl,
            'companyName'       => SystemSetting::get('company_name', config('app.name')),
            'companyAddress'    => SystemSetting::get('company_address', ''),
            'companyPhone'      => SystemSetting::get('company_phone', ''),
            'packetCompanyName' => $this->packet->company_name,
            'mcNumber'          => $this->packet->mc_number,
            'senderName'        => $this->senderName,
            'packetUrl'         => $this->packet->publicUrl(),
        ])->render();

        $result = sendEmail(
            toEmail: $this->packet->email,
            fromEmail: $fromEmail,
            subject: "Carrier Packet – {$this->packet->company_name}",
            content: $html,
        );

        if ($result['status'] === 0) {
            // Throw so the queue retries up to $tries times
            throw new \RuntimeException($result['error'] ?? 'Microsoft Graph sendMail returned failure.');
        }

        $this->packet->update(['email_status' => 'sent']);
    }

    /**
     * Called by Laravel after all retry attempts are exhausted.
     */
    public function failed(\Throwable $e): void
    {
        $this->packet->update(['email_status' => 'failed']);

        Log::error('SendCarrierPacketInvitation: all retries exhausted.', [
            'packet_id' => $this->packet->id,
            'to'        => $this->packet->email,
            'error'     => $e->getMessage(),
        ]);
    }
}
