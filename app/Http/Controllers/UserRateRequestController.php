<?php

namespace App\Http\Controllers;

use App\Events\RateRequestSubmitted;
use App\Models\RateRequestCity;
use App\Models\RateRequestLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserRateRequestController extends Controller
{
    public function index(Request $request)
    {
        $logs = RateRequestLog::with('city')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(fn ($l) => [
                'id'               => $l->id,
                'city_id'          => $l->city_id,
                'city_name'        => $l->city?->name,
                'email_body'       => $l->email_body,
                'total_recipients' => $l->total_recipients,
                'sent_count'       => $l->sent_count,
                'failed_count'     => $l->failed_count,
                'status'           => $l->status,
                'created_at'       => $l->created_at->toIso8601String(),
            ]);

        return Inertia::render('rate-requests/send', [
            'logs'   => Inertia::defer(fn () => $logs),
            'cities' => RateRequestCity::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Request $request, RateRequestLog $log)
    {
        abort_if($log->user_id !== $request->user()->id, 403);

        $log->load(['city', 'entries']);

        return response()->json([
            'id'               => $log->id,
            'city_name'        => $log->city?->name,
            'status'           => $log->status,
            'email_body'       => $log->email_body,
            'total_recipients' => $log->total_recipients,
            'sent_count'       => $log->sent_count,
            'failed_count'     => $log->failed_count,
            'created_at'       => $log->created_at->toIso8601String(),
            'entries'          => $log->entries->map(fn ($e) => [
                'id'            => $e->id,
                'to_email'      => $e->to_email,
                'company_name'  => $e->company_name,
                'mc_number'     => $e->mc_number,
                'status'        => $e->status,
                'error_message' => $e->error_message,
                'sent_at'       => $e->sent_at?->toIso8601String(),
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'city_id'    => ['required', 'integer', Rule::exists('rate_request_cities', 'id')],
            'email_body' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $city = RateRequestCity::find($data['city_id']);

        $log = RateRequestLog::create([
            'user_id'    => $request->user()->id,
            'city_id'    => $data['city_id'],
            'email_body' => $data['email_body'],
            'status'     => 'queued',
        ]);

        RateRequestSubmitted::dispatch($log);

        return back()->with('success', "Your rate request for {$city?->name} has been queued and will be sent shortly.");
    }
}
