#!/usr/bin/env python3
"""PMD_PAYMOB_OMAN_FRONTEND_PATCH_R11

Deterministically wires the existing V2 hosted-provider abstraction to Paymob
without rewriting the large shared runtime files from a stale branch snapshot.
Safe to run repeatedly.
"""
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
BASE = ROOT / "frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
CLIENT = BASE / "src/lib/client-api.ts"
RETURN = BASE / "app/payment/return/PaymentReturnClient.tsx"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"STOP: frontend patch anchor missing: {label}")
    return text.replace(old, new, 1)


client = CLIENT.read_text()

client = replace_once(
    client,
    "import type { CartLine, TableContext, TableOrderState, TableOrdersState } from '@/src/domain/model'\n",
    "import type { CartLine, TableContext, TableOrderState, TableOrdersState } from '@/src/domain/model'\n"
    "import { requestPaymobCustomerPhone } from './paymob-oman-client'\n",
    "Paymob phone helper import",
)

client = replace_once(
    client,
    "    'worldline',\n    'sumup',",
    "    'paymob',\n    'worldline',\n    'sumup',",
    "pending provider candidate",
)

client = replace_once(
    client,
    "  if (normalized === 'worldline') {\n"
    "    endpoint = '/api/v1/payments/worldline/checkout-status'",
    "  // PMD_PAYMOB_OMAN_VERIFY_R11\n"
    "  if (normalized === 'paymob') {\n"
    "    endpoint = '/api/v1/payments/paymob/checkout-status'\n"
    "    payload = { attempt_reference: String(pending.providerReference || query.get('provider_reference') || '') }\n"
    "  } else if (normalized === 'worldline') {\n"
    "    endpoint = '/api/v1/payments/worldline/checkout-status'",
    "Paymob status verification",
)

client = replace_once(
    client,
    "  if (['worldline', 'sumup', 'square', 'vr_payment', 'wero'].includes(provider)) return provider",
    "  if (['paymob', 'worldline', 'sumup', 'square', 'vr_payment', 'wero'].includes(provider)) return provider",
    "Paymob provider return code",
)

client = replace_once(
    client,
    "  const provider = normalizeProviderCode(method, providerCode)\n"
    "  if (provider === 'vr_payment' || provider === 'vrpayment') {",
    "  const provider = normalizeProviderCode(method, providerCode)\n"
    "  if (provider === 'paymob') return '/api/v1/payments/paymob/create-intention'\n"
    "  if (provider === 'vr_payment' || provider === 'vrpayment') {",
    "Paymob hosted checkout endpoint",
)

client = replace_once(
    client,
    "  const cancelUrl = window.location.href\n\n"
    "  // QR table orders use the canonical pay-existing settlement endpoint after the",
    "  const cancelUrl = window.location.href\n"
    "  // PMD_PAYMOB_OMAN_PHONE_R11: Paymob requires a real customer phone.\n"
    "  // The helper keeps it only in this tab and opens a compact dialog when missing.\n"
    "  const paymobCustomerPhone = requestedProvider === 'paymob'\n"
    "    ? await requestPaymobCustomerPhone()\n"
    "    : ''\n\n"
    "  // QR table orders use the canonical pay-existing settlement endpoint after the",
    "Paymob customer phone acquisition",
)

client = replace_once(
    client,
    "    customer_email: String(input.customerEmail || ''),\n"
    "    merchant_reference: merchantReference,",
    "    customer_email: String(input.customerEmail || ''),\n"
    "    customer_phone: paymobCustomerPhone || undefined,\n"
    "    merchant_reference: merchantReference,",
    "Paymob customer phone payload",
)

client = replace_once(
    client,
    "    payment_intent_token: input.paymentIntentToken || null,\n"
    "    items: input.items || [],",
    "    payment_intent_token: input.paymentIntentToken || null,\n"
    "    // Paymob callbacks settle multi-order payments server-side; existing providers ignore this extra field.\n"
    "    order_allocations: groupedAllocations.length ? groupedAllocations : undefined,\n"
    "    items: input.items || [],",
    "multi-order allocation payload",
)

if "PMD_PAYMOB_OMAN_VERIFY_R11" not in client or "requestPaymobCustomerPhone" not in client:
    raise SystemExit("STOP: Paymob client markers missing after patch")
CLIENT.write_text(client)

ret = RETURN.read_text()
ret = replace_once(
    ret,
    "          // PMD_MULTI_ORDER_PAYMENT_R32\n"
    "          const groupedAllocations = (pending.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)",
    "          // PMD_PAYMOB_OMAN_BACKEND_SETTLEMENT_RETURN_R11\n"
    "          // Paymob's verified callback/inquiry has already called the canonical\n"
    "          // server settlement authority. Never ask the browser to settle it again.\n"
    "          if (verification.raw?.settled_by_backend === true) {\n"
    "            clearPendingProviderPayment(provider)\n"
    "            setState('paid')\n"
    "            const count = (pending.orderAllocations || []).filter((entry) => entry.orderId > 0).length\n"
    "            setMessage(count > 1\n"
    "              ? `Payment confirmed. ${count} selected table orders were settled securely.`\n"
    "              : pending.paymentIntentToken\n"
    "                ? 'Payment confirmed. Your split payment was recorded securely.'\n"
    "                : 'Payment confirmed. PayMyDine has updated the order securely.')\n"
    "            return\n"
    "          }\n\n"
    "          // PMD_MULTI_ORDER_PAYMENT_R32\n"
    "          const groupedAllocations = (pending.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)",
    "Paymob backend-settled return handling",
)

if "PMD_PAYMOB_OMAN_BACKEND_SETTLEMENT_RETURN_R11" not in ret:
    raise SystemExit("STOP: Paymob return marker missing after patch")
RETURN.write_text(ret)

print("PMD Paymob Oman V2 frontend R11 patch: OK")
