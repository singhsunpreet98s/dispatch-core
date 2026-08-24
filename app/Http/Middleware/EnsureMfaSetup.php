<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureMfaSetup
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            Auth::check() &&
            Auth::user()->mfa_required &&
            ! Auth::user()->hasTwoFactorEnabled()
        ) {
            $allowedRoutes = ['two-factor.setup', 'two-factor.enable', 'two-factor.disable', 'logout', 'password.confirm'];

            if (! $request->routeIs(...$allowedRoutes)) {
                return redirect()->route('two-factor.setup');
            }
        }

        return $next($request);
    }
}
