<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmailTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $template = $this->route('template');

        return auth()->user()->isAdmin() || $template->user_id === auth()->id();
    }

    public function rules(): array
    {
        $template = $this->route('template');

        return [
            'title' => [
                'required', 'string', 'max:255',
                Rule::unique('email_templates')
                    ->where('user_id', $template->user_id)
                    ->ignore($template->id),
            ],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.unique' => 'This user already has a template with this title.',
        ];
    }
}
