<?php

namespace App\Http\Middleware;

use App\Models\ImpersonationLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckImpersonationExpiry
{
    // Auto-stop impersonation after 2 hours
    private const TTL_MINUTES = 120;

    public function handle(Request $request, Closure $next): Response
    {
        if (! session('impersonator_id')) {
            return $next($request);
        }

        $startedAt = session('impersonator_started_at');

        if (! $startedAt || now()->diffInMinutes($startedAt) >= self::TTL_MINUTES) {
            $this->forceStop($request, 'expired');
            return redirect()->route('login')->withErrors(['session' => 'Impersonation session expired.']);
        }

        return $next($request);
    }

    private function forceStop(Request $request, string $reason): void
    {
        $adminId = session('impersonator_id');
        $logId   = session('impersonation_log_id');

        if ($logId) {
            ImpersonationLog::where('id', $logId)->update([
                'stopped_at'  => now(),
                'stop_reason' => $reason,
            ]);
        }

        session()->forget(['impersonator_id', 'impersonator_started_at', 'impersonation_log_id']);

        $admin = User::find($adminId);
        if ($admin && $admin->role === 'admin') {
            Auth::login($admin);
            session()->regenerate();
        } else {
            Auth::logout();
            session()->invalidate();
            session()->regenerateToken();
        }
    }
}
