<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SessionEvent;
use App\Models\User;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionEventController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    public function receive(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serialNumber' => ['required', 'string'],
            'event'        => ['required', 'string', 'in:lock,unlock'],
            'timestamp'    => ['required', 'string'],
        ]);

        $timestamp = Carbon::parse($data['timestamp']);

        $user = User::where('system_id', $data['serialNumber'])->first();

        SessionEvent::create([
            'user_id'         => $user?->id,
            'serial_number'   => $data['serialNumber'],
            'event'           => $data['event'],
            'event_timestamp' => $timestamp,
        ]);

        if (! $user) {
            return response()->json(['message' => 'Serial number does not match any registered user.'], 404);
        }

        return match ($data['event']) {
            'lock'   => $this->handleLock($user, $timestamp),
            'unlock' => $this->handleUnlock($user, $timestamp),
        };
    }

    private function handleLock(User $user, Carbon $timestamp): JsonResponse
    {
        $shift = $this->attendance->getTodayShift($user);

        if (! $shift || ! $shift->isOpen()) {
            return response()->json(['message' => 'No active shift; lock event recorded.'], 200);
        }

        if ($shift->hasOpenBreak()) {
            return response()->json(['message' => 'Break already in progress; lock event recorded.'], 200);
        }

        $shift->breaks()->create([
            'started_at'     => $timestamp,
            'session_locked' => true,
        ]);

        return response()->json(['message' => 'Break started via session lock.'], 200);
    }

    private function handleUnlock(User $user, Carbon $timestamp): JsonResponse
    {
        $shift = $this->attendance->getTodayShift($user);

        if (! $shift) {
            return response()->json(['message' => 'No active shift; unlock event recorded.'], 200);
        }

        $shift->load('breaks');
        $break = $shift->currentBreak();

        if (! $break) {
            return response()->json(['message' => 'No open break; unlock event recorded.'], 200);
        }

        // Only apply session-lock logic if break was started by a lock event
        if (! $break->session_locked) {
            return response()->json(['message' => 'Open break was not started by a session lock; unlock event recorded.'], 200);
        }

        $durationMinutes = (int) $break->started_at->diffInMinutes($timestamp);

        if ($durationMinutes < 8) {
            // Too short — discard the break entirely
            $break->delete();

            return response()->json(['message' => 'Break discarded (duration under 8 minutes).'], 200);
        }

        // 8–15 min → round up to 15; >15 → use actual time
        $endedAt = $durationMinutes < 15
            ? $break->started_at->copy()->addMinutes(15)
            : $timestamp;

        $break->update(['ended_at' => $endedAt]);

        return response()->json(['message' => 'Break ended via session unlock.'], 200);
    }
}
