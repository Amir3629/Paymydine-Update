(function () {
  "use strict";

  var configNode = document.getElementById("pmd-booking-manage-config");
  if (!configNode) return;

  var config = {};
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    return;
  }

  var labels = config.labels || {};
  var csrf = document.querySelector('meta[name="csrf-token"]');
  var languageNav = document.querySelector("[data-pmd-manage-language-nav]");
  var form = document.getElementById("pmd-booking-manage-form");
  var dateInput = document.getElementById("pmd-manage-date");
  var guestsInput = document.getElementById("pmd-manage-guests");
  var timeInput = document.getElementById("pmd-manage-time");
  var times = document.getElementById("pmd-manage-times");
  var saveButton = document.getElementById("pmd-manage-save");
  var cancelButton = document.getElementById("pmd-manage-cancel");
  var cancelNote = document.getElementById("pmd-manage-cancel-note");
  var cancelDialog = document.getElementById("pmd-manage-cancel-dialog");
  var cancelDialogPanel = cancelDialog ? cancelDialog.querySelector(".pmd-booking-manage-dialog__panel") : null;
  var cancelDialogBackdrop = cancelDialog ? cancelDialog.querySelector("[data-pmd-manage-dialog-close]") : null;
  var cancelDialogKeep = document.getElementById("pmd-manage-cancel-dialog-keep");
  var cancelDialogConfirm = document.getElementById("pmd-manage-cancel-dialog-confirm");
  var cancelDialogLastFocus = null;
  var message = document.getElementById("pmd-manage-message");
  var currentDate = document.getElementById("pmd-manage-current-date");
  var currentTime = document.getElementById("pmd-manage-current-time");
  var currentParty = document.getElementById("pmd-manage-current-party");
  var statusNode = document.querySelector("[data-pmd-manage-status]");
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
  var availabilityAbort = null;
  var locale = config.localeTag || config.locale || "en-GB";
  var capacityCache = Object.create(null);
  var stripePromise = null;
  var stripeClient = null;
  var stripeCard = null;
  var stripeWalletElements = null;
  var stripeWalletElement = null;
  var stripeWalletMethod = "";
  var stripeWalletCache = Object.create(null);
  var stripeWarmScheduled = false;
  var sumupPromise = null;
  var sumupWidget = null;
  var guaranteeSelectedMethod = "";
  var guaranteeSelectedProvider = "";
  var guaranteeSetupReference = "";
  var guaranteeVerified = false;
  var guaranteeProviderBusy = false;
  var guaranteeCardComplete = false;
  var guaranteeCardLoadFailed = false;

  var state = {
    date: config.reservation ? String(config.reservation.date || "") : "",
    guests: config.reservation ? Number(config.reservation.guests || 1) : 1,
    time: config.reservation ? String(config.reservation.time || "") : "",
    loading: false
  };

  function activeLanguageCode() {
    return String(config.locale || "en").toLowerCase().slice(0, 2);
  }

  function partyLabel(count) {
    return count + " " + (count === 1 ? (labels.guest || "guest") : (labels.guests || "guests"));
  }

  function setMessage(text, error) {
    if (!message) return;
    message.textContent = text || "";
    message.classList.toggle("is-visible", Boolean(text));
    message.classList.toggle("is-error", Boolean(error));
  }

  function openCancelDialog() {
    if (!cancelDialog) return;
    cancelDialogLastFocus = document.activeElement;
    cancelDialog.hidden = false;
    cancelDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("pmd-booking-dialog-open");

    window.requestAnimationFrame(function () {
      cancelDialog.classList.add("is-open");
      if (cancelDialogKeep) cancelDialogKeep.focus();
      else if (cancelDialogPanel) cancelDialogPanel.focus();
    });
  }

  function closeCancelDialog(restoreFocus) {
    if (!cancelDialog) return;
    cancelDialog.classList.remove("is-open");
    cancelDialog.hidden = true;
    cancelDialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("pmd-booking-dialog-open");

    if (
      restoreFocus !== false
      && cancelDialogLastFocus
      && typeof cancelDialogLastFocus.focus === "function"
      && document.documentElement.contains(cancelDialogLastFocus)
    ) {
      cancelDialogLastFocus.focus();
    }

    cancelDialogLastFocus = null;
  }

  function trapCancelDialogFocus(event) {
    if (!cancelDialog || cancelDialog.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeCancelDialog(true);
      return;
    }

    if (event.key !== "Tab") return;

    var focusable = [cancelDialogKeep, cancelDialogConfirm].filter(function (node) {
      return node && !node.disabled && !node.hidden;
    });

    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function translateStaticContent() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-i18n]"), function (node) {
      var key = node.getAttribute("data-pmd-manage-i18n");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.textContent = labels[key];
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-placeholder]"), function (node) {
      var key = node.getAttribute("data-pmd-manage-placeholder");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.setAttribute("placeholder", labels[key]);
      }
    });

    if (currentParty && config.reservation) {
      currentParty.textContent = partyLabel(Number(config.reservation.guests || state.guests));
    }

    if (statusNode) {
      statusNode.textContent = statusNode.classList.contains("is-canceled")
        ? (labels.status_canceled || "Canceled")
        : (labels.status_active || "Active");
    }

    document.title = (labels.manage_booking || "Manage booking") + " · " + (config.restaurantName || "");
  }

  function applyLanguage(code, updateUrl) {
    code = String(code || "").toLowerCase().slice(0, 2);
    var packs = config.labelsByLocale || {};
    if (!packs[code]) return false;

    config.locale = code;
    labels = packs[code];
    config.labels = labels;

    var tag = (config.localeTags && config.localeTags[code]) || code;
    var direction = (config.localeDirections && config.localeDirections[code]) || "ltr";
    document.documentElement.lang = tag;
    document.documentElement.dir = direction;

    var visibleLanguages = 0;
    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-language]"), function (link) {
      var current = link.getAttribute("data-pmd-manage-language") === code;
      link.hidden = current;
      link.setAttribute("aria-hidden", current ? "true" : "false");
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
      if (!current) visibleLanguages += 1;
    });
    if (languageNav) {
      languageNav.hidden = visibleLanguages === 0;
      languageNav.classList.toggle("is-single-choice", visibleLanguages === 1);
    }

    var hiddenLang = document.querySelector('input[name="lang"]');
    if (hiddenLang) hiddenLang.value = code;

    locale = tag;
    translateStaticContent();
    renderGuarantee();

    if (updateUrl !== false && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set("lang", code);
      window.history.replaceState({ pmdManageLang: code }, "", url.pathname + url.search);
    }

    return true;
  }

  function responseMessages(payload) {
    var messages = [];
    if (payload && payload.errors) {
      Object.keys(payload.errors).forEach(function (key) {
        var value = payload.errors[key];
        if (Array.isArray(value)) messages = messages.concat(value);
        else if (value) messages.push(String(value));
      });
    }
    if (!messages.length && payload && payload.message) messages.push(String(payload.message));
    return messages;
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
      config.guaranteeLocksSchedule !== true &&
      guarantee.enabled &&
      Number(guarantee.amountPerGuestCents || 0) > 0 &&
      state.guests >= Math.max(1, Number(guarantee.minGuests || 1))
    );
  }

  function guaranteeMoney(cents, currency, localeOverride) {
    var amount = Math.max(0, Number(cents || 0)) / 100;
    try {
      return new Intl.NumberFormat(localeOverride || locale, {
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

  function setStripeWalletVisibility(method) {
    var active = false;

    Object.keys(stripeWalletCache).forEach(function (code) {
      var entry = stripeWalletCache[code];
      if (!entry || !entry.slot) return;

      var visible = Boolean(method && code === method);
      entry.slot.classList.toggle("is-active", visible);
      entry.slot.setAttribute("aria-hidden", visible ? "false" : "true");
      active = active || visible;
    });

    if (guaranteeWalletNode) {
      guaranteeWalletNode.hidden = !active;
    }
  }

  function resetProviderWidgets() {
    // Stripe wallet Elements are intentionally kept mounted and warm.
    // Verification state changes must not force Apple Pay / Google Pay
    // iframes to be recreated on every method switch.
    stripeWalletElement = null;
    stripeWalletElements = null;
    stripeWalletMethod = "";
    setStripeWalletVisibility("");

    if (sumupWidget && sumupWidget.unmount) {
      try { sumupWidget.unmount(); } catch (_) {}
    }
    sumupWidget = null;

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

    saveButton.disabled = !state.time || state.loading || blocked;
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
      guarantee_method: method,
      manage_hash: String(config.manageHash || "")
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
        setup_reference: reference,
        manage_hash: String(config.manageHash || "")
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
      throw new Error("Please complete the reservation details first.");
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
      var setupNotice = String(setup.setup_notice || "");

      if (setupNotice && guaranteeProviderNote) {
        guaranteeProviderNote.textContent = setupNotice;
      }

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
              if (guaranteeProviderNote && !setupNotice) {
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

  function stripeWalletSlot(method) {
    if (!guaranteeWalletNode) return null;

    var selector = '[data-pmd-stripe-wallet-slot="' + method + '"]';
    var slot = guaranteeWalletNode.querySelector(selector);
    if (slot) return slot;

    slot = document.createElement("div");
    slot.className = "pmd-booking-guarantee__wallet-slot";
    slot.setAttribute("data-pmd-stripe-wallet-slot", method);
    slot.setAttribute("aria-hidden", "true");
    guaranteeWalletNode.appendChild(slot);

    return slot;
  }

  function ensureStripeWallet(methodCode, options) {
    var method = String(methodCode || guaranteeSelectedMethod || "").toLowerCase();
    options = options || {};
    var show = options.show !== false;

    if (!["apple_pay", "google_pay"].includes(method)) {
      return Promise.resolve(null);
    }

    var cached = stripeWalletCache[method];
    if (cached) {
      cached.showRequested = cached.showRequested || show;

      if (cached.element) {
        if (cached.showRequested) {
          stripeWalletMethod = method;
          stripeWalletElements = cached.elements;
          stripeWalletElement = cached.element;
          setStripeWalletVisibility(method);
          cached.showRequested = false;
        }
        return Promise.resolve(cached.element);
      }

      if (cached.promise) {
        return cached.promise.then(function (element) {
          if (cached.showRequested) {
            stripeWalletMethod = method;
            stripeWalletElements = cached.elements;
            stripeWalletElement = cached.element;
            setStripeWalletVisibility(method);
            cached.showRequested = false;
          }
          return element;
        });
      }
    }

    var slot = stripeWalletSlot(method);
    if (!slot) return Promise.resolve(null);

    var entry = cached || {
      method: method,
      elements: null,
      element: null,
      slot: slot,
      available: null,
      showRequested: show,
      promise: null
    };
    stripeWalletCache[method] = entry;

    // The parent must be measurable while Stripe creates its iframe. The
    // inactive slot itself stays off-canvas until selected.
    if (guaranteeWalletNode) guaranteeWalletNode.hidden = false;

    entry.promise = ensureStripeClient().then(function () {
      var guarantee = currentGuaranteeConfig();
      var elements = stripeClient.elements({
        mode: "setup",
        currency: String(guarantee.currency || "EUR").toLowerCase(),
        setupFutureUsage: "off_session",
        paymentMethodTypes: ["card"]
      });

      var paymentMethods = {
        applePay: method === "apple_pay" ? "always" : "never",
        googlePay: method === "google_pay" ? "always" : "never",
        link: "never"
      };

      var element = elements.create(
        "expressCheckout",
        {
          paymentMethods: paymentMethods,
          buttonType: {
            applePay: "plain",
            googlePay: "plain"
          },
          buttonHeight: 48
        }
      );

      entry.elements = elements;
      entry.element = element;
      entry.promise = null;

      element.mount(slot);

      element.on("ready", function (event) {
        var available = event && event.availablePaymentMethods
          ? event.availablePaymentMethods
          : {};
        var key = method === "apple_pay" ? "applePay" : "googlePay";
        entry.available = !available || available[key] !== false;
        slot.setAttribute(
          "data-pmd-wallet-ready",
          entry.available ? "1" : "0"
        );

        if (
          guaranteeSelectedMethod === method
          && guaranteeCardError
        ) {
          guaranteeCardError.textContent = entry.available
            ? ""
            : (
                (method === "apple_pay" ? "Apple Pay" : "Google Pay")
                + " is not available on this browser/device."
              );
        }
      });

      element.on("confirm", function () {
        setErrors([]);

        var payload;
        try {
          payload = providerVerificationPayload();
        } catch (error) {
          setErrors([error.message]);
          return;
        }

        guaranteeSelectedMethod = method;
        guaranteeSelectedProvider = "stripe";
        guaranteeProviderBusy = true;
        syncSubmitState();

        Promise.resolve(
          elements && elements.saveButton
            ? elements.saveButton()
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
              elements: elements,
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

      if (entry.showRequested) {
        stripeWalletMethod = method;
        stripeWalletElements = elements;
        stripeWalletElement = element;
        setStripeWalletVisibility(method);
        entry.showRequested = false;
      } else {
        setStripeWalletVisibility(
          ["apple_pay", "google_pay"].includes(guaranteeSelectedMethod)
            ? guaranteeSelectedMethod
            : ""
        );
      }

      return element;
    }).catch(function (error) {
      entry.promise = null;
      delete stripeWalletCache[method];
      throw error;
    });

    return entry.promise;
  }

  function warmGuaranteeStripe() {
    if (stripeWarmScheduled) return;

    var guarantee = currentGuaranteeConfig();
    if (!guaranteeRequired() || !guarantee.enabled || !guarantee.providerReady) return;

    var stripeMethods = guaranteeMethods().filter(function (method) {
      return method.provider === "stripe";
    });
    if (!stripeMethods.length) return;

    stripeWarmScheduled = true;

    ensureStripeClient().then(function () {
      var walletMethods = stripeMethods
        .map(function (method) { return method.code; })
        .filter(function (code) {
          return code === "apple_pay" || code === "google_pay";
        });

      return Promise.all(walletMethods.map(function (code) {
        return ensureStripeWallet(code, {show: false}).catch(function () {
          return null;
        });
      }));
    }).catch(function () {
      // The visible payment control will surface provider errors if needed.
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
        + '</strong></button>';
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
      ensureStripeWallet(method.code, {show: true}).catch(function (error) {
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
      var normalLabel = saveButton.querySelector("span");
      if (normalLabel) {
        normalLabel.textContent = labels.save || "Save changes";
      }
      syncSubmitState();
      return;
    }

    warmGuaranteeStripe();

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

    var label = saveButton.querySelector("span");
    if (label) {
      label.textContent = String(
        labels.save
        || "Save changes"
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


  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setErrors(messages) {
    messages = Array.isArray(messages) ? messages : [];
    setMessage(messages[0] || "", messages.length > 0);
  }

  function responseErrors(payload) {
    return responseMessages(payload);
  }

  function tableIdsSupportGuests(tableIds, guests) {
    if (!Array.isArray(tableIds) || !tableIds.length) return false;
    var rules = config.tableRules || {};

    for (var index = 0; index < tableIds.length; index += 1) {
      var single = rules[String(tableIds[index])] || {};
      var singleMin = Math.max(1, Number(single.min || 1));
      var singleMax = Math.max(singleMin, Number(single.max || singleMin));
      if (guests >= singleMin && guests <= singleMax) return true;
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
      duration: Number(payload.duration || 90),
      interval: Number(payload.interval || 30),
      capacity_slots: payload.capacity_slots
    };
  }

  function availabilityFromCapacity(date, guests) {
    var capacity = capacityCache[String(date)];
    if (!capacity) return null;

    return {
      opening: capacity.opening || {},
      duration: Number(capacity.duration || 90),
      interval: Number(capacity.interval || 30),
      slots: (capacity.capacity_slots || []).filter(function (slot) {
        return tableIdsSupportGuests(slot.table_ids, guests);
      }),
      capacity_slots: capacity.capacity_slots || []
    };
  }

  function renderTimes(payload) {
    if (!times) return;

    state.loading = false;
    var slots = payload && Array.isArray(payload.slots) ? payload.slots : [];
    times.innerHTML = "";

    if (!slots.length) {
      state.time = "";
      if (timeInput) timeInput.value = "";
      var empty = document.createElement("p");
      empty.className = "pmd-booking-empty";
      empty.textContent = labels.no_times || "No available times.";
      times.appendChild(empty);
      return;
    }

    var selectedExists = slots.some(function (slot) { return String(slot.value) === state.time; });
    if (!selectedExists) {
      state.time = "";
      if (timeInput) timeInput.value = "";
    }

    slots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pmd-booking-time-option";
      button.setAttribute("data-pmd-manage-time", String(slot.value));
      button.textContent = String(slot.label || slot.value);
      if (String(slot.value) === state.time) button.classList.add("is-active");
      if (config.guaranteeLocksSchedule === true) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      }
      times.appendChild(button);
    });
  }

  function loadingTimes() {
    if (!times) return;
    state.loading = true;
    times.innerHTML = "";
    var node = document.createElement("div");
    node.className = "pmd-booking-loading";
    node.textContent = labels.loading || "Checking tables…";
    times.appendChild(node);
  }

  function loadAvailability(options) {
    if (!config.availabilityUrl || !dateInput || !guestsInput) return;
    options = options || {};
    var silent = Boolean(options.silent);

    state.date = String(dateInput.value || "");
    state.guests = Math.max(1, Math.min(Number(config.maxGuests || 50), Number(guestsInput.value || 1)));
    guestsInput.value = String(state.guests);

    if (!state.date) return;

    if (availabilityAbort) availabilityAbort.abort();
    availabilityAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    if (!silent) loadingTimes();

    var url = new URL(config.availabilityUrl, window.location.origin);
    url.searchParams.set("date", state.date);
    url.searchParams.set("guests", String(state.guests));
    if (config.manageHash) url.searchParams.set("manage_hash", String(config.manageHash));

    fetch(url.toString(), {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      signal: availabilityAbort ? availabilityAbort.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var messages = responseMessages(payload);
          throw new Error(messages[0] || "Availability could not be loaded.");
        }
        return payload;
      });
    }).then(function (payload) {
      cacheCapacity(state.date, payload);
      renderTimes(payload);
      renderGuarantee();
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
      state.loading = false;
      if (silent) {
        setMessage(
          error && error.message ? error.message : (labels.no_times || "No available times."),
          true
        );
        return;
      }
      if (times) {
        times.innerHTML = "";
        var empty = document.createElement("p");
        empty.className = "pmd-booking-empty";
        empty.textContent = error && error.message ? error.message : (labels.no_times || "No available times.");
        times.appendChild(empty);
      }
    });
  }

  function formPayload() {
    var data = new FormData(form);
    var payload = {};
    data.forEach(function (value, key) { payload[key] = value; });
    payload.reserve_date = state.date;
    payload.reserve_time = state.time;
    payload.guest_num = state.guests;
    payload._pmd_booking_locale = activeLanguageCode();

    if (config.guaranteeLocksSchedule === true && config.reservation) {
      payload.first_name = String(config.reservation.first_name || "");
      payload.last_name = String(config.reservation.last_name || "");
      payload.email = String(config.reservation.email || "");
    }

    return payload;
  }

  function submitUpdate(event) {
    event.preventDefault();
    setMessage("", false);

    if (!state.time) {
      setMessage(labels.no_times || "Choose an available time.", true);
      return;
    }
    if (!form.reportValidity()) return;

    saveButton.disabled = true;
    var span = saveButton.querySelector("span");
    var previous = span ? span.textContent : "";
    if (span) span.textContent = labels.saving || "Saving changes…";

    var updatePayload = formPayload();
    if (guaranteeRequired() && span) {
      span.textContent = labels.guarantee_verifying || "Verifying payment method…";
    }

    verifyGuaranteeForBooking(updatePayload).then(function (verifiedPayload) {
      if (span) span.textContent = labels.saving || "Saving changes…";
      return fetch(config.updateUrl, {
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
          var messages = responseMessages(payload);
          var err = new Error(messages[0] || "Update failed.");
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    }).then(function (payload) {
      var reservation = payload.reservation || {};
      config.reservation = reservation;
      state.date = String(reservation.date || state.date);
      state.time = String(reservation.time || state.time);
      state.guests = Number(reservation.guests || state.guests);

      if (dateInput) dateInput.value = state.date;
      if (guestsInput) guestsInput.value = String(state.guests);
      if (timeInput) timeInput.value = state.time;
      if (currentDate) currentDate.textContent = state.date;
      if (currentTime) currentTime.textContent = state.time;
      if (currentParty) currentParty.textContent = partyLabel(state.guests);

      if (cancelButton) {
        var canCancelNow = reservation.can_cancel === true;
        cancelButton.disabled = !canCancelNow;
        cancelButton.setAttribute("aria-disabled", canCancelNow ? "false" : "true");
      }
      if (cancelNote) {
        cancelNote.hidden = reservation.can_cancel === true;
      }

      setMessage(labels.updated || payload.message || "Reservation updated.", false);

      if (
        reservation.guarantee
        && ["active", "charge_failed", "action_required"].indexOf(
          String(reservation.guarantee.status || "")
        ) !== -1
        && config.guaranteeLocksSchedule !== true
      ) {
        config.guaranteeLocksSchedule = true;
        window.location.reload();
        return;
      }

      var instant = availabilityFromCapacity(state.date, state.guests);
      if (instant) renderTimes(instant);
      else loadAvailability({ silent: true });
      renderGuarantee();
    }).catch(function (error) {
      var messages = error && error.payload ? responseMessages(error.payload) : [error.message];
      setMessage(messages[0] || "Update failed.", true);
    }).finally(function () {
      if (span) span.textContent = previous || (labels.save || "Save changes");
      syncSubmitState();
    });
  }

  function performCancelReservation() {
    if (!config.cancelUrl || !cancelButton) return;

    setMessage("", false);
    cancelButton.disabled = true;

    var previousButtonText = cancelButton.textContent;
    var previousConfirmText = cancelDialogConfirm ? cancelDialogConfirm.textContent : "";

    cancelButton.textContent = labels.canceling || "Canceling…";

    if (cancelDialogKeep) cancelDialogKeep.disabled = true;
    if (cancelDialogConfirm) {
      cancelDialogConfirm.disabled = true;
      cancelDialogConfirm.textContent = labels.canceling || "Canceling…";
    }

    fetch(config.cancelUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
      },
      body: JSON.stringify({
        _pmd_manage_action: "cancel",
        _pmd_manage_hash: config.manageHash || ""
      })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var messages = responseMessages(payload);
          var err = new Error(messages[0] || "Cancellation failed.");
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    }).then(function () {
      closeCancelDialog(false);
      setMessage(labels.canceled || "Reservation canceled.", false);

      if (statusNode) {
        statusNode.textContent = labels.status_canceled || "Canceled";
        statusNode.classList.add("is-canceled");
      }

      Array.prototype.forEach.call(
        form.querySelectorAll("input, textarea, select, button"),
        function (node) {
          node.disabled = true;
        }
      );

      cancelButton.hidden = true;
      if (cancelNote) cancelNote.hidden = true;
    }).catch(function (error) {
      var messages = error && error.payload ? responseMessages(error.payload) : [error.message];

      setMessage(messages[0] || "Cancellation failed.", true);
      cancelButton.disabled = false;
      cancelButton.textContent = previousButtonText || (labels.cancel || "Cancel reservation");

      if (cancelDialogKeep) cancelDialogKeep.disabled = false;
      if (cancelDialogConfirm) {
        cancelDialogConfirm.disabled = false;
        cancelDialogConfirm.textContent = previousConfirmText || (labels.cancel_dialog_confirm || labels.cancel || "Cancel reservation");
      }

      closeCancelDialog(true);
    });
  }

  function cancelReservation() {
    if (!config.cancelUrl || !cancelButton || cancelButton.disabled) return;
    openCancelDialog();
  }

  if (languageNav) {
    languageNav.addEventListener("click", function (event) {
      var link = event.target.closest("[data-pmd-manage-language]");
      if (!link) return;
      event.preventDefault();
      applyLanguage(link.getAttribute("data-pmd-manage-language"), true);
    });
  }

  window.addEventListener("popstate", function () {
    var url = new URL(window.location.href);
    var lang = url.searchParams.get("lang");
    if (lang && lang !== activeLanguageCode()) applyLanguage(lang, false);
  });

  if (!form) {
    translateStaticContent();
    return;
  }

  if (times) {
    times.addEventListener("click", function (event) {
      var button = event.target.closest("[data-pmd-manage-time]");
      if (!button) return;
      if (guaranteeVerified) invalidateGuaranteeVerification(true);
      state.time = String(button.getAttribute("data-pmd-manage-time") || "");
      if (timeInput) timeInput.value = state.time;
      Array.prototype.forEach.call(times.querySelectorAll("[data-pmd-manage-time]"), function (item) {
        item.classList.toggle("is-active", item === button);
      });
      renderGuarantee();
      syncSubmitState();
    });
  }

  if (dateInput) dateInput.addEventListener("change", function () {
    if (guaranteeVerified) invalidateGuaranteeVerification(true);
    state.date = String(dateInput.value || "");
    state.time = "";
    if (timeInput) timeInput.value = "";

    var instant = availabilityFromCapacity(state.date, state.guests);
    if (instant) {
      renderTimes(instant);
      renderGuarantee();
    } else {
      loadAvailability();
    }
  });

  if (guestsInput) guestsInput.addEventListener("change", function () {
    if (guaranteeVerified) invalidateGuaranteeVerification(true);
    state.guests = Math.max(
      1,
      Math.min(
        Number(config.maxGuests || 50),
        Number(guestsInput.value || 1)
      )
    );
    guestsInput.value = String(state.guests);
    state.time = "";
    if (timeInput) timeInput.value = "";

    // PMD_PUBLIC_BOOKING_ZERO_WAIT_R27
    // Initial management payload includes every free table for each time.
    // Party-size edits are filtered entirely in the browser with no spinner.
    var instant = availabilityFromCapacity(state.date, state.guests);
    if (instant) {
      renderTimes(instant);
    } else {
      loadAvailability({ silent: true });
    }
    renderGuarantee();
  });

  Array.prototype.forEach.call(
    form.querySelectorAll('input[name="first_name"], input[name="last_name"], input[name="email"]'),
    function (input) {
      input.addEventListener("input", function () {
        if (guaranteeVerified) invalidateGuaranteeVerification(true);
        renderGuarantee();
      });
    }
  );

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

  form.addEventListener("submit", submitUpdate);
  if (cancelButton) cancelButton.addEventListener("click", cancelReservation);

  if (cancelDialogKeep) {
    cancelDialogKeep.addEventListener("click", function () {
      closeCancelDialog(true);
    });
  }

  if (cancelDialogBackdrop) {
    cancelDialogBackdrop.addEventListener("click", function () {
      closeCancelDialog(true);
    });
  }

  if (cancelDialogConfirm) {
    cancelDialogConfirm.addEventListener("click", performCancelReservation);
  }

  if (cancelDialog) {
    cancelDialog.addEventListener("keydown", trapCancelDialogFocus);
  }

  translateStaticContent();

  if (config.initialAvailability) {
    cacheCapacity(state.date, config.initialAvailability);
    renderTimes(config.initialAvailability);
  } else {
    loadAvailability();
  }

  renderGuarantee();
  syncSubmitState();
})();
