<?php

use App\Http\Controllers\CarrierPacketController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailListController;
use App\Http\Controllers\EmailTemplateController;
use App\Http\Controllers\PublicCarrierPacketController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Public carrier packet form (no auth required) ──────────────────────────
Route::prefix('p')->name('packet.')->group(function () {
    Route::get('{uuid}', [PublicCarrierPacketController::class, 'show'])->name('show');
    Route::post('{uuid}/submit', [PublicCarrierPacketController::class, 'submit'])->name('submit');
    Route::get('{uuid}/agreement', [PublicCarrierPacketController::class, 'agreement'])->name('agreement');
    Route::post('{uuid}/sign', [PublicCarrierPacketController::class, 'sign'])->name('sign');
    Route::get('{uuid}/done', [PublicCarrierPacketController::class, 'done'])->name('done');
});

Route::get('/', function () {
    if (auth()->user()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('templates', EmailTemplateController::class)->except(['show']);
    Route::resource('schedules', ScheduleController::class)->except(['create', 'edit']);

    Route::get('carrier-packets', [CarrierPacketController::class, 'index'])->name('carrier-packets.index');
    Route::post('carrier-packets', [CarrierPacketController::class, 'store'])->name('carrier-packets.store');
    Route::get('carrier-packets/{carrierPacket}', [CarrierPacketController::class, 'show'])->name('carrier-packets.show');
    Route::delete('carrier-packets/{carrierPacket}', [CarrierPacketController::class, 'destroy'])->name('carrier-packets.destroy');
    Route::get('carrier-packets/{carrierPacket}/documents/{document}/download', [CarrierPacketController::class, 'downloadDocument'])->name('carrier-packets.documents.download');

    Route::get('email-lists', [EmailListController::class, 'index'])->name('email-lists.index');
    Route::post('email-lists', [EmailListController::class, 'store'])->name('email-lists.store');
    Route::get('email-lists/{emailList}/download', [EmailListController::class, 'download'])->name('email-lists.download');
    Route::delete('email-lists/{emailList}', [EmailListController::class, 'destroy'])->name('email-lists.destroy');

    Route::middleware(['admin'])->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
