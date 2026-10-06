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
  var guaranteeMethodsNode = document.getElementById("pmd-booking-guarantee-methods");
  var guaranteeCardWrap = document.getElementById("pmd-booking-guarantee-card-wrap");
  var guaranteeMethodTitle = document.getElementById("pmd-booking-guarantee-method-title");
  var guaranteeCardNode = document.getElementById("pmd-booking-guarantee-card");
  var guaranteeWalletNode = document.getElementById("pmd-booking-guarantee-wallet");
  var guaranteeProviderAction = document.getElementById("pmd-booking-guarantee-provider-action");
  var guaranteeProviderButton = document.getElementById("pmd-booking-guarantee-provider-button");
  var guaranteeProviderNote = document.getElementById("pmd-booking-guarantee-provider-note");
  var guaranteeSumupNode = document.getElementById("pmd-booking-guarantee-sumup");
  var guaranteeCardError = document.getElementById("pmd-booking-guarantee-card-error");
  var guaranteeSecure = document.getElementById("pmd-booking-guarantee-secure");
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
  var stripeWalletElements = null;
  var stripeWalletElement = null;
  var stripeWalletMethod = "";
  var sumupPromise = null;
  var sumupWidget = null;
  var guaranteeSelectedMethod = "";
  var guaranteeSelectedProvider = "";
  var guaranteeSetupReference = "";
  var guaranteeVerified = false;
  var guaranteeProviderBusy = false;
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
      setupUrl: base.setupUrl || "/book/guarantee/setup",
      statusUrl: base.statusUrl || "/book/guarantee/status",
      returnUrl: base.returnUrl || "/book/guarantee/return"
    });
  }

  function guaranteeMethods() {
    var guarantee = currentGuaranteeConfig();
    return (Array.isArray(guarantee.methods) ? guarantee.methods : [])
      .map(function (row) {
        if (typeof row === "string") {
          return {
            code: row,
            label: row,
            provider: row === "paypal" ? "paypal" : String(guarantee.provider || "stripe"),
            provider_label: ""
          };
        }
        return {
          code: String(row.code || "").toLowerCase(),
          label: String(row.label || row.code || ""),
          provider: String(row.provider || "").toLowerCase(),
          provider_label: String(row.provider_label || row.provider || "")
        };
      })
      .filter(function (row) {
        return row.code && row.provider;
      });
  }

  function guaranteeMethodDefinition(code) {
    code = String(code || "").toLowerCase();
    var rows = guaranteeMethods();
    for (var index = 0; index < rows.length; index += 1) {
      if (rows[index].code === code) return rows[index];
    }
    return null;
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

  function guaranteeProviderLabel(provider) {
    var method = guaranteeMethodDefinition(guaranteeSelectedMethod);
    if (method && method.provider_label) return method.provider_label;
    if (provider === "vr_payment") return "VR Payment";
    if (provider === "worldline") return "Worldline";
    if (provider === "sumup") return "SumUp";
    if (provider === "paypal") return "PayPal";
    return "Stripe";
  }

  function resetProviderWidgets() {
    if (stripeWalletElement && stripeWalletElement.unmount) {
      try { stripeWalletElement.unmount(); } catch (_) {}
    }
    stripeWalletElement = null;
    stripeWalletElements = null;
    stripeWalletMethod = "";

    if (sumupWidget && sumupWidget.unmount) {
      try { sumupWidget.unmount(); } catch (_) {}
    }
    sumupWidget = null;

    if (guaranteeWalletNode) {
      guaranteeWalletNode.innerHTML = "";
      guaranteeWalletNode.hidden = true;
    }
    if (guaranteeSumupNode) {
      guaranteeSumupNode.innerHTML = "";
      guaranteeSumupNode.hidden = true;
    }
  }

  function invalidateGuaranteeVerification(keepMethod) {
    guaranteeSetupReference = "";
    guaranteeVerified = false;
    guaranteeProviderBusy = false;
    resetProviderWidgets();

    if (!keepMethod) {
      guaranteeSelectedMethod = "";
      guaranteeSelectedProvider = "";
    }

    if (guaranteeProviderNote) guaranteeProviderNote.textContent = "";
    if (guaranteeCardError) guaranteeCardError.textContent = "";
  }

  function stripeCardSelected() {
    return guaranteeSelectedMethod === "card"
      && guaranteeSelectedProvider === "stripe";
  }

  function syncSubmitState() {
    var guarantee = currentGuaranteeConfig();
    var blocked = false;

    if (guaranteeRequired()) {
      blocked = !guarantee.providerReady
        || !guaranteeSelectedMethod
        || !guaranteeSelectedProvider
        || !guaranteeConsent
        || !guaranteeConsent.checked
        || guaranteeProviderBusy;

      if (!blocked && stripeCardSelected()) {
        blocked = !guaranteeCardComplete || guaranteeCardLoadFailed;
      } else if (!blocked && !stripeCardSelected()) {
        blocked = !guaranteeVerified;
      }
    }

    submit.disabled = !state.time || state.loading || blocked;
  }

  function loadExternalScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src.replace(/"/g, '\"') + '"]');
      if (existing) {
        if (existing.getAttribute("data-pmd-loaded") === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () { resolve(); }, { once: true });
        existing.addEventListener("error", function () { reject(new Error("Payment provider could not be loaded.")); }, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = function () {
        script.setAttribute("data-pmd-loaded", "1");
        resolve();
      };
      script.onerror = function () {
        reject(new Error("Payment provider could not be loaded."));
      };
      document.head.appendChild(script);
    });
  }

  function loadStripeRuntime() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (stripePromise) return stripePromise;

    stripePromise = loadExternalScript("https://js.stripe.com/v3/")
      .then(function () {
        if (!window.Stripe) throw new Error("Stripe could not be loaded.");
        return window.Stripe;
      });

    return stripePromise;
  }

  function ensureStripeClient() {
    var guarantee = currentGuaranteeConfig();

    return loadStripeRuntime().then(function (StripeFactory) {
      if (!stripeClient) {
        var key = String(guarantee.publishableKey || "");
        if (!key) throw new Error("Stripe is not configured for wallet verification.");
        stripeClient = StripeFactory(key);
      }
      return stripeClient;
    });
  }

  function ensureStripeCard() {
    if (
      !guaranteeRequired()
      || !stripeCardSelected()
      || !currentGuaranteeConfig().providerReady
    ) {
      return Promise.resolve(null);
    }

    if (stripeCard && stripeClient) return Promise.resolve(stripeCard);
    guaranteeCardLoadFailed = false;

    return ensureStripeClient().then(function () {
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
          : "Stripe card verification is unavailable.";
      }
      syncSubmitState();
      throw error;
    });
  }

  function setupPayloadFromBooking(payload, method) {
    return {
      first_name: payload.first_name || "",
      last_name: payload.last_name || "",
      email: payload.email || "",
      reserve_date: state.date,
      reserve_time: state.time,
      guest_num: state.guests,
      locale: activeLanguageCode(),
      guarantee_method: method
    };
  }

  function requestGuaranteeSetup(payload, method) {
    var guarantee = currentGuaranteeConfig();

    return fetch(guarantee.setupUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
      },
      body: JSON.stringify(setupPayloadFromBooking(payload, method))
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok || !body.success) {
          var messages = responseErrors(body);
          throw new Error(messages[0] || "Payment-method verification could not be started.");
        }
        return body;
      });
    });
  }

  function requestGuaranteeStatus(provider, method, reference) {
    var guarantee = currentGuaranteeConfig();

    return fetch(guarantee.statusUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
      },
      body: JSON.stringify({
        reserve_date: state.date,
        reserve_time: state.time,
        guest_num: state.guests,
        locale: activeLanguageCode(),
        guarantee_provider: provider,
        guarantee_method: method,
        setup_reference: reference
      })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok || !body.success) {
          throw new Error(body.message || "Payment-method verification could not be checked.");
        }
        return body;
      });
    });
  }

  function pollGuaranteeStatus(provider, method, reference, attempts) {
    attempts = Number(attempts || 0);

    return requestGuaranteeStatus(provider, method, reference)
      .then(function (status) {
        if (status.ready) return status;
        if (attempts >= 39) {
          throw new Error("Payment-method verification timed out. Please try again.");
        }
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 1500);
        }).then(function () {
          return pollGuaranteeStatus(provider, method, reference, attempts + 1);
        });
      });
  }

  function verifiedPayload(payload) {
    payload._pmd_guarantee_provider = guaranteeSelectedProvider;
    payload._pmd_guarantee_method = guaranteeSelectedMethod;
    payload._pmd_guarantee_setup_reference = guaranteeSetupReference;
    payload._pmd_guarantee_terms_accepted = "1";

    if (guaranteeSelectedProvider === "stripe") {
      payload._pmd_guarantee_setup_intent = guaranteeSetupReference;
    }

    return payload;
  }

  function requireGuaranteeConsent() {
    if (!guaranteeConsent || !guaranteeConsent.checked) {
      throw new Error(
        currentGuaranteeConfig().consentText
          || "Please accept the guarantee terms first."
      );
    }
  }

  function providerVerificationPayload() {
    if (!state.time) {
      throw new Error(labels.select_date_hint || "Please choose an available time.");
    }
    if (!form.reportValidity()) {
      throw new Error("Please complete your booking details first.");
    }
    requireGuaranteeConsent();
    return formPayload();
  }

  function markProviderVerified(provider, method, reference) {
    guaranteeSelectedProvider = provider;
    guaranteeSelectedMethod = method;
    guaranteeSetupReference = reference;
    guaranteeVerified = true;
    guaranteeProviderBusy = false;

    if (guaranteeProviderNote) {
      guaranteeProviderNote.textContent = guaranteeProviderLabel(provider) + " verified ✓";
    }
    if (guaranteeProviderButton) {
      guaranteeProviderButton.disabled = true;
      guaranteeProviderButton.textContent = "Verified ✓";
    }
    syncSubmitState();
  }

  function autoSubmitVerifiedBooking() {
    window.setTimeout(function () {
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }, 0);
  }

  function beginRedirectVerification(payload, provider, method) {
    var popup = window.open(
      "about:blank",
      "pmdGuaranteeProvider",
      "width=520,height=720,resizable=yes,scrollbars=yes"
    );
    if (!popup) {
      return Promise.reject(new Error("Please allow the payment-provider popup and try again."));
    }

    try {
      popup.document.write("<!doctype html><title>PayMyDine</title><p style='font-family:sans-serif;padding:24px'>Opening secure verification…</p>");
    } catch (_) {}

    guaranteeProviderBusy = true;
    syncSubmitState();

    return requestGuaranteeSetup(payload, method).then(function (setup) {
      guaranteeSetupReference = String(setup.setup_reference || "");
      if (!guaranteeSetupReference) {
        throw new Error("Payment provider did not return a verification reference.");
      }

      var approvalUrl = String(
        setup.approval_url
        || setup.hosted_tokenization_url
        || setup.redirect_url
        || ""
      );
      if (!approvalUrl) {
        throw new Error("Payment provider did not return a secure verification page.");
      }

      popup.location.href = approvalUrl;

      return pollGuaranteeStatus(provider, method, guaranteeSetupReference, 0);
    }).then(function () {
      try { popup.close(); } catch (_) {}
      markProviderVerified(provider, method, guaranteeSetupReference);
      autoSubmitVerifiedBooking();
    }).catch(function (error) {
      guaranteeProviderBusy = false;
      try { popup.close(); } catch (_) {}
      syncSubmitState();
      throw error;
    });
  }

  function loadSumupRuntime(src) {
    if (window.SumUpCard && window.SumUpCard.mount) {
      return Promise.resolve(window.SumUpCard);
    }
    if (!sumupPromise) {
      sumupPromise = loadExternalScript(src).then(function () {
        if (!window.SumUpCard || !window.SumUpCard.mount) {
          throw new Error("SumUp verification widget is unavailable.");
        }
        return window.SumUpCard;
      });
    }
    return sumupPromise;
  }

  function beginSumupVerification(payload) {
    guaranteeProviderBusy = true;
    syncSubmitState();

    return requestGuaranteeSetup(payload, "card").then(function (setup) {
      guaranteeSetupReference = String(setup.setup_reference || "");
      var checkoutId = String(setup.checkout_id || "");
      var sdkUrl = String(setup.sdk_url || "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js");

      if (!checkoutId || !guaranteeSetupReference) {
        throw new Error("SumUp did not return a complete card-verification session.");
      }

      return loadSumupRuntime(sdkUrl).then(function (SumUpCard) {
        if (sumupWidget && sumupWidget.unmount) {
          try { sumupWidget.unmount(); } catch (_) {}
        }

        guaranteeSumupNode.hidden = false;
        guaranteeSumupNode.innerHTML = "";

        return new Promise(function (resolve, reject) {
          sumupWidget = SumUpCard.mount({
            id: "pmd-booking-guarantee-sumup",
            checkoutId: checkoutId,
            showAmount: false,
            showSubmitButton: true,
            showFooter: true,
            locale: activeLanguageCode() === "de"
              ? "de-DE"
              : (activeLanguageCode() === "tr" ? "tr-TR" : "en-GB"),
            onLoad: function () {
              guaranteeProviderBusy = false;
              if (guaranteeProviderNote) {
                guaranteeProviderNote.textContent = "Complete the secure SumUp card verification below.";
              }
              syncSubmitState();
            },
            onResponse: function (type, body) {
              var responseType = String(type || "").toLowerCase();

              if (responseType === "error" || responseType === "fail" || responseType === "invalid") {
                reject(new Error(
                  String(
                    body && (body.message || body.error_message || body.error)
                    || "SumUp could not verify the card."
                  )
                ));
                return;
              }

              if (responseType === "success") {
                resolve();
              }
            }
          });
        });
      });
    }).then(function () {
      guaranteeProviderBusy = true;
      syncSubmitState();
      return pollGuaranteeStatus(
        "sumup",
        "card",
        guaranteeSetupReference,
        0
      );
    }).then(function () {
      markProviderVerified("sumup", "card", guaranteeSetupReference);
      autoSubmitVerifiedBooking();
    }).catch(function (error) {
      guaranteeProviderBusy = false;
      syncSubmitState();
      throw error;
    });
  }

  function beginProviderVerification() {
    setErrors([]);

    var method = guaranteeMethodDefinition(guaranteeSelectedMethod);
    if (!method) {
      setErrors(["Choose a guarantee payment method."]);
      return;
    }

    var payload;
    try {
      payload = providerVerificationPayload();
    } catch (error) {
      setErrors([error.message]);
      return;
    }

    if (method.provider === "sumup") {
      beginSumupVerification(payload).catch(function (error) {
        setErrors([error.message]);
      });
      return;
    }

    beginRedirectVerification(
      payload,
      method.provider,
      method.code
    ).catch(function (error) {
      setErrors([error.message]);
    });
  }

  function ensureStripeWallet() {
    var method = guaranteeSelectedMethod;
    if (!["apple_pay", "google_pay"].includes(method)) {
      return Promise.resolve(null);
    }

    if (stripeWalletElement && stripeWalletMethod === method) {
      return Promise.resolve(stripeWalletElement);
    }

    resetProviderWidgets();
    stripeWalletMethod = method;

    return ensureStripeClient().then(function () {
      var guarantee = currentGuaranteeConfig();
      stripeWalletElements = stripeClient.elements({
        mode: "setup",
        currency: String(guarantee.currency || "EUR").toLowerCase(),
        setupFutureUsage: "off_session",
        paymentMethodTypes: ["card"]
      });

      var paymentMethods = {
        applePay: method === "apple_pay" ? "always" : "never",
        googlePay: method === "google_pay" ? "always" : "never"
      };

      stripeWalletElement = stripeWalletElements.create(
        "expressCheckout",
        {
          paymentMethods: paymentMethods,
          buttonHeight: 48
        }
      );

      guaranteeWalletNode.hidden = false;
      stripeWalletElement.mount("#pmd-booking-guarantee-wallet");

      stripeWalletElement.on("ready", function (event) {
        var available = event && event.availablePaymentMethods
          ? event.availablePaymentMethods
          : {};
        var key = method === "apple_pay" ? "applePay" : "googlePay";
        if (!available || available[key] === false) {
          if (guaranteeCardError) {
            guaranteeCardError.textContent =
              (method === "apple_pay" ? "Apple Pay" : "Google Pay")
              + " is not available on this browser/device.";
          }
        }
      });

      stripeWalletElement.on("confirm", function () {
        setErrors([]);

        var payload;
        try {
          payload = providerVerificationPayload();
        } catch (error) {
          setErrors([error.message]);
          return;
        }

        guaranteeProviderBusy = true;
        syncSubmitState();

        Promise.resolve(
          stripeWalletElements && stripeWalletElements.submit
            ? stripeWalletElements.submit()
            : null
        ).then(function (submitResult) {
          if (submitResult && submitResult.error) {
            throw new Error(
              submitResult.error.message
              || "Wallet details could not be submitted."
            );
          }
          return requestGuaranteeSetup(payload, method);
        })
          .then(function (setup) {
            guaranteeSetupReference = String(
              setup.setup_intent_id || ""
            );
            if (!setup.client_secret || !guaranteeSetupReference) {
              throw new Error("Stripe wallet verification could not be started.");
            }

            return stripeClient.confirmSetup({
              elements: stripeWalletElements,
              clientSecret: String(setup.client_secret),
              confirmParams: {
                return_url: window.location.href
              },
              redirect: "if_required"
            });
          })
          .then(function (result) {
            if (result && result.error) {
              throw new Error(
                result.error.message || "Wallet verification failed."
              );
            }

            var intent = result && result.setupIntent
              ? result.setupIntent
              : null;
            if (!intent || intent.status !== "succeeded" || !intent.id) {
              throw new Error("Please complete wallet verification.");
            }

            guaranteeSetupReference = String(intent.id);
            markProviderVerified("stripe", method, guaranteeSetupReference);
            autoSubmitVerifiedBooking();
          })
          .catch(function (error) {
            guaranteeProviderBusy = false;
            syncSubmitState();
            setErrors([error.message]);
          });
      });

      return stripeWalletElement;
    });
  }

  function renderGuaranteeMethods() {
    if (!guaranteeMethodsNode) return;

    var methods = guaranteeMethods();
    if (!methods.length) {
      guaranteeMethodsNode.innerHTML = "";
      return;
    }

    if (!guaranteeMethodDefinition(guaranteeSelectedMethod)) {
      var preferred = String(
        currentGuaranteeConfig().defaultMethod || ""
      ).toLowerCase();
      guaranteeSelectedMethod = guaranteeMethodDefinition(preferred)
        ? preferred
        : methods[0].code;
      guaranteeSelectedProvider = guaranteeMethodDefinition(
        guaranteeSelectedMethod
      ).provider;
    }

    guaranteeMethodsNode.innerHTML = methods.map(function (method) {
      var active = method.code === guaranteeSelectedMethod;
      var displayLabel = method.code === "card"
        ? (
            activeLanguageCode() === "de"
              ? "Karte"
              : (activeLanguageCode() === "tr" ? "Kart" : method.label)
          )
        : method.label;

      return '<button type="button" class="pmd-booking-guarantee__method'
        + (active ? ' is-active' : '')
        + '" data-pmd-guarantee-method="'
        + escapeHtml(method.code)
        + '" role="radio" aria-checked="'
        + (active ? 'true' : 'false')
        + '"><strong>'
        + escapeHtml(displayLabel)
        + '</strong><small>'
        + escapeHtml(method.provider_label || guaranteeProviderLabel(method.provider))
        + '</small></button>';
    }).join("");
  }

  function renderGuaranteeMethodPanel() {
    var method = guaranteeMethodDefinition(guaranteeSelectedMethod);

    if (!method) {
      if (guaranteeCardWrap) guaranteeCardWrap.hidden = true;
      return;
    }

    guaranteeSelectedProvider = method.provider;

    if (guaranteeCardWrap) guaranteeCardWrap.hidden = false;
    if (guaranteeCardNode) guaranteeCardNode.hidden = true;
    if (guaranteeWalletNode) guaranteeWalletNode.hidden = true;
    if (guaranteeProviderAction) guaranteeProviderAction.hidden = true;
    if (guaranteeSumupNode && !sumupWidget) guaranteeSumupNode.hidden = true;

    if (guaranteeMethodTitle) {
      guaranteeMethodTitle.textContent = method.label;
    }
    if (guaranteeSecure) {
      guaranteeSecure.textContent = "Secure verification by "
        + guaranteeProviderLabel(method.provider)
        + ".";
    }

    if (method.code === "card" && method.provider === "stripe") {
      if (guaranteeCardNode) guaranteeCardNode.hidden = false;
      ensureStripeCard().catch(function () {});
      return;
    }

    if (method.code === "apple_pay" || method.code === "google_pay") {
      ensureStripeWallet().catch(function (error) {
        if (guaranteeCardError) {
          guaranteeCardError.textContent = error.message;
        }
      });
      return;
    }

    if (guaranteeProviderAction) guaranteeProviderAction.hidden = false;
    if (guaranteeProviderButton) {
      guaranteeProviderButton.disabled = guaranteeVerified || guaranteeProviderBusy;
      guaranteeProviderButton.textContent = guaranteeVerified
        ? "Verified ✓"
        : (
            method.code === "paypal"
              ? "Verify with PayPal"
              : "Verify card with " + guaranteeProviderLabel(method.provider)
          );
    }
    if (guaranteeProviderNote && !guaranteeVerified) {
      guaranteeProviderNote.textContent =
        "You will verify securely with "
        + guaranteeProviderLabel(method.provider)
        + ". No no-show charge is made now.";
    }
  }

  function selectGuaranteeMethod(code) {
    var method = guaranteeMethodDefinition(code);
    if (!method || method.code === guaranteeSelectedMethod) return;

    invalidateGuaranteeVerification(true);
    guaranteeSelectedMethod = method.code;
    guaranteeSelectedProvider = method.provider;

    renderGuaranteeMethods();
    renderGuaranteeMethodPanel();
    syncSubmitState();
  }

  function renderGuarantee() {
    if (!guaranteeSection) return;

    var guarantee = currentGuaranteeConfig();
    var required = guaranteeRequired();
    guaranteeSection.hidden = !required;

    if (!required) {
      invalidateGuaranteeVerification(false);
      if (guaranteeConsent) guaranteeConsent.checked = false;
      var normalLabel = submit.querySelector("span");
      if (normalLabel) {
        normalLabel.textContent = labels.book_table || "Request this table";
      }
      syncSubmitState();
      return;
    }

    if (guaranteeTerms) {
      guaranteeTerms.textContent = String(guarantee.termsText || "");
    }
    if (guaranteeConsentCopy) {
      guaranteeConsentCopy.textContent = String(guarantee.consentText || "");
    }
    if (guaranteeTotal) {
      guaranteeTotal.textContent = guaranteeMoney(
        Number(guarantee.amountPerGuestCents || 0) * state.guests,
        guarantee.currency || "EUR"
      );
    }

    if (guaranteeUnavailable) {
      guaranteeUnavailable.hidden = Boolean(guarantee.providerReady);
    }

    var label = submit.querySelector("span");
    if (label) {
      label.textContent = String(
        guarantee.buttonText
        || labels.book_table
        || "Confirm reservation"
      );
    }

    renderGuaranteeMethods();
    renderGuaranteeMethodPanel();
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
        labels.guarantee_unavailable
        || "Payment guarantee is unavailable."
      ));
    }

    try {
      requireGuaranteeConsent();
    } catch (error) {
      return Promise.reject(error);
    }

    var method = guaranteeMethodDefinition(guaranteeSelectedMethod);
    if (!method) {
      return Promise.reject(new Error(
        "Choose a guarantee payment method."
      ));
    }

    guaranteeSelectedProvider = method.provider;

    if (!stripeCardSelected()) {
      if (!guaranteeVerified || !guaranteeSetupReference) {
        return Promise.reject(new Error(
          "Verify the selected payment method first."
        ));
      }
      return Promise.resolve(verifiedPayload(payload));
    }

    if (!guaranteeCardComplete) {
      return Promise.reject(new Error(
        "Please complete the card details."
      ));
    }

    return ensureStripeCard()
      .then(function () {
        return requestGuaranteeSetup(payload, "card");
      })
      .then(function (setup) {
        if (!setup.client_secret) {
          throw new Error(
            "Stripe card verification could not be started."
          );
        }

        var holderName = String(
          (payload.first_name || "")
          + " "
          + (payload.last_name || "")
        ).trim();

        return stripeClient.confirmCardSetup(
          setup.client_secret,
          {
            payment_method: {
              card: stripeCard,
              billing_details: {
                name: holderName,
                email: payload.email || ""
              }
            }
          }
        );
      })
      .then(function (result) {
        if (result && result.error) {
          throw new Error(
            result.error.message || "Card verification failed."
          );
        }

        var intent = result && result.setupIntent
          ? result.setupIntent
          : null;
        if (!intent || intent.status !== "succeeded" || !intent.id) {
          throw new Error(
            "Please complete the card verification."
          );
        }

        guaranteeSetupReference = String(intent.id);
        guaranteeVerified = true;
        guaranteeSelectedProvider = "stripe";

        return verifiedPayload(payload);
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
    if (value !== state.date && guaranteeVerified) {
      invalidateGuaranteeVerification(true);
    }
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
    if (value !== state.time && guaranteeVerified) {
      invalidateGuaranteeVerification(true);
    }
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
    var normalizedGuests = clampGuests(next);
    if (normalizedGuests !== state.guests && guaranteeVerified) {
      invalidateGuaranteeVerification(true);
    }
    state.guests = normalizedGuests;
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

  if (guaranteeMethodsNode) {
    guaranteeMethodsNode.addEventListener("click", function (event) {
      var button = event.target.closest("[data-pmd-guarantee-method]");
      if (!button) return;
      selectGuaranteeMethod(
        button.getAttribute("data-pmd-guarantee-method")
      );
    });
  }

  if (guaranteeProviderButton) {
    guaranteeProviderButton.addEventListener(
      "click",
      beginProviderVerification
    );
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
