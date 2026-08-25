<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeminiController extends Controller
{
    private const MODEL   = 'gemini-2.0-flash';
    private const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' . self::MODEL . ':generateContent';

    private const SYSTEM_PROMPT = <<<'PROMPT'
You are a professional email content writer. Your ONLY function is to write or improve email body content.

Strict rules you must always follow:
1. If the user request is not about writing or improving email content, reply with exactly: {"error":"I can only help with writing email content."}
2. Output ONLY clean HTML body content — no <!DOCTYPE>, no <html>, <head>, or <body> wrapper tags.
3. Use semantic HTML: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>. No inline styles.
4. Write professionally. Be clear, concise, and engaging.
5. Do not include any explanation, commentary, or markdown — output raw HTML only.
PROMPT;

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'action'  => ['required', 'in:write,improve'],
            'prompt'  => ['required_if:action,write', 'nullable', 'string', 'max:1000'],
            'content' => ['required_if:action,improve', 'nullable', 'string', 'max:20000'],
        ]);

        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            return response()->json(['error' => 'Gemini API key is not configured.'], 503);
        }

        $userMessage = $request->action === 'write'
            ? 'Write an email with the following description: ' . $request->prompt
            : 'Improve the following email HTML content while preserving its intent and structure: ' . $request->content;

        $response = Http::timeout(120)->post(self::API_URL . '?key=' . $apiKey, [
            'systemInstruction' => [
                'parts' => [['text' => self::SYSTEM_PROMPT]],
            ],
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $userMessage]]],
            ],
            'generationConfig' => [
                'temperature'     => 0.7,
                'maxOutputTokens' => 4096,
            ],
        ]);

        if ($response->failed()) {
            return response()->json(['error' => $response], 502);
        }

        $text = $response->json('candidates.0.content.parts.0.text', '');

        if (empty($text)) {
            return response()->json(['error' => 'No response received from Gemini.'], 502);
        }

        // Strip markdown code fences if model wrapped output
        $text = preg_replace('/^```(?:html)?\s*/i', '', trim($text));
        $text = preg_replace('/\s*```$/', '', $text);

        // Detect refusal (model said it can't help)
        $decoded = json_decode(trim($text), true);
        if (isset($decoded['error'])) {
            return response()->json(['error' => $decoded['error']], 422);
        }

        return response()->json(['html' => trim($text)]);
    }
}
