<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('mfa.user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/two-factor-challenge');
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('mfa.user_id');

        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        // Try OTP code first
        if ($request->filled('code')) {
            $google2fa = new Google2FA();
            $valid = $google2fa->verifyKey($user->two_factor_secret, str_replace(' ', '', $request->code));

            if ($valid) {
                return $this->loginUser($request, $user);
            }
        }

        // Try recovery code
        if ($request->filled('recovery_code')) {
            $codes = $user->two_factor_recovery_codes ?? [];
            $inputCode = trim($request->recovery_code);

            foreach ($codes as $index => $code) {
                if (hash_equals($code, $inputCode)) {
                    // Consume the used recovery code
                    $codes[$index] = null;
                    $user->two_factor_recovery_codes = array_values(array_filter($codes));
                    $user->save();

                    return $this->loginUser($request, $user);
                }
            }
        }

        return back()->withErrors(['code' => 'The provided code was invalid.']);
    }

    private function loginUser(Request $request, User $user): RedirectResponse
    {
        $remember = $request->session()->get('mfa.remember', false);
        $request->session()->forget(['mfa.user_id', 'mfa.remember']);

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
