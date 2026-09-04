<?php

namespace App\Http\Controllers;

use App\Models\RateRequestContact;
use App\Models\RateRequestImport;
use App\Models\RateRequestLog;
use App\Models\State;
use App\Services\RateRequestImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RateRequestController extends Controller
{
    public function __construct(private RateRequestImportService $importer) {}

    public function index(Request $request)
    {
        $search  = $request->string('search')->trim()->value();
        $stateId = $request->integer('state_id');

        $contacts = RateRequestContact::with('state')
            ->when($stateId, fn ($q) => $q->where('state_id', $stateId))
            ->when($search, fn ($q) => $q->where(function ($q2) use ($search) {
                $q2->where('email', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhere('mc_number', 'like', "%{$search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(50)
            ->through(fn ($c) => [
                'id'           => $c->id,
                'state_id'     => $c->state_id,
                'state_code'   => $c->state?->state_code,
                'state_name'   => $c->state?->state_name,
                'email'        => $c->email,
                'company_name' => $c->company_name,
                'mc_number'    => $c->mc_number,
                'created_at'   => $c->created_at->toIso8601String(),
            ])
            ->withQueryString();

        return Inertia::render('rate-requests/index', [
            'contacts' => Inertia::defer(fn () => $contacts),
            'filters'  => ['state_id' => $stateId ?: '', 'search' => $search],
            'states'   => State::orderBy('state_name')->get(['id', 'state_code', 'state_name']),
        ]);
    }

    public function history(Request $request)
    {
        $search  = $request->string('search')->trim()->value();
        $stateId = $request->integer('state_id');
        $status  = $request->string('status')->trim()->value();

        $logs = RateRequestLog::with(['user', 'state'])
            ->when($stateId, fn ($q) => $q->where('state_id', $stateId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($search, fn ($q) => $q->whereHas('user', function ($q2) use ($search) {
                $q2->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(fn ($l) => [
                'id'               => $l->id,
                'user_name'        => $l->user?->name,
                'user_email'       => $l->user?->email,
                'state_id'         => $l->state_id,
                'state_code'       => $l->state?->state_code,
                'state_name'       => $l->state?->state_name,
                'total_recipients' => $l->total_recipients,
                'sent_count'       => $l->sent_count,
                'failed_count'     => $l->failed_count,
                'status'           => $l->status,
                'created_at'       => $l->created_at->toIso8601String(),
            ])
            ->withQueryString();

        return Inertia::render('rate-requests/history', [
            'logs'    => $logs,
            'filters' => ['state_id' => $stateId ?: '', 'status' => $status, 'search' => $search],
            'states'  => State::orderBy('state_name')->get(['id', 'state_code', 'state_name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'state_id'     => ['required', 'integer', Rule::exists('states', 'id')],
            'email'        => ['required', 'email', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'mc_number'    => ['nullable', 'string', 'max:50'],
        ]);

        $contact = RateRequestContact::create($data);
        $contact->load('state');

        return back()->with('success', "Contact {$data['email']} added for {$contact->state?->state_name}.");
    }

    public function import(Request $request)
    {
        $request->validate([
            'file'     => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
            'state_id' => ['required', 'integer', Rule::exists('states', 'id')],
        ]);

        $uploadedFile = $request->file('file');
        $stateId      = (int) $request->input('state_id');
        $state        = State::findOrFail($stateId);

        $contacts = $this->importer->extractFromFile($uploadedFile->getRealPath());

        if (count($contacts) === 0) {
            return back()->with('error', 'No valid email addresses were found in the uploaded file.');
        }

        $import = RateRequestImport::create([
            'state_id'      => $stateId,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'email_count'   => 0,
        ]);

        $now      = now();
        $inserted = 0;

        foreach (array_chunk($contacts, 500) as $batch) {
            $rows = array_map(fn ($c) => [
                'import_id'    => $import->id,
                'state_id'     => $stateId,
                'email'        => $c['email'],
                'company_name' => $c['company_name'],
                'mc_number'    => $c['mc_number'],
                'created_at'   => $now,
                'updated_at'   => $now,
            ], $batch);

            $inserted += DB::table('rate_request_contacts')->insertOrIgnore($rows);
        }

        $import->update(['email_count' => $inserted]);

        return back()->with('success', "{$inserted} contact(s) added for {$state->state_name} from \"{$import->original_name}\" (Import #{$import->id}).");
    }

    public function destroy(RateRequestContact $rateRequestContact)
    {
        $email = $rateRequestContact->email;
        $rateRequestContact->delete();

        return back()->with('success', "{$email} removed from rate request contacts.");
    }
}
