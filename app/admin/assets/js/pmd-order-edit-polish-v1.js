(function () {
  'use strict';

  if (!/^\/admin\/orders\/edit\/\d+\/?$/.test(window.location.pathname)) return;

  var frame = 0;

  function text(node) {
    return String((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function nativeIcon(symbol, className) {
    var span = document.createElement('span');
    span.className = className || 'pmd-order-native-icon';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = symbol;
    return span;
  }

  function replaceContents(node, symbol) {
    if (!node || node.getAttribute('data-pmd-native-icon') === symbol) return;
    node.replaceChildren(nativeIcon(symbol));
    node.setAttribute('data-pmd-native-icon', symbol);
  }

  function cleanMachineComment(value) {
    return String(value || '')
      .split('|')
      .map(function (part) { return part.trim(); })
      .filter(function (part) {
        if (!part || /^Table Draft Basket$/i.test(part)) return false;
        if (/^(Table ID|Table)\s*:/i.test(part)) return false;
        if (/^\[(table_draft_id|submitted_by|guest_session|guest_session_id):/i.test(part)) return false;
        return true;
      })
      .join(' | ');
  }

  function polishHeader() {
    document.querySelectorAll('.order-info-item.table-number .order-info-value').forEach(function (node) {
      if (/^(N\/A|--)?$/i.test(text(node))) node.textContent = '—';
    });

    document.querySelectorAll('.header-status-clickable').forEach(function (node) {
      var color = node.getAttribute('data-status-color') || '#364a63';
      replaceContents(node, '●');
      var icon = node.firstElementChild;
      if (icon) icon.style.setProperty('color', color, 'important');
    });

    document.querySelectorAll('.header-assignee-clickable').forEach(function (node) {
      var title = node.getAttribute('title') || '';
      replaceContents(node, title && !/--$/.test(title) ? '●' : '+');
    });

    document.querySelectorAll('.note-icon-btn').forEach(function (node) {
      replaceContents(node, '✎');
    });

    document.querySelectorAll('.invoice-icon-btn').forEach(function (node) {
      var label = node.getAttribute('title') || node.getAttribute('aria-label') || '';
      replaceContents(node, /fiscal|business/i.test(label) ? '▦' : '▤');
    });

    document.querySelectorAll('.send-invoice-icon-btn').forEach(function (node) {
      replaceContents(node, '✉');
    });
  }

  function polishOrderItems() {
    document.querySelectorAll('.qty-btn.qty-minus').forEach(function (node) {
      replaceContents(node, '−');
    });

    document.querySelectorAll('.qty-btn.qty-plus').forEach(function (node) {
      replaceContents(node, '+');
    });

    document.querySelectorAll('#btn-add-item, .btn-add-item').forEach(function (button) {
      if (button.querySelector('[data-pmd-add-symbol="1"]')) return;
      button.querySelectorAll('i.fa').forEach(function (icon) { icon.remove(); });
      var symbol = nativeIcon('+');
      symbol.setAttribute('data-pmd-add-symbol', '1');
      button.insertBefore(symbol, button.firstChild);
      button.insertBefore(document.createTextNode(' '), symbol.nextSibling);
    });
  }

  function polishCustomerCard() {
    document.querySelectorAll('.customer-info.editable-field').forEach(function (field) {
      var value = field.querySelector('.editable-value');
      var valueText = text(value);

      if (!valueText || /^N\/A$/i.test(valueText)) {
        field.style.setProperty('display', 'none', 'important');
        return;
      }

      var type = value && value.getAttribute('data-field');
      var display = field.querySelector('.editable-display');
      if (display && !display.querySelector('.pmd-native-inline-icon')) {
        display.insertBefore(nativeIcon(type === 'telephone' ? '☎' : '✉', 'pmd-native-inline-icon'), display.firstChild);
        display.insertBefore(document.createTextNode(' '), display.firstChild.nextSibling);
      }
    });
  }

  function polishComments() {
    document.querySelectorAll('.pos-comment-card p, .pos-comment-card .card-text').forEach(function (paragraph) {
      var cleaned = cleanMachineComment(paragraph.textContent);
      var card = paragraph.closest('.pos-comment-card');

      if (!cleaned) {
        if (card) card.style.setProperty('display', 'none', 'important');
      } else if (paragraph.textContent !== cleaned) {
        paragraph.textContent = cleaned;
      }
    });

    document.querySelectorAll('.card, .order-note-card').forEach(function (card) {
      var body = text(card);
      if (!/Table Draft Basket|\[table_draft_id:|\[submitted_by:/i.test(body)) return;
      var cleaned = cleanMachineComment(body);
      if (!cleaned) card.style.setProperty('display', 'none', 'important');
    });
  }

  function removeLiteralBladeTokens() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];

    while (walker.nextNode()) {
      if (/^\s*@(styles|scripts)\s*$/.test(walker.currentNode.nodeValue || '')) {
        nodes.push(walker.currentNode);
      }
    }

    nodes.forEach(function (node) { node.nodeValue = ''; });
  }

  function apply() {
    frame = 0;
    polishHeader();
    polishOrderItems();
    polishCustomerCard();
    polishComments();
    removeLiteralBladeTokens();
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  window.addEventListener('load', schedule, { once: true });
  window.PMDOrderEditPolishV1 = {
    run: apply,
    cleanMachineComment: cleanMachineComment
  };
})();
