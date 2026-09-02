<?php

namespace App\Http\Controllers;

use App\Models\EmailUnsubscribe;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnsubscribersController extends Controller
{
    public function index(Request $request)
    {
        $authUser = auth()->user();
        $isAdmin  = $authUser->isAdmin();

        $q = EmailUnsubscribe::with('user:id,name,email')
            ->orderByDesc('created_at');

        if (! $isAdmin) {
            $q->where('user_id', $authUser->id);
        }

        $unsubscribers = $q->paginate(50)->through(fn($u) => [
            'id'          => $u->id,
            'email'       => $u->email,
            'user'        => $u->user ? ['name' => $u->user->name, 'email' => $u->user->email] : null,
            'created_at'  => $u->created_at->toIso8601String(),
        ]);

        $users = $isAdmin
            ? User::orderBy('name')->get(['id', 'name', 'email'])
            : collect();
        return Inertia::render('unsubscribers/index', [
            'unsubscribers' => $unsubscribers,
            'isAdmin'       => $isAdmin,
            'users'         => $users,
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $authUser = auth()->user();
        $record   = EmailUnsubscribe::findOrFail($id);

        if (! $authUser->isAdmin() && $record->user_id !== $authUser->id) {
            abort(403);
        }

        $record->delete();

        return back()->with('success', 'Unsubscribe record removed.');
    }
}
