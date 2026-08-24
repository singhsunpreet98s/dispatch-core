<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $isCustom = $this->input('type') === 'custom';

        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:daily,custom'],
            'template_id' => ['required', 'integer', 'exists:email_templates,id'],
            'email_list_id' => ['required', 'integer', 'exists:email_lists,id'],
            'triggers' => ['required', 'array', 'min:1'],
            'triggers.*.time' => ['required', 'date_format:H:i'],
            'triggers.*.weekday' => $isCustom
                ? ['required', 'integer', 'min:0', 'max:6']
                : ['nullable', 'integer', 'min:0', 'max:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'triggers.required' => 'At least one trigger is required.',
            'triggers.min' => 'At least one trigger is required.',
            'triggers.*.time.required' => 'Each trigger must have a time.',
            'triggers.*.time.date_format' => 'Time must be in HH:MM format.',
            'triggers.*.weekday.required' => 'Each custom trigger must have a weekday.',
        ];
    }
}
