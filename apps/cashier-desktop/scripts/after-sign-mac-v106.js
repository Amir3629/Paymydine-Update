'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async function afterSign(context) {
  if (process.platform !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const hasRealIdentity = Boolean(process.env.CSC_LINK || process.env.CSC_NAME || process.env.CSC_KEY_PASSWORD);

  if (!hasRealIdentity) {
    execFileSync('/usr/bin/codesign', [
      '--force',
      '--deep',
      '--sign', '-',
      '--timestamp=none',
      appPath,
    ], { stdio: 'inherit' });
  }

  execFileSync('/usr/bin/codesign', [
    '--verify',
    '--deep',
    '--strict',
    '--verbose=2',
    appPath,
  ], { stdio: 'inherit' });

  console.log(`PMD_MAC_BUNDLE_SIGNATURE_V106=VALID path=${appPath} mode=${hasRealIdentity ? 'developer-id-or-ci-identity' : 'adhoc'}`);
};
