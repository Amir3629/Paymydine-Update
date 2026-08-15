# PayMyDine Frontend V2 — Integrated QR Menu Release

این بسته Frontend جدید و مستقل PayMyDine برای **منوی داخل رستوران با QR میز** است. مشتری QR میز را اسکن می‌کند، غذا انتخاب می‌کند، آیتم‌های خودش را تأیید می‌کند، Table Order مشترک را می‌بیند، سفارش را به آشپزخانه می‌فرستد و سپس در همان flow پرداخت یا Split Bill انجام می‌دهد.

## Product contract نهایی

Frontend V2 عمداً این actionها را در منوی مشتری **نمایش نمی‌دهد**:

- تماس تلفنی / Call to Order
- Table Note / Leave a Note

شماره تلفن می‌تواند همچنان به‌عنوان داده‌ی restaurant در Backend باقی بماند، اما در QR Menu render نمی‌شود. endpoint قدیمی Table Note نیز برای backward compatibility Backend حذف نشده، ولی V2 هیچ UI یا requestی برای آن ندارد.

Actionهای customer menu عبارت‌اند از:

- Language
- Table identity
- Social links در صورت فعال بودن از Admin
- Waiter Call
- Valet در صورت فعال بودن از Admin
- Menu / Categories / Search / Item details / Options
- Allergens, vegan, vegetarian, halal, nutrition
- Personal Cart
- Shared Table Order بین چند موبایل
- Send to Kitchen / Order Status / preparation state
- Continue Ordering و سفارش بعدی روی order باز و unpaid
- VAT / Tip / Coupon
- Full Payment / Split Bill
- sync شدن settlement بین دستگاه‌ها

## 10 Theme مستقل

1. `noir_editorial`
2. `verdant_modern`
3. `lumiere_fine_dining`
4. `kazen_japanese`
5. `azzurra_coastal`
6. `neon_cocktail_bar`
7. `art_deco_speakeasy`
8. `shahrazad_persian`
9. `anatolia_turkish`
10. `ember_steakhouse`

هر Theme TSX و CSS Module خودش را دارد. Theme دیگری را import نمی‌کند. هیچ iframe، `postMessage` theme bridge، styling `MutationObserver` یا runtime `style.setProperty` وجود ندارد.

## اتصال Backend و Admin

V2 از endpoint جدید زیر برای Theme استفاده می‌کند:

```text
GET /api/v2/frontend-theme
```

این route در `integration/laravel/pmd-frontend-v2-theme.php` قرار دارد و تمام 10 Theme را پشتیبانی می‌کند. اگر bridge هنوز نصب نشده باشد، V2 موقتاً از `/simple-theme` قدیمی fallback می‌گیرد.

فایل `integration/admin/frontend-theme-fields-v2.php` selector هر 10 Theme و feature flagهای V2 را به Admin اضافه می‌کند. Installer امن و backup-aware:

```text
integration/laravel/install-v2-theme-bridge.sh
```

Legacy `/simple-theme` تغییر داده نمی‌شود؛ بنابراین Frontend فعلی روی port 3001 تا زمان cutover می‌تواند کار کند.

## Backend endpoints اصلی

- `/api/v1/settings`
- `/api/v1/restaurant`
- `/api/v1/menu`
- `/api/v2/frontend-theme` با fallback به `/simple-theme`
- `/api/v1/table-info`
- `/api/v1/table-order-draft`
- `/api/v1/payments`
- `/api/v1/vat-settings` / `/vat-settings`
- `/api/v1/tip-settings` در صورت وجود
- `/api/v1/table-order-draft/confirm-items`
- `/api/v1/table-order-draft/submit`
- `/api/v1/waiter-call`
- `/api/v1/valet-request`
- `/validate-coupon`
- payment/session/return routes مستند در `docs/BACKEND_CONTRACT.md`

## نصب امن dependencyها

این source release عمداً lockfile قدیمی pre-security-fix را حمل نمی‌کند. `package.json` dependencyهای root را exact pin کرده و Next روی `16.3.1` است. در سیستم دارای دسترسی npm registry اجرا کن:

```bash
cp .env.example .env.local
npm run secure:install
npm run release:audit
npm run build
```

`secure:install` یک `package-lock.json` تازه می‌سازد، `npm audit fix` را **بدون `--force`** اجرا می‌کند و `npm audit --omit=dev` را پاس می‌کند.

## Environment staging

برای Mimoza staging:

```dotenv
PMD_BACKEND_ORIGIN=auto
PMD_PUBLIC_HOST=mimoza.paymydine.com
PMD_TENANT_HOST_OVERRIDE=mimoza.paymydine.com
PMD_TRUST_TENANT_OVERRIDE_HEADER=false
PMD_ALLOW_MOCK_FALLBACK=false
PMD_ENABLE_THEME_PREVIEW=true
PMD_DEMO_MODE=0
PORT=3002
```

`PMD_BACKEND_ORIGIN=auto` باعث می‌شود backend از tenant host resolve شود و V2 به `127.0.0.1:8000` فرضی وابسته نباشد.

## Preview

```text
/preview
/preview/noir_editorial
/preview/verdant_modern
/preview/lumiere_fine_dining
/preview/kazen_japanese
/preview/azzurra_coastal
/preview/neon_cocktail_bar
/preview/art_deco_speakeasy
/preview/shahrazad_persian
/preview/anatolia_turkish
/preview/ember_steakhouse
```

Preview از fixture داخلی استفاده می‌کند و actionهای production را ارسال نمی‌کند. Product واقعی باید روی `/` یا URL واقعی `/table/...` با QR معتبر ارزیابی شود.

## Safety

- Port 3001 در این release overwrite نمی‌شود.
- Installer V2 legacy `/simple-theme` را تغییر نمی‌دهد.
- Database migration ندارد.
- Nginx production را تغییر نمی‌دهد.
- ابتدا 3002، سپس real QR/multi-device/payment QA، و فقط بعد cutover.

اسناد اصلی: `docs/ARCHITECTURE.md`, `docs/BACKEND_CONTRACT.md`, `docs/ADMIN_THEME_CONFIGURATION.md`, `docs/QA_MATRIX.md`, `docs/DEPLOYMENT.md`.
