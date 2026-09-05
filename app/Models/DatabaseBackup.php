<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatabaseBackup extends Model
{
    protected $fillable = [
        'filename',
        'dropbox_path',
        'size_bytes',
        'status',
        'error_message',
        'backed_up_at',
    ];

    protected $casts = [
        'backed_up_at' => 'datetime',
        'size_bytes'   => 'integer',
    ];
}
