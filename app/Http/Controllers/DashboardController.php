<?php

namespace App\Http\Controllers;

use App\Services\SendGridService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private SendGridService $sendGrid) {}

    public function index()
    {
        $stats = $this->sendGrid->getAggregateStats(30);
        $recentCampaigns = $this->sendGrid->getRecentSingleSends(10);

        $delivered = $stats['delivered'];
        $requests = $stats['requests'];

        return Inertia::render('dashboard', [
            'stats' => [
                ...$stats,
                'undelivered' => max(0, $requests - $delivered),
                'delivery_rate' => $requests > 0 ? round(($delivered / $requests) * 100, 1) : 0,
                'open_rate' => $delivered > 0 ? round(($stats['unique_opens'] / $delivered) * 100, 1) : 0,
                'click_rate' => $delivered > 0 ? round(($stats['unique_clicks'] / $delivered) * 100, 1) : 0,
            ],
            'recentCampaigns' => $recentCampaigns,
        ]);
    }
}
