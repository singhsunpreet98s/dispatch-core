<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Campaign extends Model
{
    protected $fillable = [
        'user_id',
        'template_id',
        'email_list_id',
        'name',
        'subject',
        'sendgrid_singlesend_id',
        'status',
        'error_message',
        'contact_count',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(EmailTemplate::class);
    }

    public function emailList(): BelongsTo
    {
        return $this->belongsTo(EmailList::class);
    }
}
