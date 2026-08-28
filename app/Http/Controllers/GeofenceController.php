<?php

namespace App\Http\Controllers;

use App\Models\Geofence;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GeofenceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('geofence/index', [
            'geofences' => Geofence::with('creator:id,name')->latest()->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:circle,polygon',
            'color'       => 'required|string|max:30',
            'center_lat'  => 'required_if:type,circle|nullable|numeric',
            'center_lng'  => 'required_if:type,circle|nullable|numeric',
            'radius'      => 'required_if:type,circle|nullable|numeric|min:1',
            'coordinates' => 'required_if:type,polygon|nullable|array|min:3',
            'coordinates.*' => 'array|size:2',
        ]);

        Geofence::create([...$data, 'created_by' => $request->user()->id]);

        return back()->with('success', 'Geofence created.');
    }

    public function update(Request $request, Geofence $geofence): RedirectResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:circle,polygon',
            'color'       => 'required|string|max:30',
            'center_lat'  => 'required_if:type,circle|nullable|numeric',
            'center_lng'  => 'required_if:type,circle|nullable|numeric',
            'radius'      => 'required_if:type,circle|nullable|numeric|min:1',
            'coordinates' => 'required_if:type,polygon|nullable|array|min:3',
            'coordinates.*' => 'array|size:2',
        ]);

        $geofence->update($data);

        return back()->with('success', 'Geofence updated.');
    }

    public function destroy(Geofence $geofence): RedirectResponse
    {
        $geofence->delete();

        return back()->with('success', 'Geofence deleted.');
    }
}
