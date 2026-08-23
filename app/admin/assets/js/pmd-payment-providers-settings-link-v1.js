(function () {
  'use strict';

  if (window.PMDPaymentProvidersSettingsLinkV1) return;

  function mount() {
    if (!/^\/admin\/pmdsettings\/?$/.test(window.location.pathname)) return;

    var section = document.querySelector('[data-pmd-settings-section="finance"]');
    if (!section) return;

    var grid = section.querySelector('.pmd-settings-card-grid');
    if (!grid) return;

    if (grid.querySelector('[data-pmd-payment-providers-settings-card]')) return;

    var card = document.createElement('a');
    card.className = 'pmd-settings-card';
    card.href = '/admin/payment-providers';
    card.setAttribute('data-pmd-settings-card', '');
    card.setAttribute('data-pmd-payment-providers-settings-card', '1');
    card.setAttribute('data-accent', 'orange');
    card.setAttribute(
      'data-pmd-searchable',
      'payment providers stripe sumup square vr payment worldline paypal terminals wero'
    );

    card.innerHTML = [
      '<span class="pmd-settings-card__icon" aria-hidden="true" style="--accent:#ea580c;--accent-soft:#fff2e9;">',
        '<svg viewBox="0 0 24 24">',
          '<rect x="3" y="5" width="18" height="14" rx="2"></rect>',
          '<path d="M3 10h18M7 15h4"></path>',
          '<circle cx="18" cy="6" r="3"></circle>',
        '</svg>',
      '</span>',
      '<span class="pmd-settings-card__body">',
        '<span class="pmd-settings-card__title-row"><strong>Payment providers</strong></span>',
        '<span class="pmd-settings-card__description">Connect this restaurant’s SumUp, Stripe, Square, VR Payment and other provider accounts.</span>',
      '</span>',
      '<svg class="pmd-settings-card__arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>'
    ].join('');

    grid.insertBefore(card, grid.firstChild);
  }

  window.PMDPaymentProvidersSettingsLinkV1 = { mount: mount };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}());
