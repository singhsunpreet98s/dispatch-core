<?php

use App\Http\Middleware\CheckImpersonationExpiry;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureAttendanceEnabled;
use App\Http\Middleware\EnsureMfaSetup;
use App\Http\Middleware\EnsureRateRequestEnabled;
use App\Http\Middleware\EnsureSalaryEnabled;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsureMfaSetup::class,
            CheckImpersonationExpiry::class,
        ]);

        $middleware->alias([
            'admin'      => EnsureAdmin::class,
            'mfa.setup'  => EnsureMfaSetup::class,
            'attendance'    => EnsureAttendanceEnabled::class,
            'salary'        => EnsureSalaryEnabled::class,
            'rate-request'  => EnsureRateRequestEnabled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
