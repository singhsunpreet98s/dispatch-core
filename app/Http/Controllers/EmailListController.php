<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadEmailListRequest;
use App\Models\EmailList;
use App\Services\EmailExtractionService;
use App\Services\FileStorageService;
use App\Services\SendGridService;
use Inertia\Inertia;

class EmailListController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorage,
        private EmailExtractionService $emailExtraction,
        private SendGridService $sendGrid,
    ) {}

    public function index()
    {
        $user = auth()->user();

        $query = $user->isAdmin()
            ? EmailList::with('user:id,name,email')->orderBy('created_at', 'desc')
            : EmailList::where('user_id', $user->id)->orderBy('created_at', 'desc');

        return Inertia::render('email-lists/index', [
            'emailLists' => Inertia::defer(fn () => $query->paginate(15, [
                'id', 'user_id', 'original_name', 'list_name', 'disk', 'size', 'email_count', 'sendgrid_list_id', 'created_at',
            ])),
            'isAdmin'    => $user->isAdmin(),
        ]);
    }

    public function store(UploadEmailListRequest $request)
    {
        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();
        $listName     = $request->input('list_name');

        // Duplicate filename guard
        if (EmailList::where('user_id', auth()->id())->where('original_name', $originalName)->exists()) {
            return back()->with(
                'error',
                "You have already uploaded a file named \"{$originalName}\". Delete the existing file or rename before re-uploading."
            );
        }

        $storedPath = $this->fileStorage->store($uploadedFile);

        try {
            $contacts = $this->emailExtraction->extractFromFile(
                $this->fileStorage->fullPath($storedPath)
            );

            if (count($contacts) === 0) {
                $this->fileStorage->delete($storedPath);

                return back()->with('error', 'No valid email addresses were found in the uploaded file. Please check the file and try again.');
            }

            // Create SendGrid marketing list and upload contacts
            try {
                $sendgridListId = $this->sendGrid->createMarketingList($listName);
                $this->sendGrid->addContactsToList($sendgridListId, $contacts);
            } catch (\RuntimeException $e) {
                $this->fileStorage->delete($storedPath);

                return back()->with('error', 'SendGrid sync failed: ' . $e->getMessage());
            }

            $emailList = EmailList::create([
                'user_id'           => auth()->id(),
                'original_name'     => $originalName,
                'list_name'         => $listName,
                'stored_path'       => $storedPath,
                'disk'              => 'local',
                'size'              => $uploadedFile->getSize(),
                'email_count'       => count($contacts),
                'sendgrid_list_id'  => $sendgridListId,
            ]);

            $this->emailExtraction->persistContacts($emailList->id, $contacts);

            return back()->with('success', "Uploaded successfully — {$emailList->email_count} contact(s) synced to SendGrid list \"{$listName}\".");
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
