<?php

namespace App\Http\Controllers;

use App\Events\RateRequestSubmitted;
use App\Models\RateRequestLog;
use App\Models\State;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserRateRequestController extends Controller
{
    public function index(Request $request)
    {
        $logs = RateRequestLog::with('state')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(fn ($l) => [
                'id'               => $l->id,
                'state_id'         => $l->state_id,
                'state_code'       => $l->state?->state_code,
                'state_name'       => $l->state?->state_name,
                'email_body'       => $l->email_body,
                'total_recipients' => $l->total_recipients,
                'sent_count'       => $l->sent_count,
                'failed_count'     => $l->failed_count,
                'status'           => $l->status,
                'created_at'       => $l->created_at->toIso8601String(),
            ]);

        return Inertia::render('rate-requests/send', [
            'logs'   => Inertia::defer(fn () => $logs),
            'states' => State::orderBy('state_name')->get(['id', 'state_code', 'state_name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'state_id'   => ['required', 'integer', Rule::exists('states', 'id')],
            'email_body' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $state = State::find($data['state_id']);

        $log = RateRequestLog::create([
            'user_id'    => $request->user()->id,
            'state_id'   => $data['state_id'],
            'email_body' => $data['email_body'],
            'status'     => 'queued',
        ]);

        RateRequestSubmitted::dispatch($log);

        return back()->with('success', "Your rate request for {$state?->state_name} has been queued and will be sent shortly.");
    }
}
