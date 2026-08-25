<?php

namespace App\Console\Commands;

use App\Models\ScheduleDispatchQueue;
use App\Models\SystemSetting;
use App\Services\SendGridService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Throwable;

class DispatchCampaigns extends Command
{
    protected $signature   = 'campaigns:dispatch-queue';
    protected $description = 'Pick pending campaign items from the dispatch queue and send them via SendGrid';

    public function handle(SendGridService $sendGrid): int
    {
        $now = Carbon::now();

        $pending = ScheduleDispatchQueue::with([
            'schedule.template',
            'schedule.emailList.contacts',
            'schedule.user:id,sendgrid_contact_id',
        ])
            ->where('status', 'pending')
            ->orderBy('queued_at')
            ->get();

        $sent   = 0;
        $failed = 0;

        foreach ($pending as $item) {
            $item->update(['status' => 'processing']);

            try {
                $schedule = $item->schedule;

                if (! $schedule || ! $schedule->template || ! $schedule->emailList) {
                    throw new \RuntimeException('Schedule, template, or email list no longer exists.');
                }

                $senderId = $schedule->user?->sendgrid_contact_id
                    ? (int) $schedule->user->sendgrid_contact_id
                    : null;

                if (! $senderId) {
                    throw new \RuntimeException("User #{$schedule->user_id} does not have a SendGrid Sender ID configured.");
                }

                $contacts = $schedule->emailList->contacts->map(fn ($c) => array_filter([
                    'email'      => $c->email,
                    'first_name' => $c->first_name ?? null,
                    'last_name'  => $c->last_name  ?? null,
                ]))->values()->toArray();

                $singlesendId = $sendGrid->sendMarketingCampaign(
                    campaignName: $schedule->name . ' — ' . $now->format('Y-m-d H:i'),
                    subject:      $schedule->template->subject,
                    htmlContent:  $schedule->template->body,
                    contacts:     $contacts,
                    senderId:     $senderId,
                );

                $schedule->update(['sendgrid_singlesend_id' => $singlesendId]);

                $item->update([
                    'status'        => 'sent',
                    'dispatched_at' => $now,
                    'error_message' => null,
                ]);

                $sent++;
            } catch (Throwable $e) {
                $item->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                ]);

                $this->error("Failed to dispatch queue item #{$item->id}: {$e->getMessage()}");
                $failed++;
            }
        }

        SystemSetting::set('cmd_dispatch_campaigns_last_run', $now->toIso8601String());

        if ($sent > 0 || $failed > 0) {
            $this->info("Dispatched: {$sent} sent, {$failed} failed.");
        }

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
