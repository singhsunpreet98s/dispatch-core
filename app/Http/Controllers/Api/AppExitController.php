<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppExitEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppExitController extends Controller
{
    public function receive(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serialNumber' => ['required', 'string'],
            'timestamp'    => ['required', 'string'],
        ]);

        $timestamp = Carbon::parse($data['timestamp']);
        $user      = User::where('system_id', $data['serialNumber'])->first();

        AppExitEvent::create([
            'user_id'         => $user?->id,
            'serial_number'   => $data['serialNumber'],
            'event_timestamp' => $timestamp,
        ]);

        if (! $user) {
            return response()->json(['message' => 'Serial number does not match any registered user.'], 404);
        }

        return response()->json(['message' => 'App exit event recorded.'], 200);
    }
}
