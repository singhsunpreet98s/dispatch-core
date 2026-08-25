<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function approve(Request $request, LeaveRequest $leave): RedirectResponse
    {
        $leave->update(['status' => 'approved']);

        return back()->with('success', "Leave request for {$leave->user->name} approved.");
    }

    public function reject(Request $request, LeaveRequest $leave): RedirectResponse
    {
        $leave->update(['status' => 'rejected']);

        return back()->with('success', "Leave request for {$leave->user->name} rejected.");
    }
}
