(function () {
  "use strict";

  var configNode = document.getElementById("pmd-booking-config");
  if (!configNode) return;

  var config;
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    return;
  }

  var labels = config.labels || {};
  var languageNav = document.querySelector(".pmd-booking-language");
  var titleMain = document.getElementById("pmd-booking-title-main");
  var titleSub = document.getElementById("pmd-booking-title-sub");
  var descriptionMeta = document.querySelector('meta[name="description"]');
  var form = document.getElementById("pmd-booking-form");
  var workspace = document.querySelector(".pmd-booking-workspace");
  var dateInput = document.getElementById("pmd-booking-date");
  var dateStrip = document.getElementById("pmd-booking-date-strip");
  var datePrev = document.querySelector("[data-pmd-date-prev]");
  var dateNext = document.querySelector("[data-pmd-date-next]");
  var guestInput = document.getElementById("pmd-booking-guests");
  var partyCopy = document.getElementById("pmd-booking-party-copy");
  var timeInput = document.getElementById("pmd-booking-time");
  var times = document.getElementById("pmd-booking-times");
  var opening = document.getElementById("pmd-booking-opening");
  var submit = document.getElementById("pmd-booking-submit");
  var errors = document.getElementById("pmd-booking-errors");
  var summaryDate = document.getElementById("pmd-booking-summary-date");
  var summaryTime = document.getElementById("pmd-booking-summary-time");
  var summaryParty = document.getElementById("pmd-booking-summary-party");
  var success = document.getElementById("pmd-booking-success");
  var successMessage = document.getElementById("pmd-booking-success-message");
  var successReference = document.getElementById("pmd-booking-reference");
  var successDate = document.getElementById("pmd-booking-success-date");
  var successTime = document.getElementById("pmd-booking-success-time");
  var successParty = document.getElementById("pmd-booking-success-party");
  var successGuarantee = document.getElementById("pmd-booking-success-guarantee");
  var successGuaranteeAmount = document.getElementById("pmd-booking-success-guarantee-amount");
  var successGuaranteeTerms = document.getElementById("pmd-booking-success-guarantee-terms");
  var calendarLink = document.getElementById("pmd-booking-calendar");
  var manageLink = document.getElementById("pmd-booking-manage-link");
  var manageExistingLink = document.getElementById("pmd-booking-manage-existing");
  var manageTopLink = document.getElementById("pmd-booking-manage-top");
  var csrf = document.querySelector('meta[name="csrf-token"]');
  var guaranteeSection = document.getElementById("pmd-booking-guarantee");
  var guaranteeTerms = document.getElementById("pmd-booking-guarantee-terms");
  var guaranteeTotal = document.getElementById("pmd-booking-guarantee-total");
  var guaranteeUnavailable = document.getElementById("pmd-booking-guarantee-unavailable");
  var guaranteeCardWrap = document.getElementById("pmd-booking-guarantee-card-wrap");
  var guaranteeCardNode = document.getElementById("pmd-booking-guarantee-card");
  var guaranteeCardError = document.getElementById("pmd-booking-guarantee-card-error");
  var guaranteeConsent = document.getElementById("pmd-booking-guarantee-consent");
  var guaranteeConsentCopy = document.getElementById("pmd-booking-guarantee-consent-copy");

  if (!form || !dateInput || !guestInput || !timeInput || !times || !submit) return;

  var locale = config.localeTag || config.locale || "en-GB";
  var state = {
    date: config.today,
    dateWindowStart: config.today,
    guests: Math.min(2, Number(config.maxGuests || 2)),
    time: "",
    duration: Number(config.stayMinutes || 90),
    period: "",
    slots: [],
    loading: false
  };
  var availabilityAbort = null;
  var dateStatusAbort = null;
  var stripePromise = null;
  var stripeClient = null;
  var stripeCard = null;
  var guaranteeCardComplete = false;
  var guaranteeCardLoadFailed = false;
  var dateStatuses = {};
  var availabilityCache = Object.create(null);
  var capacityCache = Object.create(null);

  function availabilityKey(date, guests) {
    return String(guests) + "|" + String(date);
  }

  function cacheAvailability(date, guests, payload) {
    if (!date || !payload) return;
    availabilityCache[availabilityKey(date, guests)] = {
      opening: payload.opening || {},
      duration: Number(payload.duration || config.stayMinutes || 90),
      interval: Number(payload.interval || 30),
      slots: Array.isArray(payload.slots) ? payload.slots : []
    };
  }

  function tableIdsSupportGuests(tableIds, guests) {
    if (!Array.isArray(tableIds) || !tableIds.length) return false;

    var rules = config.tableRules || {};

    for (var index = 0; index < tableIds.length; index += 1) {
      var single = rules[String(tableIds[index])] || {};
      var singleMin = Math.max(1, Number(single.min || 1));
      var singleMax = Math.max(singleMin, Number(single.max || singleMin));

      if (guests >= singleMin && guests <= singleMax) {
        return true;
      }
    }

    var remaining = guests;

    for (var joinIndex = 0; joinIndex < tableIds.length; joinIndex += 1) {
      var rule = rules[String(tableIds[joinIndex])] || {};
      if (!rule.joinable) continue;

      var min = Math.max(1, Number(rule.min || 1));
      var max = Math.max(min, Number(rule.max || min));
      if (remaining < min) continue;

      remaining -= max;
      if (remaining <= 0) return true;
    }

    return false;
  }

  function cacheCapacity(date, payload) {
    if (!date || !payload || !Array.isArray(payload.capacity_slots)) return;

    capacityCache[String(date)] = {
      opening: payload.opening || {},
      duration: Number(payload.duration || config.stayMinutes || 90),
      interval: Number(payload.interval || 30),
      capacity_slots: payload.capacity_slots
    };
  }

  function availabilityFromCapacity(date, guests) {
    var capacity = capacityCache[String(date)];
    if (!capacity) return null;

    return {
      opening: capacity.opening || {},
      duration: Number(capacity.duration || config.stayMinutes || 90),
      interval: Number(capacity.interval || 30),
      slots: (capacity.capacity_slots || []).filter(function (slot) {
        return tableIdsSupportGuests(slot.table_ids, guests);
      })
    };
  }

  function cachedAvailability(date, guests) {
    var key = availabilityKey(date, guests);
    if (availabilityCache[key]) return availabilityCache[key];

    var derived = availabilityFromCapacity(date, guests);
    if (derived) {
      availabilityCache[key] = derived;
      return derived;
    }

    return null;
  }

  function syncDateStatusesForGuests(guests) {
    dateStatuses = {};

    Object.keys(capacityCache).forEach(function (date) {
      var payload = availabilityFromCapacity(date, guests);
      if (!payload) return;

      if (!payload.opening || !payload.opening.enabled) {
        dateStatuses[date] = "closed";
      } else if (!payload.slots.length) {
        dateStatuses[date] = "full";
      } else {
        dateStatuses[date] = "available";
      }
    });
  }

  function dateWindowIsCached(startValue, guests, count) {
    var start = dateFromIso(startValue);
    for (var index = 0; index < count; index += 1) {
      var date = new Date(start);
      date.setDate(start.getDate() + index);
      var value = isoDate(date);
      if (value > String(config.maxDate)) break;
      if (!cachedAvailability(value, guests)) return false;
    }
    return true;
  }

  function hydrateAvailabilitySeed(rows, guests) {
    if (!Array.isArray(rows)) return;

    rows.forEach(function (row) {
      if (!row || !row.date) return;

      cacheCapacity(row.date, row);
      cacheAvailability(row.date, guests, {
        opening: row.opening || {},
        duration: row.duration,
        interval: row.interval,
        slots: row.slots
      });
    });

    syncDateStatusesForGuests(guests);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function isoDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function dateFromIso(value) {
    var parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function clampGuests(value) {
    var max = Math.max(1, Number(config.maxGuests || 20));
    var number = Number(value || 1);
    if (!Number.isFinite(number)) number = 1;
    return Math.max(1, Math.min(max, Math.round(number)));
  }

  function partyLabel(count) {
    var suffix = count === 1 ? (labels.guest || "guest") : (labels.guests || "guests");
    return count + " " + suffix;
  }

  function translateStaticContent() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-i18n]"), function (node) {
      var key = node.getAttribute("data-pmd-i18n");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.textContent = labels[key];
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-i18n-placeholder]"), function (node) {
      var key = node.getAttribute("data-pmd-i18n-placeholder");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.setAttribute("placeholder", labels[key]);
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-i18n-aria]"), function (node) {
      var key = node.getAttribute("data-pmd-i18n-aria");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.setAttribute("aria-label", labels[key]);
      }
    });

    if (titleMain) titleMain.textContent = labels.find_table || "";
    if (titleSub) titleSub.textContent = (labels.at || "at") + " " + (config.restaurantName || "");
    if (descriptionMeta) descriptionMeta.setAttribute("content", labels.intro || "");
    document.title = (labels.reservations || "Reservations") + " · " + (config.restaurantName || "");
  }

  function activeLanguageCode() {
    return String(config.locale || "").toLowerCase().slice(0, 2);
  }

  function currentGuaranteeConfig() {
    var base = config.guarantee || {};
    var packs = config.guaranteeByLocale || {};
    var localized = packs[activeLanguageCode()] || {};
    return Object.assign({}, base, localized, {
      setupUrl: base.setupUrl || "/book/guarantee/setup"
    });
  }

  function guaranteeRequired() {
    var guarantee = currentGuaranteeConfig();
    return Boolean(
      guarantee.enabled &&
      Number(guarantee.amountPerGuestCents || 0) > 0 &&
      state.guests >= Math.max(1, Number(guarantee.minGuests || 1))
    );
  }

  function guaranteeMoney(cents, currency) {
    var amount = Math.max(0, Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: String(currency || "EUR").toUpperCase()
      }).format(amount);
    } catch (_) {
      return amount.toFixed(2) + " " + String(currency || "EUR").toUpperCase();
    }
  }

  function syncSubmitState() {
    var guarantee = currentGuaranteeConfig();
    var guaranteeBlocked = guaranteeRequired() && (
      !guarantee.providerReady ||
      !guaranteeCardComplete ||
      !guaranteeConsent ||
      !guaranteeConsent.checked ||
      guaranteeCardLoadFailed
    );

    submit.disabled = !state.time || state.loading || guaranteeBlocked;
  }

  function loadStripeRuntime() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripePromise) return stripePromise;

    stripePromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src^="https://js.stripe.com/v3"]');
      if (existing) {
        existing.addEventListener("load", function () {
          window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe could not be loaded."));
        }, { once: true });
        existing.addEventListener("error", function () {
          reject(new Error("Stripe could not be loaded."));
        }, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = function () {
        window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe could not be loaded."));
      };
      script.onerror = function () {
        reject(new Error("Stripe could not be loaded."));
      };
      document.head.appendChild(script);
    });

    return stripePromise;
  }

  function ensureStripeCard() {
    var guarantee = currentGuaranteeConfig();
    if (!guaranteeRequired() || !guarantee.providerReady) {
      return Promise.resolve(null);
    }
    if (stripeCard && stripeClient) return Promise.resolve(stripeCard);

    guaranteeCardLoadFailed = false;

    return loadStripeRuntime().then(function (StripeFactory) {
      if (!stripeClient) {
        stripeClient = StripeFactory(String(guarantee.publishableKey || ""));
      }

      if (!stripeClient) throw new Error("Stripe could not be initialized.");

      if (!stripeCard) {
        var elements = stripeClient.elements();
        stripeCard = elements.create("card", {
          hidePostalCode: false,
          style: {
            base: {
              fontSize: "16px",
              fontFamily: "Arial, sans-serif"
            }
          }
        });
        stripeCard.mount("#pmd-booking-guarantee-card");
        stripeCard.on("change", function (event) {
          guaranteeCardComplete = Boolean(event && event.complete);
          if (guaranteeCardError) {
            guaranteeCardError.textContent = event && event.error
              ? String(event.error.message || "")
              : "";
          }
          syncSubmitState();
        });
      }

      return stripeCard;
    }).catch(function (error) {
      guaranteeCardLoadFailed = true;
      guaranteeCardComplete = false;
      if (guaranteeCardError) {
        guaranteeCardError.textContent = error && error.message
          ? error.message
          : (labels.guarantee_unavailable || "Card guarantee is unavailable.");
      }
      syncSubmitState();
      throw error;
    });
  }

  function renderGuarantee() {
    if (!guaranteeSection) return;

    var guarantee = currentGuaranteeConfig();
    var required = guaranteeRequired();

    guaranteeSection.hidden = !required;

    if (!required) {
      if (guaranteeConsent) guaranteeConsent.checked = false;
      var normalLabel = submit.querySelector("span");
      if (normalLabel) normalLabel.textContent = labels.book_table || "Request this table";
      syncSubmitState();
      return;
    }

    if (guaranteeTerms) guaranteeTerms.textContent = String(guarantee.termsText || "");
    if (guaranteeConsentCopy) guaranteeConsentCopy.textContent = String(guarantee.consentText || "");
    if (guaranteeTotal) {
      guaranteeTotal.textContent = guaranteeMoney(
        Number(guarantee.amountPerGuestCents || 0) * state.guests,
        guarantee.currency || "EUR"
      );
    }

    if (guaranteeUnavailable) guaranteeUnavailable.hidden = Boolean(guarantee.providerReady);
    if (guaranteeCardWrap) guaranteeCardWrap.hidden = !guarantee.providerReady;

    var label = submit.querySelector("span");
    if (label) {
      label.textContent = String(
        guarantee.buttonText ||
        labels.book_table ||
        "Confirm reservation"
      );
    }

    if (guarantee.providerReady) {
      ensureStripeCard().catch(function () {});
    }

    syncSubmitState();
  }

  function verifyGuaranteeForBooking(payload) {
    var guarantee = currentGuaranteeConfig();

    payload._pmd_booking_locale = activeLanguageCode();

    if (!guaranteeRequired()) {
      return Promise.resolve(payload);
    }

    if (!guarantee.providerReady) {
      return Promise.reject(new Error(
        labels.guarantee_unavailable || "Card guarantee is unavailable."
      ));
    }

    if (!guaranteeConsent || !guaranteeConsent.checked) {
      return Promise.reject(new Error(
        guarantee.consentText || "Please accept the card guarantee terms."
      ));
    }

    if (!guaranteeCardComplete) {
      return Promise.reject(new Error("Please complete the card details."));
    }

    return ensureStripeCard().then(function () {
      var setupPayload = {
        first_name: payload.first_name || "",
        last_name: payload.last_name || "",
        email: payload.email || "",
        reserve_date: state.date,
        reserve_time: state.time,
        guest_num: state.guests,
        locale: activeLanguageCode()
      };

      return fetch(guarantee.setupUrl || "/book/guarantee/setup", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
        },
        body: JSON.stringify(setupPayload)
      });
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (setup) {
        if (!response.ok || !setup.success || !setup.client_secret) {
          var messages = responseErrors(setup);
          throw new Error(messages[0] || "Card verification could not be started.");
        }
        return setup;
      });
    }).then(function (setup) {
      if (!stripeClient || !stripeCard) {
        throw new Error("Card verification is unavailable.");
      }

      var holderName = String(
        (payload.first_name || "") + " " + (payload.last_name || "")
      ).trim();

      return stripeClient.confirmCardSetup(setup.client_secret, {
        payment_method: {
          card: stripeCard,
          billing_details: {
            name: holderName,
            email: payload.email || ""
          }
        }
      });
    }).then(function (result) {
      if (result && result.error) {
        throw new Error(result.error.message || "Card verification failed.");
      }

      var intent = result && result.setupIntent ? result.setupIntent : null;
      if (!intent || intent.status !== "succeeded" || !intent.id) {
        throw new Error("Please complete the card verification.");
      }

      payload._pmd_guarantee_setup_intent = String(intent.id);
      payload._pmd_guarantee_terms_accepted = "1";
      return payload;
    });
  }

  function applyLanguage(code, updateUrl) {
    code = String(code || "").toLowerCase().slice(0, 2);
    var packs = config.labelsByLocale || {};
    if (!packs[code]) return false;

    config.locale = code;
    labels = packs[code];
    config.labels = labels;
    locale = (config.localeTags && config.localeTags[code]) || code;
    config.localeTag = locale;

    var direction = (config.localeDirections && config.localeDirections[code]) || "ltr";
    config.direction = direction;
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-language]"), function (link) {
      var isActive = String(link.getAttribute("data-pmd-language") || "") === code;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    translateStaticContent();
    renderDateStrip();
    renderSummary();
    renderGuarantee();

    var instant = cachedAvailability(state.date, state.guests);
    if (instant) {
      renderTimes(instant);
    } else if (state.slots && state.slots.length) {
      renderTimeChoices(state.slots);
    }

    if (manageExistingLink) {
      manageExistingLink.href = "/book?manage=1&lang=" + encodeURIComponent(code);
    }

    if (manageTopLink) {
      manageTopLink.href = "/book?manage=1&lang=" + encodeURIComponent(code);
    }

    if (manageLink && manageLink.href) {
      var currentManageUrl = new URL(manageLink.href, window.location.origin);
      currentManageUrl.searchParams.set("lang", code);
      manageLink.href = currentManageUrl.pathname + currentManageUrl.search;
    }

    if (updateUrl !== false && window.history && window.history.replaceState) {
      var nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("lang", code);
      window.history.replaceState({ pmdBookingLang: code }, "", nextUrl.pathname + nextUrl.search + nextUrl.hash);
    }

    return true;
  }

  function formatDate(value, compact) {
    var date = dateFromIso(value);
    var options = compact
      ? { weekday: "short", day: "numeric", month: "short" }
      : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      return value;
    }
  }

  function setErrors(messages) {
    if (!errors) return;
    var list = Array.isArray(messages) ? messages.filter(Boolean) : [];
    if (!list.length) {
      errors.textContent = "";
      errors.classList.remove("is-visible");
      return;
    }

    errors.innerHTML = list.map(function (message) {
      return "<div>" + escapeHtml(String(message)) + "</div>";
    }).join("");
    errors.classList.add("is-visible");
  }

  function escapeHtml(value) {
    var node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  }

  function dateStatusLabel(status) {
    if (status === "closed") return labels.closed_short || "Closed";
    if (status === "full") return labels.full_short || "Fully booked";
    return "";
  }

  function renderDateStrip() {
    if (!dateStrip) return;

    var start = dateFromIso(state.dateWindowStart || config.today);
    var html = [];

    for (var index = 0; index < 7; index += 1) {
      var date = new Date(start);
      date.setDate(start.getDate() + index);
      var value = isoDate(date);
      if (value > String(config.maxDate || value)) break;

      var weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
      var month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
      var active = value === state.date ? " is-active" : "";
      var status = dateStatuses[value] || "";
      var unavailable = status === "closed" || status === "full";
      var statusClass = status ? " has-status is-" + status : "";
      var statusLabel = dateStatusLabel(status);

      html.push(
        '<button type="button" class="pmd-booking-date-option' + active + statusClass + '" data-pmd-booking-date="' + value + '" role="listitem"' +
          (unavailable ? ' aria-disabled="true"' : '') + '>' +
          "<span>" + escapeHtml(weekday) + "</span>" +
          "<strong>" + date.getDate() + "</strong>" +
          "<small>" + escapeHtml(month) + "</small>" +
          (statusLabel ? '<em>' + escapeHtml(statusLabel) + '</em>' : '') +
        "</button>"
      );
    }

    dateStrip.innerHTML = html.join("");

    if (datePrev) {
      datePrev.disabled = String(state.dateWindowStart) <= String(config.today);
    }
    if (dateNext) {
      var last = new Date(start);
      last.setDate(start.getDate() + 7);
      dateNext.disabled = isoDate(last) > String(config.maxDate);
    }
  }

  function loadDateStatuses(force) {
    if (!config.dateStatusesUrl || !state.dateWindowStart || !state.guests) return;

    if (!force && dateWindowIsCached(state.dateWindowStart, state.guests, 7)) {
      renderDateStrip();
      return;
    }

    if (dateStatusAbort) dateStatusAbort.abort();
    dateStatusAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    var requestStart = state.dateWindowStart;
    var requestGuests = state.guests;
    var url = new URL(config.dateStatusesUrl, window.location.origin);
    url.searchParams.set("start", requestStart);
    url.searchParams.set("days", "14");
    url.searchParams.set("guests", String(requestGuests));

    fetch(url.toString(), {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      signal: dateStatusAbort ? dateStatusAbort.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error("Date availability could not be loaded.");
      return response.json();
    }).then(function (payload) {
      var rows = Array.isArray(payload.dates) ? payload.dates : [];
      rows.forEach(function (row) {
        if (!row || !row.date) return;

        cacheCapacity(row.date, row);
        cacheAvailability(row.date, requestGuests, {
          opening: row.opening || {},
          duration: row.duration,
          interval: row.interval,
          slots: row.slots
        });
      });

      syncDateStatusesForGuests(state.guests);
      renderDateStrip();

      var instant = cachedAvailability(state.date, state.guests);
      if (state.loading && instant) {
        renderTimes(instant);
      }
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
    });
  }

  function moveDateWindow(days) {
    var start = dateFromIso(state.dateWindowStart || config.today);
    start.setDate(start.getDate() + days);
    var next = isoDate(start);
    if (next < String(config.today)) next = String(config.today);
    if (next > String(config.maxDate)) return;
    state.dateWindowStart = next;
    renderDateStrip();
    loadDateStatuses();
    if (dateStrip && dateStrip.scrollTo) dateStrip.scrollTo({ left: 0, behavior: "smooth" });
  }

  function renderSummary() {
    if (summaryDate) summaryDate.textContent = state.date ? formatDate(state.date, true) : (labels.not_selected || "Not selected");
    if (summaryTime) summaryTime.textContent = state.time || (labels.not_selected || "Not selected");
    if (summaryParty) summaryParty.textContent = partyLabel(state.guests);
    if (partyCopy) partyCopy.textContent = partyLabel(state.guests);
    guestInput.value = String(state.guests);
    dateInput.value = state.date;
    timeInput.value = state.time;
    syncSubmitState();
    renderGuarantee();
  }

  function loadingState() {
    state.loading = true;
    state.time = "";
    timeInput.value = "";
    submit.disabled = true;
    setErrors([]);
    if (opening) opening.textContent = "";
    times.innerHTML = '<div class="pmd-booking-loading">' + escapeHtml(labels.loading || "Checking tables…") + "</div>";
    renderSummary();
  }

  function emptyState(message, closed) {
    var button = closed
      ? '<button type="button" data-pmd-booking-next-date>' + escapeHtml(labels.try_another || "Try another date") + "</button>"
      : "";

    times.innerHTML = '<div class="pmd-booking-empty">' + escapeHtml(message) + button + "</div>";
  }

  function periodForTime(value) {
    var hour = Number(String(value || "00:00").split(":")[0] || 0);
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }

  function renderTimeChoices(slots) {
    var groups = { morning: [], afternoon: [], evening: [] };
    slots.forEach(function (slot) {
      groups[periodForTime(slot.value)].push(slot);
    });

    var availablePeriods = ["morning", "afternoon", "evening"].filter(function (period) {
      return groups[period].length > 0;
    });
    if (!availablePeriods.length) return;

    if (availablePeriods.indexOf(state.period) === -1) {
      state.period = availablePeriods[0];
    }

    var periodLabels = {
      morning: labels.morning || "Morning",
      afternoon: labels.afternoon || "Afternoon",
      evening: labels.evening || "Evening"
    };

    var tabs = availablePeriods.length > 1
      ? '<div class="pmd-booking-time-periods" role="tablist">' +
          availablePeriods.map(function (period) {
            var active = period === state.period;
            return '<button type="button" role="tab" class="' + (active ? "is-active" : "") +
              '" data-pmd-time-period="' + period + '" aria-selected="' + (active ? "true" : "false") + '">' +
              escapeHtml(periodLabels[period]) + '<span>' + groups[period].length + '</span></button>';
          }).join("") +
        '</div>'
      : "";

    var choices = groups[state.period].map(function (slot) {
      var active = slot.value === state.time;
      return '<button type="button" class="pmd-booking-time-option' + (active ? " is-active" : "") +
        '" data-pmd-booking-time="' + escapeHtml(slot.value) + '" aria-pressed="' + (active ? "true" : "false") + '">' +
        escapeHtml(slot.label || slot.value) + "</button>";
    }).join("");

    times.innerHTML = tabs +
      '<div class="pmd-booking-time-strip" role="group" aria-label="' +
      escapeHtml(periodLabels[state.period]) + '">' + choices + '</div>';
  }

  function renderTimes(payload) {
    state.loading = false;
    state.duration = Number(payload.duration || config.stayMinutes || 90);
    var slots = Array.isArray(payload.slots) ? payload.slots : [];
    state.slots = slots;

    if (state.time && !slots.some(function (slot) { return slot.value === state.time; })) {
      state.time = "";
    }

    var openingData = payload.opening || {};

    if (opening) {
      if (openingData.enabled && openingData.opening_time && openingData.closing_time) {
        opening.textContent = openingData.opening_time + " – " + openingData.closing_time;
      } else {
        opening.textContent = "";
      }
    }

    if (!openingData.enabled) {
      dateStatuses[state.date] = "closed";
      renderDateStrip();
      emptyState(labels.closed || "The restaurant is closed for online reservations on this date.", true);
      renderSummary();
      return;
    }

    if (!slots.length) {
      dateStatuses[state.date] = "full";
      renderDateStrip();
      emptyState(labels.no_times || "No online tables are available for this date.", true);
      renderSummary();
      return;
    }

    dateStatuses[state.date] = "available";
    renderDateStrip();
    renderTimeChoices(slots);
    renderSummary();
  }

  function responseErrors(payload) {
    var output = [];
    if (payload && payload.errors && typeof payload.errors === "object") {
      Object.keys(payload.errors).forEach(function (key) {
        var value = payload.errors[key];
        if (Array.isArray(value)) output = output.concat(value);
        else if (value) output.push(value);
      });
    }
    if (!output.length && payload && payload.message) output.push(payload.message);
    return output;
  }

  function loadAvailability(options) {
    if (!state.date || !state.guests) return;

    options = options || {};
    var silent = Boolean(options.silent);
    var requestDate = state.date;
    var requestGuests = state.guests;

    if (availabilityAbort) availabilityAbort.abort();
    availabilityAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    if (!silent) loadingState();

    var url = new URL(config.availabilityUrl, window.location.origin);
    url.searchParams.set("date", requestDate);
    url.searchParams.set("guests", String(requestGuests));

    fetch(url.toString(), {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      signal: availabilityAbort ? availabilityAbort.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok) {
          var messages = responseErrors(payload);
          throw new Error(messages[0] || "Availability could not be loaded.");
        }
        return payload;
      });
    }).then(function (payload) {
      cacheAvailability(requestDate, requestGuests, payload);

      if (state.date === requestDate && state.guests === requestGuests) {
        renderTimes(payload);
      }
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
      if (silent || state.date !== requestDate || state.guests !== requestGuests) return;

      state.loading = false;
      emptyState(error && error.message ? error.message : (labels.no_times || "No times available."), false);
      renderSummary();
    });
  }

  function selectDate(value) {
    if (!value) return;
    if (value < String(config.today) || value > String(config.maxDate)) return;

    state.date = value;
    state.time = "";
    state.period = "";

    var windowStart = dateFromIso(state.dateWindowStart || config.today);
    var windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 6);
    if (value < isoDate(windowStart) || value > isoDate(windowEnd)) {
      state.dateWindowStart = value;
    }

    renderDateStrip();
    renderSummary();

    var instant = cachedAvailability(value, state.guests);
    if (instant) {
      /*
       * PMD_PUBLIC_BOOKING_ZERO_WAIT_R5
       *
       * Date changes inside the seeded window are intentionally 100% local.
       * The final booking POST remains authoritative and revalidates the slot.
       */
      renderTimes(instant);
    } else {
      loadAvailability();
    }
  }

  function selectTime(value, button) {
    state.time = value;
    timeInput.value = value;

    Array.prototype.forEach.call(times.querySelectorAll(".pmd-booking-time-option"), function (item) {
      item.classList.toggle("is-active", item === button);
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });

    renderSummary();
    setErrors([]);
  }

  function applyGuestCount(next) {
    state.guests = clampGuests(next);
    state.time = "";
    state.period = "";
    syncDateStatusesForGuests(state.guests);
    renderSummary();
    renderDateStrip();

    var instant = cachedAvailability(state.date, state.guests);
    if (instant) {
      renderTimes(instant);
    } else {
      loadAvailability();
      loadDateStatuses();
    }
  }

  function adjustGuests(delta) {
    var next = clampGuests(state.guests + delta);
    if (next === state.guests) return;
    applyGuestCount(next);
  }

  function nextDate() {
    var date = dateFromIso(state.date);
    for (var index = 0; index < 14; index += 1) {
      date.setDate(date.getDate() + 1);
      var value = isoDate(date);
      if (value > String(config.maxDate)) return;
      if (dateStatuses[value] !== "closed" && dateStatuses[value] !== "full") {
        if (value >= state.dateWindowStart) {
          var windowEnd = dateFromIso(state.dateWindowStart);
          windowEnd.setDate(windowEnd.getDate() + 6);
          if (value > isoDate(windowEnd)) {
            state.dateWindowStart = value;
            loadDateStatuses();
          }
        }
        selectDate(value);
        return;
      }
    }
    moveDateWindow(7);
  }

  function formPayload() {
    var data = new FormData(form);
    var payload = {};
    data.forEach(function (value, key) {
      payload[key] = value;
    });
    payload.reserve_date = state.date;
    payload.reserve_time = state.time;
    payload.guest_num = state.guests;
    return payload;
  }

  function submitBooking(event) {
    event.preventDefault();
    setErrors([]);

    if (!state.time) {
      setErrors([labels.select_date_hint || "Please choose an available time."]);
      return;
    }

    if (!form.reportValidity()) return;

    state.loading = true;
    submit.disabled = true;
    var originalText = submit.querySelector("span");
    var previousLabel = originalText ? originalText.textContent : "";
    if (originalText) originalText.textContent = labels.booking || "Saving your reservation…";

    var bookingPayload = formPayload();
    bookingPayload._pmd_booking_locale = activeLanguageCode();

    if (guaranteeRequired() && originalText) {
      originalText.textContent = labels.guarantee_verifying || "Verifying card…";
    }

    verifyGuaranteeForBooking(bookingPayload).then(function (verifiedPayload) {
      if (originalText) originalText.textContent = labels.booking || "Saving your reservation…";

      return fetch(config.storeUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
        },
        body: JSON.stringify(verifiedPayload)
      });
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var err = new Error((responseErrors(payload)[0]) || "Booking failed.");
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    }).then(function (payload) {
      showSuccess(payload);
    }).catch(function (error) {
      state.loading = false;
      if (originalText) originalText.textContent = previousLabel;
      renderGuarantee();
      syncSubmitState();
      var messages = error && error.payload ? responseErrors(error.payload) : [error.message];
      setErrors(messages);
      if (error && error.payload && error.payload.errors && error.payload.errors.reserve_time) {
        state.time = "";
        renderSummary();
        loadAvailability();
      }
    });
  }

  function escapeIcs(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function compactDateTime(date, time) {
    return String(date).replace(/-/g, "") + "T" + String(time).replace(":", "") + "00";
  }

  function addMinutes(date, time, minutes) {
    var parts = String(time).split(":").map(Number);
    var value = dateFromIso(date);
    value.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
    value.setMinutes(value.getMinutes() + Number(minutes || 0));
    return {
      date: isoDate(value),
      time: pad(value.getHours()) + ":" + pad(value.getMinutes())
    };
  }

  function calendarHref(payload) {
    var reservation = payload.reservation || {};
    var end = addMinutes(reservation.date, reservation.time, reservation.duration || state.duration);
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PayMyDine//Public Booking//EN",
      "BEGIN:VEVENT",
      "UID:" + escapeIcs(payload.reference || ("reservation-" + Date.now())) + "@paymydine",
      "DTSTAMP:" + compactDateTime(config.today, "00:00") + "Z",
      "DTSTART;TZID=" + escapeIcs(config.timezone) + ":" + compactDateTime(reservation.date, reservation.time),
      "DTEND;TZID=" + escapeIcs(config.timezone) + ":" + compactDateTime(end.date, end.time),
      "SUMMARY:" + escapeIcs("Reservation at " + config.restaurantName),
      "LOCATION:" + escapeIcs(config.restaurantAddress || ""),
      "DESCRIPTION:" + escapeIcs((labels.reference || "Booking reference") + ": " + (payload.reference || "")),
      "END:VEVENT",
      "END:VCALENDAR"
    ];

    return URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  }

  function showSuccess(payload) {
    state.loading = false;
    if (workspace) workspace.hidden = true;
    if (success) success.hidden = false;

    var reservation = payload.reservation || {};
    if (successMessage) {
      successMessage.textContent = payload.confirmed
        ? (labels.success_confirmed || payload.message)
        : (labels.success_received || payload.message);
    }
    if (successReference) successReference.textContent = payload.reference || String(payload.reservation_id || "");
    if (successDate) successDate.textContent = formatDate(reservation.date || state.date, true);
    if (successTime) successTime.textContent = reservation.time || state.time;
    if (successParty) successParty.textContent = partyLabel(Number(reservation.guests || state.guests));

    var guarantee = payload.guarantee || null;
    if (successGuarantee) {
      successGuarantee.hidden = !guarantee;
    }
    if (successGuaranteeAmount && guarantee) {
      successGuaranteeAmount.textContent = guaranteeMoney(
        Number(guarantee.amount_cents || 0),
        guarantee.currency || "EUR"
      );
    }
    if (successGuaranteeTerms) {
      successGuaranteeTerms.textContent = guarantee
        ? String(guarantee.terms_text || "")
        : "";
    }

    if (calendarLink) calendarLink.href = calendarHref(payload);
    if (manageLink && payload.manage_url) {
      var manageUrl = new URL(payload.manage_url, window.location.origin);
      manageUrl.searchParams.set("lang", activeLanguageCode());
      manageLink.href = manageUrl.pathname + manageUrl.search;
    }

    success.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetBooking() {
    form.reset();
    state.date = String(config.today);
    state.dateWindowStart = String(config.today);
    state.guests = Math.min(2, Number(config.maxGuests || 2));
    state.time = "";
    state.period = "";
    state.slots = [];
    state.duration = Number(config.stayMinutes || 90);
    availabilityCache = Object.create(null);
    syncDateStatusesForGuests(state.guests);
    state.loading = false;
    guaranteeCardComplete = false;
    guaranteeCardLoadFailed = false;
    if (guaranteeConsent) guaranteeConsent.checked = false;
    if (stripeCard && typeof stripeCard.clear === "function") stripeCard.clear();
    setErrors([]);
    if (workspace) workspace.hidden = false;
    if (success) success.hidden = true;
    renderDateStrip();
    renderSummary();

    var resetAvailability = cachedAvailability(state.date, state.guests);
    if (resetAvailability) {
      renderTimes(resetAvailability);
    } else {
      loadAvailability();
      loadDateStatuses();
    }

    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  dateStrip.addEventListener("click", function (event) {
    var button = event.target.closest("[data-pmd-booking-date]");
    if (!button || button.getAttribute("aria-disabled") === "true") return;
    selectDate(button.getAttribute("data-pmd-booking-date"));
  });

  if (datePrev) datePrev.addEventListener("click", function () { moveDateWindow(-7); });
  if (dateNext) dateNext.addEventListener("click", function () { moveDateWindow(7); });

  times.addEventListener("click", function (event) {
    var periodButton = event.target.closest("[data-pmd-time-period]");
    if (periodButton) {
      state.period = periodButton.getAttribute("data-pmd-time-period") || "";
      renderTimeChoices(state.slots || []);
      return;
    }

    var timeButton = event.target.closest("[data-pmd-booking-time]");
    if (timeButton) {
      selectTime(timeButton.getAttribute("data-pmd-booking-time"), timeButton);
      return;
    }

    if (event.target.closest("[data-pmd-booking-next-date]")) {
      nextDate();
    }
  });

  dateInput.addEventListener("change", function () {
    selectDate(dateInput.value);
  });

  guestInput.addEventListener("change", function () {
    applyGuestCount(guestInput.value);
  });

  var minus = form.querySelector("[data-pmd-party-minus]");
  var plus = form.querySelector("[data-pmd-party-plus]");
  if (minus) minus.addEventListener("click", function () { adjustGuests(-1); });
  if (plus) plus.addEventListener("click", function () { adjustGuests(1); });

  if (guaranteeConsent) {
    guaranteeConsent.addEventListener("change", function () {
      syncSubmitState();
    });
  }

  form.addEventListener("submit", submitBooking);

  if (languageNav) {
    languageNav.addEventListener("click", function (event) {
      var link = event.target.closest("[data-pmd-language]");
      if (!link) return;

      event.preventDefault();
      applyLanguage(link.getAttribute("data-pmd-language"), true);
    });
  }

  window.addEventListener("popstate", function () {
    var url = new URL(window.location.href);
    var requested = url.searchParams.get("lang");
    if (requested && requested !== activeLanguageCode()) {
      applyLanguage(requested, false);
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-new-booking]"), function (button) {
    button.addEventListener("click", resetBooking);
  });

  hydrateAvailabilitySeed(config.availabilitySeed, state.guests);
  translateStaticContent();
  renderDateStrip();
  renderSummary();

  var initialAvailability = cachedAvailability(state.date, state.guests);
  if (initialAvailability) {
    renderTimes(initialAvailability);
  } else {
    loadAvailability();
  }

  // R7: first paint only carries the visible week. Prefetch the next week
  // after the UI is already interactive so /book itself stays fast.
  window.setTimeout(function () {
    loadDateStatuses(true);
  }, 0);

  window.PMDPublicBookingV1 = {
    reload: loadAvailability,
    setLanguage: function (code) { return applyLanguage(code, true); },
    state: state
  };
})();
