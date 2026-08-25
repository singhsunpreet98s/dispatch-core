<?php

namespace App\Http\Middleware;

use App\Models\FeatureFlag;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAttendanceEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! FeatureFlag::isEnabled('attendance_feature_flag')) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Attendance module is not enabled.'], 403);
            }

            return redirect()->route('dashboard')
                ->with('error', 'The attendance module is not enabled.');
        }

        return $next($request);
    }
}
