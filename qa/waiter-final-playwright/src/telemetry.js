import { expect } from '@playwright/test';
import { qaConfig, isIgnored } from './config.js';

function sameOrigin(url) {
  try {
    return new URL(url).origin === new URL(qaConfig.baseURL).origin;
  } catch {
    return false;
  }
}

export async function installTelemetry(page, testInfo) {
  const report = {
    test: testInfo.title,
    project: testInfo.project.name,
    startedAt: new Date().toISOString(),
    console: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
    dialogs: [],
    metrics: null,
  };

  await page.addInitScript(() => {
    window.__PMD_QA_METRICS__ = {
      layoutShiftScore: 0,
      layoutShifts: [],
      longTasks: [],
      navigation: null,
    };

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__PMD_QA_METRICS__.layoutShiftScore += entry.value;
            window.__PMD_QA_METRICS__.layoutShifts.push({
              value: entry.value,
              startTime: entry.startTime,
              sources: (entry.sources || []).slice(0, 5).map((source) => ({
                node: source.node ? `${source.node.tagName || ''}.${source.node.className || ''}` : '',
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })),
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__PMD_QA_METRICS__.longTasks.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}

    addEventListener('load', () => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        window.__PMD_QA_METRICS__.navigation = {
          domContentLoaded: nav.domContentLoadedEventEnd,
          load: nav.loadEventEnd,
          responseStart: nav.responseStart,
          transferSize: nav.transferSize,
          decodedBodySize: nav.decodedBodySize,
        };
      }
    }, { once: true });
  });

  page.on('console', (message) => {
    report.console.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });

  page.on('pageerror', (error) => {
    report.pageErrors.push({ name: error.name, message: error.message, stack: error.stack || '' });
  });

  page.on('requestfailed', (request) => {
    report.failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
      resourceType: request.resourceType(),
    });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      report.badResponses.push({
        status: response.status(),
        method: response.request().method(),
        url: response.url(),
        resourceType: response.request().resourceType(),
      });
    }
  });

  page.on('dialog', (dialog) => {
    report.dialogs.push({ type: dialog.type(), message: dialog.message() });
  });

  async function snapshotMetrics() {
    report.metrics = await page.evaluate(() => window.__PMD_QA_METRICS__ || null).catch(() => null);
    return report.metrics;
  }

  async function attach() {
    await snapshotMetrics();
    report.finishedAt = new Date().toISOString();
    await testInfo.attach('pmd-qa-telemetry.json', {
      body: Buffer.from(JSON.stringify(report, null, 2)),
      contentType: 'application/json',
    });
  }

  async function assertHealthy(options = {}) {
    const metrics = await snapshotMetrics();
    const maxLayoutShift = options.maxLayoutShift ?? qaConfig.maxLayoutShift;
    const maxLongTasks = options.maxLongTasks ?? qaConfig.maxLongTasks;

    const consoleErrors = report.console.filter((row) =>
      row.type === 'error' && !isIgnored(row.text, qaConfig.ignoreConsolePatterns)
    );

    const criticalResponses = report.badResponses.filter((row) => {
      if (isIgnored(row.url, qaConfig.ignoreNetworkPatterns)) return false;
      if (row.status >= 500) return true;
      if (!sameOrigin(row.url)) return false;
      if ([401, 403].includes(row.status)) return true;
      return row.status === 404 && /\/admin\/(dashboardwaiternewfinal|pmd-waiter|waiter-final)|pmd-waiter-.*\.(js|css)/i.test(row.url);
    });

    const criticalFailures = report.failedRequests.filter((row) => {
      if (!sameOrigin(row.url)) return false;
      if (isIgnored(row.url, qaConfig.ignoreNetworkPatterns)) return false;
      return !/ERR_ABORTED|NS_BINDING_ABORTED/i.test(row.failure);
    });

    expect(report.pageErrors, 'Uncaught browser errors').toEqual([]);
    expect(consoleErrors, 'Console errors').toEqual([]);
    expect(criticalResponses, 'Critical HTTP responses').toEqual([]);
    expect(criticalFailures, 'Failed same-origin requests').toEqual([]);

    if (metrics) {
      expect(metrics.layoutShiftScore, 'Cumulative layout shift').toBeLessThanOrEqual(maxLayoutShift);
      expect(metrics.longTasks.length, 'Long tasks above 50 ms').toBeLessThanOrEqual(maxLongTasks);
    }
  }

  return { report, snapshotMetrics, attach, assertHealthy };
}
