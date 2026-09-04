<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DirectSend extends Model
{
    protected $fillable = [
        'user_id',
        'email_list_id',
        'from_email',
        'from_name',
        'subject',
        'body',
        'status',
        'email_count',
        'sent_count',
        'error_message',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function emailList(): BelongsTo
    {
        return $this->belongsTo(EmailList::class);
    }
}
