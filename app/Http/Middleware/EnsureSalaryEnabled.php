<?php

namespace App\Http\Middleware;

use App\Models\FeatureFlag;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSalaryEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! FeatureFlag::isEnabled('salary_feature_flag')) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Salary module is not enabled.'], 403);
            }

            return redirect()->route('dashboard')
                ->with('error', 'The salary module is not enabled.');
        }

        return $next($request);
    }
}
