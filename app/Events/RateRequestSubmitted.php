<?php

namespace App\Events;

use App\Models\RateRequestLog;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RateRequestSubmitted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly RateRequestLog $log) {}
}
