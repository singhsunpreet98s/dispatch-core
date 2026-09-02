<?php

namespace App\Http\Controllers;

use App\Models\BlockedEmail;
use App\Models\Customer;
use App\Models\EmailUnsubscribe;
use App\Services\EmailExtractionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class FilterEmailController extends Controller
{
    public function __construct(private EmailExtractionService $emailExtraction) {}

    public function index()
    {
        return Inertia::render('email-filter/index', [
            'isAdmin' => auth()->user()->isAdmin(),
        ]);
    }

    public function scan(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
        ]);

        $isAdmin  = auth()->user()->isAdmin();
        $contacts = $this->emailExtraction->extractFromFile($request->file('file')->getRealPath());

        if (count($contacts) === 0) {
            return response()->json(['error' => 'No valid email addresses found in the file.'], 422);
        }

        $allEmails = array_map(fn ($c) => strtolower($c['email']), $contacts);
        $emailSet  = array_flip($allEmails); // for O(1) lookup

        // Load exclusion sets
        $unsubscribed = EmailUnsubscribe::pluck('email')
            ->map(fn ($e) => strtolower($e))
            ->flip()
            ->all();

        $blocked = BlockedEmail::pluck('email')
            ->map(fn ($e) => strtolower($e))
            ->flip()
            ->all();

        $customers = $isAdmin
            ? Customer::pluck('email')->map(fn ($e) => strtolower($e))->flip()->all()
            : [];

        // Categorise each email
        $removedUnsubscribed = 0;
        $removedBlocked      = 0;
        $removedCustomers    = 0;
        $cleanEmails         = [];

        foreach ($allEmails as $email) {
            $isUnsub    = isset($unsubscribed[$email]);
            $isBlocked  = isset($blocked[$email]);
            $isCustomer = $isAdmin && isset($customers[$email]);

            if ($isUnsub) {
                $removedUnsubscribed++;
            } elseif ($isBlocked) {
                $removedBlocked++;
            } elseif ($isCustomer) {
                $removedCustomers++;
            } else {
                $cleanEmails[] = $email;
            }
        }

        $totalRemoved = $removedUnsubscribed + $removedBlocked + $removedCustomers;

        // Build filtered CSV content
        $csvLines = ["email\r\n"];
        foreach ($cleanEmails as $email) {
            $csvLines[] = $email . "\r\n";
        }
        $csvContent = implode('', $csvLines);

        // Store in a temp file keyed to session
        $tempKey  = 'email_filter_' . auth()->id() . '_' . now()->timestamp;
        $tempPath = 'temp/' . $tempKey . '.csv';
        Storage::put($tempPath, $csvContent);

        // Keep the temp path in session for the download step
        session(['email_filter_temp' => $tempPath]);

        $result = [
            'total'               => count($allEmails),
            'total_removed'       => $totalRemoved,
            'removed_unsubscribed'=> $removedUnsubscribed,
            'removed_blocked'     => $removedBlocked,
            'clean'               => count($cleanEmails),
        ];

        if ($isAdmin) {
            $result['removed_customers'] = $removedCustomers;
        }

        return response()->json($result);
    }

    public function download(Request $request)
    {
        $tempPath = session('email_filter_temp');

        if (! $tempPath || ! Storage::exists($tempPath)) {
            abort(404, 'Filtered file not found. Please run the scan again.');
        }

        return Storage::download($tempPath, 'filtered-emails.csv');
    }
}
