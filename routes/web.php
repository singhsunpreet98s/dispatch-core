<?php

use App\Http\Controllers\Admin\AttendanceController as AdminAttendanceController;
use App\Http\Controllers\Admin\AttendanceHolidayController;
use App\Http\Controllers\Admin\LeaveController as AdminLeaveController;
use App\Http\Controllers\Api\SystemInfoController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceNoteController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\CarrierPacketController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\EmailListController;
use App\Http\Controllers\EmailTemplateController;
use App\Http\Controllers\PublicCarrierPacketController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SalaryController;
use App\Http\Controllers\DemoController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\GeofenceController;
use App\Http\Controllers\GeminiController;
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
Route::get('/demo', [DemoController::class, 'index'])->name('demo.index');
Route::get('/', function () {
    if (auth()->user()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::post('ai/email', [GeminiController::class, 'generate'])->name('ai.email');

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('campaigns/{singlesendId}/detail', [DashboardController::class, 'campaignDetail'])->name('campaigns.detail');
    Route::get('emails', [EmailController::class, 'index'])->name('emails.index');

    Route::resource('templates', EmailTemplateController::class)->except(['show']);
    Route::resource('schedules', ScheduleController::class)->except(['create', 'edit']);

    Route::get('carrier-packets/lookup-mc', [CarrierPacketController::class, 'lookupMc'])->name('carrier-packets.lookup-mc');
    Route::get('carrier-packets', [CarrierPacketController::class, 'index'])->name('carrier-packets.index');
    Route::post('carrier-packets', [CarrierPacketController::class, 'store'])->name('carrier-packets.store');
    Route::get('carrier-packets/{carrierPacket}', [CarrierPacketController::class, 'show'])->name('carrier-packets.show');
    Route::delete('carrier-packets/{carrierPacket}', [CarrierPacketController::class, 'destroy'])->name('carrier-packets.destroy');
    Route::get('carrier-packets/{carrierPacket}/agreement/download', [CarrierPacketController::class, 'downloadAgreement'])->name('carrier-packets.agreement.download');
    Route::get('carrier-packets/{carrierPacket}/documents/{document}/download', [CarrierPacketController::class, 'downloadDocument'])->name('carrier-packets.documents.download');

    Route::get('campaigns', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::post('campaigns', [CampaignController::class, 'store'])->name('campaigns.store');

    Route::get('email-lists', [EmailListController::class, 'index'])->name('email-lists.index');
    Route::post('email-lists', [EmailListController::class, 'store'])->name('email-lists.store');
    Route::get('email-lists/{emailList}/download', [EmailListController::class, 'download'])->name('email-lists.download');
    Route::delete('email-lists/{emailList}', [EmailListController::class, 'destroy'])->name('email-lists.destroy');

    Route::middleware(['attendance'])->prefix('attendance')->name('attendance.')->group(function () {
        Route::get('/', [AttendanceController::class, 'index'])->name('index');
        Route::post('clock-in', [AttendanceController::class, 'clockIn'])->name('clock-in');
        Route::post('clock-out', [AttendanceController::class, 'clockOut'])->name('clock-out');
        Route::post('break/start', [AttendanceController::class, 'startBreak'])->name('break.start');
        Route::post('break/end', [AttendanceController::class, 'endBreak'])->name('break.end');
        Route::post('notes', [AttendanceNoteController::class, 'save'])->name('notes.save');
        Route::post('leave', [LeaveController::class, 'store'])->name('leave.store');
        Route::delete('leave/{leave}', [LeaveController::class, 'destroy'])->name('leave.destroy');
    });

    Route::middleware(['salary'])->group(function () {
        Route::get('remuneration', [SalaryController::class, 'myRemuneration'])->name('remuneration');
        Route::get('remuneration/{monthlySalary}/slip', [SalaryController::class, 'mySlip'])->name('remuneration.slip');
    });

    Route::middleware(['admin'])->group(function () {
        Route::middleware(['attendance'])->group(function () {
            Route::get('attendance/admin', [AdminAttendanceController::class, 'index'])->name('attendance.admin.index');
            Route::get('attendance/live', [AdminAttendanceController::class, 'live'])->name('attendance.admin.live');
            Route::get('attendance/admin/{user}', [AdminAttendanceController::class, 'show'])->name('attendance.admin.show');
            Route::get('attendance/system-info/{serialNumber}', [SystemInfoController::class, 'show'])->name('attendance.system-info');
            Route::post('attendance/exit-events/{exitEvent}/acknowledge', [AdminAttendanceController::class, 'acknowledgeExitEvent'])->name('attendance.exit-events.acknowledge');
            Route::patch('attendance/breaks/{break}', [AdminAttendanceController::class, 'updateBreak'])->name('attendance.breaks.update');
            Route::delete('attendance/breaks/{break}', [AdminAttendanceController::class, 'destroyBreak'])->name('attendance.breaks.destroy');
            Route::post('attendance/holidays', [AttendanceHolidayController::class, 'store'])->name('attendance.holidays.store');
            Route::delete('attendance/holidays/{holiday}', [AttendanceHolidayController::class, 'destroy'])->name('attendance.holidays.destroy');
            Route::patch('attendance/leave/{leave}/approve', [AdminLeaveController::class, 'approve'])->name('attendance.leave.approve');
            Route::patch('attendance/leave/{leave}/reject', [AdminLeaveController::class, 'reject'])->name('attendance.leave.reject');
        });

        Route::get('geofence', [GeofenceController::class, 'index'])->name('geofence.index');
        Route::post('geofence', [GeofenceController::class, 'store'])->name('geofence.store');
        Route::put('geofence/{geofence}', [GeofenceController::class, 'update'])->name('geofence.update');
        Route::delete('geofence/{geofence}', [GeofenceController::class, 'destroy'])->name('geofence.destroy');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::get('users/senders', [UserController::class, 'senders'])->name('users.senders');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::middleware(['salary'])->group(function () {
            Route::get('users/{user}/salary', [SalaryController::class, 'show'])->name('users.salary.show');
            Route::post('users/{user}/salary', [SalaryController::class, 'update'])->name('users.salary.update');
            Route::get('users/{user}/salary/{monthlySalary}/slip', [SalaryController::class, 'slip'])->name('users.salary.slip');
        });
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
