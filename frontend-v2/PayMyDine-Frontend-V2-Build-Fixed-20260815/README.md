# PayMyDine Frontend V2 Revolution

این بسته یک Frontend جدید و جدا برای صفحه‌ی عمومی منوی PayMyDine است. هدف آن جایگزینی تدریجی Frontend فعلی روی پورت `3001` است، بدون دست زدن به Admin، Laravel، دیتابیس tenant یا Frontend production تا پایان QA.

## چیزی که داخل این ZIP ساخته شده است

- Next.js customer frontend مستقل برای اجرا روی پورت staging `3002`.
- Theme resolution در Server؛ مرورگر از ابتدا فقط Theme نهایی tenant را دریافت می‌کند.
- ۱۰ Theme مستقل با TSX و CSS Module جداگانه:
  - Noir Editorial
  - Verdant Modern
  - Lumière Fine Dining
  - Kazen Japanese
  - Azzurra Coastal
  - Neon Cocktail Bar
  - Art Deco Speakeasy
  - Shahrazad Persian
  - Anatolia Turkish
  - Ember Steakhouse
- اتصال read-only اولیه به endpointهای فعلی:
  - `/settings`
  - `/simple-theme`
  - `/api/v1/restaurant`
  - `/api/v1/menu`
  - `/api/v1/table-info`
  - `/api/v1/table-order-draft`
  - `/api/v1/payments`
- اتصال actionها به endpointهای فعلی:
  - Confirm personal items
  - Submit table order to kitchen
  - Waiter call
  - Table note
  - Valet request
  - Cash/existing-order payment adapter
  - Provider payment session adapter
- Cart جدا برای هر tenant و table.
- Polling واحد و مشخص برای sync شدن Table Order و پرداخت بین چند دستگاه.
- Category filtering، search، item detail، options، nutrition، allergens، vegan، vegetarian و halal.
- زبان‌های demo شامل English، German، Farsi، Turkish و Japanese؛ ترجمه‌ی item/category از backend نیز در صورت وجود استفاده می‌شود.
- Split Bill UI برای full، equal، by-items و by-shares.
- Footer ثابت `Powered by PayMyDine` در همه‌ی Themeها.
- Preview امن بدون ارسال POST به production backend.
- Audit scriptهایی که iframe، MutationObserver، runtime styling، `!important` و Theme CSS leakage را رد می‌کنند.

## اصول معماری

- هیچ Theme با iframe یا `postMessage` ساخته نشده است.
- هیچ Theme از CSS Theme دیگر import نمی‌کند.
- `app/globals.css` فقط reset عمومی است و هیچ selector مربوط به Theme ندارد.
- هیچ `MutationObserver`، `style.setProperty`, `dangerouslySetInnerHTML` یا styling interval وجود ندارد.
- انتخاب Theme قبل از render و در Server انجام می‌شود؛ بنابراین Gold/Kazen/Theme قبلی برای یک frame نمایش داده نمی‌شود.
- Business state مشترک است، اما composition و CSS هر Theme مستقل است.

## اجرای Preview روی لپ‌تاپ یا VPS staging

```bash
cp .env.example .env.local
npm ci
npm run release:audit
npm run build
npm run dev:3002
```

سپس:

```text
http://localhost:3002/preview/noir_editorial
http://localhost:3002/preview/verdant_modern
http://localhost:3002/preview/lumiere_fine_dining
http://localhost:3002/preview/kazen_japanese
http://localhost:3002/preview/azzurra_coastal
http://localhost:3002/preview/neon_cocktail_bar
http://localhost:3002/preview/art_deco_speakeasy
http://localhost:3002/preview/shahrazad_persian
http://localhost:3002/preview/anatolia_turkish
http://localhost:3002/preview/ember_steakhouse
```

در preview از fixture داخلی استفاده می‌شود و هیچ waiter/note/valet/order/payment request به Laravel production ارسال نمی‌شود. کد تخفیف demo: `DEMO10`.

## اتصال به Mimoza بدون Cutover

`.env.local`:

```dotenv
PMD_BACKEND_ORIGIN=http://127.0.0.1:8000
PMD_PUBLIC_HOST=mimoza.paymydine.com
PMD_ALLOW_MOCK_FALLBACK=false
PMD_ENABLE_THEME_PREVIEW=true
PMD_DEMO_MODE=0
PORT=3002
```

برای تست با میز واقعی:

```text
https://preview-host.example/table/REAL_TABLE_ID?qr=REAL_QR
```

## وضعیت Payment

ساختار Table Order، existing order، totals، coupon/tip، split calculations و adapterهای payment در این بسته وجود دارند. Cash/COD و settlement سفارش موجود به endpoint فعلی متصل‌اند. PayPal create/capture، hosted Card، Wero، Worldline، VR Payment، SumUp و Square session/return adapterها نیز داخل بسته هستند. سفارش‌های `qr_pay_later` بعد از تأیید provider از مسیر canonical `pay-existing` settle می‌شوند. پیش از production cutover، هر provider باید با credential و response واقعی همان tenant روی staging تست شود. هیچ secret داخل Frontend یا bootstrap عمومی قرار نگرفته است.

## چیزی که این ZIP انجام نمی‌دهد

- Frontend فعلی پورت 3001 را overwrite نمی‌کند.
- PM2 یا Nginx را تغییر نمی‌دهد.
- routeهای Laravel فعلی را حذف یا consolidate نمی‌کند.
- database migration اجرا نمی‌کند.
- Theme انتخاب‌شده در Admin را تغییر نمی‌دهد.

Deployment باید ابتدا روی 3002 انجام شود و فقط بعد از QA کامل، upstream Nginx جابه‌جا شود.

## اسناد مهم

- `docs/DEEP_INVESTIGATION_REPORT.md`
- `docs/FINAL_RELEASE_REPORT.md`
- `docs/ARCHITECTURE.md`
- `docs/BACKEND_CONTRACT.md`
- `docs/ADMIN_THEME_CONFIGURATION.md`
- `docs/QA_MATRIX.md`
- `docs/DEPLOYMENT.md`
- `docs/MIGRATION_PLAN.md`
- `docs/LIVE_AUDIT_FINDINGS_2026-08-14.md`
- `docs/design-references/README.md`
