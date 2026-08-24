#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit("usage: patch-pmd-vr-payment-doc-contract-r1.py <VrPaymentApiClient.php> <VRPaymentGatewayService.php>")
client_path = Path(sys.argv[1]).resolve()
service_path = Path(sys.argv[2]).resolve()
client = client_path.read_text(encoding='utf-8')
service = service_path.read_text(encoding='utf-8')

if 'PMD_VR_PAYMENT_DOC_CONTRACT_R1' not in client:
    old = """    public function readTransaction(int $transactionId): array\n    {\n        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId);\n    }\n\n    public function paymentPageUrl(int $transactionId): array"""
    new = """    public function readTransaction(int $transactionId): array\n    {\n        return $this->request('GET', '/api/v2.0/payment/transactions/'.$transactionId);\n    }\n\n    // PMD_VR_PAYMENT_DOC_CONTRACT_R1\n    public function updateTransaction(int $transactionId, array $payload): array\n    {\n        return $this->request('PATCH', '/api/v2.0/payment/transactions/'.$transactionId, [], $payload);\n    }\n\n    public function paymentPageUrl(int $transactionId): array"""
    if old not in client:
        raise SystemExit('ERROR: client readTransaction anchor missing')
    client = client.replace(old, new, 1)

    old2 = """        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [\n            'limit' => 100,\n            'order' => 'id ASC',\n        ]);"""
    new2 = """        return $this->request('GET', '/api/v2.0/payment/method-configurations/search', [\n            'limit' => 100,\n            'order' => 'id ASC',\n            'expand' => 'paymentMethod',\n        ]);"""
    if old2 not in client:
        raise SystemExit('ERROR: payment method search anchor missing')
    client = client.replace(old2, new2, 1)
    client_path.write_text(client, encoding='utf-8')

if 'PMD_VR_PAYMENT_TRANSACTION_METHOD_GATE_R1' not in service:
    old = """        $allowedIds = [];\n        foreach ((array)($audit['payment_methods'] ?? []) as $row) {\n            if (($row['pmd_method_code'] ?? null) === $method && !empty($row['id']) && ($row['active'] ?? true)) {\n                $allowedIds[] = (int)$row['id'];\n            }\n        }\n        $allowedIds = array_values(array_unique(array_filter($allowedIds)));\n\n        $transactionPayload = ["""
    new = """        // PMD_VR_PAYMENT_TRANSACTION_METHOD_GATE_R1\n        // The tenant-level catalogue is only a preflight. The authoritative\n        // method gate is fetched for the concrete transaction below, because\n        // VR Payment can apply transaction-specific connector conditions.\n        $transactionPayload = ["""
    if old not in service:
        raise SystemExit('ERROR: service pre-create method gate anchor missing')
    service = service.replace(old, new, 1)
    service = service.replace("        if ($allowedIds) $transactionPayload['allowedPaymentMethodConfigurations'] = $allowedIds;\n", "", 1)

    old3 = """        $transaction = (array)$created['data'];\n        $transactionId = (int)($transaction['id'] ?? 0);\n        if ($transactionId <= 0) {\n            return $this->businessError('vr_payment_transaction_create_failed', 'VR Payment did not return a transaction ID.');\n        }\n\n        $page = $client->paymentPageUrl($transactionId);"""
    new3 = """        $transaction = (array)$created['data'];\n        $transactionId = (int)($transaction['id'] ?? 0);\n        if ($transactionId <= 0) {\n            return $this->businessError('vr_payment_transaction_create_failed', 'VR Payment did not return a transaction ID.');\n        }\n\n        $possible = $client->availablePaymentMethodConfigurations($transactionId, 'payment_page');\n        if (!($possible['ok'] ?? false)) {\n            return $this->businessError(\n                'vr_payment_method_discovery_failed',\n                $possible['message'] ?? 'VR Payment could not list payment methods for this transaction.',\n                ['provider_http_status' => $possible['status'] ?? null, 'transaction_id' => $transactionId]\n            );\n        }\n        $possibleRows = $client->normalizeMethodConfigurations((array)($possible['data'] ?? []));\n        $allowedIds = [];\n        foreach ($possibleRows as $row) {\n            if (($row['pmd_method_code'] ?? null) === $method && !empty($row['id']) && ($row['active'] ?? true)) {\n                $allowedIds[] = (int)$row['id'];\n            }\n        }\n        $allowedIds = array_values(array_unique(array_filter($allowedIds)));\n        if (!$allowedIds) {\n            return $this->businessError(\n                'vr_payment_method_not_available_for_transaction',\n                strtoupper(str_replace('_', ' ', $method)).' is not available for this VR Payment transaction.',\n                ['transaction_id' => $transactionId]\n            );\n        }\n\n        $version = (int)($transaction['version'] ?? 0);\n        $updatePayload = [\n            'id' => $transactionId,\n            'version' => $version,\n            'allowedPaymentMethodConfigurations' => array_map(\n                static fn (int $id): array => ['id' => $id],\n                $allowedIds\n            ),\n        ];\n        $updated = $client->updateTransaction($transactionId, $updatePayload);\n        if (!($updated['ok'] ?? false)) {\n            return $this->businessError(\n                'vr_payment_method_restriction_failed',\n                $updated['message'] ?? 'VR Payment could not restrict the transaction to the selected payment method.',\n                ['provider_http_status' => $updated['status'] ?? null, 'transaction_id' => $transactionId]\n            );\n        }\n        if (is_array($updated['data'] ?? null)) $transaction = (array)$updated['data'];\n\n        $page = $client->paymentPageUrl($transactionId);"""
    if old3 not in service:
        raise SystemExit('ERROR: service post-create anchor missing')
    service = service.replace(old3, new3, 1)
    service_path.write_text(service, encoding='utf-8')

print('PMD_VR_PAYMENT_DOC_CONTRACT_R1=OK')
