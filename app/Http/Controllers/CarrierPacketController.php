<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCarrierPacketRequest;
use App\Models\CarrierPacket;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CarrierPacketController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $query = $user->isAdmin()
            ? CarrierPacket::with(['user:id,name,email', 'documents'])
            : CarrierPacket::where('user_id', $user->id)->with(['documents']);

        return Inertia::render('carrier-packets/index', [
            'packets' => Inertia::defer(fn () => $query->orderBy('created_at', 'desc')->paginate(15)),
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function store(StoreCarrierPacketRequest $request)
    {
        CarrierPacket::create([
            ...$request->validated(),
            'user_id' => auth()->id(),
            'uuid'    => (string) Str::uuid(),
        ]);

        return back()->with('success', 'Carrier packet created successfully.');
    }

    public function show(CarrierPacket $carrierPacket)
    {
        $this->authorizeAccess($carrierPacket);

        $carrierPacket->load(['user:id,name,email', 'documents']);

        return Inertia::render('carrier-packets/show', [
            'packet'  => array_merge($carrierPacket->toArray(), [
                'public_url' => $carrierPacket->publicUrl(),
            ]),
            'isAdmin' => auth()->user()->isAdmin(),
        ]);
    }

    public function destroy(CarrierPacket $carrierPacket)
    {
        $this->authorizeAccess($carrierPacket);

        foreach ($carrierPacket->documents as $doc) {
            Storage::disk($doc->disk)->delete($doc->path);
        }

        if ($carrierPacket->signature_path) {
            Storage::disk('public')->delete($carrierPacket->signature_path);
        }

        $carrierPacket->delete();

        return back()->with('success', 'Carrier packet deleted.');
    }

    public function downloadAgreement(CarrierPacket $carrierPacket)
    {
        $this->authorizeAccess($carrierPacket);

        abort_if($carrierPacket->status !== 'signed', 404, 'Agreement not yet signed.');

        $formData = (object) [
            'company_name'   => $carrierPacket->company_name,
            'name'           => $carrierPacket->full_name,
            'address'        => $carrierPacket->address,
            'phone'          => $carrierPacket->phone,
            'email'          => $carrierPacket->email,
            'signature_path' => $carrierPacket->signature_path,
        ];

        $pdf = Pdf::loadView('carrier-packets.agreement-pdf', compact('formData'))
            ->setPaper('a4', 'portrait');

        $filename = 'broker-carrier-agreement-' . Str::slug($carrierPacket->company_name) . '.pdf';

        return $pdf->download($filename);
    }

    public function downloadDocument(CarrierPacket $carrierPacket, int $documentId)
    {
        $this->authorizeAccess($carrierPacket);

        $doc = $carrierPacket->documents()->findOrFail($documentId);

        return Storage::disk($doc->disk)->download($doc->path, $doc->original_name);
    }

    private function authorizeAccess(CarrierPacket $packet): void
    {
        if (! auth()->user()->isAdmin() && $packet->user_id !== auth()->id()) {
            abort(403);
        }
    }
}
