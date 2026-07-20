import { test as base, expect } from '@playwright/test';
import { installTelemetry } from './telemetry.js';

export const test = base.extend({
  telemetry: async ({ page }, use, testInfo) => {
    const telemetry = await installTelemetry(page, testInfo);
    await use(telemetry);
    await telemetry.attach();
  },
});

export { expect };
