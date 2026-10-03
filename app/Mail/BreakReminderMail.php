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

class BreakReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public readonly string $companyName;
    public readonly ?string $logoUrl;
    public readonly int $durationMinutes;

    public function __construct(
        public readonly object $employee,
        public readonly object $break,
        public readonly int $reminderNumber,
    ) {
        $this->companyName = SystemSetting::get('company_name', config('app.name'));

        $logoPath      = SystemSetting::get('logo_path');
        $this->logoUrl = $logoPath && Storage::disk('public')->exists($logoPath)
            ? Storage::disk('public')->url($logoPath)
            : null;

        // Support both a real AttendanceBreak model and a plain object with a durationSeconds closure
        $this->durationMinutes = is_callable([$this->break, 'durationSeconds'])
            ? (int) round($this->break->durationSeconds() / 60)
            : (int) round($this->break->started_at->diffInSeconds(now()) / 60);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address('support@unishipcargo.com', $this->companyName),
            subject: 'Reminder: Your break is still open',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.break-reminder');
    }
}
