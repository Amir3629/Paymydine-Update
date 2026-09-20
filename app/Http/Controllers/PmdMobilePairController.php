<?php

namespace App\Http\Controllers;

use App\Services\PmdMobileSync\PmdMobilePairingService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class PmdMobilePairController extends Controller
{
    public function start(Request $request, PmdMobilePairingService $pairing)
    {
        try {
            return redirect()->to($pairing->start($request));
        } catch (\Throwable $error) {
            report($error);

            return response(
                $this->messagePage(
                    'PayMyDine pairing could not start',
                    $error->getMessage()
                ),
                409,
                ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store']
            );
        }
    }

    public function finish(Request $request, PmdMobilePairingService $pairing)
    {
        try {
            $deepLink = $pairing->finish($request);
            $safe = htmlspecialchars($deepLink, ENT_QUOTES, 'UTF-8');

            return response(
                '<!doctype html><html><head><meta charset="utf-8">'
                .'<meta name="viewport" content="width=device-width,initial-scale=1">'
                .'<meta http-equiv="refresh" content="0;url='.$safe.'">'
                .'<title>Open PayMyDine</title></head>'
                .'<body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto">'
                .'<h1>Android device approved</h1>'
                .'<p>Return to the PayMyDine app to finish secure pairing.</p>'
                .'<p><a href="'.$safe.'">Open PayMyDine</a></p>'
                .'</body></html>',
                200,
                ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store']
            );
        } catch (\Throwable $error) {
            report($error);

            return response(
                $this->messagePage('PayMyDine pairing expired', $error->getMessage()),
                410,
                ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store']
            );
        }
    }

    public function exchange(Request $request, PmdMobilePairingService $pairing)
    {
        $data = $request->validate([
            'exchange' => ['required', 'string', 'size:64'],
        ]);

        return response()->json(
            $pairing->exchange($request, (string)$data['exchange']),
            200,
            ['Cache-Control' => 'no-store, private']
        );
    }

    private function messagePage(string $title, string $message): string
    {
        return '<!doctype html><html><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</title></head>'
            .'<body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto">'
            .'<h1>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</h1>'
            .'<p>'.htmlspecialchars($message, ENT_QUOTES, 'UTF-8').'</p>'
            .'</body></html>';
    }
}
