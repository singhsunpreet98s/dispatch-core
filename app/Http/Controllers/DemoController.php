<?php

namespace App\Http\Controllers;

use App\Mail\BreakReminderMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;

class DemoController extends Controller
{
    public function index()
    {
        $employee = (object) [
            'name'  => 'John Doe',
            'email' => 'singhsunpreet98s@gmail.com',
        ];

        $break = (object) [
            'started_at' => Carbon::now()->subMinutes(45),
            'ended_at'   => null,
        ];

        Mail::to($employee->email)->send(new BreakReminderMail($employee, $break, 3));
    }
}
