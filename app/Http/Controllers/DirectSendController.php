<?php

namespace App\Http\Controllers;

use App\Jobs\SendDirectEmailsJob;
use App\Models\DirectSend;
use App\Models\EmailList;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DirectSendController extends Controller
{
    public function index()
    {
        $user  = auth()->user();
        $limit = (int) config('services.sendgrid.max_direct_recipients', 100);

        $sendsQuery = $user->isAdmin()
            ? DirectSend::with(['user:id,name,email', 'emailList:id,list_name'])
                ->orderBy('created_at', 'desc')
            : DirectSend::where('user_id', $user->id)
                ->with('emailList:id,list_name')
                ->orderBy('created_at', 'desc');

        $listsQuery = $user->isAdmin()
            ? EmailList::where('email_count', '<=', $limit)
                ->orderBy('list_name')
                ->get(['id', 'list_name', 'email_count'])
            : EmailList::where('user_id', $user->id)
                ->where('email_count', '<=', $limit)
                ->orderBy('list_name')
                ->get(['id', 'list_name', 'email_count']);

        return Inertia::render('direct-sends/index', [
            'directSends'        => $sendsQuery->paginate(20, ['id', 'user_id', 'email_list_id', 'subject', 'status', 'email_count', 'sent_count', 'created_at']),
            'availableLists'     => $listsQuery,
            'maxRecipients'      => $limit,
            'isAdmin'            => $user->isAdmin(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email_list_id' => ['required', 'integer', 'exists:email_lists,id'],
            'subject'       => ['required', 'string', 'max:998'],
            'body'          => ['required', 'string'],
        ]);

        $user  = auth()->user();
        $limit = (int) config('services.sendgrid.max_direct_recipients', 100);

        $emailList = EmailList::findOrFail($validated['email_list_id']);

        // Non-admins can only use their own lists
        if (! $user->isAdmin() && $emailList->user_id !== $user->id) {
            abort(403);
        }

        if ($emailList->email_count > $limit) {
            return back()->with('error', "This list has {$emailList->email_count} contacts which exceeds the {$limit}-recipient limit.");
        }

        $directSend = DirectSend::create([
            'user_id'       => $user->id,
            'email_list_id' => $emailList->id,
            'from_email'    => $user->email,
            'from_name'     => $user->name,
            'subject'       => $validated['subject'],
            'body'          => $validated['body'],
            'status'        => 'pending',
            'email_count'   => $emailList->email_count,
        ]);

        SendDirectEmailsJob::dispatch($directSend);

        return back()->with('success', "Email queued — sending to {$emailList->email_count} recipient(s).");
    }
}
