<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BearerTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $stored = SystemSetting::get('api_bearer_token');

        if (! $stored) {
            return response()->json(['message' => 'API token not configured.'], 401);
        }

        $provided = $request->bearerToken();

        if (! $provided || ! hash_equals($stored, $provided)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
