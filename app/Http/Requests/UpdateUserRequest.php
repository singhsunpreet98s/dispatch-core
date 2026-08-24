<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,'.$this->route('user')->id],
            'password' => ['nullable', 'string', Password::defaults()],
            'role' => ['required', 'in:admin,manager,user'],
            'sendgrid_contact_id' => ['nullable', 'string', 'max:255'],
            'mfa_required' => ['boolean'],
        ];
    }
}
