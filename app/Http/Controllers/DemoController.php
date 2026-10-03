<?php

namespace App\Http\Controllers;

use App\Mail\ClockInReminderMail;
use Illuminate\Support\Facades\Mail;

class DemoController extends Controller
{
    public function index()
    {
        $employee = (object) [
            'name'  => 'John Doe',
            'email' => 'singhsunpreet98s@gmail.com',
        ];

        Mail::to($employee->email)->send(new ClockInReminderMail($employee, 2, 30));
    }
}
