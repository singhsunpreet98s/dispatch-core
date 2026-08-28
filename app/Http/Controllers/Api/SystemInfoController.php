<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SystemInfoController extends Controller
{
    public function receive(Request $request): JsonResponse
    {
        $data = $request->validate([
            'serialNumber'     => ['required', 'string'],
            'model'            => ['required', 'string'],
            'ipAddress'        => ['required', 'string'],
            'maxStorageGB'     => ['required', 'numeric', 'min:0'],
            'storageLeftGB'    => ['required', 'numeric', 'min:0'],
            'openApplications' => ['required', 'array'],
            'openApplications.*' => ['string'],
        ]);

        $exists = User::where('system_id', $data['serialNumber'])->exists();

        if (! $exists) {
            return response()->json(['message' => 'Serial number does not match any registered user.'], 404);
        }

        Cache::put("system_info:{$data['serialNumber']}", $data, now()->addMinutes(10));

        return response()->json(['message' => 'System info received.'], 200);
    }

    public function show(string $serialNumber): JsonResponse
    {
        $cached = Cache::get("system_info:{$serialNumber}");

        if (! $cached) {
            return response()->json(['data' => null], 200);
        }

        return response()->json(['data' => $cached], 200);
    }
}
