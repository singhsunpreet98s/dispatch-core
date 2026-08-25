<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use App\Services\SendGridService;

class DemoController extends Controller
{
   public function __construct(private SendGridService $sendGrid) {}
   public function index()
   {
      $detail = $this->sendGrid->getSingleSendDetail("54b517ed-9fda-11f1-aa9c-3608abf6a830");
      $raw    = $this->sendGrid->getSingleSendStats("54b517ed-9fda-11f1-aa9c-3608abf6a830");
      dd($raw);
   }
}
