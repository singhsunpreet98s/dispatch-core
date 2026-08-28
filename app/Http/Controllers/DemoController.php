<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class DemoController extends Controller
{
    public function index()
    {
        $rows = DB::table('cache')->orderBy('key')->get();

        $result = [];
        foreach ($rows as $row) {
            $result[$row->key] = [
                'value'      => unserialize($row->value),
                'expires_at' => date('Y-m-d H:i:s', $row->expiration),
                'expired'    => $row->expiration < time(),
            ];
        }

        dd($result);
    }
}
