<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date_from' => ['required', 'date', 'after_or_equal:today'],
            'date_to'   => ['required', 'date', 'after_or_equal:date_from'],
            'reason'    => ['required', 'string', 'max:1000'],
        ]);

        LeaveRequest::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status'  => 'pending',
        ]);

        return back()->with('success', 'Leave request submitted successfully.');
    }

    public function destroy(Request $request, LeaveRequest $leave): RedirectResponse
    {
        if ($leave->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! $leave->isPending()) {
            return back()->with('error', 'Only pending leave requests can be cancelled.');
        }

        $leave->delete();

        return back()->with('success', 'Leave request cancelled.');
    }
}
