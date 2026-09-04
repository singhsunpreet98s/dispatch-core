<?php

namespace App\Http\Middleware;

use App\Models\FeatureFlag;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRateRequestEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! FeatureFlag::isEnabled('rate_request_feature_flag')) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Rate request module is not enabled.'], 403);
            }

            return redirect()->route('dashboard')
                ->with('error', 'The rate request module is not enabled.');
        }

        return $next($request);
    }
}
