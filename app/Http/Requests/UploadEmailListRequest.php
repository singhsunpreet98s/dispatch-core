<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadEmailListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'list_name' => ['required', 'string', 'max:255'],
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls,csv',
                'max:10240',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'list_name.required' => 'Please provide a name for this list.',
            'file.mimes' => 'Only .xlsx, .xls, and .csv files are supported.',
            'file.max' => 'File size must not exceed 10 MB.',
        ];
    }
}
