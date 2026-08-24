<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCarrierPacketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'email'        => ['required', 'email', 'max:255'],
            'mc_number'    => ['required', 'string', 'max:100'],
            'company_name' => ['required', 'string', 'max:255'],
        ];
    }
}
