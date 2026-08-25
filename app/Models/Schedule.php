<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    protected $fillable = ['user_id', 'template_id', 'email_list_id', 'name', 'type', 'status', 'sendgrid_singlesend_id'];

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

    public function triggers(): HasMany
    {
        return $this->hasMany(ScheduleTrigger::class)->orderBy('weekday')->orderBy('time');
    }
}
