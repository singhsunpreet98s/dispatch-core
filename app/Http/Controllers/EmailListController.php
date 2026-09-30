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
            'emailLists' => Inertia::defer(fn() => $query->paginate(15, [
                'id',
                'user_id',
                'original_name',
                'list_name',
                'disk',
                'size',
                'email_count',
                'sendgrid_list_id',
                'created_at',
            ])),
            'isAdmin'    => $user->isAdmin(),
        ]);
    }

    public function store(UploadEmailListRequest $request)
    {
        if (! auth()->user()->sendgrid_contact_id) {
            return back()->with('error', 'Your Portal Sender ID is not configured. Ask an admin to set it up before uploading email lists.');
        }

        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();
        $listName     = $request->input('list_name');
        $userId       = auth()->id();

        // If another user already owns a list with this name, block the upload
        $otherUserList = EmailList::where('list_name', $listName)
            ->where('user_id', '!=', $userId)
            ->first();

        if ($otherUserList) {
            return back()->with(
                'error',
                "A list named \"{$listName}\" already exists and belongs to another user. Please choose a different name."
            );
        }

        $existingList = EmailList::where('list_name', $listName)
            ->where('user_id', $userId)
            ->first();

        $storedPath = $this->fileStorage->store($uploadedFile);

        try {
            $contacts = $this->emailExtraction->extractFromFile(
                $this->fileStorage->fullPath($storedPath)
            );

            if (count($contacts) === 0) {
                $this->fileStorage->delete($storedPath);

                return back()->with('error', 'No valid email addresses were found in the uploaded file. Please check the file and try again.');
            }

            if ($existingList) {
                // Same user, same list name — override contacts in the existing SendGrid list

                // Compute which emails were removed so we can delete them from SendGrid
                $oldEmails = $existingList->contacts()->pluck('email')->all();
                $newEmails = array_column($contacts, 'email');
                $removedEmails = array_values(array_diff($oldEmails, $newEmails));

                try {
                    $this->sendGrid->addContactsToList($existingList->sendgrid_list_id, $contacts);
                    if (! empty($removedEmails)) {
                        $this->sendGrid->deleteContactsByEmails($removedEmails);
                    }
                } catch (\RuntimeException $e) {
                    $this->fileStorage->delete($storedPath);

                    return back()->with('error', 'Portal sync failed: ' . $e->getMessage());
                }

                $this->fileStorage->delete($existingList->stored_path, $existingList->disk);
                $existingList->contacts()->delete();
                $existingList->update([
                    'original_name' => $originalName,
                    'stored_path'   => $storedPath,
                    'size'          => $uploadedFile->getSize(),
                    'email_count'   => count($contacts),
                ]);
                $this->emailExtraction->persistContacts($existingList->id, $contacts);

                return back()->with('success', "Updated successfully — " . count($contacts) . " contact(s) synced to Portal list \"{$listName}\".");
            }

            // New list — create in SendGrid and store locally
            try {
                $sendgridListId = $this->sendGrid->createMarketingList($listName);
                $this->sendGrid->addContactsToList($sendgridListId, $contacts);
            } catch (\RuntimeException $e) {
                $this->fileStorage->delete($storedPath);

                return back()->with('error', 'Portal sync failed: ' . $e->getMessage());
            }

            $emailList = EmailList::create([
                'user_id'           => $userId,
                'original_name'     => $originalName,
                'list_name'         => $listName,
                'stored_path'       => $storedPath,
                'disk'              => 'local',
                'size'              => $uploadedFile->getSize(),
                'email_count'       => count($contacts),
                'sendgrid_list_id'  => $sendgridListId,
            ]);

            $this->emailExtraction->persistContacts($emailList->id, $contacts);

            return back()->with('success', "Uploaded successfully — {$emailList->email_count} contact(s) synced to Portal list \"{$listName}\".");
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

        $deleteFromSendgrid = auth()->user()->isAdmin() && request()->boolean('delete_from_sendgrid');

        if ($deleteFromSendgrid && $emailList->sendgrid_list_id) {
            try {
                $this->sendGrid->deleteMarketingList($emailList->sendgrid_list_id);
            } catch (\RuntimeException $e) {
                return back()->with('error', 'Could not delete Portal list — deletion cancelled: ' . $e->getMessage());
            }
        }

        $this->fileStorage->delete($emailList->stored_path, $emailList->disk);
        $emailList->delete(); // cascades to email_contacts via FK

        $message = $deleteFromSendgrid && $emailList->sendgrid_list_id
            ? 'List deleted from Portal and local database.'
            : 'List deleted from local database.';

        return back()->with('success', $message);
    }

    private function authorizeAccess(EmailList $emailList): void
    {
        if (! auth()->user()->isAdmin() && $emailList->user_id !== auth()->id()) {
            abort(403);
        }
    }
}
