<?php

namespace App\Http\Controllers;

use App\Models\EmailUnsubscribe;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnsubscribeController extends Controller
{
    public function show(Request $request)
    {
        $userId = (int) $request->query('s');
        $email  = strtolower(trim((string) $request->query('r')));

        $sender = $userId ? User::find($userId) : null;
        $alreadyUnsubscribed = false;

        if ($sender && $email) {
            $alreadyUnsubscribed = EmailUnsubscribe::where('user_id', $userId)
                ->where('email', $email)
                ->exists();
        }

        return Inertia::render('unsubscribe/index', [
            'userId'              => $userId ?: null,
            'email'               => $email ?: null,
            'senderName'          => $sender?->email,
            'alreadyUnsubscribed' => $alreadyUnsubscribed,
            'resubscribed'        => $request->query('done') === 'resubscribed',
            'valid'               => (bool) ($sender && $email),
        ]);
    }

    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'email'   => ['required', 'email'],
        ]);

        EmailUnsubscribe::firstOrCreate([
            'user_id' => $validated['user_id'],
            'email'   => strtolower($validated['email']),
        ]);

        return redirect()->route('unsubscribe.show', [
            's' => $validated['user_id'],
            'r' => $validated['email'],
        ]);
    }

    public function resubscribe(Request $request)
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'email'   => ['required', 'email'],
        ]);

        EmailUnsubscribe::where('user_id', $validated['user_id'])
            ->where('email', strtolower($validated['email']))
            ->delete();

        return redirect()->route('unsubscribe.show', [
            's'    => $validated['user_id'],
            'r'    => $validated['email'],
            'done' => 'resubscribed',
        ]);
    }
}
