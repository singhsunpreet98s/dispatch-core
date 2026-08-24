<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class TwoFactorController extends Controller
{
    private function google2fa(): Google2FA
    {
        return new Google2FA();
    }

    private function generateQrSvg(string $email, string $secret): string
    {
        $qrUrl = $this->google2fa()->getQRCodeUrl(config('app.name'), $email, $secret);

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );

        return (new Writer($renderer))->writeString($qrUrl);
    }

    private function generateRecoveryCodes(): array
    {
        return array_map(fn () => Str::random(5) . '-' . Str::random(5), range(1, 8));
    }

    public function show(Request $request): Response
    {
        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            return Inertia::render('settings/two-factor', [
                'enabled' => true,
                'recoveryCodes' => $user->two_factor_recovery_codes ?? [],
            ]);
        }

        // Generate a pending secret (not saved yet — confirmed on enable)
        $secret = $this->google2fa()->generateSecretKey();
        $qrSvg = $this->generateQrSvg($user->email, $secret);

        return Inertia::render('settings/two-factor', [
            'enabled' => false,
            'secret' => $secret,
            'qrSvg' => $qrSvg,
        ]);
    }

    public function enable(Request $request): RedirectResponse
    {
        $request->validate([
            'secret' => ['required', 'string'],
            'code'   => ['required', 'string', 'digits:6'],
        ]);

        $valid = $this->google2fa()->verifyKey($request->secret, $request->code);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => 'The code did not match. Please try again.',
            ]);
        }

        $codes = $this->generateRecoveryCodes();

        $request->user()->update([
            'two_factor_secret'         => $request->secret,
            'two_factor_recovery_codes' => $codes,
            'two_factor_confirmed_at'   => now(),
        ]);

        return redirect()->route('two-factor.setup')
            ->with('recoveryCodes', $codes)
            ->with('justEnabled', true);
    }

    public function disable(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($request->password, $request->user()->password)) {
            throw ValidationException::withMessages([
                'password' => 'The password you entered is incorrect.',
            ]);
        }

        $request->user()->update([
            'two_factor_secret'         => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at'   => null,
        ]);

        return redirect()->route('two-factor.setup')->with('status', 'mfa-disabled');
    }

    public function regenerateCodes(Request $request): RedirectResponse
    {
        $codes = $this->generateRecoveryCodes();

        $request->user()->update([
            'two_factor_recovery_codes' => $codes,
        ]);

        return redirect()->route('two-factor.setup')->with('recoveryCodes', $codes);
    }
}
