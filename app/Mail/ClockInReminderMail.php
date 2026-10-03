<?php

namespace App\Mail;

use App\Models\SystemSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ClockInReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $companyName;
    public readonly ?string $logoUrl;
    public readonly string $clockInStart;

    public function __construct(
        public readonly object $employee,
        public readonly int $reminderNumber,
        public readonly int $minutesLate,
    ) {
        $this->companyName  = SystemSetting::get('company_name', config('app.name'));
        $this->clockInStart = SystemSetting::get('attendance_clock_in_start', '');

        $logoPath      = SystemSetting::get('logo_path');
        $this->logoUrl = $logoPath && Storage::disk('public')->exists($logoPath)
            ? Storage::disk('public')->url($logoPath)
            : null;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address('support@unishipcargo.com', $this->companyName),
            subject: 'Reminder: You have not clocked in yet',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clock-in-reminder');
    }
}
