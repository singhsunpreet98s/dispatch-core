<?php

namespace App\Http\Controllers;

use App\Models\ImpersonationLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonateController extends Controller
{
    public function start(Request $request, User $user)
    {
        $admin = Auth::user();

        abort_if($admin->role !== 'admin', 403);
        abort_if($user->role === 'admin', 403, 'Cannot impersonate another admin.');
        abort_if((bool) session('impersonator_id'), 403, 'Already in an impersonation session.');
        abort_if($admin->id === $user->id, 403, 'Cannot impersonate yourself.');

        $log = ImpersonationLog::create([
            'impersonator_id' => $admin->id,
            'impersonated_id' => $user->id,
            'ip_address'      => $request->ip(),
            'user_agent'      => $request->userAgent(),
            'started_at'      => now(),
        ]);

        session([
            'impersonator_id'       => $admin->id,
            'impersonator_started_at' => now(),
            'impersonation_log_id'  => $log->id,
        ]);

        Auth::login($user);
        session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function stop(Request $request)
    {
        $adminId = session('impersonator_id');

        if (! $adminId) {
            return redirect()->route('dashboard');
        }

        $admin = User::find($adminId);

        // Verify the impersonator still exists and is still an admin
        abort_if(! $admin || $admin->role !== 'admin', 403, 'Original admin account is no longer valid.');

        $logId = session('impersonation_log_id');
        if ($logId) {
            ImpersonationLog::where('id', $logId)->update([
                'stopped_at'  => now(),
                'stop_reason' => 'manual',
            ]);
        }

        session()->forget(['impersonator_id', 'impersonator_started_at', 'impersonation_log_id']);

        Auth::login($admin);
        session()->regenerate();

        return redirect()->route('users.index');
    }
}
