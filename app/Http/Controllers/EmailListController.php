<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadEmailListRequest;
use App\Models\EmailList;
use App\Services\EmailExtractionService;
use App\Services\FileStorageService;
use Inertia\Inertia;

class EmailListController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorage,
        private EmailExtractionService $emailExtraction,
    ) {}

    public function index()
    {
        $user = auth()->user();

        $query = $user->isAdmin()
            ? EmailList::with('user:id,name,email')->orderBy('created_at', 'desc')
            : EmailList::where('user_id', $user->id)->orderBy('created_at', 'desc');

        return Inertia::render('email-lists/index', [
            'emailLists' => $query->paginate(15, [
                'id', 'user_id', 'original_name', 'disk', 'size', 'email_count', 'created_at',
            ]),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function store(UploadEmailListRequest $request)
    {
        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();

        // Duplicate filename guard
        if (EmailList::where('user_id', auth()->id())->where('original_name', $originalName)->exists()) {
            return back()->with(
                'error',
                "You have already uploaded a file named \"{$originalName}\". Delete the existing file or rename before re-uploading."
            );
        }

        $storedPath = $this->fileStorage->store($uploadedFile);

        try {
            $emails = $this->emailExtraction->extractFromFile(
                $this->fileStorage->fullPath($storedPath)
            );

            // No emails found — discard the file
            if (count($emails) === 0) {
                $this->fileStorage->delete($storedPath);

                return back()->with('error', 'No valid email addresses were found in the uploaded file. Please check the file and try again.');
            }

            $emailList = EmailList::create([
                'user_id' => auth()->id(),
                'original_name' => $originalName,
                'stored_path' => $storedPath,
                'disk' => 'local',
                'size' => $uploadedFile->getSize(),
                'email_count' => count($emails),
            ]);

            $this->emailExtraction->persistEmails($emailList->id, $emails);

            return back()->with('success', "Uploaded successfully — {$emailList->email_count} email(s) extracted.");
        } catch (\RuntimeException $e) {
            $this->fileStorage->delete($storedPath);

            return back()->with('error', $e->getMessage());
        }
    }

    public function download(EmailList $emailList)
    {
        $this->authorizeAccess($emailList);

        return $this->fileStorage->download(
            $emailList->stored_path,
            $emailList->original_name,
            $emailList->disk
        );
    }

    public function destroy(EmailList $emailList)
    {
        $this->authorizeAccess($emailList);

        $this->fileStorage->delete($emailList->stored_path, $emailList->disk);
        $emailList->delete(); // cascades to email_contacts via FK

        return back()->with('success', 'File deleted.');
    }

    private function authorizeAccess(EmailList $emailList): void
    {
        if (! auth()->user()->isAdmin() && $emailList->user_id !== auth()->id()) {
            abort(403);
        }
    }
}
