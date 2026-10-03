<?php

namespace Admin\Services\Fiskaly;

class FiskalyReceiptPresenter
{
    public function presentForOrder($order): array
    {
        if (!$order) {
            return ['enabled' => false];
        }

        $status = (string)($order->fiskaly_status ?? '');
        $qr = (string)($order->fiskaly_qr_code_data ?? '');
        $txNumber = (string)($order->fiskaly_tx_number ?? '');
        $sigCounter = (string)($order->fiskaly_signature_counter ?? '');
        $serial = (string)($order->fiskaly_serial_number ?? '');
        $txRef = (string)($order->fiskaly_transaction_id_ref ?? '');

        if ($status === '' && $qr === '' && $txNumber === '' && $sigCounter === '' && $serial === '' && $txRef === '') {
            return ['enabled' => false];
        }

        $lines = [];

        if ($status !== '') {
            $lines[] = ['label' => 'Fiskaly Status', 'value' => $status];
        }

        if ($txRef !== '') {
            $lines[] = ['label' => 'Transaction Ref', 'value' => $txRef];
        }

        if ($txNumber !== '') {
            $lines[] = ['label' => 'TSE Transaction No.', 'value' => $txNumber];
        }

        if ($sigCounter !== '') {
            $lines[] = ['label' => 'Signature Counter', 'value' => $sigCounter];
        }

        if ($serial !== '') {
            $lines[] = ['label' => 'Serial Number', 'value' => $serial];
        }

        $qrSrc = null;
        if ($qr !== '') {
            $qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . rawurlencode($qr);
            $lines[] = ['label' => 'QR Payload', 'value' => $qr];
        }

        return [
            'enabled' => true,
            'intro' => 'TSE/Fiskaly data loaded directly from the order record.',
            'qr_src' => $qrSrc,
            'lines' => $lines,
        ];
    }
}
