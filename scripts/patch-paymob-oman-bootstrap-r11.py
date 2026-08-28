#!/usr/bin/env python3
"""PMD_PAYMOB_OMAN_BOOTSTRAP_PATCH_R11

Adds the Oman supplemental payment catalogue to the current live V2 bootstrap
without replacing unrelated bootstrap work from another branch/chat.
Idempotent and anchor-guarded.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
path = root / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/server/bootstrap.ts'
text = path.read_text()
marker = 'PMD_PAYMOB_OMAN_BOOTSTRAP_R11'

if marker in text:
    print('Paymob Oman V2 bootstrap R11 patch already present')
    raise SystemExit(0)

old_destructure = "    paymentsPayload,\n    tablePayload,"
new_destructure = "    paymentsPayload,\n    paymobCatalogPayload,\n    tablePayload,"
if old_destructure not in text:
    raise SystemExit('STOP: bootstrap payment destructuring anchor missing')
text = text.replace(old_destructure, new_destructure, 1)

old_fetch = "    fetchBackendJsonOrNull<any>('/api/v1/payments', requestOptions),\n    tableId || tableNo || qr ?"
new_fetch = (
    "    fetchBackendJsonOrNull<any>('/api/v1/payments', requestOptions),\n"
    "    // PMD_PAYMOB_OMAN_BOOTSTRAP_R11\n"
    "    // Supplemental market endpoint keeps Germany's mature resolver untouched.\n"
    "    fetchBackendJsonOrNull<any>('/api/v1/payments/paymob/catalog', requestOptions),\n"
    "    tableId || tableNo || qr ?"
)
if old_fetch not in text:
    raise SystemExit('STOP: bootstrap payments fetch anchor missing')
text = text.replace(old_fetch, new_fetch, 1)

old_payments = "  const paymentMethods = normalizePayments(paymentsPayload)"
new_payments = """  const legacyPaymentMethods = normalizePayments(paymentsPayload)
  const paymobPaymentMethods = paymobCatalogPayload?.active_market
    ? normalizePayments(paymobCatalogPayload?.methods || [])
    : []
  const paymentMethods = Array.from(
    new Map(
      [...legacyPaymentMethods, ...paymobPaymentMethods]
        .map((method) => [`${method.code}:${method.providerCode || 'default'}`, method]),
    ).values(),
  ).sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))"""
if old_payments not in text:
    raise SystemExit('STOP: bootstrap payment normalization anchor missing')
text = text.replace(old_payments, new_payments, 1)

if marker not in text or '/api/v1/payments/paymob/catalog' not in text:
    raise SystemExit('STOP: Paymob bootstrap markers missing after patch')

path.write_text(text)
print('PMD Paymob Oman V2 bootstrap R11 patch: OK')
