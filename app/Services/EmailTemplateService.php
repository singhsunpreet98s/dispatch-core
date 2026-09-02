<?php

namespace App\Services;

class EmailTemplateService
{
    public static function getTemplateV1(string $body, int $userId): string
    {
        // Email clients apply their own margins to block elements, so spacing is
        // inlined here rather than left to the <style> block (which several clients
        // strip). The first block loses its top margin and the last its bottom one.
        $body = self::inlineBlockSpacing($body);

        $wrapper = '<div style="max-width:600px;margin:0 auto;">';
        $footer = '<div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;color:#888888;font-size:12px;">'
            .'<p style="margin:0 0 6px 0;">&#169; 2026 Uniship Cargo LLC | All rights reserved</p>'
            .'<p style="margin:0;">Click here to <a href="[UNSUBSCRIBE_LINK]" target="_blank" style="color:#555555;">Unsubscribe</a></p>'
            .'</div>';

        $template = '<!DOCTYPE html>'
            .'<html lang="en"><head><meta charset="UTF-8"></head>'
            .'<body style="margin:0;padding:0;font-family:Arial,sans-serif;line-height:1.5;">'
            .'<style>p,h1,h2,h3,h4,h5,h6,ul,ol{margin:0 0 1em 0;padding:0;}ul,ol{padding-left:24px;}p:last-child,h1:last-child,h2:last-child,h3:last-child{margin-bottom:0;}</style>'
            .$wrapper
            .'[BODY]'
            .$footer
            .'</div>'
            .'</body></html>';

        $unsubscribeLink = url('unsubscribe?s='.$userId.'&r={{email}}');
        $template = str_replace('[BODY]', $body, $template);
        $template = str_replace('[UNSUBSCRIBE_LINK]', $unsubscribeLink, $template);

        return $template;
    }

    /**
     * Inline vertical margins on every block element: a single blank line between
     * blocks, none above the first or below the last. Existing inline styles are
     * kept and win, since they are declared after the defaults.
     */
    private static function inlineBlockSpacing(string $html): string
    {
        $pattern = '/<(h[1-6]|p|div|ul|ol)(\s[^>]*)?>/i';

        preg_match_all($pattern, $html, $matches);
        $lastIndex = count($matches[0]) - 1;

        if ($lastIndex < 0) {
            return $html;
        }

        $index = -1;

        return preg_replace_callback(
            $pattern,
            function (array $m) use (&$index, $lastIndex) {
                $index++;
                $tag = $m[1];
                $attrs = $m[2] ?? '';

                // Bottom margins only: Outlook's Word engine doesn't collapse adjacent
                // margins, so a top margin here would double the gap between blocks.
                $bottom = $index === $lastIndex ? '0' : '1em';
                $padding = in_array(strtolower($tag), ['ul', 'ol'], true) ? '0 0 0 24px' : '0';
                $margin = "margin:0 0 {$bottom} 0;padding:{$padding};";

                if (preg_match('/\bstyle\s*=\s*("|\')(.*?)\1/is', $attrs, $s)) {
                    // Style attribute already exists — prepend the defaults so the author's win.
                    $newStyle = $margin.$s[2];
                    $attrs = preg_replace('/\bstyle\s*=\s*("|\').*?\1/is', 'style="'.$newStyle.'"', $attrs);
                } else {
                    $attrs .= ' style="'.$margin.'"';
                }

                return "<{$tag}{$attrs}>";
            },
            $html,
        ) ?? $html;
    }
}
