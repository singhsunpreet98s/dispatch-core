<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Services\SendGridService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailController extends Controller
{
    public function __construct(private SendGridService $sendGrid) {}

    public function index(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
            'status'    => ['nullable', 'string'],
        ]);

        $dateFrom = $request->date_from ?? now()->format('Y-m-d');
        $dateTo   = $request->date_to   ?? now()->format('Y-m-d');
        $status   = $request->input('status', 'all');
        $user     = $request->user();

        // Non-admins see only their own campaigns.
        $campaignIds = null;
        if (! $user->isAdmin()) {
            $campaignIds = Schedule::where('user_id', $user->id)
                ->whereNotNull('sendgrid_singlesend_id')
                ->pluck('sendgrid_singlesend_id')
                ->all();
        }

        $emails = $this->sendGrid->getEmailActivity(
            $dateFrom,
            $dateTo,
            $status !== 'all' ? $status : null,
            $campaignIds,
        );

        return Inertia::render('emails/index', [
            'emails'  => $emails,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
                'status'    => $status,
            ],
        ]);
    }
}
