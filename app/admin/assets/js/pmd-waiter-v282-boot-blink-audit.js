(function () {
  'use strict';

  if (window.PMD_BOOT_BLINK_AUDIT_ACTIVE) return;
  window.PMD_BOOT_BLINK_AUDIT_ACTIVE = true;

  var START = performance.now();
  var DURATION = 3500;
  var MAX_RECORDS = 5000;

  var report = {
    version: '2.8.2',
    url: location.href,
    startedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio
    },
    themeAtStart: {
      htmlTheme:
        document.documentElement.getAttribute('data-pmd-pos-theme'),
      htmlClass: document.documentElement.className,
      colorScheme:
        getComputedStyle(document.documentElement).colorScheme
    },
    domOperations: [],
    mutations: [],
    styleTimeline: [],
    layoutShifts: [],
    longTasks: [],
    resources: [],
    scripts: [],
    stylesheets: [],
    errors: [],
    rejections: [],
    summary: {}
  };

  window.PMD_BOOT_BLINK_AUDIT = report;

  function now() {
    return Math.round((performance.now() - START) * 100) / 100;
  }

  function safeText(value, limit) {
    var text = String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > limit
      ? text.slice(0, limit) + '…'
      : text;
  }

  function safeSelector(element) {
    if (!element || element.nodeType !== 1) return '';

    var output = element.tagName.toLowerCase();

    if (element.id) {
      output += '#' + element.id;
    }

    if (element.classList && element.classList.length) {
      output += '.' + Array.prototype.slice.call(element.classList)
        .slice(0, 5)
        .join('.');
    }

    [
      'data-v2-open-table',
      'data-final-open-table',
      'data-v21-number',
      'data-v241-filter',
      'data-v257-action',
      'data-pmd-pos-theme'
    ].forEach(function (name) {
      if (element.hasAttribute &&
          element.hasAttribute(name)) {
        output += '[' + name + '="' +
          safeText(element.getAttribute(name), 50) + '"]';
      }
    });

    return output;
  }

  function stackSource() {
    var stack = '';

    try {
      stack = String(new Error().stack || '');
    } catch (error) {}

    var lines = stack.split('\n').map(function (line) {
      return line.trim();
    });

    var useful = lines.find(function (line) {
      return (
        line.indexOf('pmd-waiter-') !== -1 &&
        line.indexOf('v282-boot-blink-audit') === -1
      );
    });

    return useful || lines.slice(2, 6).join(' | ');
  }

  function pushLimited(collection, item) {
    if (collection.length < MAX_RECORDS) {
      collection.push(item);
    }
  }

  function recordOperation(type, element, detail) {
    pushLimited(report.domOperations, {
      time: now(),
      type: type,
      target: safeSelector(element),
      detail: safeText(detail, 240),
      source: stackSource()
    });
  }

  /*
   * Capture direct class and attribute modifications with stack traces.
   */
  var originalSetAttribute = Element.prototype.setAttribute;

  Element.prototype.setAttribute = function (name, value) {
    if (
      name === 'class' ||
      name === 'style' ||
      name === 'hidden' ||
      name === 'data-pmd-pos-theme'
    ) {
      recordOperation(
        'setAttribute:' + name,
        this,
        value
      );
    }

    return originalSetAttribute.apply(this, arguments);
  };

  var originalRemoveAttribute = Element.prototype.removeAttribute;

  Element.prototype.removeAttribute = function (name) {
    if (
      name === 'class' ||
      name === 'style' ||
      name === 'hidden' ||
      name === 'data-pmd-pos-theme'
    ) {
      recordOperation(
        'removeAttribute:' + name,
        this,
        ''
      );
    }

    return originalRemoveAttribute.apply(this, arguments);
  };

  [
    'add',
    'remove',
    'toggle',
    'replace'
  ].forEach(function (method) {
    var original = DOMTokenList.prototype[method];

    if (!original) return;

    DOMTokenList.prototype[method] = function () {
      var owner = this && this.value != null
        ? findTokenOwner(this)
        : null;

      recordOperation(
        'classList.' + method,
        owner,
        Array.prototype.join.call(arguments, ', ')
      );

      return original.apply(this, arguments);
    };
  });

  function findTokenOwner(tokenList) {
    /*
     * DOMTokenList does not expose its owning element.
     * Stack traces remain the most useful signal here.
     */
    return null;
  }

  [
    'appendChild',
    'insertBefore',
    'replaceChild',
    'removeChild'
  ].forEach(function (method) {
    var original = Node.prototype[method];

    if (!original) return;

    Node.prototype[method] = function () {
      var child = arguments[0];

      recordOperation(
        method,
        this.nodeType === 1 ? this : null,
        child && child.nodeType === 1
          ? safeSelector(child)
          : child && child.nodeName
      );

      return original.apply(this, arguments);
    };
  });

  if (Element.prototype.replaceChildren) {
    var originalReplaceChildren =
      Element.prototype.replaceChildren;

    Element.prototype.replaceChildren = function () {
      recordOperation(
        'replaceChildren',
        this,
        'children=' + arguments.length
      );

      return originalReplaceChildren.apply(this, arguments);
    };
  }

  /*
   * Observe actual DOM mutations.
   */
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      var record = {
        time: now(),
        type: mutation.type,
        target: safeSelector(mutation.target),
        attribute: mutation.attributeName || '',
        oldValue: safeText(mutation.oldValue, 180),
        added: [],
        removed: []
      };

      if (mutation.addedNodes) {
        record.added = Array.prototype.slice
          .call(mutation.addedNodes)
          .slice(0, 10)
          .map(function (node) {
            return node.nodeType === 1
              ? safeSelector(node)
              : safeText(node.textContent, 80);
          });
      }

      if (mutation.removedNodes) {
        record.removed = Array.prototype.slice
          .call(mutation.removedNodes)
          .slice(0, 10)
          .map(function (node) {
            return node.nodeType === 1
              ? safeSelector(node)
              : safeText(node.textContent, 80);
          });
      }

      pushLimited(report.mutations, record);
    });
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    attributeFilter: [
      'class',
      'style',
      'hidden',
      'data-pmd-pos-theme',
      'aria-pressed',
      'data-v241-state',
      'data-v257-action'
    ]
  });

  /*
   * Elements whose geometry and appearance matter.
   */
  function targets() {
    var definitions = {
      html: document.documentElement,
      body: document.body,
      leftRail: document.querySelector(
        '.pmd-v2-filter-rail,' +
        '.pmd-v23-service-rail,' +
        '.pmd-v241-lifecycle-rail,' +
        '.pmd-v257-left-rail'
      ),
      rightRail: document.querySelector(
        '.pmd-v280-right-rail,' +
        '.v257-operations-rail'
      ),
      leftButton: document.querySelector(
        '[data-v241-filter="occupied"],' +
        '[data-v2-filter="occupied"]'
      ),
      rightButton: document.querySelector(
        '.pmd-v280-operation,' +
        '.v257-operation'
      ),
      areaRow: document.querySelector(
        '.pmd-v2-area-tabs,' +
        '.pmd-v2-zone-tabs,' +
        '[data-v2-area-tabs]'
      ),
      areaButton: document.querySelector(
        '.pmd-v2-area-tabs button,' +
        '.pmd-v2-zone-tabs button'
      ),
      tableGrid: document.querySelector(
        '.pmd-v2-table-grid,' +
        '[data-v2-table-grid]'
      ),
      tableCard: document.querySelector(
        '[data-v2-open-table],' +
        '[data-final-open-table],' +
        '.pmd-v2-table-key'
      ),
      noteCard: document.querySelector(
        '[data-v274-note-count],' +
        '.has-note'
      ),
      cleaningCard: document.querySelector(
        '[data-v241-state="cleaning"],' +
        '.is-cleaning'
      )
    };

    return definitions;
  }

  function styleSnapshot(name, element) {
    if (!element) {
      return {
        name: name,
        exists: false
      };
    }

    var rect = element.getBoundingClientRect();
    var style = getComputedStyle(element);

    return {
      name: name,
      exists: true,
      selector: safeSelector(element),
      className: safeText(element.className, 180),
      text: safeText(element.textContent, 100),
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100
      },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      background: style.backgroundColor,
      color: style.color,
      border: style.border,
      borderLeft: style.borderLeft,
      borderTop: style.borderTop,
      boxShadow: style.boxShadow,
      transform: style.transform,
      transition: style.transition,
      animation: style.animation,
      position: style.position,
      gridTemplateColumns: style.gridTemplateColumns,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight
    };
  }

  var lastSignatures = {};

  function sample() {
    var currentTargets = targets();

    Object.keys(currentTargets).forEach(function (name) {
      var snapshot = styleSnapshot(
        name,
        currentTargets[name]
      );

      var signature = JSON.stringify(snapshot);

      if (lastSignatures[name] !== signature) {
        pushLimited(report.styleTimeline, {
          time: now(),
          element: name,
          snapshot: snapshot
        });

        lastSignatures[name] = signature;
      }
    });
  }

  var samplingTimer = setInterval(sample, 25);
  sample();

  /*
   * Layout shifts and long main-thread tasks.
   */
  try {
    var layoutObserver = new PerformanceObserver(
      function (list) {
        list.getEntries().forEach(function (entry) {
          if (entry.hadRecentInput) return;

          pushLimited(report.layoutShifts, {
            time: Math.round(entry.startTime * 100) / 100,
            value: entry.value,
            sources: (entry.sources || []).map(function (source) {
              return {
                node: safeSelector(source.node),
                previousRect: source.previousRect,
                currentRect: source.currentRect
              };
            })
          });
        });
      }
    );

    layoutObserver.observe({
      type: 'layout-shift',
      buffered: true
    });
  } catch (error) {}

  try {
    var longTaskObserver = new PerformanceObserver(
      function (list) {
        list.getEntries().forEach(function (entry) {
          pushLimited(report.longTasks, {
            time: Math.round(entry.startTime * 100) / 100,
            duration: Math.round(entry.duration * 100) / 100,
            name: entry.name
          });
        });
      }
    );

    longTaskObserver.observe({
      type: 'longtask',
      buffered: true
    });
  } catch (error) {}

  window.addEventListener('error', function (event) {
    pushLimited(report.errors, {
      time: now(),
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error && event.error.stack
    });
  }, true);

  window.addEventListener(
    'unhandledrejection',
    function (event) {
      pushLimited(report.rejections, {
        time: now(),
        reason: safeText(
          event.reason &&
          (
            event.reason.stack ||
            event.reason.message ||
            event.reason
          ),
          800
        )
      });
    }
  );

  function finish() {
    clearInterval(samplingTimer);
    observer.disconnect();
    sample();

    report.finishedAt = new Date().toISOString();
    report.duration = now();

    report.resources = performance
      .getEntriesByType('resource')
      .map(function (entry) {
        return {
          name: entry.name,
          initiatorType: entry.initiatorType,
          startTime:
            Math.round(entry.startTime * 100) / 100,
          duration:
            Math.round(entry.duration * 100) / 100,
          transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize
        };
      });

    report.scripts = Array.prototype.slice.call(
      document.scripts
    ).map(function (script, index) {
      return {
        index: index,
        src: script.src || 'INLINE',
        async: script.async,
        defer: script.defer,
        type: script.type || 'classic'
      };
    });

    report.stylesheets = Array.prototype.slice.call(
      document.querySelectorAll(
        'link[rel="stylesheet"], style'
      )
    ).map(function (node, index) {
      return {
        index: index,
        type: node.tagName.toLowerCase(),
        href: node.href || '',
        media: node.media || '',
        textPreview:
          node.tagName === 'STYLE'
            ? safeText(node.textContent, 160)
            : ''
      };
    });

    var sourceCounts = {};
    var operationCounts = {};
    var mutationCounts = {};
    var styleCounts = {};

    report.domOperations.forEach(function (item) {
      var source = item.source || 'UNKNOWN';
      sourceCounts[source] =
        (sourceCounts[source] || 0) + 1;

      operationCounts[item.type] =
        (operationCounts[item.type] || 0) + 1;
    });

    report.mutations.forEach(function (item) {
      var key =
        item.type +
        (item.attribute ? ':' + item.attribute : '');

      mutationCounts[key] =
        (mutationCounts[key] || 0) + 1;
    });

    report.styleTimeline.forEach(function (item) {
      styleCounts[item.element] =
        (styleCounts[item.element] || 0) + 1;
    });

    function sortedObject(source) {
      return Object.entries(source)
        .sort(function (a, b) {
          return b[1] - a[1];
        })
        .map(function (item) {
          return {
            item: item[0],
            count: item[1]
          };
        });
    }

    report.summary = {
      domOperationCount: report.domOperations.length,
      mutationCount: report.mutations.length,
      styleChangeCount: report.styleTimeline.length,
      layoutShiftCount: report.layoutShifts.length,
      totalLayoutShift: report.layoutShifts.reduce(
        function (sum, item) {
          return sum + Number(item.value || 0);
        },
        0
      ),
      longTaskCount: report.longTasks.length,
      errorCount: report.errors.length,
      rejectionCount: report.rejections.length,
      topScriptSources: sortedObject(sourceCounts)
        .slice(0, 30),
      operationTypes: sortedObject(operationCounts),
      mutationTypes: sortedObject(mutationCounts),
      styleChangesByElement: sortedObject(styleCounts)
    };

    try {
      sessionStorage.setItem(
        'PMD_BOOT_BLINK_AUDIT',
        JSON.stringify(report)
      );
    } catch (error) {}

    console.log(
      '========================================'
    );
    console.log('PMD BOOT / BLINK AUDIT COMPLETE');
    console.log(
      '========================================'
    );

    console.log('Summary:', report.summary);

    console.table(
      report.summary.topScriptSources
    );

    console.table(
      report.summary.styleChangesByElement
    );

    console.table(
      report.summary.mutationTypes
    );

    console.log(
      'Full report:',
      window.PMD_BOOT_BLINK_AUDIT
    );

    console.log(
      'Copy the complete report with:'
    );

    console.log(
      'copy(JSON.stringify(window.PMD_BOOT_BLINK_AUDIT, null, 2))'
    );

    console.log(
      'Show only files causing DOM changes with:'
    );

    console.log(
      'console.table(window.PMD_BOOT_BLINK_AUDIT.summary.topScriptSources)'
    );

    console.log(
      'Show the style-changing timeline with:'
    );

    console.log(
      'console.table(window.PMD_BOOT_BLINK_AUDIT.styleTimeline.map(x => ({time:x.time, element:x.element, selector:x.snapshot.selector, className:x.snapshot.className, background:x.snapshot.background, border:x.snapshot.border, display:x.snapshot.display, opacity:x.snapshot.opacity})))'
    );
  }

  setTimeout(finish, DURATION);

  console.info(
    '[PMD] V2.8.2 early boot/blink audit started'
  );
})();
