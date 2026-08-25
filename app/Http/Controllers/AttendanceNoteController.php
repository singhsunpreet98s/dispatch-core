<?php

namespace App\Http\Controllers;

use App\Models\AttendanceNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AttendanceNoteController extends Controller
{
    public function save(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'date'             => ['required', 'date'],
            'items'            => ['required', 'array'],
            'items.*.text'     => ['required', 'string', 'max:500'],
            'items.*.checked'  => ['required', 'boolean'],
        ]);

        AttendanceNote::updateOrCreate(
            ['user_id' => $request->user()->id, 'date' => $data['date']],
            ['items' => $data['items']],
        );

        return back()->with('success', 'Notes saved.');
    }
}
