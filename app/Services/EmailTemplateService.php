<?php

namespace App\Services;

class EmailTemplateService
{
    public static function getTemplateV1(string $body, int $userId): string
    {
        // Remove the top margin on whichever block element opens the body so email
        // clients (Gmail, Outlook) don't add visible space above the first line.
        $body = self::stripFirstElementTopMargin($body);

        $wrapper = '<div style="max-width:600px;margin:0 auto;">';
        $footer  = '<div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;color:#888888;font-size:12px;">'
            . '<p style="margin:0 0 6px 0;">&#169; 2026 Uniship Cargo LLC | All rights reserved</p>'
            . '<p style="margin:0;">Click here to <a href="[UNSUBSCRIBE_LINK]" target="_blank" style="color:#555555;">Unsubscribe</a></p>'
            . '</div>';

        $template = '<!DOCTYPE html>'
            . '<html lang="en"><head><meta charset="UTF-8"></head>'
            . '<body style="margin:0;padding:0;font-family:Arial,sans-serif;">'
            . '<style>p,h1,h2,h3,h4,h5,h6,ul,ol{margin:0 0 1em 0;padding:0;}p:last-child,h1:last-child,h2:last-child,h3:last-child{margin-bottom:0;}</style>'
            . $wrapper
            . '[BODY]'
            . $footer
            . '</div>'
            . '</body></html>';

        $unsubscribeLink = url('unsubscribe?s=' . $userId . '&r={{email}}');
        $template        = str_replace('[BODY]', $body, $template);
        $template        = str_replace('[UNSUBSCRIBE_LINK]', $unsubscribeLink, $template);

        return $template;
    }

    /**
     * Inline margin-top:0 on the very first block element so email clients
     * don't render UA-stylesheet top margins above the opening line.
     */
    private static function stripFirstElementTopMargin(string $html): string
    {
        return preg_replace_callback(
            '/<(h[1-6]|p|div|ul|ol)(\s[^>]*)?>/i',
            function (array $m) {
                $tag   = $m[1];
                $attrs = $m[2] ?? '';

                if (preg_match('/\bstyle\s*=\s*(["\'])([^"\']*)\1/i', $attrs, $s)) {
                    // Style attribute already exists — prepend margin-top:0
                    $newStyle = 'margin-top:0;' . $s[2];
                    $attrs    = preg_replace('/\bstyle\s*=\s*(["\'])[^"\']*\1/i', 'style="' . $newStyle . '"', $attrs);
                } else {
                    $attrs .= ' style="margin-top:0"';
                }

                return "<{$tag}{$attrs}>";
            },
            $html,
            1, // only the first match
        ) ?? $html;
    }
}
