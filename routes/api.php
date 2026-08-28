<?php

use App\Http\Controllers\Api\SessionEventController;
use App\Http\Controllers\Api\SystemInfoController;
use App\Http\Middleware\BearerTokenAuth;
use Illuminate\Support\Facades\Route;

Route::middleware(BearerTokenAuth::class)->group(function () {
    Route::post('system-info', [SystemInfoController::class, 'receive'])->name('api.system-info.receive');
    Route::post('session-event', [SessionEventController::class, 'receive'])->name('api.session-event.receive');
});
