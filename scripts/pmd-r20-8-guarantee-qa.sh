#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

PHP_FILES=(
  app/Http/Controllers/PmdPublicBookingController.php
  app/Services/Payments/VrPaymentApiClient.php
  app/Services/Payments/WorldlineConnectRuntimeService.php
  app/Services/Reservations/PmdReservationGuaranteeGateway.php
  app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
  app/Services/Reservations/PmdReservationGuaranteeService.php
  app/admin/controllers/Pmdfinance.php
  app/admin/database/migrations/2026_10_06_170000_add_guarantee_payment_method_to_tenants.php
  app/main/routes/next-proxy.php
  app/main/routes/pmd-public-booking-v1.php
  scripts/pmd-reservation-guarantee-schema-check-r20-6.php
)

echo
echo "========================================"
echo "PayMyDine R20.8 guarantee QA"
echo "========================================"

for file in "${PHP_FILES[@]}"; do
  test -f "$file"
  php -l "$file"
done

node --check public/assets/pmd/public-booking-v1.js

grep -Fq "Reservation guarantee" resources/views/pmd/public-booking.blade.php
grep -Fq "Reservierungsgarantie" resources/views/pmd/public-booking.blade.php
grep -Fq "pmd-booking-guarantee-methods" resources/views/pmd/public-booking.blade.php
grep -Fq "apple_pay" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "google_pay" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "'paypal'" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "'sumup'" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "'vr_payment'" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "'worldline'" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php

if grep -Fq "'square' =>" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php; then
  echo "ERROR: Square must not be present in the reservation-guarantee registry."
  exit 1
fi

grep -Fq "SETUP_RECURRING_PAYMENT" app/Services/Reservations/PmdReservationGuaranteeGateway.php
grep -Fq "/v3/vault/setup-tokens" app/Services/Reservations/PmdReservationGuaranteeGateway.php
grep -Fq "processWithToken" app/Services/Reservations/PmdReservationGuaranteeGateway.php
grep -Fq "unscheduledCardOnFileSequenceIndicator" app/Services/Payments/WorldlineConnectRuntimeService.php
grep -Fq "initialSchemeTransactionId" app/Services/Payments/WorldlineConnectRuntimeService.php
grep -Fq "stripeWalletElements.submit" public/assets/pmd/public-booking-v1.js
grep -Fq "providerForMethod" app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
grep -Fq "pmd_requested_method" app/Services/Reservations/PmdReservationGuaranteeService.php
grep -Fq "does not match the selected guarantee method" app/Services/Reservations/PmdReservationGuaranteeService.php
grep -Fq "ensureStripePaymentMethodDomain" app/Services/Reservations/PmdReservationGuaranteeService.php
grep -Fq "payment_method_domains" app/Services/Reservations/PmdReservationGuaranteeService.php
grep -Fq "pmd-booking-guarantee__methods" public/assets/pmd/public-booking-v1.css

echo
echo "PASS: R20.8 PHP, JavaScript and provider-routing markers are valid."
echo "========================================"
