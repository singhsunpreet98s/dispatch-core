<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceHoliday;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AttendanceHolidayController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date', 'unique:attendance_holidays,date'],
            'name' => ['required', 'string', 'max:150'],
        ]);

        AttendanceHoliday::create($data);

        return back()->with('success', 'Holiday added.');
    }

    public function destroy(AttendanceHoliday $holiday): RedirectResponse
    {
        $holiday->delete();

        return back()->with('success', 'Holiday removed.');
    }
}
