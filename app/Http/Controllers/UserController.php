<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('users/index', [
            'users' => User::orderBy('created_at', 'desc')
                ->paginate(10, ['id', 'name', 'email', 'role', 'sendgrid_contact_id', 'two_factor_confirmed_at', 'mfa_required', 'created_at']),
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        User::create($request->validated());

        return back()->with('success', 'User created.');
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->safe()->except('password');

        if ($request->filled('password')) {
            $data['password'] = $request->validated('password');
        }

        $user->update($data);

        return back()->with('success', 'User updated.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return back()->with('success', 'User deleted.');
    }
}
