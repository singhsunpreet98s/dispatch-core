<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppearanceController extends Controller
{
    private const VALID_ACCENT_COLORS = [
        'indigo', 'violet', 'purple', 'pink', 'rose',
        'orange', 'amber', 'emerald', 'teal', 'cyan', 'sky', 'blue',
    ];

    public function edit(): Response
    {
        return Inertia::render('settings/appearance');
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'accent_color' => ['nullable', 'string', 'in:' . implode(',', self::VALID_ACCENT_COLORS)],
        ]);

        $request->user()->update([
            'accent_color' => $request->accent_color,
        ]);

        return back();
    }
}
