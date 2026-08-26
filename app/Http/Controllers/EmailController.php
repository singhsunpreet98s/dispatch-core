<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Schedule;
use App\Models\User;
use App\Services\SendGridService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmailController extends Controller
{
    public function __construct(private SendGridService $sendGrid) {}

    public function index(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date', 'after_or_equal:date_from'],
            'status'     => ['nullable', 'string'],
            'to_email'   => ['nullable', 'string', 'max:255'],
            'from_email' => ['nullable', 'string', 'max:255'],
            'user_id'    => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $dateFrom       = $request->date_from ?? now()->format('Y-m-d');
        $dateTo         = $request->date_to   ?? now()->format('Y-m-d');
        $status         = $request->input('status', 'all');
        $authUser       = $request->user();
        $isAdmin        = $authUser->isAdmin();
        $toEmail        = $request->input('to_email') ?: null;
        $fromEmail      = $isAdmin ? ($request->input('from_email') ?: null) : null;
        $selectedUserId = $isAdmin ? ($request->integer('user_id') ?: null) : null;


        if ($isAdmin && $selectedUserId) {
            $user = User::find($selectedUserId);
            $fromEmail = $user->email;
        } elseif (! $isAdmin) {
            $fromEmail = auth()->user()->email;
        }

        $users = $isAdmin
            ? User::orderBy('name')->get(['id', 'name', 'email'])
            : collect();

        return Inertia::render('emails/index', [
            'emails'  => Inertia::defer(fn() => $this->sendGrid->getEmailActivity(
                $dateFrom,
                $dateTo,
                $status !== 'all' ? $status : 'all',
                $toEmail,
                $fromEmail,
            )),
            'filters' => [
                'date_from'  => $dateFrom,
                'date_to'    => $dateTo,
                'status'     => $status,
                'to_email'   => $toEmail ?? '',
                'from_email' => $fromEmail ?? '',
                'user_id'    => $selectedUserId,
            ],
            'isAdmin' => $isAdmin,
            'users'   => $users,
        ]);
    }
}
