<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceHoliday extends Model
{
    protected $fillable = ['date', 'name'];

    protected $casts = ['date' => 'date'];
}
