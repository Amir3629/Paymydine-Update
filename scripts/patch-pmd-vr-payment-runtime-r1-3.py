#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER_CLIENT = "PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3"
MARKER_SERVICE = "PMD_VR_METHOD_STATUS_SYNC_R1_3"
MARKER_PAYMENTS = "PMD_VR_METHOD_RUNTIME_ENABLEMENT_R1_3"


def fail(msg: str) -> None:
    raise SystemExit("ERROR: " + msg)


def patch_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_CLIENT not in text:
        old = "            'Accept' => 'application/json',\n"
        new = "            'Accept' => str_ends_with($path, '/payment-page-url') ? '*/*' : 'application/json', // PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3\n"
        if old not in text:
            fail("VrPaymentApiClient Accept header anchor not found")
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_SERVICE not in text:
        anchor = "        $sync = $this->syncTerminalDevices($audit['terminals'] ?? [], $config);\n"
        if anchor not in text:
            fail("VRPaymentGatewayService probe sync anchor not found")
        text = text.replace(
            anchor,
            anchor + "        $methodSync = $this->syncAssignedMethodStatuses((array)($audit['available_method_codes'] ?? [])); // PMD_VR_METHOD_STATUS_SYNC_R1_3\n",
            1,
        )

        response_anchor = "            'terminal_sync' => $sync,\n"
        if response_anchor in text:
            text = text.replace(response_anchor, response_anchor + "            'method_sync' => $methodSync,\n", 1)

        method_anchor = "    public function syncTerminalDevices(?array $terminals = null, ?array $config = null): array\n"
        if method_anchor not in text:
            fail("VRPaymentGatewayService syncTerminalDevices anchor not found")

        method = r'''    public function syncAssignedMethodStatuses(array $availableMethodCodes): array
    {
        $ready = array_values(array_unique(array_filter(array_map(
            static fn ($code): string => strtolower(trim((string)$code)),
            $availableMethodCodes
        ))));
        $updated = [];

        foreach (Payments_model::query()->whereIn('code', self::SUPPORTED_METHODS)->get() as $row) {
            $data = method_exists($row, 'getConfigData') ? (array)$row->getConfigData() : (is_array($row->data) ? (array)$row->data : []);
            $assigned = strtolower(trim((string)($row->provider_code ?? $data['provider_code'] ?? '')));
            if ($assigned !== 'vr_payment') continue;

            $code = strtolower(trim((string)$row->code));
            $desired = in_array($code, $ready, true) ? 1 : 0;
            if ((int)$row->status !== $desired) {
                $row->status = $desired;
                $row->save();
            }
            $updated[$code] = $desired;
        }

        return [
            'ok' => true,
            'provider' => 'vr_payment',
            'ready_codes' => $ready,
            'method_statuses' => $updated,
        ];
    }

'''
        text = text.replace(method_anchor, method + method_anchor, 1)

    path.write_text(text, encoding="utf-8")


def patch_payments(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER_PAYMENTS in text:
        path.write_text(text, encoding="utf-8")
        return

    runtime_block = r'''            // PMD_VR_METHOD_RUNTIME_ENABLEMENT_R1_3
            // Provider assignment is the enablement authority. VR Payment has
            // one extra gate: the method must be discovered as active in the
            // merchant Space before it is offered to guests.
            if (!in_array((string)$model->code, ['cod', 'cash'], true)) {
                if ($providerCode === null) {
                    $model->status = 0;
                    $model->is_default = 0;
                } elseif ($providerCode === 'vr_payment') {
                    try {
                        $model->status = (new \Admin\Classes\VRPaymentGatewayService())
                            ->isMethodReady((string)$model->code) ? 1 : 0;
                    } catch (\Throwable $error) {
                        \Log::warning('PMD_VR_METHOD_RUNTIME_ENABLEMENT_FAILED', [
                            'method' => (string)$model->code,
                            'message' => $error->getMessage(),
                        ]);
                        $model->status = 0;
                    }
                    if (!$model->status) $model->is_default = 0;
                } else {
                    $model->status = 1;
                }
            }
'''

    legacy_block = r'''            // PMD_METHOD_PROVIDER_IS_ENABLEMENT_R1
            // The compact owner editor has only Name + Provider. For provider-
            // backed methods, choosing a provider offers the method; choosing
            // Not offered disables it. Cash methods keep their own status.
            if (!in_array((string)$model->code, ['cod', 'cash'], true)) {
                $model->status = $providerCode ? 1 : 0;
                if (!$providerCode) {
                    $model->is_default = 0;
                }
            }
'''

    if legacy_block in text:
        text = text.replace(legacy_block, runtime_block, 1)
    else:
        anchor = "            $model->provider_code = $providerCode;\n"
        if anchor not in text:
            fail("Payments.php provider assignment anchor not found")
        text = text.replace(anchor, anchor + runtime_block, 1)

    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 4:
        fail("usage: patch-pmd-vr-payment-runtime-r1-3.py <VrPaymentApiClient.php> <VRPaymentGatewayService.php> <Payments.php>")

    client = Path(sys.argv[1]).resolve()
    service = Path(sys.argv[2]).resolve()
    payments = Path(sys.argv[3]).resolve()
    for p in (client, service, payments):
        if not p.is_file():
            fail(f"target not found: {p}")

    patch_client(client)
    patch_service(service)
    patch_payments(payments)

    for marker, p in ((MARKER_CLIENT, client), (MARKER_SERVICE, service), (MARKER_PAYMENTS, payments)):
        if marker not in p.read_text(encoding="utf-8"):
            fail(f"marker missing after patch: {marker}")

    print("PMD_VR_PAYMENT_PAGE_ACCEPT_R1_3=OK")
    print("PMD_VR_METHOD_STATUS_SYNC_R1_3=OK")
    print("PMD_VR_METHOD_RUNTIME_ENABLEMENT_R1_3=OK")


if __name__ == "__main__":
    main()
