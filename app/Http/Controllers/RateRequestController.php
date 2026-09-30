<?php

namespace App\Http\Controllers;

use App\Models\RateRequestCity;
use App\Models\RateRequestContact;
use App\Models\RateRequestImport;
use App\Models\RateRequestLog;
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
        $search = $request->string('search')->trim()->value();
        $cityId = $request->integer('city_id');

        $contacts = RateRequestContact::with('city')
            ->when($cityId, fn ($q) => $q->where('city_id', $cityId))
            ->when($search, fn ($q) => $q->where(function ($q2) use ($search) {
                $q2->where('email', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhere('mc_number', 'like', "%{$search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(50)
            ->through(fn ($c) => [
                'id'           => $c->id,
                'city_id'      => $c->city_id,
                'city_name'    => $c->city?->name,
                'email'        => $c->email,
                'company_name' => $c->company_name,
                'mc_number'    => $c->mc_number,
                'created_at'   => $c->created_at->toIso8601String(),
            ])
            ->withQueryString();

        return Inertia::render('rate-requests/index', [
            'contacts' => Inertia::defer(fn () => $contacts),
            'filters'  => ['city_id' => $cityId ?: '', 'search' => $search],
            'cities'   => RateRequestCity::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function history(Request $request)
    {
        $search = $request->string('search')->trim()->value();
        $cityId = $request->integer('city_id');
        $status = $request->string('status')->trim()->value();

        $logs = RateRequestLog::with(['user', 'city'])
            ->when($cityId, fn ($q) => $q->where('city_id', $cityId))
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
                'city_id'          => $l->city_id,
                'city_name'        => $l->city?->name,
                'total_recipients' => $l->total_recipients,
                'sent_count'       => $l->sent_count,
                'failed_count'     => $l->failed_count,
                'status'           => $l->status,
                'created_at'       => $l->created_at->toIso8601String(),
            ])
            ->withQueryString();

        return Inertia::render('rate-requests/history', [
            'logs'    => $logs,
            'filters' => ['city_id' => $cityId ?: '', 'status' => $status, 'search' => $search],
            'cities'  => RateRequestCity::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'city_id'      => ['required', 'integer', Rule::exists('rate_request_cities', 'id')],
            'email'        => ['required', 'email', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'mc_number'    => ['nullable', 'string', 'max:50'],
        ]);

        $contact = RateRequestContact::create($data);
        $contact->load('city');

        return back()->with('success', "Contact {$data['email']} added for {$contact->city?->name}.");
    }

    public function storeCity(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('rate_request_cities', 'name')],
        ]);

        $city = RateRequestCity::create($data);

        return back()->with('success', "City \"{$city->name}\" added.");
    }

    public function import(Request $request)
    {
        $request->validate([
            'file'    => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
            'city_id' => ['required', 'integer', Rule::exists('rate_request_cities', 'id')],
        ]);

        $uploadedFile = $request->file('file');
        $cityId       = (int) $request->input('city_id');
        $city         = RateRequestCity::findOrFail($cityId);

        $contacts = $this->importer->extractFromFile($uploadedFile->getRealPath());

        if (count($contacts) === 0) {
            return back()->with('error', 'No valid email addresses were found in the uploaded file.');
        }

        // Override: delete all existing contacts for this city before inserting the new ones.
        RateRequestContact::where('city_id', $cityId)->delete();

        $import = RateRequestImport::create([
            'city_id'       => $cityId,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'email_count'   => 0,
        ]);

        $now      = now();
        $inserted = 0;

        foreach (array_chunk($contacts, 500) as $batch) {
            $rows = array_map(fn ($c) => [
                'import_id'    => $import->id,
                'city_id'      => $cityId,
                'email'        => $c['email'],
                'company_name' => $c['company_name'],
                'mc_number'    => $c['mc_number'],
                'created_at'   => $now,
                'updated_at'   => $now,
            ], $batch);

            $inserted += DB::table('rate_request_contacts')->insertOrIgnore($rows);
        }

        $import->update(['email_count' => $inserted]);

        return back()->with('success', "{$inserted} contact(s) loaded for {$city->name} from \"{$import->original_name}\" (previous contacts replaced).");
    }

    public function destroy(RateRequestContact $rateRequestContact)
    {
        $email = $rateRequestContact->email;
        $rateRequestContact->delete();

        return back()->with('success', "{$email} removed from rate request contacts.");
    }
}
