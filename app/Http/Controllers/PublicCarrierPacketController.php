<?php

namespace App\Http\Controllers;

use App\Models\CarrierPacket;
use App\Models\CarrierPacketDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PublicCarrierPacketController extends Controller
{
    public function show(string $uuid)
    {
        $packet = CarrierPacket::where('uuid', $uuid)->firstOrFail();

        if ($packet->status === 'signed') {
            return Inertia::render('carrier-packets/public/completed', [
                'packet' => $packet->only(['company_name', 'mc_number']),
            ]);
        }

        if ($packet->status === 'pending') {
            $packet->update(['status' => 'opened', 'opened_at' => now()]);
        }

        // If already submitted, go straight to agreement
        if ($packet->status === 'submitted') {
            return redirect()->route('packet.agreement', $uuid);
        }

        return Inertia::render('carrier-packets/public/form', [
            'packet' => $packet->only(['uuid', 'company_name', 'mc_number']),
        ]);
    }

    public function submit(Request $request, string $uuid)
    {
        $packet = CarrierPacket::where('uuid', $uuid)->firstOrFail();

        if ($packet->status === 'signed') {
            return redirect()->route('packet.show', $uuid);
        }

        $validated = $request->validate([
            'full_name'    => ['required', 'string', 'max:255'],
            'address'      => ['required', 'string', 'max:500'],
            'phone'        => ['required', 'string', 'max:50'],
            'mc_authority' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'w9'           => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'coi'          => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'void_check'   => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        // Store uploaded docs in local temp
        $documents = [];
        foreach (['mc_authority', 'w9', 'coi', 'void_check'] as $type) {
            if ($request->hasFile($type)) {
                $file = $request->file($type);
                $path = $file->storeAs(
                    "carrier-packets-temp/{$uuid}",
                    "{$type}_{$file->getClientOriginalName()}",
                    'local'
                );
                $documents[$type] = [
                    'path'          => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'size'          => $file->getSize(),
                ];
            }
        }

        // Persist customer fields immediately (survives session loss)
        $packet->update([
            'status'       => 'submitted',
            'submitted_at' => now(),
            'full_name'    => $validated['full_name'],
            'address'      => $validated['address'],
            'phone'        => $validated['phone'],
        ]);

        // Also keep in session for agreement page
        session()->put("cp_{$uuid}", [
            'full_name' => $validated['full_name'],
            'address'   => $validated['address'],
            'phone'     => $validated['phone'],
            'documents' => $documents,
        ]);

        return redirect()->route('packet.agreement', $uuid);
    }

    public function agreement(string $uuid)
    {
        $packet = CarrierPacket::where('uuid', $uuid)->firstOrFail();

        if ($packet->status === 'signed') {
            return Inertia::render('carrier-packets/public/completed', [
                'packet' => $packet->only(['company_name', 'mc_number']),
            ]);
        }

        if (! in_array($packet->status, ['submitted'])) {
            return redirect()->route('packet.show', $uuid);
        }

        $session = session()->get("cp_{$uuid}", []);

        return Inertia::render('carrier-packets/public/agreement', [
            'packet' => $packet->only(['uuid', 'company_name', 'mc_number']),
            'customer' => [
                'full_name' => $packet->full_name,
                'address'   => $packet->address,
                'phone'     => $packet->phone,
            ],
            'documentTypes' => array_keys($session['documents'] ?? []),
        ]);
    }

    public function sign(Request $request, string $uuid)
    {
        $packet = CarrierPacket::where('uuid', $uuid)->firstOrFail();

        if ($packet->status === 'signed') {
            return redirect()->route('packet.done', $uuid);
        }

        $request->validate([
            'signature' => ['required', 'string'],
        ]);

        $session = session()->get("cp_{$uuid}", []);

        // Decode and save signature PNG
        $sigData = $request->input('signature');
        $sigData = preg_replace('/^data:image\/\w+;base64,/', '', $sigData);
        $sigDir  = "carrier-packets/{$uuid}";
        $sigPath = "{$sigDir}/signature.png";
        Storage::disk('public')->put($sigPath, base64_decode($sigData));

        // Move temp documents to permanent public storage
        $docRows = [];
        foreach ($session['documents'] ?? [] as $type => $info) {
            $finalPath = "{$sigDir}/{$type}_" . basename($info['path']);
            Storage::disk('public')->put(
                $finalPath,
                Storage::disk('local')->get($info['path'])
            );
            Storage::disk('local')->delete($info['path']);

            $docRows[] = [
                'carrier_packet_id' => $packet->id,
                'type'              => $type,
                'path'              => $finalPath,
                'disk'              => 'public',
                'original_name'     => $info['original_name'],
                'size'              => $info['size'] ?? 0,
                'created_at'        => now(),
                'updated_at'        => now(),
            ];
        }

        if (! empty($docRows)) {
            CarrierPacketDocument::insert($docRows);
        }

        $packet->update([
            'status'         => 'signed',
            'signed_at'      => now(),
            'signature_path' => $sigPath,
        ]);

        session()->forget("cp_{$uuid}");

        return redirect()->route('packet.done', $uuid);
    }

    public function done(string $uuid)
    {
        $packet = CarrierPacket::where('uuid', $uuid)->firstOrFail();

        return Inertia::render('carrier-packets/public/completed', [
            'packet' => $packet->only(['company_name', 'mc_number']),
        ]);
    }
}
