<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sendgrid' => [
        'api_key'              => env('SENDGRID_API_KEY'),
        'unsubscribe_group_id' => env('SENDGRID_UNSUBSCRIBE_GROUP_ID'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    'microsoft_graph' => [
        'tenant_id'     => env('MICROSOFT_GRAPH_TENANT_ID'),
        'client_id'     => env('MICROSOFT_GRAPH_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_GRAPH_CLIENT_SECRET'),
        'from_email'    => env('MICROSOFT_GRAPH_FROM_EMAIL'),
    ],

];
