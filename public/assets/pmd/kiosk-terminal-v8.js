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
      product: "Self-service ordering", orderType: "Order type", eatHere: "Eat here", takeAway: "Take away",
      menu: "Menu", all: "All items", search: "Search menu", items: "items", item: "item",
      add: "Add", customize: "Customize", order: "Your order", empty: "Your order is empty",
      emptyHint: "Choose something from the menu to begin.", clear: "Clear order", subtotal: "Subtotal",
      tax: "Tax", service: "Service charge", total: "Total", reviewPay: "Review & pay",
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
      add: "Hinzufügen", customize: "Anpassen", order: "Deine Bestellung", empty: "Deine Bestellung ist leer",
      emptyHint: "Wähle etwas aus der Speisekarte.", clear: "Bestellung leeren", subtotal: "Zwischensumme",
      tax: "Steuer", service: "Servicegebühr", total: "Gesamt", reviewPay: "Prüfen & bezahlen",
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
      add: "افزودن", customize: "انتخاب گزینه‌ها", order: "سفارش شما", empty: "سفارش شما خالی است",
      emptyHint: "برای شروع یک آیتم از منو انتخاب کنید.", clear: "پاک کردن سفارش", subtotal: "جمع جزء",
      tax: "مالیات", service: "هزینه سرویس", total: "جمع کل", reviewPay: "بررسی و پرداخت",
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
      add: "Ekle", customize: "Seçenekler", order: "Siparişiniz", empty: "Siparişiniz boş",
      emptyHint: "Başlamak için menüden bir ürün seçin.", clear: "Siparişi temizle", subtotal: "Ara toplam",
      tax: "Vergi", service: "Servis ücreti", total: "Toplam", reviewPay: "Kontrol et & öde",
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
    paypalButtons: null
  };

  var sessionKey = "pmd-kiosk-v8-session";
  var cartKey = "pmd-kiosk-v8-cart:" + String(config.session || "kiosk");
  var orderKey = "pmd-kiosk-v8-order:" + String(config.session || "kiosk");
  var paymentKey = "pmd-kiosk-v8-payment:" + String(config.session || "kiosk");

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
    }).filter(function (method) { return method.enabled && method.code; })
      .sort(function (a, b) { return a.priority - b.priority; });
  }

  function parseLocales(settings, theme) {
    var raw = first(theme, ["pmd_v2_enabled_languages", "enabled_languages"], first(settings, ["enabled_languages", "pmd_v2_enabled_languages"], ""));
    var list = Array.isArray(raw) ? raw : String(raw || "").split(",");
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
      cache: configOptions.method === "POST" ? "no-store" : "no-store",
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
    var afterCoupon = Math.max(0, Math.round((base - state.couponDiscount) * 100) / 100);
    var tip = Math.round(afterCoupon * Math.max(0, state.tipPercent) / 100 * 100) / 100;
    var payable = Math.round((afterCoupon + tip) * 100) / 100;

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
      if (state.category !== "all" && String(item.categoryId) !== String(state.category)) return false;
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

  function renderCategories() {
    var entries = [{ id: "all", name: copy().all }].concat(state.categories);
    categoryList.innerHTML = entries.map(function (entry) {
      var active = String(entry.id) === String(state.category);
      return '<button type="button" class="pmd-kiosk-category-button' + (active ? " is-active" : "") +
        '" data-category="' + escapeHtml(entry.id) + '" aria-pressed="' + (active ? "true" : "false") + '">' +
        escapeHtml(entry.name) + "</button>";
    }).join("");

    var current = entries.find(function (entry) { return String(entry.id) === String(state.category); }) || entries[0];
    $("pmd-kiosk-category-title").textContent = current.name;
  }

  function renderMenu() {
    var items = visibleItems();
    $("pmd-kiosk-result-count").textContent = items.length + " " + (items.length === 1 ? copy().item : copy().items);
    if (!items.length) {
      grid.innerHTML = '<div class="pmd-kiosk-no-results"><strong>' + escapeHtml(copy().noResults) + '</strong><p>' +
        escapeHtml(copy().noResultsHint) + "</p></div>";
      return;
    }

    grid.innerHTML = items.map(function (item) {
      var quantity = itemCartQuantity(item.id);
      var image = item.image
        ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" decoding="async">'
        : '<span class="pmd-kiosk-item__placeholder">' + escapeHtml(item.name.charAt(0).toUpperCase()) + "</span>";
      return '<article class="pmd-kiosk-item">' +
        '<button type="button" class="pmd-kiosk-item__image" data-open-item="' + escapeHtml(item.id) + '">' +
          image + (quantity > 0 ? '<span class="pmd-kiosk-item__qty">' + quantity + "</span>" : "") +
        "</button>" +
        '<div class="pmd-kiosk-item__body">' +
          '<div class="pmd-kiosk-item__copy"><h2>' + escapeHtml(item.name) + "</h2>" +
            (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
          "</div>" +
          '<div class="pmd-kiosk-item__foot"><span class="pmd-kiosk-item__price">' + escapeHtml(money(item.price)) + "</span>" +
            '<button type="button" class="pmd-kiosk-add" data-add-item="' + escapeHtml(item.id) + '">' +
              (item.options.length ? escapeHtml(copy().customize) : "+ " + escapeHtml(copy().add)) +
            "</button>" +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("");
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
    $("pmd-kiosk-checkout-label").textContent = copy().reviewPay;
    checkoutButton.disabled = !state.cart.length || state.busy;

    $("pmd-kiosk-compact-count").textContent = String(count);
    $("pmd-kiosk-compact-label").textContent = copy().order;
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
    if (!item.options.length) {
      addConfiguredItem(item, 1, [], "");
      return;
    }
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

  function tipOptionsHtml() {
    if (!state.tips.enabled) return "";
    var presets = state.tips.presets.length ? state.tips.presets : [0, 5, 10];
    if (presets.indexOf(0) < 0) presets = [0].concat(presets);
    return '<div style="margin-top:14px"><p class="pmd-kiosk-rail-label" style="padding:0 0 8px">' + escapeHtml(copy().tip) + "</p>" +
      '<div style="display:flex;gap:7px;flex-wrap:wrap">' +
      presets.slice(0, 5).map(function (value) {
        return '<button type="button" class="pmd-kiosk-secondary' + (number(value) === state.tipPercent ? ' is-active' : '') +
          '" data-tip="' + number(value) + '" style="' + (number(value) === state.tipPercent ? "border-color:var(--pmd-k-accent);background:var(--pmd-k-accent-soft)" : "") + '">' +
          (number(value) === 0 ? "0%" : number(value) + "%") + "</button>";
      }).join("") + "</div></div>";
  }

  function couponHtml() {
    return '<div style="margin-top:14px"><p class="pmd-kiosk-rail-label" style="padding:0 0 8px">' + escapeHtml(copy().coupon) + "</p>" +
      '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px">' +
      '<input id="pmd-kiosk-coupon-input" value="' + escapeHtml(state.couponCode) + '" style="min-height:48px;border:1px solid var(--pmd-k-line);border-radius:9px;padding:0 12px" placeholder="' + escapeHtml(copy().coupon) + '">' +
      '<button type="button" class="pmd-kiosk-secondary" data-apply-coupon>' + escapeHtml(copy().apply) + "</button></div></div>";
  }

  function checkoutTotalsHtml() {
    var totals = calculateTotals();
    return '<div class="pmd-kiosk-checkout-totals"><dl>' +
      "<div><dt>" + escapeHtml(copy().subtotal) + "</dt><dd>" + escapeHtml(money(totals.subtotal)) + "</dd></div>" +
      (totals.tax > 0 ? "<div><dt>" + escapeHtml(copy().tax) + "</dt><dd>" + escapeHtml(money(totals.tax)) + "</dd></div>" : "") +
      (totals.service > 0 ? "<div><dt>" + escapeHtml(state.service.label || copy().service) + "</dt><dd>" + escapeHtml(money(totals.service)) + "</dd></div>" : "") +
      (state.couponDiscount > 0 ? "<div><dt>" + escapeHtml(copy().coupon) + "</dt><dd>−" + escapeHtml(money(state.couponDiscount)) + "</dd></div>" : "") +
      (totals.tip > 0 ? "<div><dt>" + escapeHtml(copy().tip) + "</dt><dd>" + escapeHtml(money(totals.tip)) + "</dd></div>" : "") +
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
    var body = reviewLinesHtml() + checkoutTotalsHtml();

    if (!order) {
      openModal(
        '<header class="pmd-kiosk-modal__head"><div><p>' + escapeHtml(copy().review) + "</p><h2>" + escapeHtml(copy().review) +
        '</h2></div><button type="button" class="pmd-kiosk-modal__close" data-pmd-close-modal aria-label="Close">×</button></header>' +
        '<div class="pmd-kiosk-modal__body">' + body + status + "</div>" +
        '<footer class="pmd-kiosk-modal__foot"><button type="button" class="pmd-kiosk-secondary" data-pmd-close-modal>' +
        escapeHtml(copy().continueMenu) + '</button><button type="button" class="pmd-kiosk-primary" data-submit-order' + (state.busy ? " disabled" : "") + ">" +
        "<span>" + escapeHtml(state.busy ? copy().creating : copy().placeOrder) + "</span><span>›</span></button></footer>",
        true
      );
      return;
    }

    var methods = state.payments.map(function (method) {
      return '<button type="button" class="pmd-kiosk-payment" data-payment-method="' + escapeHtml(method.code) +
        '" data-payment-provider="' + escapeHtml(method.providerCode || "") + '">' +
        '<span class="pmd-kiosk-payment__mark">' + escapeHtml(paymentMark(method)) + '</span><span><strong>' +
        escapeHtml(paymentLabel(method)) + "</strong><small>" + escapeHtml(method.providerCode ? method.providerCode.replace(/_/g, " ") : "PayMyDine") +
        "</small></span></button>";
    }).join("");

    openModal(
      '<header class="pmd-kiosk-modal__head"><div><p>' + escapeHtml(copy().orderNumber) + " #" + escapeHtml(order.orderNumber || order.orderId) +
      "</p><h2>" + escapeHtml(copy().choosePayment) +
      '</h2></div><button type="button" class="pmd-kiosk-modal__close" data-pmd-close-modal aria-label="Close">×</button></header>' +
      '<div class="pmd-kiosk-modal__body">' + body + tipOptionsHtml() + couponHtml() +
      (methods ? '<div class="pmd-kiosk-payment-methods">' + methods + "</div>" : '<div class="pmd-kiosk-payment-status is-error">' + escapeHtml(copy().noPayments) + "</div>") +
      '<div id="pmd-kiosk-provider-slot"></div>' + status + "</div>",
      true
    );
  }

  function submitOrder() {
    if (state.busy || state.order || !state.cart.length) return Promise.resolve(state.order);
    state.busy = true;
    renderCheckout();

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
      items: state.cart.map(function (line) {
        var options = {};
        (line.selections || []).forEach(function (entry) { options[entry.groupName] = entry.valueId; });
        return {
          menu_id: Number(line.item.id) || line.item.id,
          name: line.item.name,
          quantity: line.quantity,
          price: line.unitPrice,
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
      payment_method: "card",
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
        state.busy = false;
        renderCheckout();
        return state.order;
      })
      .catch(function (error) {
        state.busy = false;
        renderCheckout(error.message || "The order could not be created.", true);
        throw error;
      });
  }

  function validateCoupon() {
    if (!state.order || state.busy) return;
    var input = $("pmd-kiosk-coupon-input");
    var code = cleanText(input ? input.value : state.couponCode, "");
    if (!code) return;
    state.busy = true;
    requestJson("/validate-coupon", { method: "POST", body: { code: code, subtotal: state.order.baseTotal, amount: state.order.baseTotal } })
      .then(function (data) {
        var payload = object(data.data || data);
        state.couponCode = code;
        state.couponDiscount = Math.min(state.order.baseTotal, Math.max(0, number(first(payload, ["discount_amount", "discount", "amount"], 0))));
        state.busy = false;
        renderCheckout(data.message || copy().couponApplied, false);
      })
      .catch(function (error) {
        state.couponDiscount = 0;
        state.busy = false;
        renderCheckout(error.message || "Coupon could not be applied.", true);
      });
  }

  function providerCode(method) {
    var provider = String(method.providerCode || "").toLowerCase().replace(/[\s-]+/g, "_");
    if (provider) return provider;
    if (method.code === "wero") return "wero";
    if (method.code === "paypal") return "paypal";
    if (["card", "apple_pay", "google_pay"].indexOf(method.code) >= 0) return "stripe";
    return method.code;
  }

  function returnUrl() {
    var url = new URL(config.returnUrl || "/kiosk/", window.location.origin);
    url.searchParams.set("pmd_kiosk", "1");
    url.searchParams.set("pmd_payment_return", "1");
    url.searchParams.set("kiosk_session", String(config.session || "kiosk"));
    url.searchParams.set("kiosk_order_type", config.serviceMode === "pickup" ? "pickup" : "eat_in");
    return url.toString();
  }

  function paymentEndpoint(method) {
    var provider = providerCode(method);
    var code = String(method.code || "card").toLowerCase();
    var suffix = {
      card: "card", paypal: "paypal", wero: "wero",
      apple_pay: "apple-pay", google_pay: "google-pay"
    };
    if (provider === "worldline") return "/api/v1/payments/worldline/runtime/" + (suffix[code] || "card") + "/create-session";
    if (provider === "vr_payment" || provider === "vrpayment") return "/api/v1/payments/vr-payment/" + (suffix[code] || "card") + "/create-session";
    if (provider === "sumup") return "/api/v1/payments/sumup/self-service-checkout";
    if (code === "wero") return "/api/v1/payments/wero/create-session";
    return "/api/v1/payments/card/create-session";
  }

  function paymentItems() {
    return state.cart.map(function (line) {
      return {
        id: String(line.item.id),
        name: line.item.name,
        quantity: line.quantity,
        price: line.unitPrice
      };
    });
  }

  function savePendingPayment(method, response) {
    var pending = {
      provider: String(response.provider || response.provider_code || providerCode(method) || ""),
      providerCode: providerCode(method),
      methodCode: method.code,
      orderId: state.order.orderId,
      amount: calculateTotals().payable,
      tipAmount: calculateTotals().tip,
      couponCode: state.couponCode || null,
      couponDiscount: state.couponDiscount,
      hostedCheckoutId: response.hosted_checkout_id ? String(response.hosted_checkout_id) : null,
      checkoutId: response.checkout_id ? String(response.checkout_id) : null,
      paymentLinkId: response.payment_link_id ? String(response.payment_link_id) : null,
      sessionId: response.session_id ? String(response.session_id) : null,
      transactionId: response.transaction_id ? String(response.transaction_id) : null,
      providerReference: response.provider_reference ? String(response.provider_reference) : null,
      merchantReference: response.merchant_reference ? String(response.merchant_reference) : null,
      createdAt: Date.now()
    };
    try { sessionStorage.setItem(paymentKey, JSON.stringify(pending)); } catch (error) {}
    return pending;
  }

  function settleExisting(methodCode, provider, reference, amount, tip, couponCode, couponDiscount) {
    return requestJson(config.payExistingUrl || "/api/v1/orders/pay-existing", {
      method: "POST",
      body: {
        order_id: state.order.orderId,
        payment_method: methodCode,
        payment_method_raw: methodCode,
        payment_provider: provider || null,
        provider: provider || null,
        payment_reference: reference || null,
        amount: amount,
        tip_amount: tip || 0,
        coupon_code: couponCode || null,
        coupon_discount: couponDiscount || 0,
        selected_items: null,
        payer_label: "PayMyDine Kiosk",
        payment_intent_token: reference || null,
        idempotency_key: reference || null,
        split_mode: null,
        split_people: null,
        share_percent: null,
        guest_session_id: String(config.session || "kiosk"),
        location_id: null,
        table_id: null,
        table_no: null,
        qr: null
      }
    });
  }

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
    window.setTimeout(function () {
      notifyNativeOrderComplete(state.order && state.order.orderId);
    }, 180);
  }

  function startHostedPayment(method) {
    if (!state.order || state.busy) return;
    state.busy = true;
    renderCheckout(copy().processing, false);

    var totals = calculateTotals();
    var provider = providerCode(method);
    var merchantReference = "PMD-KIOSK-" + state.order.orderId + "-" + Date.now();
    var payload = {
      amount: totals.payable,
      currency: String(state.restaurant.currency || "EUR").toUpperCase(),
      return_url: returnUrl(),
      cancel_url: window.location.href,
      customer_email: "",
      merchant_reference: merchantReference,
      order_id: state.order.orderId,
      description: "PayMyDine kiosk order #" + state.order.orderId,
      payment_method: method.code,
      provider: provider,
      guest_session_id: String(config.session || "kiosk"),
      table_id: null,
      table_no: null,
      qr: null,
      tip_amount: totals.tip,
      coupon_code: state.couponCode || null,
      coupon_discount: state.couponDiscount,
      selected_items: null,
      payer_label: "PayMyDine Kiosk",
      items: paymentItems(),
      integration_preference: provider === "vr_payment" || provider === "vrpayment" ? "lightbox" : undefined
    };

    requestJson(paymentEndpoint(method), { method: "POST", body: payload })
      .then(function (response) {
        state.busy = false;
        var pending = savePendingPayment(method, Object.assign({}, response, { merchant_reference: merchantReference }));
        var reference = String(response.payment_intent_id || response.payment_id || response.transaction_id || response.transaction_code || response.provider_reference || "");
        var redirect = response.redirect_url || response.redirectUrl || response.checkout_url || response.checkoutUrl || response.approval_url || response.approvalUrl || response.url || null;
        var flow = String(response.flow || "").toLowerCase();

        if ((provider === "vr_payment" || provider === "vrpayment") && flow === "lightbox" && response.script_url && response.payment_method_configuration_id) {
          loadScript(String(response.script_url), "pmd-kiosk-vr-payment").then(function () {
            if (!window.LightboxCheckoutHandler || typeof window.LightboxCheckoutHandler.startPayment !== "function") {
              throw new Error("VR Payment lightbox could not be initialized.");
            }
            window.LightboxCheckoutHandler.startPayment(Number(response.payment_method_configuration_id), function (error) {
              renderCheckout(String(error && error.message || "VR Payment reported an error."), true);
            });
            renderCheckout(copy().processing, false);
          }).catch(function (error) {
            renderCheckout(error.message || copy().paymentFailed, true);
          });
          return;
        }

        if (redirect) {
          window.location.assign(String(redirect));
          return;
        }

        if (reference) {
          settleExisting(method.code, pending.providerCode, reference, totals.payable, totals.tip, state.couponCode, state.couponDiscount)
            .then(function () { finishOrder(copy().paidHint); })
            .catch(function (error) { renderCheckout(error.message || copy().paymentFailed, true); });
          return;
        }

        renderCheckout(String(response.message || copy().paymentPending), false);
      })
      .catch(function (error) {
        state.busy = false;
        renderCheckout(error.message || copy().paymentFailed, true);
      });
  }

  function loadScript(src, marker) {
    return new Promise(function (resolve, reject) {
      if (!src) { reject(new Error("Payment script URL is missing.")); return; }
      var prior = document.querySelector('script[data-pmd-script="' + marker + '"]');
      if (prior) {
        prior.addEventListener("load", resolve, { once: true });
        prior.addEventListener("error", function () { reject(new Error("Payment script could not be loaded.")); }, { once: true });
        if (marker === "pmd-kiosk-paypal" && window.paypal) resolve();
        if (marker === "pmd-kiosk-vr-payment" && window.LightboxCheckoutHandler) resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.pmdScript = marker;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Payment script could not be loaded.")); };
      document.head.appendChild(script);
    });
  }

  function startPayPal(method) {
    if (!state.order || state.busy) return;
    var slot = $("pmd-kiosk-provider-slot");
    if (!slot) return;
    slot.innerHTML = '<div class="pmd-kiosk-paypal-box"><div id="pmd-kiosk-paypal-buttons"></div><div id="pmd-kiosk-paypal-message" class="pmd-kiosk-payment-status">' +
      escapeHtml(copy().processing) + "</div></div>";
    var message = $("pmd-kiosk-paypal-message");
    var totals = calculateTotals();

    requestJson(config.paypalConfigUrl || "/api/v1/payments/config-public")
      .then(function (publicConfig) {
        var enabled = publicConfig.paypalEnabled !== undefined ? Boolean(publicConfig.paypalEnabled) : boolish(publicConfig.paypal_enabled, true);
        var clientId = String(publicConfig.paypalClientId || publicConfig.paypal_client_id || "").trim();
        var currency = String(publicConfig.currency || state.restaurant.currency || "EUR").toUpperCase();
        if (!enabled || !clientId) throw new Error("PayPal is not configured for this restaurant.");
        var params = new URLSearchParams({
          "client-id": clientId,
          currency: currency,
          intent: "capture",
          components: "buttons",
          "enable-funding": "paypal,card"
        });
        return loadScript("https://www.paypal.com/sdk/js?" + params.toString(), "pmd-kiosk-paypal");
      })
      .then(function () {
        if (!window.paypal || !window.paypal.Buttons) throw new Error("PayPal Buttons are unavailable.");
        message.hidden = true;
        state.paypalButtons = window.paypal.Buttons({
          fundingSource: method.code === "card" ? "card" : "paypal",
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 48, tagline: false },
          createOrder: function () {
            return requestJson(config.paypalCreateUrl || "/api/v1/payments/paypal/create-order", {
              method: "POST",
              body: {
                amount: totals.payable,
                currency: String(state.restaurant.currency || "EUR").toUpperCase(),
                payment_method: method.code,
                order_id: state.order.orderId,
                items: paymentItems(),
                tableNumber: null,
                table_id: null,
                table_no: null,
                qr: null,
                payment_intent_token: null
              }
            }).then(function (data) {
              var id = String(data.orderID || data.orderId || data.id || (data.paypal && data.paypal.id) || "");
              if (!id) throw new Error("PayPal did not return an order ID.");
              return id;
            });
          },
          onApprove: function (data) {
            state.busy = true;
            message.hidden = false;
            message.textContent = copy().processing;
            return requestJson(config.paypalCaptureUrl || "/api/v1/payments/paypal/capture-order", {
              method: "POST",
              body: {
                orderID: data.orderID || data.orderId,
                orderId: data.orderID || data.orderId,
                paymentData: {
                  amount: totals.payable,
                  currency: String(state.restaurant.currency || "EUR").toUpperCase(),
                  payment_method: method.code,
                  order_id: state.order.orderId,
                  items: paymentItems(),
                  tableNumber: null,
                  table_id: null,
                  table_no: null,
                  qr: null,
                  payment_intent_token: null
                }
              }
            }).then(function (capture) {
              var reference = String(capture.transactionId || capture.captureID || capture.orderID || data.orderID || "");
              if (!reference) throw new Error("PayPal capture reference is missing.");
              return settleExisting(method.code, "paypal", reference, totals.payable, totals.tip, state.couponCode, state.couponDiscount);
            }).then(function () {
              state.busy = false;
              finishOrder(copy().paidHint);
            }).catch(function (error) {
              state.busy = false;
              message.classList.add("is-error");
              message.textContent = error.message || copy().paymentFailed;
            });
          },
          onCancel: function () {
            message.hidden = false;
            message.textContent = "PayPal checkout was cancelled.";
          },
          onError: function (error) {
            message.hidden = false;
            message.classList.add("is-error");
            message.textContent = String(error && error.message || copy().paymentFailed);
          }
        });
        return state.paypalButtons.render(document.getElementById("pmd-kiosk-paypal-buttons"));
      })
      .catch(function (error) {
        message.hidden = false;
        message.classList.add("is-error");
        message.textContent = error.message || copy().paymentFailed;
      });
  }

  function startCashPayment() {
    if (!state.order) return;
    renderCheckout(copy().payCounterHint, false);
    window.setTimeout(function () { notifyNativeOrderComplete(state.order.orderId); }, 280);
  }

  function startPayment(method) {
    if (!method || !state.order || state.busy) return;
    var code = String(method.code || "").toLowerCase();
    var provider = providerCode(method);
    if (code === "cash" || code === "cod") { startCashPayment(); return; }
    if (code === "paypal" && (!provider || provider === "paypal")) { startPayPal(method); return; }
    startHostedPayment(method);
  }

  function pendingPayment() {
    try { return JSON.parse(sessionStorage.getItem(paymentKey) || "null"); }
    catch (error) { return null; }
  }

  function verifyPendingOnce(pending) {
    var provider = String(pending.provider || pending.providerCode || "").toLowerCase().replace(/-/g, "_");
    var endpoint = "";
    var payload = {};
    if (provider === "worldline") {
      endpoint = "/api/v1/payments/worldline/runtime/status";
      payload = { hosted_checkout_id: pending.hostedCheckoutId || "", order_id: pending.orderId || "" };
    } else if (provider === "sumup") {
      endpoint = "/api/v1/payments/sumup/checkout-status";
      payload = { checkout_id: pending.checkoutId || "" };
    } else if (provider === "square") {
      endpoint = "/api/v1/payments/square/checkout-status";
      payload = { payment_link_id: pending.paymentLinkId || "" };
    } else if (provider === "vr_payment" || provider === "vrpayment") {
      endpoint = "/api/v1/payments/vr-payment/return-status";
      payload = {
        session_id: pending.sessionId || "",
        transaction_id: pending.transactionId || "",
        provider_reference: pending.providerReference || "",
        merchant_reference: pending.merchantReference || ""
      };
    } else if (provider === "wero" || provider === "stripe" || provider === "card") {
      endpoint = "/api/v1/payments/wero/checkout-status";
      payload = { session_id: pending.sessionId || "" };
    }
    if (!endpoint) return Promise.resolve({ paid: false, pending: true, reference: pending.providerReference || null });
    return requestJson(endpoint, { method: "POST", body: payload }).then(function (data) {
      var status = String(data.status || data.payment_status || "").toLowerCase();
      return {
        paid: Boolean(data.is_paid || status === "paid" || status === "successful" || status === "completed" || status === "captured"),
        pending: status === "pending" || status === "processing" || status === "authorized" || status === "redirected" || !status,
        cancelled: ["cancelled", "canceled", "expired", "failed", "rejected"].indexOf(status) >= 0,
        reference: String(data.payment_intent_id || data.payment_id || data.transaction_code || data.transaction_id || data.order_id ||
          pending.providerReference || pending.transactionId || pending.sessionId || pending.checkoutId || pending.hostedCheckoutId || "")
      };
    });
  }

  function handlePaymentReturn() {
    var pending = pendingPayment();
    if (!pending || !state.order) {
      openCheckout();
      renderCheckout(copy().paymentFailed, true);
      return;
    }

    state.currentModal = { type: "checkout" };
    renderCheckout(copy().processing, false);
    var attempts = 0;

    function check() {
      attempts += 1;
      verifyPendingOnce(pending).then(function (result) {
        if (result.paid) {
          return settleExisting(
            pending.methodCode,
            pending.providerCode || pending.provider,
            result.reference,
            pending.amount,
            pending.tipAmount,
            pending.couponCode,
            pending.couponDiscount
          ).then(function () { finishOrder(copy().paidHint); });
        }
        if (result.cancelled) {
          renderCheckout(copy().paymentFailed, true);
          return;
        }
        if (attempts < 8) {
          window.setTimeout(check, 900);
        } else {
          renderCheckout(copy().paymentPending, false);
        }
      }).catch(function (error) {
        if (attempts < 4) window.setTimeout(check, 900);
        else renderCheckout(error.message || copy().paymentFailed, true);
      });
    }

    check();
  }

  function loadBootstrap() {
    return requestJson(config.bootstrapUrl || "/api/v1/frontend-bootstrap-batch-r1")
      .then(function (batch) {
        var data = object(batch.data);
        var settings = unwrap(data.settings);
        var restaurant = unwrap(data.restaurant);
        var theme = unwrap(data.theme);
        var vat = unwrap(data.vatSettings);
        var tipPayload = unwrap(data.tipSettings);
        var normalizedMenu = normalizeMenu(data.menu);

        state.settings = settings;
        state.theme = theme;
        state.items = normalizedMenu.items;
        state.categories = normalizedMenu.categories;
        state.payments = normalizePayments(data.payments);

        state.restaurant = {
          name: cleanText(first(settings, ["pmd_restaurant_identity_name", "site_name", "business_name", "restaurant_name"],
            first(restaurant, ["name", "restaurant_name"], "PayMyDine")), "PayMyDine"),
          logo: normalizeAsset(first(settings, ["pmd_restaurant_identity_logo", "site_logo_url", "logo_url", "site_logo", "logo"], "")),
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
          enabled: boolish(first(tipPayload, ["tips_enabled", "tip_enabled", "enabled"], first(settings, ["tips_enabled", "tip_enabled"], true)), true),
          presets: presets.map(function (value) { return Math.max(0, number(value)); }).filter(function (value, index, all) { return all.indexOf(value) === index; })
        };

        if (!state.items.length) throw new Error("No menu items are available.");
      });
  }

  function failBoot(error) {
    loading.innerHTML = '<div class="pmd-kiosk-loading__mark">!</div><strong>' + escapeHtml(copy().unavailable) +
      "</strong><span>" + escapeHtml(error && error.message ? error.message : copy().wait) +
      '</span><button type="button" class="pmd-kiosk-secondary" onclick="window.location.reload()">' + escapeHtml(copy().reload) + "</button>";
  }

  function finishBoot() {
    app.setAttribute("aria-busy", "false");
    loading.hidden = true;
    renderAll();
    if (config.paymentReturn) {
      handlePaymentReturn();
    } else if (state.order) {
      openCheckout();
    }
  }

  categoryList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.getAttribute("data-category") || "all";
    renderCategories();
    renderMenu();
  });

  grid.addEventListener("click", function (event) {
    var opener = event.target.closest("[data-open-item]");
    var adder = event.target.closest("[data-add-item]");
    var id = opener ? opener.getAttribute("data-open-item") : adder ? adder.getAttribute("data-add-item") : "";
    if (!id) return;
    openItem(findItem(id));
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

    if (event.target.closest("[data-submit-order]")) {
      submitOrder().catch(function () {});
      return;
    }

    var tipButton = event.target.closest("[data-tip]");
    if (tipButton) {
      state.tipPercent = Math.max(0, number(tipButton.getAttribute("data-tip")));
      renderCheckout();
      return;
    }

    if (event.target.closest("[data-apply-coupon]")) {
      validateCoupon();
      return;
    }

    var paymentButton = event.target.closest("[data-payment-method]");
    if (paymentButton) {
      var code = paymentButton.getAttribute("data-payment-method");
      var provider = paymentButton.getAttribute("data-payment-provider") || "";
      var method = state.payments.find(function (entry) {
        return entry.code === code && String(entry.providerCode || "") === String(provider);
      }) || state.payments.find(function (entry) { return entry.code === code; });
      startPayment(method);
    }
  });

  restoreSession();
  loadBootstrap().then(finishBoot).catch(failBoot);
})();
