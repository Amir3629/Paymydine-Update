# PayMyDine VR Payment Setup Guide — 2026-08-26

## Current Moon truth

Tenant: `moon.paymydine.com`

- VR Payment Space: `95339`
- Application User: `177947`
- API connection: connected
- Discovered payment methods: `wero`, `card`
- Discovered terminals: `0`
- Card: provider `vr_payment`, enabled
- Wero: provider `vr_payment`, enabled
- Apple Pay: provider `vr_payment`, disabled because the Space does not currently expose it
- Google Pay: provider `vr_payment`, disabled because the Space does not currently expose it

PayMyDine must not fake-enable a wallet or terminal that VR Payment does not expose for the current Space.

## Card / Wero Lightbox status

Frontend V2 sends `integration_preference=lightbox` for VR Payment Card and Wero.

R1.4 added the VR Lightbox API/client integration, but the Laravel `create-session` route rebuilt a new service payload and did not forward `integration_preference` into `VRPaymentGatewayService::createRedirectSession()`.

R1.4.1 added the field to route validation, but that alone was not sufficient because the validated field was still omitted from the array passed to the service. R1.4.1 also made transaction-scoped method matching too strict by requiring a normalized method code even when VR Payment may return a transaction-scoped configuration without expanded payment-method naming.

R1.4.2 fixes both issues:

1. Frontend V2 asks for `lightbox`.
2. The Laravel route validates and explicitly forwards `integration_preference` to the VR service.
3. Backend creates the VR transaction with the selected method's tenant-scoped configuration IDs.
4. Backend asks VR Payment for transaction-scoped payment-method configurations with `integrationMode=lightbox`.
5. When VR returns a configuration whose ID belongs to the selected method allow-list, PMD accepts it even if the transaction-scoped response omits an expanded method name.
6. Backend returns the VR Lightbox JavaScript URL + the selected configuration ID.
7. Frontend loads the VR JavaScript and calls `LightboxCheckoutHandler.startPayment(...)`.
8. If VR Payment does not expose a usable Lightbox configuration/script for that transaction, PMD deliberately falls back to the hosted Payment Page.
9. Payment completion is still verified by backend/provider status before settlement.

R1.4.2 also adds stage-specific diagnostics for HTTP 422 failures. After a browser test, inspect:

```bash
grep -E 'VR_PAYMENT_CREATE_SESSION_(REQUEST|VALIDATION_FAILED|SERVICE_FAILED)_R1_4_2|VR_PAYMENT_LIGHTBOX_(READY|FALLBACK)' /var/www/paymydine/storage/logs/laravel.log | tail -50
```

Interpretation:

- `VR_PAYMENT_CREATE_SESSION_REQUEST_R1_4_2`: route accepted the request and shows which integration mode was forwarded.
- `VR_PAYMENT_CREATE_SESSION_VALIDATION_FAILED_R1_4_2`: the request was rejected before the VR service; the log contains the exact validation field(s).
- `VR_PAYMENT_CREATE_SESSION_SERVICE_FAILED_R1_4_2`: the request reached the VR service but transaction/provider handling failed.
- `VR_PAYMENT_LIGHTBOX_READY`: PMD received a usable VR Lightbox configuration and JavaScript URL.
- `VR_PAYMENT_LIGHTBOX_FALLBACK`: VR did not expose a usable Lightbox configuration/script, so hosted Payment Page fallback was used intentionally.

Official Lightbox documentation:

- https://gateway.vr-payment.de/de-de/doc/payment/lightbox
- https://gateway.vr-payment.de/de-de/doc/payment/integration-mode

## VR Payment terminal test/setup

PayMyDine currently reports `terminal_count=0`. There is therefore no terminal device that PMD can legitimately trigger yet.

### Portal setup

1. Open VR Payment and enter Space `95339`.
2. On the Space dashboard, use **Configure your terminals / Konfigurieren Sie Ihre Terminals**.
3. Select the in-store payment methods you want for the terminal.
4. Create the terminal configuration (receipt/QR, tips, etc.).
5. Create/select the terminal location and save it.
6. For production hardware, complete the required terminal/acquirer contracts.
7. Open **Space > Payment > Terminals** and verify that a terminal exists.
8. For a physical PAX A920Pro, VR Payment shows an activation code in the terminal details once the account/contracts are eligible; enter that code on the terminal to link it.
9. Re-run **Test saved connection** in PayMyDine. PMD must report `terminal_count >= 1` before a real terminal test is offered.

Official guides:

- https://service.vr-payment.de/hc/de/articles/27299311888402-Wie-konfiguriere-ich-meine-Terminals-im-Portal
- https://service.vr-payment.de/hc/de/articles/27287841421842-Wie-aktiviere-ich-das-Terminal
- https://service.vr-payment.de/hc/de/articles/27287830700178-Was-ist-eine-Terminal-ID-und-wo-finde-ich-sie
- https://gateway.vr-payment.de/fr-fr/doc/payment/terminal
- https://gateway.vr-payment.de/de-de/doc/api/web-service

### Important test-mode limitation

VR Payment supports account/gateway test mode, but PMD will not invent a virtual terminal. A terminal test requires a terminal object/device that VR Payment actually exposes to Space `95339`. If the VR portal has no terminal to provision in the test Space, request a test terminal/simulator or test-device provisioning from VR Payment support. The API supports terminal objects and device linking, but creating a database/API terminal object is not the same thing as having an actual linked payment device capable of completing a terminal transaction.

## Apple Pay setup

Current status is disabled because Space `95339` only exposes `wero` and `card`.

For VR Payment Apple Pay Web:

1. Ensure the customer-facing domain is HTTPS.
2. Obtain/use the VR Payment Apple Pay domain verification file/process.
3. Register the exact domain in VR Payment under the Apple Pay Web Merchant Registration area.
4. Activate/configure the Apple Pay payment method/connector for the Space/merchant.
5. Re-run PMD **Test saved connection**.
6. PMD will only enable Apple Pay after the VR API actually returns `apple_pay` in the Space payment-method configurations.

PMD already has a tenant-aware well-known route:

`https://<tenant-domain>/.well-known/apple-developer-merchantid-domain-association`

The current Frontend V2 implementation reads the tenant-specific file from:

`/var/www/paymydine/storage/app/pmd-wallets/apple-pay/<tenant-domain>.bin`

For Moon this is:

`/var/www/paymydine/storage/app/pmd-wallets/apple-pay/moon.paymydine.com.bin`

Production verification check:

```bash
curl -i https://moon.paymydine.com/.well-known/apple-developer-merchantid-domain-association
```

Official VR Payment Apple Pay guide:

- https://service.vr-payment.de/hc/de/articles/27330096853522-Apple-Pay-mit-VR-Payment-Zertifikat-einrichten

VR Payment states that in its test system the domain can be registered without placing the verification file, while production requires the proper domain-verification setup.

## Google Pay setup

Current status is disabled because Space `95339` does not expose `google_pay`.

For Google Pay production:

1. Configure the Google Pay payment method/connector in VR Payment.
2. Create/configure the website in Google Pay Business Console.
3. Select **Gateway** as the integration type.
4. Supply the required screenshots of the buyflow to Google.
5. Request and receive Google Pay production access.
6. Configure the approved Google Pay Merchant ID as required by the VR Payment widget/connector.
7. Re-run PMD **Test saved connection**.
8. PMD enables Google Pay only when VR Payment exposes `google_pay` for the Space.

Official guide:

- https://service.vr-payment.de/hc/de/articles/13595514880914-Google-Pay-Registration-Walkthrough

## What not to do

- Do not manually set Apple Pay or Google Pay `status=1` while VR Payment does not expose them.
- Do not map Click to Pay to Apple Pay or Google Pay.
- Do not create fake terminal success responses.
- Do not mark an order paid from the browser. Provider/backend verification remains authoritative.
- Do not replace the new Frontend V2 authority with an older branch copy; deployment patches the live authority in place.
