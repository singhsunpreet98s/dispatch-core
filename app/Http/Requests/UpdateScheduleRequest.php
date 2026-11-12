<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $schedule = $this->route('schedule');

        return auth()->user()->isAdmin() || $schedule->user_id === auth()->id();
    }

    public function rules(): array
    {
        $type      = $this->input('type');
        $isCustom  = $type === 'custom';
        $isOneTime = $type === 'one_time';

        return [
            'name'          => ['required', 'string', 'max:255'],
            'type'          => ['required', 'in:daily,custom,one_time'],
            'template_id'   => ['required', 'integer', 'exists:email_templates,id'],
            'email_list_id' => ['required', 'integer', 'exists:email_lists,id'],
            'status'        => ['sometimes', 'in:active,paused'],
            'triggers'      => ['required', 'array', 'min:1', $isOneTime ? 'max:1' : 'min:1'],
            'triggers.*.send_at' => $isOneTime
                ? ['required', 'date']
                : ['nullable'],
            'triggers.*.time' => $isOneTime
                ? ['nullable']
                : ['required', 'date_format:H:i'],
            'triggers.*.weekday' => $isCustom
                ? ['required', 'integer', 'min:0', 'max:6']
                : ['nullable', 'integer', 'min:0', 'max:6'],
        ];
    }
}
