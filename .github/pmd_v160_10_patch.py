from pathlib import Path

path = Path('app/admin/assets/js/pmd-waiter-floor-edit-v160.js')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, name: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{name}: expected 1 occurrence, found {count}')
    text = text.replace(old, new, 1)


if 'pmd-waiter-floor-edit-v160.10' in text:
    raise RuntimeError('V160.10 already present')

replace_once(
    """  var dropAdjustments = 0;
  var proxyMoves = 0;
""",
    """  var dropAdjustments = 0;
  var proxyMoves = 0;

  var stableFloorSection = null;
  var stableFloorMap = null;
  var stableFloorObserver = null;
  var stableFloorRetryTimer = 0;
  var stableFloorReconciling = false;
  var stableFloorLastScrollTop = 0;
  var stableFloorReplacementsBlocked = 0;
  var stableFloorAdoptions = 0;
  var stableFloorTablesAdded = 0;
  var stableFloorTablesRemoved = 0;
  var stableFloorStatusSyncs = 0;
  var stableFloorNumberRepairs = 0;
  var stableFloorBadgeSuppressions = 0;
""",
    'variable anchor',
)

stable_code = r'''  function stableSection(currentRoot) {
    if (!currentRoot) return null;
    var sections = Array.prototype.slice.call(currentRoot.querySelectorAll('section.pmd-w5-floor'));
    for (var index = 0; index < sections.length; index++) {
      if (sections[index].querySelector('.pmd-w5-floor-map-real')) return sections[index];
    }
    return null;
  }

  function stableMapFor(section) {
    return section ? section.querySelector('.pmd-w5-floor-map-real') : null;
  }

  function stableTables(map) {
    return map
      ? Array.prototype.slice.call(map.querySelectorAll('.pmd-w5-table[data-table]:not(.pmd-v160-drag-proxy)'))
      : [];
  }

  function stableNo(table) {
    return String(table && table.getAttribute('data-table') || '').replace(/\s+/g, '').trim();
  }

  function stableText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function stableByNumber(map) {
    var result = new Map();
    stableTables(map).forEach(function (table) {
      var number = stableNo(table);
      if (number && !result.has(number)) result.set(number, table);
    });
    return result;
  }

  function stableOrderCounts(table) {
    if (!table) return [];
    return Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child || child.nodeType !== 1) return false;
      if (child.classList.contains('pmd-v175c-attention-badge')) return false;
      if (child.classList.contains('pmd-v175c-table-number')) return false;
      return child.tagName === 'SMALL' || /order[-_ ]?count|pmd-v183-order-count-badge/i.test(String(child.className || ''));
    });
  }

  function stableEnsureNumber(table) {
    var number = stableNo(table);
    if (!number) return null;

    var label = table.querySelector(':scope > .pmd-v175c-table-number');
    if (!label) {
      label = Array.prototype.slice.call(table.children).find(function (child) {
        return child.tagName === 'SPAN' && stableText(child.textContent) === number;
      }) || null;

      if (!label) {
        label = document.createElement('span');
        table.appendChild(label);
      }

      label.classList.add('pmd-v175c-table-number');
      stableFloorNumberRepairs++;
    }

    if (label.textContent !== number) {
      label.textContent = number;
      stableFloorNumberRepairs++;
    }

    label.classList.remove('pmd-v175c-hide-dupe-number');
    label.removeAttribute('aria-hidden');
    if (label.style.getPropertyValue('display') === 'none') label.style.removeProperty('display');

    Array.prototype.slice.call(table.childNodes).forEach(function (node) {
      if (node === label) return;
      if (node.nodeType === 3) {
        if (stableText(node.nodeValue) === number) node.nodeValue = '';
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.classList.contains('pmd-v175c-attention-badge')) return;
      if (stableOrderCounts(table).indexOf(node) !== -1) return;
      if (stableText(node.textContent) !== number) return;
      node.classList.add('pmd-v175c-hide-dupe-number');
      node.setAttribute('aria-hidden', 'true');
      setImportant(node, 'display', 'none');
    });

    return label;
  }

  function stableEnsureSingleBadge(table) {
    var attention = Array.prototype.slice.call(
      table.querySelectorAll(':scope > .pmd-v175c-attention-badge')
    );

    attention.slice(1).forEach(function (badge) {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    });

    var primaryAttention = attention.length ? attention[0] : null;
    var counts = stableOrderCounts(table);

    counts.forEach(function (count, index) {
      count.classList.add('pmd-v183-order-count-badge');
      var suppress = !!primaryAttention || index > 0;

      if (suppress) {
        if (!count.classList.contains('pmd-v160-suppressed-order-count')) {
          stableFloorBadgeSuppressions++;
          count.classList.add('pmd-v160-suppressed-order-count');
        }
        count.setAttribute('aria-hidden', 'true');
        setImportant(count, 'display', 'none');
      } else {
        count.classList.remove('pmd-v160-suppressed-order-count');
        count.removeAttribute('aria-hidden');
        if (count.style.getPropertyValue('display') === 'none') count.style.removeProperty('display');
      }
    });
  }

  function stableNormalizeTable(table) {
    if (!table) return;

    table.classList.add('pmd-v175c-floor-tile');
    transformStyleOwners.set(table.style, table);

    setImportant(table, 'position', 'absolute');
    setImportant(table, 'right', 'auto');
    setImportant(table, 'bottom', 'auto');
    setImportant(table, 'margin', '0');
    setImportant(table, 'width', '104px');
    setImportant(table, 'height', '86px');
    setImportant(table, 'min-width', '104px');
    setImportant(table, 'min-height', '86px');
    setImportant(table, 'max-width', '104px');
    setImportant(table, 'max-height', '86px');
    setImportant(table, 'transform', 'translate(-50%, -50%)');
    setImportant(table, 'transition', 'none');
    setImportant(table, 'animation', 'none');
    setImportant(table, 'overflow', 'visible');

    stableEnsureNumber(table);
    stableEnsureSingleBadge(table);
  }

  function stableNormalizeAll() {
    stableTables(stableFloorMap).forEach(stableNormalizeTable);
  }

  function stableSyncCount(oldTable, freshTable) {
    var fresh = stableOrderCounts(freshTable);
    var current = stableOrderCounts(oldTable);

    if (!fresh.length) {
      current.forEach(function (count) {
        if (count.parentNode) count.parentNode.removeChild(count);
      });
      return;
    }

    var count = current.length ? current[0] : null;
    if (!count) {
      count = fresh[0].cloneNode(true);
      oldTable.appendChild(count);
    }

    var nextText = stableText(fresh[0].textContent);
    if (stableText(count.textContent) !== nextText) count.textContent = nextText;

    current.slice(1).forEach(function (extra) {
      if (extra.parentNode) extra.parentNode.removeChild(extra);
    });
  }

  function stableSyncTable(oldTable, freshTable) {
    var dataClasses = [
      'is-active', 'is-ready', 'is-payment', 'is-urgent', 'is-selected',
      'has-orders', 'busy', 'available', 'free', 'payment', 'waiting',
      'note', 'call', 'needs', 'attention'
    ];

    dataClasses.forEach(function (className) {
      oldTable.classList.toggle(className, freshTable.classList.contains(className));
    });

    ['title', 'aria-label', 'aria-pressed'].forEach(function (attribute) {
      var value = freshTable.getAttribute(attribute);
      if (value == null) oldTable.removeAttribute(attribute);
      else oldTable.setAttribute(attribute, value);
    });

    stableSyncCount(oldTable, freshTable);
    stableNormalizeTable(oldTable);
    stableFloorStatusSyncs++;
  }

  function stableInsertTable(table) {
    var anchor = stableFloorMap && stableFloorMap.querySelector(
      ':scope > .pmd-v61-map-info-btn, :scope > .pmd-v61-map-legend, :scope > .pmd-v160-recovery-notice'
    );
    stableFloorMap.insertBefore(table, anchor || null);
  }

  function stableAdopt(section) {
    var map = stableMapFor(section);
    if (!section || !map) return false;
    stableFloorSection = section;
    stableFloorMap = map;
    stableFloorAdoptions++;
    stableNormalizeAll();
    return true;
  }

  function stableReconcile(reason) {
    var currentRoot = root();
    if (!currentRoot || stableFloorReconciling) return false;

    var freshSection = stableSection(currentRoot);
    if (!freshSection) return false;
    if (!stableFloorSection || !stableFloorMap) return stableAdopt(freshSection);

    if (freshSection === stableFloorSection) {
      stableNormalizeAll();
      return false;
    }

    var freshMap = stableMapFor(freshSection);
    if (!freshMap) return false;

    stableFloorReconciling = true;
    try {
      var freshByNo = stableByNumber(freshMap);
      var oldByNo = stableByNumber(stableFloorMap);

      freshByNo.forEach(function (freshTable, number) {
        var oldTable = oldByNo.get(number);
        if (oldTable) {
          stableSyncTable(oldTable, freshTable);
        } else {
          stableNormalizeTable(freshTable);
          stableInsertTable(freshTable);
          stableFloorTablesAdded++;
        }
      });

      if (freshByNo.size > 0) {
        oldByNo.forEach(function (oldTable, number) {
          if (!freshByNo.has(number)) {
            oldTable.remove();
            stableFloorTablesRemoved++;
          }
        });
      }

      freshSection.replaceWith(stableFloorSection);
      stableFloorReplacementsBlocked++;
      stableNormalizeAll();
      markAuthority();
      ensureLegend();
      currentRoot.scrollTop = stableFloorLastScrollTop;
      return true;
    } finally {
      stableFloorReconciling = false;
    }
  }

  function stableInstall() {
    var currentRoot = root();
    if (!currentRoot) {
      clearTimeout(stableFloorRetryTimer);
      stableFloorRetryTimer = setTimeout(stableInstall, 40);
      return;
    }

    if (!stableFloorSection) stableAdopt(stableSection(currentRoot));
    if (stableFloorObserver) return;

    stableFloorLastScrollTop = currentRoot.scrollTop || 0;
    currentRoot.addEventListener('scroll', function () {
      stableFloorLastScrollTop = currentRoot.scrollTop || 0;
    }, {passive:true});

    stableFloorObserver = new MutationObserver(function (mutations) {
      if (stableFloorReconciling) return;

      var currentSection = stableSection(currentRoot);
      if (currentSection && currentSection !== stableFloorSection) {
        stableReconcile('root-replacement');
        return;
      }

      var touchesFloor = mutations.some(function (mutation) {
        var target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : null;
        return !!(target && stableFloorSection && (
          target === stableFloorSection || stableFloorSection.contains(target)
        ));
      });

      if (touchesFloor) stableNormalizeAll();
    });

    stableFloorObserver.observe(currentRoot, {childList:true, subtree:true});
  }

  function stableVisibleBadgeCount(table) {
    return Array.prototype.slice.call(table.children).filter(function (child) {
      if (!child.classList) return false;
      var badge = child.classList.contains('pmd-v175c-attention-badge') ||
        child.classList.contains('pmd-v183-order-count-badge') || child.tagName === 'SMALL';
      if (!badge) return false;
      var style = getComputedStyle(child);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    }).length;
  }

'''

replace_once(
    """  function scheduleApply() {
""",
    stable_code + """  function scheduleApply() {
""",
    'stable code insertion anchor',
)

replace_once(
    """  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    scheduleApply();
""",
    """  document.addEventListener('pmd-waiter-dashboard-rendered', function () {
    stableInstall();
    stableReconcile('dashboard-rendered');
    scheduleApply();
""",
    'render event anchor',
)

replace_once(
    """  bindObserver();
  markAuthority();
""",
    """  bindObserver();
  stableInstall();
  stableReconcile('v160-boot');
  markAuthority();
""",
    'boot anchor',
)

replace_once(
    """    apply: function () {
      markAuthority();
""",
    """    apply: function () {
      stableInstall();
      stableReconcile('manual-apply');
      markAuthority();
""",
    'public apply anchor',
)

replace_once(
    """        badgeOrigin: 'border-box-corrected',
        tableGap: TABLE_GAP,
""",
    """        badgeOrigin: 'border-box-corrected',
        floorDomMode: 'stable-section-reconcile',
        stableFloorConnected: !!(stableFloorSection && stableFloorSection.isConnected),
        stableFloorNodePreserved: stableSection(root()) === stableFloorSection,
        v5FloorReplacementsBlocked: stableFloorReplacementsBlocked,
        stableFloorAdoptions: stableFloorAdoptions,
        stableFloorTablesAdded: stableFloorTablesAdded,
        stableFloorTablesRemoved: stableFloorTablesRemoved,
        stableFloorStatusSyncs: stableFloorStatusSyncs,
        canonicalNumberRepairs: stableFloorNumberRepairs,
        suppressedSecondaryBadges: stableFloorBadgeSuppressions,
        numberMismatchTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          var number = table.getAttribute('data-table') || '';
          var labels = table.querySelectorAll(':scope > .pmd-v175c-table-number');
          return labels.length !== 1 || stableText(labels[0].textContent) !== number;
        }).map(function (table) { return table.getAttribute('data-table') || ''; }),
        multipleVisibleBadgeTables: Array.prototype.slice.call(tableNodes).filter(function (table) {
          return stableVisibleBadgeCount(table) > 1;
        }).map(function (table) { return table.getAttribute('data-table') || ''; }),
        tableGap: TABLE_GAP,
""",
    'debug anchor',
)

replace_once(
    """    stop: function () {
      if (observer) observer.disconnect();
""",
    """    stop: function () {
      if (observer) observer.disconnect();
      if (stableFloorObserver) stableFloorObserver.disconnect();
      clearTimeout(stableFloorRetryTimer);
""",
    'stop anchor',
)

replace_once(
    "version: 'pmd-waiter-floor-edit-v160.9'",
    "version: 'pmd-waiter-floor-edit-v160.10'",
    'version marker',
)

replace_once(
    "console.info('[PMD] Waiter floor edit V160.9 border-corrected number-badge proxy authority active');",
    "console.info('[PMD] Waiter floor edit V160.10 stable floor DOM + single badge authority active');",
    'console marker',
)

path.write_text(text, encoding='utf-8')
print('PMD_V160_10_PATCH_OK')
