function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function intEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function csvEnv(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizedBaseUrl(value) {
  const input = String(value || 'https://mimoza.paymydine.com').trim();
  const url = new URL(input);
  return url.toString().replace(/\/$/, '');
}

export const qaConfig = Object.freeze({
  baseURL: normalizedBaseUrl(process.env.PMD_BASE_URL),
  finalPath: process.env.PMD_FINAL_PATH || '/admin/dashboardwaiternewfinal',
  username: process.env.PMD_USERNAME || '',
  password: process.env.PMD_PASSWORD || '',
  workers: Math.max(1, intEnv('PMD_WORKERS', 1)),
  headless: boolEnv('PMD_HEADLESS', true),
  slowMo: Math.max(0, intEnv('PMD_SLOW_MO', 0)),
  expectTimeout: Math.max(3000, intEnv('PMD_EXPECT_TIMEOUT_MS', 12000)),
  actionTimeout: Math.max(3000, intEnv('PMD_ACTION_TIMEOUT_MS', 15000)),
  navigationTimeout: Math.max(10000, intEnv('PMD_NAVIGATION_TIMEOUT_MS', 45000)),
  maxLayoutShift: Math.max(0, Number(process.env.PMD_MAX_LAYOUT_SHIFT || 0.10)),
  maxLongTasks: Math.max(0, intEnv('PMD_MAX_LONG_TASKS', 12)),
  coupon: String(process.env.PMD_TEST_COUPON || '').trim(),
  allowCouponValidation: boolEnv('PMD_ALLOW_COUPON_VALIDATION', false),
  allowMutations: boolEnv('PMD_ALLOW_MUTATIONS', false),
  allowPaymentMutations: boolEnv('PMD_ALLOW_PAYMENT_MUTATIONS', false),
  mutationMode: process.env.PMD_MUTATION_MODE === 'send' ? 'send' : 'hold',
  testTables: csvEnv('PMD_TEST_TABLES'),
  testProduct: String(process.env.PMD_TEST_PRODUCT || '').trim(),
  testNote: String(process.env.PMD_TEST_NOTE || 'PLAYWRIGHT QA').trim(),
  cleanupVoid: boolEnv('PMD_CLEANUP_VOID', false),
  ignoreConsolePatterns: csvEnv('PMD_IGNORE_CONSOLE_PATTERNS'),
  ignoreNetworkPatterns: csvEnv('PMD_IGNORE_NETWORK_PATTERNS'),
});

export function requireCredentials() {
  if (!qaConfig.username || !qaConfig.password) {
    throw new Error('PMD_USERNAME and PMD_PASSWORD are required. Copy .env.example to .env or export them in the shell.');
  }
}

export function isIgnored(value, patterns) {
  const text = String(value || '');
  return patterns.some((pattern) => text.toLowerCase().includes(pattern.toLowerCase()));
}
