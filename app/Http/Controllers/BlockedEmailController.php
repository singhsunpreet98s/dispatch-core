<?php

namespace App\Http\Controllers;

use App\Models\BlockedEmail;
use App\Models\BlockedEmailImport;
use App\Services\EmailExtractionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BlockedEmailController extends Controller
{
    public function __construct(private EmailExtractionService $emailExtraction) {}

    public function index(Request $request)
    {
        $search = $request->string('search')->trim()->value();

        $blockedEmails = BlockedEmail::with('import:id,original_name,type')
            ->when($search, fn ($q) => $q->where('email', 'like', "%{$search}%"))
            ->orderByDesc('created_at')
            ->paginate(50)
            ->through(fn ($b) => [
                'id'         => $b->id,
                'email'      => $b->email,
                'type'       => $b->type,
                'import_id'  => $b->import_id,
                'import'     => $b->import ? [
                    'id'            => $b->import->id,
                    'original_name' => $b->import->original_name,
                ] : null,
                'created_at' => $b->created_at->toIso8601String(),
            ])
            ->withQueryString();

        return Inertia::render('blocked-emails/index', [
            'blockedEmails' => $blockedEmails,
            'filters'       => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', Rule::unique('blocked_emails', 'email')],
            'type'  => ['required', Rule::in(['blocked', 'bounced'])],
        ]);

        BlockedEmail::create($data);

        return back()->with('success', "Email {$data['email']} added to {$data['type']} list.");
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
            'type' => ['required', Rule::in(['blocked', 'bounced'])],
        ]);

        $uploadedFile = $request->file('file');
        $type         = $request->input('type');

        $contacts = $this->emailExtraction->extractFromFile($uploadedFile->getRealPath());

        if (count($contacts) === 0) {
            return back()->with('error', 'No valid email addresses were found in the uploaded file.');
        }

        $import = BlockedEmailImport::create([
            'original_name' => $uploadedFile->getClientOriginalName(),
            'email_count'   => 0,
            'type'          => $type,
        ]);

        $now   = now();
        $chunk = 500;
        $inserted = 0;

        foreach (array_chunk($contacts, $chunk) as $batch) {
            $rows = array_map(fn ($c) => [
                'email'      => $c['email'],
                'type'       => $type,
                'import_id'  => $import->id,
                'created_at' => $now,
                'updated_at' => $now,
            ], $batch);

            $inserted += DB::table('blocked_emails')->insertOrIgnore($rows);
        }

        $import->update(['email_count' => $inserted]);

        return back()->with('success', "{$inserted} unique email(s) added to the {$type} list from \"{$import->original_name}\" (Import #{$import->id}).");
    }

    public function destroy(BlockedEmail $blockedEmail)
    {
        $email = $blockedEmail->email;
        $blockedEmail->delete();

        return back()->with('success', "{$email} removed from the blocked/bounced list.");
    }
}
