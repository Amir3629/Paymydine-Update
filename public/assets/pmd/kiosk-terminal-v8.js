// PMD_KIOSK_BLADE_TERMINAL_V8
// PMD_KIOSK_INSTANT_MENU_V12
// PMD_KIOSK_SMOOTH_SCROLL_V13
// PMD_KIOSK_TERMINAL_ONLY_CHECKOUT_V18
// PMD_KIOSK_SCROLL_CATEGORIES_V18
(function () {
  "use strict";

  var configNode = document.getElementById("pmd-kiosk-config");
  if (!configNode) return;

  var config = {};
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  var app = $("pmd-kiosk-app");
  var loading = $("pmd-kiosk-loading");
  var grid = $("pmd-kiosk-menu-grid");
  var categoryList = $("pmd-kiosk-category-list");
  var orderLines = $("pmd-kiosk-order-lines");
  var searchInput = $("pmd-kiosk-search");
  var searchClear = $("pmd-kiosk-search-clear");
  var languageSelect = $("pmd-kiosk-language");
  var modalLayer = $("pmd-kiosk-modal-layer");
  var modal = $("pmd-kiosk-modal");
  var toast = $("pmd-kiosk-toast");
  var checkoutButton = $("pmd-kiosk-checkout");
  var compactOrder = $("pmd-kiosk-compact-order");
  var clearOrder = $("pmd-kiosk-clear-order");

  var COPY = {
    en: {
      product: "Self-service ordering", orderType: "Order type", eatHere: "Dine in", takeAway: "Take away",
      menu: "Menu", all: "All items", search: "Search menu", items: "items", item: "item",
      add: "Add", customize: "Customize", details: "Tap for details", order: "Your order", empty: "Your order is empty",
      emptyHint: "Choose something from the menu to begin.", clear: "Clear order", subtotal: "Subtotal",
      tax: "Tax", service: "Service charge", total: "Total", reviewPay: "Checkout", checkout: "Checkout", pay: "Pay", terminalPay: "Pay on terminal",
      noResults: "Nothing found", noResultsHint: "Try another category or search.",
      options: "Choose options", required: "Required", optional: "Optional", note: "Item note",
      noteHint: "e.g. no onions, sauce on the side", cancel: "Cancel", addOrder: "Add to order",
      review: "Review order", continueMenu: "Continue ordering", placeOrder: "Place order",
      creating: "Creating order…", payment: "Payment", choosePayment: "Choose how to pay",
      payCounter: "Pay at counter", payCounterHint: "Your order was sent. Please pay at the counter.",
      processing: "Processing payment…", retry: "Check payment again", paid: "Payment complete",
      paidHint: "Your order has been received.", orderNumber: "Order", unavailable: "Menu unavailable",
      reload: "Try again", tip: "Tip", coupon: "Coupon code", apply: "Apply", couponApplied: "Coupon applied",
      paymentPending: "Payment is still processing. Do not pay again.", paymentFailed: "Payment could not be confirmed.",
      noPayments: "No payment methods are enabled for this restaurant.", loading: "Loading menu", wait: "Please wait…"
    },
    de: {
      product: "Selbstbedienung", orderType: "Bestellart", eatHere: "Hier essen", takeAway: "Mitnehmen",
      menu: "Menü", all: "Alle Artikel", search: "Speisekarte durchsuchen", items: "Artikel", item: "Artikel",
      add: "Hinzufügen", customize: "Anpassen", details: "Tippen für Details", order: "Deine Bestellung", empty: "Deine Bestellung ist leer",
      emptyHint: "Wähle etwas aus der Speisekarte.", clear: "Bestellung leeren", subtotal: "Zwischensumme",
      tax: "Steuer", service: "Servicegebühr", total: "Gesamt", reviewPay: "Checkout", checkout: "Checkout", pay: "Bezahlen", terminalPay: "Am Terminal bezahlen",
      noResults: "Nichts gefunden", noResultsHint: "Andere Kategorie oder Suche wählen.",
      options: "Optionen wählen", required: "Erforderlich", optional: "Optional", note: "Hinweis zum Artikel",
      noteHint: "z. B. ohne Zwiebeln, Sauce separat", cancel: "Abbrechen", addOrder: "Zur Bestellung",
      review: "Bestellung prüfen", continueMenu: "Weiter bestellen", placeOrder: "Bestellung aufgeben",
      creating: "Bestellung wird erstellt…", payment: "Zahlung", choosePayment: "Zahlungsart wählen",
      payCounter: "An der Kasse zahlen", payCounterHint: "Bestellung gesendet. Bitte an der Kasse zahlen.",
      processing: "Zahlung wird verarbeitet…", retry: "Zahlung erneut prüfen", paid: "Zahlung abgeschlossen",
      paidHint: "Deine Bestellung wurde empfangen.", orderNumber: "Bestellung", unavailable: "Menü nicht verfügbar",
      reload: "Erneut versuchen", tip: "Trinkgeld", coupon: "Gutscheincode", apply: "Anwenden", couponApplied: "Gutschein angewendet",
      paymentPending: "Die Zahlung wird noch verarbeitet. Bitte nicht erneut bezahlen.", paymentFailed: "Die Zahlung konnte nicht bestätigt werden.",
      noPayments: "Für dieses Restaurant sind keine Zahlungsmethoden aktiviert.", loading: "Menü wird geladen", wait: "Bitte warten…"
    },
    fa: {
      product: "سفارش سلف‌سرویس", orderType: "نوع سفارش", eatHere: "صرف در رستوران", takeAway: "بیرون‌بر",
      menu: "منو", all: "همه", search: "جستجو در منو", items: "آیتم", item: "آیتم",
      add: "افزودن", customize: "انتخاب گزینه‌ها", details: "برای جزئیات لمس کنید", order: "سفارش شما", empty: "سفارش شما خالی است",
      emptyHint: "برای شروع یک آیتم از منو انتخاب کنید.", clear: "پاک کردن سفارش", subtotal: "جمع جزء",
      tax: "مالیات", service: "هزینه سرویس", total: "جمع کل", reviewPay: "پرداخت", checkout: "پرداخت", pay: "پرداخت", terminalPay: "پرداخت با دستگاه کارت‌خوان",
      noResults: "چیزی پیدا نشد", noResultsHint: "دسته یا عبارت دیگری را امتحان کنید.",
      options: "انتخاب گزینه‌ها", required: "الزامی", optional: "اختیاری", note: "یادداشت آیتم",
      noteHint: "مثلاً بدون پیاز، سس جدا", cancel: "لغو", addOrder: "افزودن به سفارش",
      review: "بررسی سفارش", continueMenu: "ادامه سفارش", placeOrder: "ثبت سفارش",
      creating: "در حال ثبت سفارش…", payment: "پرداخت", choosePayment: "روش پرداخت را انتخاب کنید",
      payCounter: "پرداخت در صندوق", payCounterHint: "سفارش ارسال شد. لطفاً در صندوق پرداخت کنید.",
      processing: "در حال پردازش پرداخت…", retry: "بررسی دوباره پرداخت", paid: "پرداخت کامل شد",
      paidHint: "سفارش شما دریافت شد.", orderNumber: "سفارش", unavailable: "منو در دسترس نیست",
      reload: "تلاش دوباره", tip: "انعام", coupon: "کد تخفیف", apply: "اعمال", couponApplied: "کد تخفیف اعمال شد",
      paymentPending: "پرداخت هنوز در حال پردازش است. دوباره پرداخت نکنید.", paymentFailed: "پرداخت تأیید نشد.",
      noPayments: "هیچ روش پرداخت فعالی برای این رستوران وجود ندارد.", loading: "در حال بارگذاری منو", wait: "لطفاً صبر کنید…"
    },
    tr: {
      product: "Self servis sipariş", orderType: "Sipariş tipi", eatHere: "Burada ye", takeAway: "Paket",
      menu: "Menü", all: "Tümü", search: "Menüde ara", items: "ürün", item: "ürün",
      add: "Ekle", customize: "Seçenekler", details: "Detaylar için dokun", order: "Siparişiniz", empty: "Siparişiniz boş",
      emptyHint: "Başlamak için menüden bir ürün seçin.", clear: "Siparişi temizle", subtotal: "Ara toplam",
      tax: "Vergi", service: "Servis ücreti", total: "Toplam", reviewPay: "Checkout", checkout: "Checkout", pay: "Öde", terminalPay: "Terminalde öde",
      noResults: "Sonuç bulunamadı", noResultsHint: "Başka kategori veya arama deneyin.",
      options: "Seçenekleri seçin", required: "Zorunlu", optional: "İsteğe bağlı", note: "Ürün notu",
      noteHint: "örn. soğansız, sos ayrı", cancel: "İptal", addOrder: "Siparişe ekle",
      review: "Siparişi kontrol et", continueMenu: "Siparişe devam et", placeOrder: "Siparişi ver",
      creating: "Sipariş oluşturuluyor…", payment: "Ödeme", choosePayment: "Ödeme yöntemini seçin",
      payCounter: "Kasada öde", payCounterHint: "Sipariş gönderildi. Lütfen kasada ödeme yapın.",
      processing: "Ödeme işleniyor…", retry: "Ödemeyi tekrar kontrol et", paid: "Ödeme tamamlandı",
      paidHint: "Siparişiniz alındı.", orderNumber: "Sipariş", unavailable: "Menü kullanılamıyor",
      reload: "Tekrar dene", tip: "Bahşiş", coupon: "Kupon kodu", apply: "Uygula", couponApplied: "Kupon uygulandı",
      paymentPending: "Ödeme hâlâ işleniyor. Tekrar ödeme yapmayın.", paymentFailed: "Ödeme doğrulanamadı.",
      noPayments: "Bu restoran için etkin ödeme yöntemi yok.", loading: "Menü yükleniyor", wait: "Lütfen bekleyin…"
    }
  };

  var state = {
    locale: "en",
    enabledLocales: ["en"],
    restaurant: { name: "PayMyDine", logo: "", currency: "EUR" },
    settings: {},
    theme: {},
    items: [],
    categories: [],
    payments: [],
    cart: [],
    category: "all",
    search: "",
    tax: { enabled: false, percentage: 0, included: true },
    service: { enabled: false, type: "percentage", value: 0, label: "Service charge" },
    tips: { enabled: false, presets: [0, 5, 10] },
    tipPercent: 0,
    couponCode: "",
    couponDiscount: 0,
    order: null,
    busy: false,
    paymentStatus: "",
    currentModal: null,
    paypalButtons: null,
    stripeElements: null,
    stripePaymentElement: null,
    themeId: "kazen_japanese"
  };

  var sessionKey = "pmd-kiosk-v8-session";
  var cartKey = "pmd-kiosk-v8-cart:" + String(config.session || "kiosk");
  var orderKey = "pmd-kiosk-v8-order:" + String(config.session || "kiosk");
  var paymentKey = "pmd-kiosk-v8-payment:" + String(config.session || "kiosk");
  var bootstrapCacheKey = "pmd-kiosk-v13-bootstrap:" + String(window.location.host || "tenant");
  var bootstrapCacheMaxAgeMs = 6 * 60 * 60 * 1000;
  var bootPresented = false;

  function copy() {
    return COPY[state.locale] || COPY.en;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cleanText(value, fallback) {
    var text = String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text || String(fallback || "");
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
  }

  function boolish(value, fallback) {
    if (value === undefined || value === null || value === "") return Boolean(fallback);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["1", "true", "yes", "on", "enabled"].indexOf(String(value).trim().toLowerCase()) >= 0;
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function unwrap(value) {
    if (!value || typeof value !== "object") return {};
    if (value.data && typeof value.data === "object" && !Array.isArray(value.data)) return value.data;
    return value;
  }

  function first(source, keys, fallback) {
    var row = source || {};
    for (var i = 0; i < keys.length; i += 1) {
      if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== "") return row[keys[i]];
    }
    return fallback;
  }

  // PMD_KIOSK_CUSTOMER_THEME_SYNC_V9
  // Keep the kiosk interaction model purpose-built for a touch terminal, but
  // derive its visual identity from the same Customer Menu theme selection.
  function validHex(value, fallback) {
    var raw = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : fallback;
  }

  function hexRgb(value) {
    var raw = validHex(value, "#000000").slice(1);
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16)
    };
  }

  function rgbHex(rgb) {
    function part(value) {
      var n = Math.max(0, Math.min(255, Math.round(value))).toString(16).toUpperCase();
      return n.length === 1 ? "0" + n : n;
    }
    return "#" + part(rgb.r) + part(rgb.g) + part(rgb.b);
  }

  function mixHex(a, b, ratio) {
    var left = hexRgb(a);
    var right = hexRgb(b);
    var t = Math.max(0, Math.min(1, Number(ratio) || 0));
    return rgbHex({
      r: left.r + (right.r - left.r) * t,
      g: left.g + (right.g - left.g) * t,
      b: left.b + (right.b - left.b) * t
    });
  }

  function relativeLuminance(hex) {
    var rgb = hexRgb(hex);
    var values = [rgb.r, rgb.g, rgb.b].map(function (value) {
      var c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }

  function normalizeThemeId(value) {
    var key = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    var aliases = {
      modern_dark: "noir_editorial",
      black_luxury: "noir_editorial",
      modern_green: "verdant_modern",
      green: "verdant_modern",
      gold_luxury: "lumiere_fine_dining",
      gold: "lumiere_fine_dining",
      organic_botanical_paper: "lumiere_fine_dining",
      organic: "lumiere_fine_dining",
      kazen: "kazen_japanese",
      japanese: "kazen_japanese",
      coastal: "azzurra_coastal",
      mediterranean: "azzurra_coastal",
      seafood: "azzurra_coastal",
      vibrant_colors: "neon_cocktail_bar",
      cyber_futuristic: "neon_cocktail_bar",
      bar: "neon_cocktail_bar",
      art_deco: "art_deco_speakeasy",
      speakeasy: "art_deco_speakeasy",
      gatsby: "art_deco_speakeasy",
      persian: "shahrazad_persian",
      persian_luxury: "shahrazad_persian",
      velvet_terracotta: "anatolia_turkish",
      velvet: "anatolia_turkish",
      turkish: "anatolia_turkish",
      steakhouse: "ember_steakhouse",
      charcoal: "ember_steakhouse",
      grill_house: "ember_steakhouse"
    };
    return aliases[key] || key || "kazen_japanese";
  }

  function applyCustomerMenuTheme(settings, bootstrapTheme) {
    var configured = object(config.theme);
    var remote = object(bootstrapTheme);
    var rawId = first(
      configured,
      ["id"],
      first(remote, ["id", "theme_id", "frontend_theme", "pmd_v2_theme_id"],
        first(settings || {}, ["pmd_v2_theme_id", "frontend_theme", "theme_id"], "kazen_japanese"))
    );
    var id = normalizeThemeId(rawId);

    var background = validHex(first(configured, ["background"], first(remote, ["background"], "#F5F1EB")), "#F5F1EB");
    var text = validHex(first(configured, ["text"], first(remote, ["text"], "#25231F")), "#25231F");
    var muted = validHex(first(configured, ["muted"], first(remote, ["muted"], mixHex(text, background, 0.52))), mixHex(text, background, 0.52));
    var accent = validHex(first(configured, ["accent"], first(remote, ["accent"], "#B5413F")), "#B5413F");
    var surface = validHex(first(configured, ["surface"], first(remote, ["surface"], mixHex(background, "#FFFFFF", 0.72))), mixHex(background, "#FFFFFF", 0.72));
    var dark = configured.is_dark !== undefined
      ? boolish(configured.is_dark, false)
      : (remote.is_dark !== undefined ? boolish(remote.is_dark, false) : relativeLuminance(background) < 0.36);

    var rootStyle = document.documentElement.style;
    rootStyle.setProperty("--pmd-k-bg", background);
    rootStyle.setProperty("--pmd-k-panel", surface);
    rootStyle.setProperty("--pmd-k-panel-soft", mixHex(surface, background, dark ? 0.22 : 0.34));
    rootStyle.setProperty("--pmd-k-ink", text);
    rootStyle.setProperty("--pmd-k-muted", muted);
    rootStyle.setProperty("--pmd-k-line", mixHex(text, background, dark ? 0.76 : 0.84));
    rootStyle.setProperty("--pmd-k-line-strong", mixHex(text, background, dark ? 0.62 : 0.72));
    rootStyle.setProperty("--pmd-k-accent", accent);
    rootStyle.setProperty("--pmd-k-accent-dark", mixHex(accent, "#000000", dark ? 0.08 : 0.22));
    rootStyle.setProperty("--pmd-k-accent-soft", mixHex(accent, background, dark ? 0.72 : 0.84));
    rootStyle.setProperty("--pmd-k-accent-contrast", relativeLuminance(accent) > 0.56 ? "#101418" : "#FFFFFF");
    rootStyle.setProperty("--pmd-k-danger", dark ? "#FF8A82" : "#A93A32");

    state.themeId = id;
    document.body.setAttribute("data-pmd-kiosk-theme", id);
    document.body.setAttribute("data-pmd-kiosk-dark", dark ? "1" : "0");

    var meta = document.getElementById("pmd-kiosk-theme-color");
    if (meta) meta.setAttribute("content", surface);

    state.theme = Object.assign({}, remote, configured, {
      id: id,
      background: background,
      text: text,
      muted: muted,
      accent: accent,
      surface: surface,
      is_dark: dark
    });
  }

  function normalizeAsset(value) {
    var raw = String(value || "").trim();
    if (!raw || raw === "null" || raw === "undefined") return "";
    if (/^(https?:)?\/\//i.test(raw) || raw.indexOf("data:") === 0) return raw;
    if (raw.charAt(0) === "/") return raw;
    var clean = raw.replace(/^\/+/, "").split("#")[0].split("?")[0];
    if (clean.indexOf("api/media/") === 0) return "/" + clean;
    if (clean.indexOf("assets/media/") === 0) return "/" + clean;
    if (clean.indexOf("uploads/") === 0) return "/assets/media/" + clean;
    if (clean.indexOf("storage/") === 0) return "/" + clean;
    if (clean.indexOf("brand/") === 0) return "/" + clean;
    if (clean === "images/pasta.png") return "/brand/paymydine-logo.svg";
    if (clean.indexOf("images/") === 0) return "/api/media/" + encodeURI(clean.slice(7));
    return "/api/media/" + encodeURI(clean);
  }

  function slug(value) {
    return cleanText(value, "menu").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "menu";
  }

  function rowsFrom(payload, keys) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    var root = unwrap(payload);
    for (var i = 0; i < keys.length; i += 1) {
      if (Array.isArray(root[keys[i]])) return root[keys[i]];
    }
    return [];
  }

  function normalizeOptions(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function (group, groupIndex) {
      group = object(group);
      var rawType = String(first(group, ["display_type", "displayType"], "radio")).toLowerCase();
      var type = rawType === "checkbox" || rawType === "select" ? rawType : "radio";
      var values = rowsFrom(first(group, ["values", "option_values"], []), []);
      return {
        id: String(first(group, ["id", "option_id", "menu_option_id"], "option-" + groupIndex)),
        name: cleanText(first(group, ["name", "label", "option_name"], "Option " + (groupIndex + 1))),
        displayType: type,
        required: boolish(group.required, false),
        values: values.map(function (entry, valueIndex) {
          entry = object(entry);
          return {
            id: String(first(entry, ["id", "option_value_id", "value_id"], "value-" + groupIndex + "-" + valueIndex)),
            name: cleanText(first(entry, ["value", "name", "label"], "Choice " + (valueIndex + 1))),
            price: number(first(entry, ["price", "price_delta", "amount"], 0)),
            isDefault: boolish(first(entry, ["is_default", "default"], false), false)
          };
        })
      };
    }).filter(function (group) { return group.values.length > 0; });
  }

  function menuRows(payload) {
    if (Array.isArray(payload && payload.data)) return payload.data;
    var root = unwrap(payload);
    if (Array.isArray(root.items)) return root.items;
    if (Array.isArray(root.menu_items)) return root.menu_items;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  function normalizeMenu(payload) {
    var rows = menuRows(payload);
    var categoryMap = {};
    var items = rows.map(function (source, index) {
      source = object(source);
      var categoryName = cleanText(first(source, ["category_name", "category", "categoryName"], "Menu"), "Menu");
      var categoryId = String(first(source, ["category_id", "categoryId"], slug(categoryName)));
      var rawImages = [];
      [source.image, source.image_url, source.images, source.gallery, source.media, source.additional_images].forEach(function visit(value) {
        if (!value) return;
        if (Array.isArray(value)) { value.forEach(visit); return; }
        if (typeof value === "object") { visit(first(value, ["url", "image", "src", "path", "name"], "")); return; }
        var normalized = normalizeAsset(value);
        if (normalized && rawImages.indexOf(normalized) < 0) rawImages.push(normalized);
      });
      var stock = source.stock_qty;
      var available = source.available === undefined
        ? !boolish(source.is_stock_out, false)
        : boolish(source.available, true);
      if (stock !== undefined && stock !== null && stock !== "" && number(stock) <= 0) available = false;
      categoryMap[categoryId] = categoryMap[categoryId] || { id: categoryId, name: categoryName };
      return {
        id: String(first(source, ["id", "menu_id", "combo_id"], "item-" + index)),
        name: cleanText(first(source, ["name", "menu_name", "title"], "Menu item")),
        description: cleanText(first(source, ["description", "menu_description", "details"], "")),
        price: number(first(source, ["price", "menu_price", "combo_price"], 0)),
        categoryId: categoryId,
        categoryName: categoryName,
        image: rawImages[0] || "",
        available: available,
        options: normalizeOptions(source.options)
      };
    }).filter(function (item) { return item.id && item.available; });

    return {
      items: items,
      categories: Object.keys(categoryMap).map(function (key) { return categoryMap[key]; })
    };
  }

  function normalizePayments(payload) {
    return rowsFrom(payload, ["methods", "payments"]).map(function (row, index) {
      row = object(row);
      var legacy = String(first(row, ["code", "payment_code", "method"], "")).toLowerCase().replace(/[\s-]+/g, "_");
      var aliases = {
        stripe: "card", credit_card: "card", creditcard: "card",
        applepay: "apple_pay", googlepay: "google_pay", cash_on_delivery: "cod"
      };
      var code = aliases[legacy] || legacy;
      return {
        code: code,
        name: cleanText(first(row, ["name", "label", "title"], code === "cod" ? "Cash" : code === "card" ? "Card" : code)),
        providerCode: String(first(row, ["provider_code", "providerCode", "provider"], "") || "").toLowerCase().replace(/[\s-]+/g, "_"),
        enabled: row.enabled === undefined && row.status === undefined ? true : boolish(first(row, ["enabled", "status"], true), true),
        priority: number(first(row, ["priority", "sort_order"], index + 1), index + 1)
      };
    }).filter(function (method) {
      // PMD_KIOSK_PAY_FIRST_V10
      // Kiosk checkout is prepaid. Cash/COD and qr_pay_later are not customer
      // choices here; split/payment-later remains available only in QR/staff UI.
      return method.enabled &&
        method.code &&
        ["cash", "cod", "qr_pay_later"].indexOf(method.code) < 0;
    })
      .sort(function (a, b) { return a.priority - b.priority; });
  }

  function parseLocales(settings, theme) {
    var raw = first(theme, ["pmd_v2_enabled_languages", "enabled_languages"], first(settings, ["enabled_languages", "pmd_v2_enabled_languages"], ""));
    var list;
    if (Array.isArray(raw)) {
      list = raw;
    } else {
      var rawText = String(raw || "").trim();
      if (rawText.charAt(0) === "[") {
        try { list = JSON.parse(rawText); } catch (error) { list = rawText.split(","); }
      } else {
        list = rawText.split(",");
      }
    }
    var normalized = list.map(function (entry) { return String(entry || "").trim().toLowerCase().split("-")[0]; }).filter(Boolean);
    var base = String(first(settings, ["default_language", "locale"], "en")).trim().toLowerCase().split("-")[0] || "en";
    if (normalized.indexOf(base) < 0) normalized.unshift(base);
    if (!normalized.length) normalized = ["en"];
    return normalized.filter(function (entry, index, all) { return all.indexOf(entry) === index; });
  }

  function money(value) {
    try {
      return new Intl.NumberFormat(state.locale || undefined, {
        style: "currency",
        currency: state.restaurant.currency || "EUR",
        maximumFractionDigits: 2
      }).format(number(value));
    } catch (error) {
      return number(value).toFixed(2) + " " + (state.restaurant.currency || "EUR");
    }
  }

  function requestJson(url, options) {
    var configOptions = options || {};
    var headers = Object.assign({ Accept: "application/json" }, configOptions.headers || {});
    if (configOptions.body !== undefined && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(url, {
      method: configOptions.method || "GET",
      credentials: "same-origin",
      // PMD_KIOSK_FAST_WEBVIEW_V10: GETs may use/revalidate the WebView HTTP
      // cache; mutations remain no-store. The old code forced every menu open
      // to redownload the entire bootstrap payload.
      cache: configOptions.method === "POST" ? "no-store" : "default",
      headers: headers,
      body: configOptions.body === undefined
        ? undefined
        : (typeof configOptions.body === "string" ? configOptions.body : JSON.stringify(configOptions.body))
    }).then(function (response) {
      return response.text().then(function (raw) {
        var data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch (error) { data = {}; }
        if (!response.ok || data.success === false) {
          throw new Error(String(data.error || data.message || ("HTTP " + response.status)));
        }
        return data;
      });
    });
  }

  function persistCart() {
    try { sessionStorage.setItem(cartKey, JSON.stringify(state.cart)); } catch (error) {}
  }

  function persistOrder() {
    try {
      if (state.order) sessionStorage.setItem(orderKey, JSON.stringify(state.order));
      else sessionStorage.removeItem(orderKey);
    } catch (error) {}
  }

  function restoreSession() {
    try {
      var priorSession = sessionStorage.getItem(sessionKey);
      if (priorSession !== String(config.session || "kiosk")) {
        sessionStorage.clear();
        sessionStorage.setItem(sessionKey, String(config.session || "kiosk"));
      }
      var storedCart = JSON.parse(sessionStorage.getItem(cartKey) || "[]");
      state.cart = Array.isArray(storedCart) ? storedCart : [];
      var storedOrder = JSON.parse(sessionStorage.getItem(orderKey) || "null");
      state.order = storedOrder && storedOrder.orderId ? storedOrder : null;
    } catch (error) {
      state.cart = [];
      state.order = null;
    }
  }

  function calculateTotals() {
    var subtotal = state.cart.reduce(function (sum, line) {
      return sum + number(line.unitPrice) * number(line.quantity, 1);
    }, 0);
    subtotal = Math.round(subtotal * 100) / 100;

    var tax = state.tax.enabled && !state.tax.included
      ? Math.round(subtotal * Math.max(0, state.tax.percentage) / 100 * 100) / 100
      : 0;

    var service = 0;
    if (state.service.enabled) {
      service = state.service.type === "fixed"
        ? Math.max(0, state.service.value)
        : subtotal * Math.max(0, state.service.value) / 100;
      service = Math.round(service * 100) / 100;
    }

    var base = Math.round((subtotal + tax + service) * 100) / 100;
    // PMD_KIOSK_NO_TIP_NO_COUPON_V18
    var afterCoupon = base;
    var tip = 0;
    var payable = base;

    return {
      subtotal: subtotal,
      tax: tax,
      service: service,
      base: base,
      couponDiscount: state.couponDiscount,
      tip: tip,
      payable: payable
    };
  }

  function itemCartQuantity(itemId) {
    return state.cart.filter(function (line) { return String(line.item.id) === String(itemId); })
      .reduce(function (sum, line) { return sum + number(line.quantity, 1); }, 0);
  }

  function cartKeyFor(item, selections, note) {
    var suffix = (selections || []).slice().sort(function (a, b) {
      return (a.groupId + ":" + a.valueId).localeCompare(b.groupId + ":" + b.valueId);
    }).map(function (entry) { return entry.groupId + "=" + entry.valueId; }).join("&");
    return String(item.id) + (suffix ? "?" + suffix : "") + (note ? "#note=" + note : "");
  }

  function addConfiguredItem(item, quantity, selections, note) {
    quantity = Math.max(1, number(quantity, 1));
    selections = selections || [];
    note = cleanText(note, "").slice(0, 500);
    var optionPrice = selections.reduce(function (sum, entry) { return sum + number(entry.price); }, 0);
    var unitPrice = Math.max(0, item.price + optionPrice);
    var key = cartKeyFor(item, selections, note);
    var existing = state.cart.find(function (line) { return line.key === key; });
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.cart.push({
        key: key,
        item: item,
        quantity: quantity,
        selections: selections,
        note: note,
        unitPrice: unitPrice
      });
    }
    state.couponCode = "";
    state.couponDiscount = 0;
    persistCart();
    renderAll();
    closeModal();
  }

  function updateLine(key, delta) {
    var line = state.cart.find(function (entry) { return entry.key === key; });
    if (!line) return;
    line.quantity = Math.max(0, number(line.quantity, 1) + delta);
    if (line.quantity <= 0) state.cart = state.cart.filter(function (entry) { return entry.key !== key; });
    state.couponCode = "";
    state.couponDiscount = 0;
    persistCart();
    renderAll();
  }

  function clearCartState() {
    if (state.busy) return;
    state.cart = [];
    state.order = null;
    state.couponCode = "";
    state.couponDiscount = 0;
    state.tipPercent = 0;
    try {
      sessionStorage.removeItem(cartKey);
      sessionStorage.removeItem(orderKey);
      sessionStorage.removeItem(paymentKey);
    } catch (error) {}
    renderAll();
  }

  function visibleItems() {
    var needle = state.search.trim().toLowerCase();
    return state.items.filter(function (item) {
      if (!needle) return true;
      return [item.name, item.description, item.categoryName].some(function (value) {
        return String(value || "").toLowerCase().indexOf(needle) >= 0;
      });
    });
  }

  function renderBrand() {
    var mark = $("pmd-kiosk-brand-mark");
    var letter = $("pmd-kiosk-brand-letter");
    $("pmd-kiosk-restaurant-name").textContent = state.restaurant.name;
    $("pmd-kiosk-product-label").textContent = copy().product;
    if (state.restaurant.logo) {
      mark.innerHTML = '<img src="' + escapeHtml(state.restaurant.logo) + '" alt="">';
    } else {
      letter = document.createElement("span");
      letter.textContent = (state.restaurant.name || "P").charAt(0).toUpperCase();
      mark.replaceChildren(letter);
    }

    $("pmd-kiosk-order-mode-kicker").textContent = copy().orderType;
    $("pmd-kiosk-order-mode-label").textContent = config.serviceMode === "pickup" ? copy().takeAway : copy().eatHere;
    $("pmd-kiosk-context-label").textContent = (config.serviceMode === "pickup" ? copy().takeAway : copy().eatHere).toUpperCase();
    $("pmd-kiosk-menu-label").textContent = copy().menu.toUpperCase();
    searchInput.placeholder = copy().search;
    document.documentElement.lang = state.locale;
    document.documentElement.dir = ["fa", "ar"].indexOf(state.locale) >= 0 ? "rtl" : "ltr";
  }

  function renderLanguages() {
    languageSelect.innerHTML = state.enabledLocales.map(function (locale) {
      return '<option value="' + escapeHtml(locale) + '"' + (locale === state.locale ? " selected" : "") + '>' + escapeHtml(locale.toUpperCase()) + "</option>";
    }).join("");
  }

  function categoryIcon(name) {
    var value = String(name || "").toLowerCase();
    if (/breakfast|frühstück|صبح|kahvalt/.test(value)) return "🥐";
    if (/drink|beverage|getränk|نوش|içecek/.test(value)) return "🥤";
    if (/dessert|sweet|nachtisch|دسر|tatlı/.test(value)) return "🍰";
    if (/lunch|dinner|main|haupt|ناهار|شام|öğle|akşam/.test(value)) return "🍲";
    return "";
  }

  var categoryObserver = null;

  function setActiveCategory(categoryId) {
    var id = String(categoryId || "");
    if (!id) return;
    state.category = id;
    Array.prototype.forEach.call(
      categoryList.querySelectorAll("[data-category-scroll]"),
      function (button) {
        var active = String(button.getAttribute("data-category-scroll")) === id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "true" : "false");
      }
    );
    var category = state.categories.find(function (entry) {
      return String(entry.id) === id;
    });
    if (category) $("pmd-kiosk-category-title").textContent = category.name;

    var activeButton = categoryList.querySelector('[data-category-scroll="' + CSS.escape(id) + '"]');
    if (activeButton && activeButton.scrollIntoView) {
      activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  function renderCategories() {
    var entries = state.categories.slice();
    if (!entries.length) {
      categoryList.innerHTML = "";
      $("pmd-kiosk-category-title").textContent = copy().menu;
      return;
    }
    if (!entries.some(function (entry) { return String(entry.id) === String(state.category); })) {
      state.category = String(entries[0].id);
    }
    categoryList.innerHTML = entries.map(function (entry) {
      var active = String(entry.id) === String(state.category);
      var icon = categoryIcon(entry.name);
      return '<button type="button" class="pmd-kiosk-category-button' + (active ? " is-active" : "") +
        '" data-category-scroll="' + escapeHtml(entry.id) + '" aria-current="' + (active ? "true" : "false") + '">' +
        (icon ? '<span class="pmd-kiosk-category-icon" aria-hidden="true">' + icon + "</span>" : "") +
        '<span>' + escapeHtml(entry.name) + "</span></button>";
    }).join("");

    var current = entries.find(function (entry) { return String(entry.id) === String(state.category); }) || entries[0];
    $("pmd-kiosk-category-title").textContent = current.name;
  }

  // PMD_KIOSK_CLEAN_CARDS_V13
  // PMD_KIOSK_PLUS_ONLY_V18
  // Cards stay directly tappable for details, with one compact + action.
  function itemCardHtml(item, index) {
    var quantity = itemCartQuantity(item.id);
    var image = item.image
      ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) +
        '" loading="' + (index < 4 ? "eager" : "lazy") + '" decoding="async"' +
        (index < 2 ? ' fetchpriority="high"' : '') + '>'
      : '<span class="pmd-kiosk-item__placeholder">' + escapeHtml(item.name.charAt(0).toUpperCase()) + "</span>";
    return '<article class="pmd-kiosk-item" data-open-item="' + escapeHtml(item.id) + '" tabindex="0" role="button" aria-label="' +
        escapeHtml(item.name) + '">' +
      '<div class="pmd-kiosk-item__image">' +
        image +
        (quantity > 0 ? '<span class="pmd-kiosk-item__qty">' + quantity + "</span>" : "") +
      "</div>" +
      '<div class="pmd-kiosk-item__body">' +
        '<div class="pmd-kiosk-item__copy"><h2>' + escapeHtml(item.name) + "</h2>" +
          (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
        "</div>" +
        '<div class="pmd-kiosk-item__foot"><span class="pmd-kiosk-item__price">' + escapeHtml(money(item.price)) + "</span>" +
          '<button type="button" class="pmd-kiosk-add" data-add-item="' + escapeHtml(item.id) +
            '" aria-label="' + escapeHtml(copy().add + " " + item.name) + '">+</button>' +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function bindCategoryScrollObserver() {
    if (categoryObserver) {
      categoryObserver.disconnect();
      categoryObserver = null;
    }
    if (!("IntersectionObserver" in window)) return;
    categoryObserver = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top); });
      if (!visible.length) return;
      setActiveCategory(visible[0].target.getAttribute("data-menu-category"));
    }, {
      root: null,
      rootMargin: "-20% 0px -62% 0px",
      threshold: [0, 0.01, 0.15]
    });
    Array.prototype.forEach.call(grid.querySelectorAll("[data-menu-category]"), function (section) {
      categoryObserver.observe(section);
    });
  }

  function renderMenu() {
    var items = visibleItems();
    $("pmd-kiosk-result-count").textContent = items.length + " " + (items.length === 1 ? copy().item : copy().items);
    if (!items.length) {
      grid.innerHTML = '<div class="pmd-kiosk-no-results"><strong>' + escapeHtml(copy().noResults) + '</strong><p>' +
        escapeHtml(copy().noResultsHint) + "</p></div>";
      return;
    }

    // PMD_KIOSK_SCROLL_CATEGORIES_V18
    // Render one continuous document. Scrolling naturally enters Breakfast,
    // Lunch, Drinks, etc.; category chips are optional shortcuts/indicators.
    var ordered = state.categories.slice();
    var seen = {};
    ordered.forEach(function (entry) { seen[String(entry.id)] = true; });
    items.forEach(function (item) {
      var id = String(item.categoryId || "uncategorized");
      if (!seen[id]) {
        ordered.push({ id: id, name: item.categoryName || copy().menu });
        seen[id] = true;
      }
    });

    var itemIndex = 0;
    grid.innerHTML = ordered.map(function (category) {
      var rows = items.filter(function (item) {
        return String(item.categoryId || "uncategorized") === String(category.id);
      });
      if (!rows.length) return "";
      var cards = rows.map(function (item) {
        var html = itemCardHtml(item, itemIndex);
        itemIndex += 1;
        return html;
      }).join("");
      return '<section class="pmd-kiosk-category-section" data-menu-category="' + escapeHtml(category.id) + '">' +
        '<header class="pmd-kiosk-category-section__head"><h2>' + escapeHtml(category.name) + '</h2><span>' +
          rows.length + " " + (rows.length === 1 ? escapeHtml(copy().item) : escapeHtml(copy().items)) +
        '</span></header><div class="pmd-kiosk-category-grid">' + cards + "</div></section>";
    }).join("");

    bindCategoryScrollObserver();
  }

  function renderOrder() {
    var totals = calculateTotals();
    var count = state.cart.reduce(function (sum, line) { return sum + number(line.quantity, 1); }, 0);
    $("pmd-kiosk-order-title").textContent = copy().order.toUpperCase();
    $("pmd-kiosk-order-count").textContent = count + " " + (count === 1 ? copy().item : copy().items);
    clearOrder.textContent = copy().clear;
    clearOrder.hidden = state.cart.length === 0;
    $("pmd-kiosk-subtotal-label").textContent = copy().subtotal;
    $("pmd-kiosk-tax-label").textContent = copy().tax;
    $("pmd-kiosk-service-label").textContent = state.service.label || copy().service;
    $("pmd-kiosk-total-label").textContent = copy().total;
    $("pmd-kiosk-subtotal").textContent = money(totals.subtotal);
    $("pmd-kiosk-tax").textContent = money(totals.tax);
    $("pmd-kiosk-service").textContent = money(totals.service);
    $("pmd-kiosk-total").textContent = money(totals.base);
    $("pmd-kiosk-tax-row").hidden = totals.tax <= 0;
    $("pmd-kiosk-service-row").hidden = totals.service <= 0;
    // PMD_KIOSK_CHECKOUT_CTA_V18
    $("pmd-kiosk-checkout-label").textContent = copy().checkout || "Checkout";
    checkoutButton.disabled = !state.cart.length || state.busy;

    $("pmd-kiosk-compact-count").textContent = String(count);
    $("pmd-kiosk-compact-label").textContent = copy().checkout || "Checkout";
    $("pmd-kiosk-compact-total").textContent = money(totals.base);
    compactOrder.hidden = state.cart.length === 0;

    if (!state.cart.length) {
      orderLines.innerHTML = '<div class="pmd-kiosk-order-empty">' +
        '<span class="pmd-kiosk-order-empty__mark">＋</span>' +
        "<strong>" + escapeHtml(copy().empty) + "</strong>" +
        "<p>" + escapeHtml(copy().emptyHint) + "</p></div>";
      return;
    }

    orderLines.innerHTML = state.cart.map(function (line) {
      var options = line.selections && line.selections.length
        ? line.selections.map(function (entry) { return entry.valueName; }).join(" · ")
        : "";
      return '<article class="pmd-kiosk-order-line">' +
        '<div class="pmd-kiosk-order-line__head"><div><strong>' + escapeHtml(line.item.name) + "</strong>" +
          (options ? "<small>" + escapeHtml(options) + "</small>" : "") +
          (line.note ? "<small>" + escapeHtml(line.note) + "</small>" : "") +
        '</div><span class="pmd-kiosk-order-line__price">' + escapeHtml(money(line.unitPrice * line.quantity)) + "</span></div>" +
        '<div class="pmd-kiosk-stepper">' +
          '<button type="button" data-line-minus="' + escapeHtml(line.key) + '" aria-label="Decrease">−</button>' +
          "<b>" + line.quantity + "</b>" +
          '<button type="button" data-line-plus="' + escapeHtml(line.key) + '" aria-label="Increase">+</button>' +
        "</div></article>";
    }).join("");
  }

  function renderAll() {
    renderBrand();
    renderLanguages();
    renderCategories();
    renderMenu();
    renderOrder();
  }

  function showToast(message, error) {
    toast.textContent = String(message || "");
    toast.classList.toggle("is-error", Boolean(error));
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 3800);
  }

  function openModal(html, wide) {
    modal.classList.remove("pmd-kiosk-modal--payment-fullscreen");
    modal.classList.toggle("pmd-kiosk-modal--wide", Boolean(wide));
    modal.innerHTML = html;
    modalLayer.hidden = false;
  }

  function closeModal() {
    if (state.busy) return;
    if (state.paypalButtons && state.paypalButtons.close) {
      try { state.paypalButtons.close(); } catch (error) {}
    }
    state.paypalButtons = null;
    if (state.stripePaymentElement && state.stripePaymentElement.destroy) {
      try { state.stripePaymentElement.destroy(); } catch (error) {}
    }
    state.stripePaymentElement = null;
    state.stripeElements = null;
    state.currentModal = null;
    modalLayer.hidden = true;
    modal.innerHTML = "";
  }

  function findItem(id) {
    return state.items.find(function (item) { return String(item.id) === String(id); }) || null;
  }

  function defaultSelections(item) {
    var result = {};
    item.options.forEach(function (group) {
      var selected = group.values.filter(function (value) { return value.isDefault; }).map(function (value) { return value.id; });
      if (!selected.length && group.required && group.values[0]) selected.push(group.values[0].id);
      result[group.id] = selected;
    });
    return result;
  }

  function openItem(item) {
    if (!item) return;
    state.currentModal = { type: "item", itemId: item.id };
    var selected = defaultSelections(item);
    var detailImage = item.image
      ? '<div class="pmd-kiosk-detail__image"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '"></div>'
      : '<div class="pmd-kiosk-detail__image"><span class="pmd-kiosk-item__placeholder">' + escapeHtml(item.name.charAt(0).toUpperCase()) + "</span></div>";
    var groups = item.options.map(function (group) {
      var inputs = group.values.map(function (value) {
        var checked = (selected[group.id] || []).indexOf(value.id) >= 0;
        var type = group.displayType === "checkbox" ? "checkbox" : "radio";
        return '<label class="pmd-kiosk-option"><span><input type="' + type + '" name="option-' + escapeHtml(group.id) +
          '" value="' + escapeHtml(value.id) + '" data-option-group="' + escapeHtml(group.id) + '"' +
          (checked ? " checked" : "") + "> " + escapeHtml(value.name) + "</span>" +
          (value.price > 0 ? "<small>+" + escapeHtml(money(value.price)) + "</small>" : "") + "</label>";
      }).join("");
      return '<fieldset class="pmd-kiosk-option-group" data-required="' + (group.required ? "1" : "0") +
        '" data-group-id="' + escapeHtml(group.id) + '"><legend>' + escapeHtml(group.name) +
        " · " + escapeHtml(group.required ? copy().required : copy().optional) + '</legend><div class="pmd-kiosk-option-list">' + inputs + "</div></fieldset>";
    }).join("");

    openModal(
      '<header class="pmd-kiosk-modal__head"><div><p>' + escapeHtml(item.categoryName) + "</p><h2>" +
        escapeHtml(item.name) + '</h2></div><button type="button" class="pmd-kiosk-modal__close" data-pmd-close-modal aria-label="Close">×</button></header>' +
      '<div class="pmd-kiosk-modal__body"><div class="pmd-kiosk-detail">' + detailImage +
        '<div class="pmd-kiosk-detail__copy">' + (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
          groups +
          '<label class="pmd-kiosk-option-group"><legend>' + escapeHtml(copy().note) + '</legend><textarea id="pmd-kiosk-item-note" rows="3" maxlength="500" placeholder="' +
            escapeHtml(copy().noteHint) + '" style="width:100%;resize:vertical;border:1px solid var(--pmd-k-line);border-radius:8px;padding:10px;background:#fff;color:var(--pmd-k-ink)"></textarea></label>' +
        "</div></div></div>" +
      '<footer class="pmd-kiosk-modal__foot"><button type="button" class="pmd-kiosk-secondary" data-pmd-close-modal>' +
        escapeHtml(copy().cancel) + '</button><button type="button" class="pmd-kiosk-primary" data-add-configured="' + escapeHtml(item.id) + '">' +
        "<span>" + escapeHtml(copy().addOrder) + " · " + escapeHtml(money(item.price)) + "</span><span>›</span></button></footer>"
    );
  }

  function collectSelections(item) {
    var selections = [];
    var missing = "";
    item.options.forEach(function (group) {
      var nodes = Array.prototype.slice.call(modal.querySelectorAll('[data-option-group="' + CSS.escape(group.id) + '"]:checked'));
      if (group.required && !nodes.length && !missing) missing = group.name;
      nodes.forEach(function (node) {
        var value = group.values.find(function (entry) { return String(entry.id) === String(node.value); });
        if (value) {
          selections.push({
            groupId: group.id,
            groupName: group.name,
            valueId: value.id,
            valueName: value.name,
            price: value.price
          });
        }
      });
    });
    if (missing) throw new Error(missing + " is required.");
    return selections;
  }

  function paymentLabel(method) {
    var code = String(method.code || "").toLowerCase();
    if (code === "card") return method.name || "Card";
    if (code === "apple_pay") return "Apple Pay";
    if (code === "google_pay") return "Google Pay";
    if (code === "paypal") return "PayPal";
    if (code === "wero") return "Wero";
    if (code === "cash" || code === "cod") return copy().payCounter;
    return method.name || code;
  }

  function paymentMark(method) {
    var code = String(method.code || "").toLowerCase();
    if (code === "apple_pay") return "A";
    if (code === "google_pay") return "G";
    if (code === "paypal") return "P";
    if (code === "wero") return "W";
    if (code === "cash" || code === "cod") return "€";
    return "▣";
  }

  // PMD_KIOSK_NO_TIP_NO_COUPON_V18
  // Kiosk checkout intentionally has no tip or coupon controls. A guest only
  // reviews the order total and pays on the linked physical terminal.

  function checkoutTotalsHtml() {
    var totals = calculateTotals();
    return '<div class="pmd-kiosk-checkout-totals"><dl>' +
      "<div><dt>" + escapeHtml(copy().subtotal) + "</dt><dd>" + escapeHtml(money(totals.subtotal)) + "</dd></div>" +
      (totals.tax > 0 ? "<div><dt>" + escapeHtml(copy().tax) + "</dt><dd>" + escapeHtml(money(totals.tax)) + "</dd></div>" : "") +
      (totals.service > 0 ? "<div><dt>" + escapeHtml(state.service.label || copy().service) + "</dt><dd>" + escapeHtml(money(totals.service)) + "</dd></div>" : "") +

      '<div class="is-total"><dt>' + escapeHtml(copy().total) + "</dt><dd>" + escapeHtml(money(totals.payable)) + "</dd></div>" +
    "</dl></div>";
  }

  function reviewLinesHtml() {
    return '<div class="pmd-kiosk-review-list">' + state.cart.map(function (line) {
      var detail = (line.selections || []).map(function (entry) { return entry.valueName; }).join(" · ");
      return '<div class="pmd-kiosk-review-line"><b>' + line.quantity + "×</b><div><strong>" + escapeHtml(line.item.name) +
        "</strong>" + (detail ? "<small>" + escapeHtml(detail) + "</small>" : "") + (line.note ? "<small>" + escapeHtml(line.note) + "</small>" : "") +
        "</div><span>" + escapeHtml(money(line.unitPrice * line.quantity)) + "</span></div>";
    }).join("") + "</div>";
  }

  function openCheckout() {
    if (!state.cart.length) return;
    state.currentModal = { type: "checkout" };
    renderCheckout();
  }

  function renderCheckout(message, isError) {
    var order = state.order;
    var status = message
      ? '<div class="pmd-kiosk-payment-status' + (isError ? " is-error" : "") + '">' + escapeHtml(message) + "</div>"
      : "";
    var kicker = order
      ? (escapeHtml(copy().orderNumber) + " #" + escapeHtml(order.orderNumber || order.orderId))
      : escapeHtml(copy().checkout || "Checkout");

    openModal(
      '<header class="pmd-kiosk-modal__head"><div><p>' + kicker +
      '</p><h2>' + escapeHtml(copy().checkout || "Checkout") +
      '</h2></div><button type="button" class="pmd-kiosk-modal__close" data-pmd-close-modal aria-label="Close">×</button></header>' +
      '<div class="pmd-kiosk-modal__body pmd-kiosk-terminal-checkout">' +
        reviewLinesHtml() + checkoutTotalsHtml() +
        '<div class="pmd-kiosk-terminal-pay-copy"><strong>' + escapeHtml(copy().terminalPay || "Pay on terminal") +
        '</strong><span>' + escapeHtml(state.locale === "de" ? "Karte oder Wallet am verbundenen Terminal vorhalten oder einstecken." :
          state.locale === "fa" ? "کارت یا کیف پول خود را روی کارت‌خوان متصل بگیرید." :
          state.locale === "tr" ? "Kartınızı veya cüzdanınızı bağlı terminale okutun." :
          "Tap or insert your card / wallet on the connected terminal.") + '</span></div>' +
        '<button type="button" class="pmd-kiosk-terminal-pay-button" data-kiosk-terminal-pay' + (state.busy ? " disabled" : "") + '>' +
          '<span>' + escapeHtml(state.busy ? copy().processing : (copy().pay || "Pay")) + '</span>' +
          '<strong>' + escapeHtml(money(calculateTotals().payable)) + '</strong>' +
        '</button>' + status +
      "</div>",
      true
    );
    modal.classList.add("pmd-kiosk-modal--payment-fullscreen");
  }

  function terminalBridge() {
    try {
      var bridge = window.PayMyDineKiosk;
      var secret = String(window.__PMD_KIOSK_BRIDGE_SECRET__ || "");
      if (bridge && typeof bridge.terminalPay === "function" && secret) {
        return { bridge: bridge, secret: secret };
      }
    } catch (error) {}
    return null;
  }

  function startTerminalPayment() {
    if (state.busy || !state.cart.length) return;
    var nativeBridge = terminalBridge();
    if (!nativeBridge) {
      renderCheckout(
        state.locale === "de"
          ? "Kein verbundenes Zahlungsterminal gefunden. Terminal in der PayMyDine Device App einrichten."
          : "No connected payment terminal is available. Configure the terminal for this kiosk device.",
        true
      );
      return;
    }

    state.busy = true;
    renderCheckout(copy().processing, false);
    submitOrder({ silent: true, allowWhileBusy: true })
      .then(function (order) {
        nativeBridge.bridge.terminalPay(String(order.orderId), nativeBridge.secret);
      })
      .catch(function (error) {
        state.busy = false;
        renderCheckout(error.message || copy().paymentFailed, true);
      });
  }

  window.__PMD_KIOSK_TERMINAL_RESULT__ = function (payload) {
    var result = payload;
    if (typeof payload === "string") {
      try { result = JSON.parse(payload); } catch (error) { result = { ok: false, message: payload }; }
    }
    result = result || {};
    if (result.paid === true || String(result.status || "").toLowerCase() === "paid") {
      state.busy = false;
      finishOrder(result.message || copy().paidHint);
      return;
    }
    state.busy = false;
    renderCheckout(result.message || copy().paymentFailed, true);
  };


  function submitOrder(options) {
    var opts = options || {};
    if (state.order) return Promise.resolve(state.order);
    if (!state.cart.length) return Promise.reject(new Error("Your order is empty."));
    if (state.busy && !opts.allowWhileBusy) return Promise.reject(new Error(copy().processing));

    var previousBusy = state.busy;
    state.busy = true;
    if (!opts.silent) renderCheckout(copy().creating, false);

    var totals = calculateTotals();
    var payload = {
      customer_name: "Kiosk Customer",
      customer_email: null,
      customer_phone: null,
      table_id: null,
      table_name: config.serviceMode === "pickup" ? "pickup" : "kiosk",
      location_id: 1,
      service_mode: config.serviceMode === "pickup" ? "pickup" : "kiosk",
      kiosk_session: String(config.session || "kiosk"),
      guest_session_id: String(config.session || "kiosk"),
      kiosk_prepaid: false,
      items: state.cart.map(function (line) {
        var options = {};
        (line.selections || []).forEach(function (entry) { options[entry.groupName] = entry.valueId; });
        return {
          menu_id: Number(line.item.id) || line.item.id,
          name: line.item.name,
          quantity: line.quantity,
          price: line.item.price,
          subtotal: Math.round(line.unitPrice * line.quantity * 100) / 100,
          special_instructions: line.note || "",
          options: options
        };
      }),
      total_amount: totals.base,
      tax_amount: totals.tax,
      service_charge_amount: totals.service,
      service_charge_label: state.service.label || "Service charge",
      tip_amount: 0,
      coupon_code: null,
      coupon_discount: 0,
      // PMD_KIOSK_PAY_FIRST_V10
      // Provider payment succeeds before this short-lived canonical order is
      // committed. qr_pay_later is only the settlement bridge for pay-existing.
      payment_method: "qr_pay_later",
      payment_method_raw: "qr_pay_later",
      payment_provider: null,
      special_instructions: ""
    };

    return requestJson(config.orderUrl || "/api/v1/orders", { method: "POST", body: payload })
      .then(function (result) {
        var orderId = Number(result.order_id || result.orderId || 0);
        if (!orderId) throw new Error("The order could not be created.");
        state.order = {
          orderId: orderId,
          orderNumber: String(result.order_number || result.orderNumber || orderId),
          baseTotal: totals.base,
          createdAt: Date.now()
        };
        persistOrder();
        state.busy = previousBusy;
        if (!opts.silent) renderCheckout();
        return state.order;
      })
      .catch(function (error) {
        state.busy = previousBusy;
        if (!opts.silent) renderCheckout(error.message || "The order could not be created.", true);
        throw error;
      });
  }

  // PMD_KIOSK_TERMINAL_ONLY_PAYMENT_V18
  // Hosted wallets/forms are not kiosk payment methods. Terminal payment is
  // initiated only through the authenticated native PayMyDineKiosk bridge.

  function notifyNativeOrderComplete(orderId) {
    var attempts = 0;
    function run() {
      attempts += 1;
      try {
        var bridge = window.PayMyDineKiosk;
        var secret = String(window.__PMD_KIOSK_BRIDGE_SECRET__ || "");
        if (bridge && typeof bridge.orderComplete === "function" && secret) {
          bridge.orderComplete(String(orderId), secret);
          return;
        }
      } catch (error) {}
      if (attempts < 30) window.setTimeout(run, 150);
    }
    run();
  }

  function finishOrder(message) {
    try { sessionStorage.removeItem(paymentKey); } catch (error) {}
    state.paymentStatus = "paid";
    renderCheckout(message || copy().paidHint, false);

    // PMD_KIOSK_RECEIPT_PRINT_V18
    try {
      var bridge = window.PayMyDineKiosk;
      var secret = String(window.__PMD_KIOSK_BRIDGE_SECRET__ || "");
      if (bridge && typeof bridge.printReceipt === "function" && secret) {
        bridge.printReceipt(JSON.stringify({
          restaurant: state.restaurant.name,
          order_id: state.order && state.order.orderId,
          order_number: state.order && state.order.orderNumber,
          currency: state.restaurant.currency,
          total: calculateTotals().payable,
          service_mode: config.serviceMode,
          items: state.cart.map(function (line) {
            return {
              name: line.item.name,
              quantity: line.quantity,
              unit_price: line.unitPrice,
              total: Math.round(line.unitPrice * line.quantity * 100) / 100
            };
          })
        }), secret);
      }
    } catch (error) {}

    window.setTimeout(function () {
      notifyNativeOrderComplete(state.order && state.order.orderId);
    }, 180);
  }

  function applyBootstrapBatch(batch) {
    var data = object(batch && batch.data);
    var settings = unwrap(data.settings);
    var restaurant = unwrap(data.restaurant);
    var theme = unwrap(data.theme);
    var vat = unwrap(data.vatSettings);
    var tipPayload = unwrap(data.tipSettings);
    var normalizedMenu = normalizeMenu(data.menu);

    state.settings = settings;
    applyCustomerMenuTheme(settings, theme);
    state.items = normalizedMenu.items;
    state.categories = normalizedMenu.categories;
    state.payments = normalizePayments(data.payments);
    if (state.categories.length && (state.category === "all" || !state.category)) {
      state.category = String(state.categories[0].id);
    }

    var heroItem = state.items.find(function (entry) { return entry.image; });
    if (heroItem && heroItem.image) {
      document.documentElement.style.setProperty("--pmd-k-hero-image", 'url("' + String(heroItem.image).replace(/"/g, "%22") + '")');
      var heroNode = $("pmd-kiosk-menu-hero");
      if (heroNode) heroNode.classList.add("is-ready");
      document.body.classList.add("pmd-kiosk-hero-ready");
    }

    state.restaurant = {
      name: cleanText(first(config.restaurant || {}, ["name"],
        first(settings, ["pmd_restaurant_identity_name", "site_name", "business_name", "restaurant_name"],
          first(restaurant, ["name", "restaurant_name"], "PayMyDine"))), "PayMyDine"),
      logo: normalizeAsset(first(config.restaurant || {}, ["logo"],
        first(settings, ["pmd_restaurant_identity_logo", "site_logo_url", "logo_url", "site_logo", "logo"], ""))),
      currency: String(first(restaurant, ["currency", "location_currency"], first(settings, ["default_currency", "currency"], "EUR")) || "EUR").toUpperCase()
    };

    state.enabledLocales = parseLocales(settings, theme);
    var requested = new URL(window.location.href).searchParams.get("lang");
    var baseLocale = String(requested || first(settings, ["default_language", "locale"], state.enabledLocales[0] || "en")).toLowerCase().split("-")[0];
    state.locale = state.enabledLocales.indexOf(baseLocale) >= 0 ? baseLocale : (state.enabledLocales[0] || "en");

    var vatPercentage = number(first(vat, ["vat_percentage", "tax_percentage"], first(settings, ["vat_percentage", "tax_percentage"], 0)));
    var vatMode = boolish(first(vat, ["vat_mode", "tax_mode"], first(settings, ["vat_mode", "tax_mode"], vatPercentage > 0)), vatPercentage > 0);
    var addAtCheckout = boolish(first(vat, ["vat_menu_price", "tax_menu_price"], first(settings, ["vat_menu_price", "tax_menu_price"], 0)), false);
    state.tax = { enabled: vatMode, percentage: vatPercentage, included: !addAtCheckout };

    var serviceType = String(first(settings, ["pmd_service_charge_type", "service_charge_type"], first(theme, ["pmd_service_charge_type", "service_charge_type"], "percentage"))).toLowerCase();
    var serviceValue = Math.max(0, number(first(settings, ["pmd_service_charge_value", "service_charge_value"], first(theme, ["pmd_service_charge_value", "service_charge_value"], 0))));
    state.service = {
      enabled: boolish(first(settings, ["pmd_service_charge_enabled", "service_charge_enabled"], first(theme, ["pmd_service_charge_enabled", "service_charge_enabled"], false)), false) && serviceValue > 0,
      type: serviceType === "fixed" ? "fixed" : "percentage",
      value: serviceValue,
      label: cleanText(first(settings, ["pmd_service_charge_label", "service_charge_label"], first(theme, ["pmd_service_charge_label", "service_charge_label"], copy().service)), copy().service)
    };

    var rawPresets = first(tipPayload, ["tip_presets", "tips_presets", "presets"], first(settings, ["tip_presets", "tips_presets"], [0, 5, 10]));
    var presets = Array.isArray(rawPresets) ? rawPresets : String(rawPresets || "").split(",");
    state.tips = {
      enabled: false,
      presets: []
    };
    state.tipPercent = 0;
    state.couponCode = "";
    state.couponDiscount = 0;

    if (!state.items.length) throw new Error("No menu items are available.");
  }

  function readBootstrapCache() {
    try {
      var raw = localStorage.getItem(bootstrapCacheKey);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || !cached.batch || !cached.savedAt) return null;
      if ((Date.now() - Number(cached.savedAt)) > bootstrapCacheMaxAgeMs) return null;
      return cached.batch;
    } catch (error) {
      return null;
    }
  }

  function writeBootstrapCache(batch) {
    try {
      localStorage.setItem(bootstrapCacheKey, JSON.stringify({
        savedAt: Date.now(),
        batch: batch
      }));
    } catch (error) {}
  }

  function loadBootstrap() {
    return requestJson(config.bootstrapUrl || "/api/v1/frontend-bootstrap-batch-r1")
      .then(function (batch) {
        applyBootstrapBatch(batch);
        writeBootstrapCache(batch);
        return batch;
      });
  }

  function failBoot(error) {
    if (!loading) return;
    loading.hidden = false;
    loading.innerHTML = '<div class="pmd-kiosk-loading__mark">!</div><strong>' + escapeHtml(copy().unavailable) +
      "</strong><span>" + escapeHtml(error && error.message ? error.message : copy().wait) +
      '</span><button type="button" class="pmd-kiosk-secondary" onclick="window.location.reload()">' + escapeHtml(copy().reload) + "</button>";
  }

  function finishBoot() {
    app.setAttribute("aria-busy", "false");
    if (loading) loading.hidden = true;
    renderAll();

    // Cached menu snapshots are visual-only first paint. Checkout/payment
    // side effects must run once, after the first usable menu is presented.
    if (bootPresented) return;
    bootPresented = true;
    if (state.order) {
      openCheckout();
    }
  }

  categoryList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-category-scroll]");
    if (!button) return;
    var id = button.getAttribute("data-category-scroll") || "";
    var section = grid.querySelector('[data-menu-category="' + CSS.escape(id) + '"]');
    if (section) {
      setActiveCategory(id);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  grid.addEventListener("click", function (event) {
    var adder = event.target.closest("[data-add-item]");
    if (adder) {
      event.preventDefault();
      event.stopPropagation();
      var addItem = findItem(adder.getAttribute("data-add-item"));
      if (!addItem) return;
      if (addItem.options.length) openItem(addItem);
      else addConfiguredItem(addItem, 1, [], "");
      return;
    }

    var opener = event.target.closest("[data-open-item]");
    if (!opener) return;
    openItem(findItem(opener.getAttribute("data-open-item")));
  });

  grid.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var opener = event.target.closest("[data-open-item]");
    if (!opener) return;
    event.preventDefault();
    openItem(findItem(opener.getAttribute("data-open-item")));
  });

  orderLines.addEventListener("click", function (event) {
    var minus = event.target.closest("[data-line-minus]");
    var plus = event.target.closest("[data-line-plus]");
    if (minus) updateLine(minus.getAttribute("data-line-minus"), -1);
    if (plus) updateLine(plus.getAttribute("data-line-plus"), 1);
  });

  searchInput.addEventListener("input", function () {
    state.search = searchInput.value || "";
    searchClear.hidden = !state.search;
    renderMenu();
  });

  searchClear.addEventListener("click", function () {
    state.search = "";
    searchInput.value = "";
    searchClear.hidden = true;
    searchInput.focus();
    renderMenu();
  });

  languageSelect.addEventListener("change", function () {
    state.locale = languageSelect.value || "en";
    renderAll();
    if (!modalLayer.hidden && state.currentModal && state.currentModal.type === "checkout") renderCheckout();
  });

  checkoutButton.addEventListener("click", openCheckout);
  compactOrder.addEventListener("click", openCheckout);
  clearOrder.addEventListener("click", clearCartState);

  modalLayer.addEventListener("click", function (event) {
    if (event.target.closest("[data-pmd-close-modal]")) { closeModal(); return; }

    var configured = event.target.closest("[data-add-configured]");
    if (configured) {
      var item = findItem(configured.getAttribute("data-add-configured"));
      if (!item) return;
      try {
        var selections = collectSelections(item);
        var noteNode = $("pmd-kiosk-item-note");
        addConfiguredItem(item, 1, selections, noteNode ? noteNode.value : "");
      } catch (error) {
        showToast(error.message || "Choose the required options.", true);
      }
      return;
    }

    if (event.target.closest("[data-kiosk-terminal-pay]")) {
      startTerminalPayment();
    }
  });

  applyCustomerMenuTheme({}, config.theme || {});
  if (config.hero) {
    document.documentElement.style.setProperty("--pmd-k-hero-image", 'url("' + String(config.hero).replace(/"/g, "%22") + '")');
    document.body.classList.add("pmd-kiosk-hero-ready");
    var initialHeroNode = $("pmd-kiosk-menu-hero");
    if (initialHeroNode) initialHeroNode.classList.add("is-ready");
  }
  restoreSession();

  // PMD_KIOSK_INSTANT_CACHE_V13
  // Paint the most recent canonical menu immediately, then revalidate in the
  // background. The fresh response always wins, so admin/menu edits still
  // appear automatically without asking the guest to wait.
  var cachedBootstrap = readBootstrapCache();
  var cacheHydrated = false;
  if (cachedBootstrap) {
    try {
      applyBootstrapBatch(cachedBootstrap);
      cacheHydrated = true;
      finishBoot();
    } catch (error) {
      cacheHydrated = false;
    }
  }

  loadBootstrap()
    .then(finishBoot)
    .catch(function (error) {
      if (!cacheHydrated) failBoot(error);
    });
})();
