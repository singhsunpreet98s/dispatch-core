<?php

use App\Http\Controllers\Settings\AppearanceController;
use App\Http\Controllers\Settings\AttendanceSettingController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SystemSettingController;
use App\Http\Controllers\Settings\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', [AppearanceController::class, 'edit'])->name('appearance');
    Route::patch('settings/appearance', [AppearanceController::class, 'update'])->name('appearance.update');

    Route::get('settings/two-factor', [TwoFactorController::class, 'show'])->name('two-factor.setup');
    Route::post('settings/two-factor/enable', [TwoFactorController::class, 'enable'])->name('two-factor.enable');
    Route::delete('settings/two-factor', [TwoFactorController::class, 'disable'])->name('two-factor.disable');
    Route::post('settings/two-factor/recovery-codes', [TwoFactorController::class, 'regenerateCodes'])->name('two-factor.recovery-codes');

    Route::middleware('admin')->group(function () {
        Route::get('settings/system', [SystemSettingController::class, 'edit'])->name('system-settings.edit');
        Route::post('settings/system/logo', [SystemSettingController::class, 'update'])->name('system-settings.logo');
        Route::delete('settings/system/logo', [SystemSettingController::class, 'removeLogo'])->name('system-settings.logo.remove');

        Route::patch('settings/system/flags/{featureFlag}', [SystemSettingController::class, 'updateFlag'])->name('system-settings.flags.update');
        Route::patch('settings/system/flags/{featureFlag}/toggle', [SystemSettingController::class, 'toggleFlag'])->name('system-settings.flags.toggle');

        Route::patch('settings/attendance', [AttendanceSettingController::class, 'update'])->name('attendance-settings.update');
        Route::get('settings/system/command-status', [SystemSettingController::class, 'commandStatus'])->name('system-settings.command-status');
    });
});
