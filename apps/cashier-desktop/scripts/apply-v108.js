'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'src', 'main.js');
const MARK = 'PMD_CASHIER_PRINT_ROUTING_V108';

function fail(message) {
  throw new Error(`V1.0.8 print-routing patch refused: ${message}`);
}

let source = fs.readFileSync(MAIN, 'utf8');

if (source.includes(MARK)) {
  console.log('PMD_CASHIER_PRINT_ROUTING_V108_ALREADY_APPLIED');
  process.exit(0);
}

const receiptConstant = "const RECEIPT_PATH = /^\\/admin\\/orders\\/split-receipt\\/\\d+\\/?$/;";
if (!source.includes(receiptConstant)) fail('receipt route constant missing');

source = source.replace(
  receiptConstant,
  `${receiptConstant}\nconst ORDER_CENTER_INVOICE_PATH = /^\\/admin\\/pmd-cashier-order-center\\/invoice\\/\\d+\\/?$/; // ${MARK}`,
);

const maxKeysAnchor = 'const MAX_HANDLED_KEYS = 100;';
if (!source.includes(maxKeysAnchor)) fail('MAX_HANDLED_KEYS anchor missing');
source = source.replace(
  maxKeysAnchor,
  `${maxKeysAnchor}\n\nfunction isPrintableDocumentPath(pathname) { // ${MARK}\n  const value = String(pathname || '');\n  return RECEIPT_PATH.test(value) || ORDER_CENTER_INVOICE_PATH.test(value);\n}`,
);

const popupNeedle = "        if (RECEIPT_PATH.test(parsed.pathname) && hasConfiguredPrintTarget(readSettings())) { // PMD_VIRTUAL_PDF_PRINT_V104";
const popupReplacement = `        if (isPrintableDocumentPath(parsed.pathname) && hasConfiguredPrintTarget(readSettings())) { // ${MARK}`;
if (!source.includes(popupNeedle)) fail('V1.0.4 popup print target anchor missing');
source = source.replace(popupNeedle, popupReplacement);

const required = [
  MARK,
  'ORDER_CENTER_INVOICE_PATH',
  'isPrintableDocumentPath(parsed.pathname)',
  'hasConfiguredPrintTarget(readSettings())',
  'printReceiptRemoteUrl(url)',
];
for (const marker of required) {
  if (!source.includes(marker)) fail(`contract missing: ${marker}`);
}

fs.writeFileSync(MAIN, source, 'utf8');
console.log('PMD_CASHIER_PRINT_ROUTING_V108_PATCH_OK');
