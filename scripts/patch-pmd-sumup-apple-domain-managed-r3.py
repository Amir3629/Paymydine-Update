#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-apple-domain-managed-r3.py <stage-root>')

root = Path(sys.argv[1])


def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f'ERROR: missing target: {rel}')
    return path, path.read_text()


def replace_once(rel, old, new, label):
    path, text = read(rel)
    if new in text:
        print(f'{label}=ALREADY_PATCHED')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'ERROR: {label}: expected 1 anchor, found {count}: {rel}')
    path.write_text(text.replace(old, new, 1))
    print(f'{label}=PATCHED')


controller_rel = 'app/admin/controllers/SumupTerminalSettings.php'
routes_rel = 'routes/terminal-payments.php'
js_rel = 'app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js'

# 1) Owner uploads the exact SumUp/Apple association file through PMD.
# The file is public by design and stored per tenant host. No DB migration and no
# shell/VPS access is required for restaurant owners.
controller_path, controller = read(controller_rel)
if 'public function saveApplePayDomainFile(' not in controller:
    anchor = "    public function pairReader(Request $request, SumupTenantConnectionService $service)\n    {"
    method = r'''    public function saveApplePayDomainFile(Request $request)
    {
        $this->assertOwnerAccess();

        $data = $request->validate([
            'environment' => ['required', 'in:test,production'],
            'association_file_base64' => ['required', 'string', 'max:262144'],
        ]);

        try {
            $domain = $this->resolveTenantDomain($request);
            $raw = base64_decode((string)$data['association_file_base64'], true);
            if ($raw === false) {
                throw new \RuntimeException('The Apple Pay verification file could not be decoded.');
            }

            $bytes = strlen($raw);
            if ($bytes < 64 || $bytes > 131072) {
                throw new \RuntimeException('The Apple Pay verification file size is invalid.');
            }

            $sample = strtolower(substr(ltrim($raw), 0, 1024));
            if (strpos($sample, '<html') !== false || strpos($sample, '<!doctype') !== false) {
                throw new \RuntimeException('This looks like a web page, not the Apple Pay verification file downloaded from SumUp.');
            }

            $dir = storage_path('app/pmd-wallets/apple-pay');
            if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new \RuntimeException('Could not create the Apple Pay verification directory.');
            }

            $target = $dir.DIRECTORY_SEPARATOR.$domain.'.bin';
            $temp = $target.'.tmp-'.bin2hex(random_bytes(6));
            if (file_put_contents($temp, $raw, LOCK_EX) !== $bytes) {
                @unlink($temp);
                throw new \RuntimeException('Could not store the Apple Pay verification file.');
            }
            @chmod($temp, 0644);
            if (!@rename($temp, $target)) {
                @unlink($temp);
                throw new \RuntimeException('Could not activate the Apple Pay verification file.');
            }
            @chmod($target, 0644);

            return response()->json([
                'success' => true,
                'message' => 'Apple Pay verification file hosted by PayMyDine.',
                'environment' => (string)$data['environment'],
                'domain' => $domain,
                'path' => '/.well-known/apple-developer-merchantid-domain-association',
                'sha256' => hash('sha256', $raw),
                'bytes' => $bytes,
            ]);
        } catch (\Throwable $e) {
            return $this->failure($e);
        }
    }

    private function resolveTenantDomain(Request $request): string
    {
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $domain = strtolower(trim((string)($tenant->domain ?? $request->getHost())));
        $domain = preg_replace('/:\\d+$/', '', $domain);

        if (
            !$domain
            || strlen($domain) > 253
            || strpos($domain, '..') !== false
            || !preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $domain)
        ) {
            throw new \RuntimeException('Could not resolve a safe tenant domain for Apple Pay.');
        }

        return $domain;
    }

'''
    if anchor not in controller:
        raise SystemExit('ERROR: controller pairReader anchor missing')
    controller = controller.replace(anchor, method + anchor, 1)
    controller_path.write_text(controller)
    print('APPLE_UPLOAD_CONTROLLER=PATCHED')
else:
    print('APPLE_UPLOAD_CONTROLLER=ALREADY_PATCHED')

# 2) Protected owner endpoint.
replace_once(
    routes_rel,
    "    Route::post('/payment-providers/sumup/environment', [\\Admin\\Controllers\\SumupTerminalSettings::class, 'activateEnvironment']);",
    "    Route::post('/payment-providers/sumup/environment', [\\Admin\\Controllers\\SumupTerminalSettings::class, 'activateEnvironment']);\n    Route::post('/payment-providers/sumup/apple-pay-domain-file', [\\Admin\\Controllers\\SumupTerminalSettings::class, 'saveApplePayDomainFile']);",
    'APPLE_UPLOAD_ROUTE',
)

# 3) Add upload + automatic verification UI to the SumUp provider modal.
js_path, js = read(js_rel)
if 'function fileToBase64(file)' not in js:
    anchor = "  function reorderFinanceSections() {"
    helper = r'''  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        if (comma < 0) return reject(new Error('Could not read the verification file.'));
        resolve(result.slice(comma + 1));
      };
      reader.onerror = function () { reject(new Error('Could not read the verification file.')); };
      reader.readAsDataURL(file);
    });
  }

'''
    if anchor not in js:
        raise SystemExit('ERROR: JS reorder anchor missing')
    js = js.replace(anchor, helper + anchor, 1)

if 'data-pmd-sumup-apple-domain-file' not in js:
    anchor = "    section.appendChild(fields);\n\n    var note = document.createElement('p');"
    block = r'''    section.appendChild(fields);

    var appleFields = document.createElement('div');
    appleFields.className = 'pmd-provider-modal-fields';

    var appleDomain = document.createElement('label');
    appleDomain.className = 'pmd-provider-modal-field';
    var appleDomainTitle = document.createElement('span');
    appleDomainTitle.textContent = 'Apple Pay Domain';
    var appleDomainInput = document.createElement('input');
    appleDomainInput.type = 'text';
    appleDomainInput.value = location.hostname;
    appleDomainInput.readOnly = true;
    var appleDomainHelp = document.createElement('small');
    appleDomainHelp.textContent = 'PayMyDine serves the verification file automatically on this tenant domain.';
    appleDomain.appendChild(appleDomainTitle);
    appleDomain.appendChild(appleDomainInput);
    appleDomain.appendChild(appleDomainHelp);
    appleFields.appendChild(appleDomain);

    var appleFile = document.createElement('label');
    appleFile.className = 'pmd-provider-modal-field';
    var appleFileTitle = document.createElement('span');
    appleFileTitle.textContent = 'Apple Pay Verification File';
    var appleFileInput = document.createElement('input');
    appleFileInput.type = 'file';
    appleFileInput.accept = '.txt,.bin,application/octet-stream,text/plain';
    appleFileInput.setAttribute('data-pmd-sumup-apple-domain-file', '1');
    var appleFileHelp = document.createElement('small');
    appleFileHelp.textContent = 'Download the domain verification file from SumUp, then choose it here. No VPS upload is needed.';
    appleFile.appendChild(appleFileTitle);
    appleFile.appendChild(appleFileInput);
    appleFile.appendChild(appleFileHelp);
    appleFields.appendChild(appleFile);
    section.appendChild(appleFields);

    var appleActions = document.createElement('div');
    appleActions.className = 'pmd-provider-modal__footer-left';
    var appleUpload = document.createElement('button');
    appleUpload.type = 'button';
    appleUpload.className = 'pmd-provider-secondary';
    appleUpload.textContent = 'Upload & verify Apple Pay file';
    appleUpload.setAttribute('data-pmd-sumup-apple-domain-upload', '1');
    var appleStatus = document.createElement('span');
    appleStatus.className = 'pmd-provider-muted';
    appleStatus.setAttribute('data-pmd-sumup-apple-domain-status', '1');
    appleActions.appendChild(appleUpload);
    appleActions.appendChild(appleStatus);
    section.appendChild(appleActions);

    appleUpload.addEventListener('click', async function () {
      if (appleUpload.disabled) return;
      var file = appleFileInput.files && appleFileInput.files[0];
      if (!file) {
        appleStatus.textContent = 'Choose the verification file downloaded from SumUp first.';
        return;
      }
      if (file.size < 64 || file.size > 131072) {
        appleStatus.textContent = 'Verification file size looks invalid.';
        return;
      }
      appleUpload.disabled = true;
      appleStatus.textContent = 'Uploading…';
      try {
        var encoded = await fileToBase64(file);
        var latest = currentSnapshot();
        var saved = await postJson('/admin/payment-providers/sumup/apple-pay-domain-file', {
          environment: latest.env,
          association_file_base64: encoded
        });
        var verify = await fetch('/.well-known/apple-developer-merchantid-domain-association?ts=' + Date.now(), {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!verify.ok) throw new Error('File saved, but public verification URL returned HTTP ' + verify.status + '.');
        appleStatus.textContent = 'Hosted for ' + String(saved.domain || location.hostname) + ' · SHA-256 ' + String(saved.sha256 || '').slice(0, 12) + '…';
      } catch (error) {
        appleStatus.textContent = error && error.message ? error.message : 'Could not host the Apple Pay verification file.';
      } finally {
        appleUpload.disabled = false;
      }
    });

    var note = document.createElement('p');'''
    if anchor not in js:
        raise SystemExit('ERROR: JS fields/note anchor missing')
    js = js.replace(anchor, block, 1)

old_note = "Apple Pay: PayMyDine hosts the Apple verification file automatically on every PMD tenant domain; register the restaurant domain once in SumUp → Payment wallets. Google Pay production still requires Google web approval and a Google Merchant ID. Wero is not a SumUp online method."
new_note = "Apple Pay: download the verification file from SumUp once, upload it here, then register this exact tenant domain in SumUp. PayMyDine hosts the public .well-known URL automatically. Google Pay production still requires Google web approval and a Google Merchant ID. Wero is not a SumUp online method."
if old_note in js:
    js = js.replace(old_note, new_note, 1)
elif new_note not in js:
    # Also support the pre-R2 wording when R3 is applied independently.
    legacy_note = "Apple Pay: register every domain/subdomain that will show the Apple Pay option. Apple Pay and Google Pay domain onboarding is managed in SumUp Dashboard → Settings → For developers → Payment wallets. Wero is not part of the current SumUp online-method list and stays with its configured provider."
    if legacy_note in js:
        js = js.replace(legacy_note, new_note, 1)
    else:
        raise SystemExit('ERROR: Apple/Google owner note anchor missing')

js_path.write_text(js)
print('APPLE_UPLOAD_ADMIN_UI=PATCHED')

for rel, needle in [
    (controller_rel, 'public function saveApplePayDomainFile('),
    (controller_rel, "storage_path('app/pmd-wallets/apple-pay')"),
    (routes_rel, "sumup/apple-pay-domain-file"),
    (js_rel, 'data-pmd-sumup-apple-domain-file'),
    (js_rel, 'Upload & verify Apple Pay file'),
]:
    _, text = read(rel)
    if needle not in text:
        raise SystemExit(f'ERROR: final Apple domain contract missing {needle}: {rel}')

print('PMD_SUMUP_APPLE_DOMAIN_MANAGED_R3=OK')
