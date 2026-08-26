<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\LeaveRequest;
use App\Models\Schedule;
use App\Models\User;
use App\Services\SendGridService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private SendGridService $sendGrid) {}

    public function campaignDetail(string $singlesendId)
    {
        $detail = $this->sendGrid->getSingleSendDetail($singlesendId);
        $raw    = $this->sendGrid->getSingleSendStats($singlesendId);
        $delivered = $raw['delivered'] ?? 0;
        $requests  = $raw['requests']  ?? 0;

        $senderId   = $detail['email_config']['sender_id'] ?? null;
        $senderName = $senderId
            ? User::where('sendgrid_contact_id', (string) $senderId)->value('name')
            : null;

        return response()->json([
            'detail'      => $detail,
            'sender_name' => $senderName,
            'stats'  => [
                ...$raw,
                'undelivered'   => max(0, $requests - $delivered),
                'delivery_rate' => $requests > 0 ? round(($delivered / $requests) * 100, 1) : 0,
                'open_rate'     => $delivered > 0 ? round((($raw['unique_opens'] ?? 0) / $delivered) * 100, 1) : 0,
                'click_rate'    => $delivered > 0 ? round((($raw['unique_clicks'] ?? 0) / $delivered) * 100, 1) : 0,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date', 'before_or_equal:date_to'],
            'date_to'   => ['nullable', 'date'],
            'user_id'   => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $dateFrom = $request->date_from ?? now()->subDays(29)->format('Y-m-d');
        $dateTo   = $request->date_to   ?? now()->format('Y-m-d');

        $authUser       = $request->user();
        $isAdmin        = $authUser->isAdmin();
        $selectedUserId = $isAdmin ? ($request->integer('user_id') ?: null) : null;

        $users = $isAdmin
            ? User::orderBy('name')->get(['id', 'name', 'email'])
            : collect();

        $selectedUser    = null;
        $recentCampaigns = [];
        $dailyStats      = [];

        if (! $isAdmin) {
            // Scope to the authenticated user's own campaigns only
            $singlesendIds = Campaign::where('user_id', $authUser->id)
                ->whereNotNull('sendgrid_singlesend_id')
                ->latest('sent_at')
                ->limit(20)
                ->pluck('sendgrid_singlesend_id')
                ->merge(
                    Schedule::where('user_id', $authUser->id)
                        ->whereNotNull('sendgrid_singlesend_id')
                        ->latest()
                        ->limit(10)
                        ->pluck('sendgrid_singlesend_id')
                )
                ->unique()
                ->values()
                ->all();

            $stats = Cache::remember(
                "dashboard.user.{$authUser->id}.stats",
                now()->addMinutes(5),
                fn () => $this->sendGrid->getAggregateStatsForSingleSends($singlesendIds)
            );

            $recentCampaigns = $this->sendGrid->getSingleSendsByIds($singlesendIds);

        } elseif ($selectedUserId) {
            $singlesendIds = Schedule::where('user_id', $selectedUserId)
                ->whereNotNull('sendgrid_singlesend_id')
                ->latest()
                ->limit(10)
                ->pluck('sendgrid_singlesend_id')
                ->all();

            $stats = Cache::remember(
                "dashboard.user.{$selectedUserId}.stats",
                now()->addMinutes(5),
                fn () => $this->sendGrid->getAggregateStatsForSingleSends($singlesendIds)
            );

            $recentCampaigns = $this->sendGrid->getSingleSendsByIds($singlesendIds);
            $selectedUser    = User::find($selectedUserId, ['id', 'name', 'email']);
        } else {
            $dailyStats      = $this->sendGrid->getDailyStats($dateFrom, $dateTo);
            $stats           = $this->sendGrid->getAggregateStats($dateFrom, $dateTo);
            $recentCampaigns = $this->sendGrid->getRecentSingleSends(10);
        }

        $delivered = $stats['delivered'];
        $requests  = $stats['requests'];

        $actionItems = [];

        if ($isAdmin) {
            $pendingLeaves = LeaveRequest::with('user')
                ->where('status', 'pending')
                ->orderBy('created_at')
                ->get();

            foreach ($pendingLeaves as $leave) {
                $actionItems[] = [
                    'id'   => $leave->id,
                    'type' => 'leave',
                    'user' => ['id' => $leave->user->id, 'name' => $leave->user->name],
                    'meta' => [
                        'date_from' => $leave->date_from->format('Y-m-d'),
                        'date_to'   => $leave->date_to->format('Y-m-d'),
                        'reason'    => $leave->reason,
                    ],
                ];
            }
        }

        return Inertia::render('dashboard', [
            'stats' => [
                ...$stats,
                'undelivered'   => max(0, $requests - $delivered),
                'delivery_rate' => $requests > 0 ? round(($delivered / $requests) * 100, 1) : 0,
                'open_rate'     => $delivered > 0 ? round(($stats['unique_opens'] / $delivered) * 100, 1) : 0,
                'click_rate'    => $delivered > 0 ? round(($stats['unique_clicks'] / $delivered) * 100, 1) : 0,
            ],
            'dailyStats'      => $dailyStats,
            'recentCampaigns' => $recentCampaigns,
            'actionItems'     => $actionItems,
            'filters'         => ['date_from' => $dateFrom, 'date_to' => $dateTo, 'user_id' => $selectedUserId],
            'users'           => $users,
            'selectedUser'    => $selectedUser,
            'isAdmin'         => $isAdmin,
        ]);
    }
}
