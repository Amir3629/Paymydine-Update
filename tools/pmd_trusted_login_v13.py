#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('trusted-login-v13-' + STAMP)

TRUSTED = ROOT / 'app/Services/PmdTrustedLoginDeviceService.php'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'
LOGIN = ROOT / 'app/admin/controllers/Login.php'
OWNER = ROOT / 'app/Http/Controllers/PmdOwnerEmergencyAccessController.php'
WORKPLACE = ROOT / 'app/Http/Controllers/PmdLoginWorkplaceVerifyController.php'
PATHS = [TRUSTED, GATE, LOGIN, OWNER, WORKPLACE]

for path in PATHS:
    if not path.is_file():
        raise SystemExit('ERROR: missing ' + str(path))

text = {path: path.read_text(encoding='utf-8') for path in PATHS}
original = dict(text)

if 'PMD_TRUSTED_LOGIN_DEVICE_V2' not in text[TRUSTED] and 'PMD_TRUSTED_LOGIN_DEVICE_V3' not in text[TRUSTED]:
    raise SystemExit('ERROR: trusted-device V2/V3 service not found')
if 'PMD_TRUSTED_DEVICE_LOGIN_GATE_V1' not in text[GATE] or 'finalizeAdminHtml' in text[GATE]:
    raise SystemExit('ERROR: security-only trusted gate is not active')

if 'PMD_TRUSTED_LOGIN_DEVICE_V3' not in text[TRUSTED]:
    text[TRUSTED] = text[TRUSTED].replace('PMD_TRUSTED_LOGIN_DEVICE_V2', 'PMD_TRUSTED_LOGIN_DEVICE_V3', 1)
    old = "    public function rememberVerifiedResponse(Request $request, $response)\n    {\n        if (!$this->ready() || !AdminAuth::isLogged()) return $response;\n"
    new = "    public function rememberVerifiedResponse(Request $request, $response)\n    {\n        // PMD_TRUSTED_DIRECT_SECOND_FACTOR_V3\n        if ($this->responseHasTrustedCookie($response)) return $response;\n        if (!$this->ready() || !AdminAuth::isLogged()) return $response;\n"
    if text[TRUSTED].count(old) != 1:
        raise SystemExit('ERROR: trusted remember anchor mismatch')
    text[TRUSTED] = text[TRUSTED].replace(old, new, 1)
    text[TRUSTED] = text[TRUSTED].replace(
        '    private function renewExistingCookie(Request $request, $response)\n',
        '    public function renewExistingCookie(Request $request, $response)\n',
        1,
    )
    needle = '    private function touch(int $deviceId): void\n    {\n'
    helper = "    private function responseHasTrustedCookie($response): bool\n    {\n        try {\n            if (!is_object($response) || !isset($response->headers)) return false;\n            foreach ($response->headers->getCookies() as $cookie) {\n                if ($cookie && $cookie->getName() === self::COOKIE) return true;\n            }\n        } catch (\\Throwable $error) {\n        }\n        return false;\n    }\n\n" + needle
    if text[TRUSTED].count(needle) != 1:
        raise SystemExit('ERROR: trusted cookie helper anchor mismatch')
    text[TRUSTED] = text[TRUSTED].replace(needle, helper, 1)

if 'PMD_TRUSTED_COOKIE_SURVIVES_LOGOUT_V3' not in text[GATE]:
    anchor = '        // PMD_TRUSTED_DEVICE_RESUME_V1\n'
    capture = "        // PMD_TRUSTED_COOKIE_SURVIVES_LOGOUT_V3\n        $trustedDeviceBeforeResponse = null;\n        try {\n            if (AdminAuth::isLogged()) {\n                $trustedDeviceBeforeResponse = app(PmdTrustedLoginDeviceService::class)->current($request);\n            }\n        } catch (\\Throwable $error) {\n            $trustedDeviceBeforeResponse = null;\n        }\n\n" + anchor
    if text[GATE].count(anchor) != 1:
        raise SystemExit('ERROR: gate resume anchor mismatch')
    text[GATE] = text[GATE].replace(anchor, capture, 1)
    old = '        return $response;\n    }\n}\n'
    new = "        if ($trustedDeviceBeforeResponse) {\n            try {\n                $response = app(PmdTrustedLoginDeviceService::class)->renewExistingCookie($request, $response);\n            } catch (\\Throwable $error) {\n                logger()->warning('PMD trusted cookie logout preservation failed', ['message' => $error->getMessage()]);\n            }\n        }\n\n        return $response;\n    }\n}\n"
    if text[GATE].count(old) != 1:
        raise SystemExit('ERROR: gate final-response anchor mismatch')
    text[GATE] = text[GATE].replace(old, new, 1)

if 'use App\\Services\\PmdTrustedLoginDeviceService;' not in text[LOGIN]:
    text[LOGIN] = text[LOGIN].replace(
        'use App\\Services\\PmdSiteAccessSessionBindingService;\n',
        'use App\\Services\\PmdSiteAccessSessionBindingService;\nuse App\\Services\\PmdTrustedLoginDeviceService;\n',
        1,
    )
if 'PMD_TRUSTED_PASSWORD_POST_RESUME_V3' not in text[LOGIN]:
    anchor = '        // PMD_WORKPLACE_LOGIN_ALL_USERS_V8\n'
    insertion = "        // PMD_TRUSTED_PASSWORD_POST_RESUME_V3\n        // User/location are known now. Resume trusted browser before creating\n        // another TOTP or Workplace challenge.\n        try {\n            $trustedLogin = app(PmdTrustedLoginDeviceService::class)->resumeIfPossible(request());\n            if ($trustedLogin) return $trustedLogin;\n        } catch (\\Throwable $error) {\n            logger()->warning('PMD trusted password-post resume failed', [\n                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),\n                'message' => $error->getMessage(),\n            ]);\n        }\n\n" + anchor
    if text[LOGIN].count(anchor) != 1:
        raise SystemExit('ERROR: Login security anchor mismatch')
    text[LOGIN] = text[LOGIN].replace(anchor, insertion, 1)

if 'use App\\Services\\PmdTrustedLoginDeviceService;' not in text[OWNER]:
    text[OWNER] = text[OWNER].replace(
        'use App\\Services\\PmdSiteAccessSessionBindingService;\n',
        'use App\\Services\\PmdSiteAccessSessionBindingService;\nuse App\\Services\\PmdTrustedLoginDeviceService;\n',
        1,
    )
if 'PMD_OWNER_TRUST_EXACT_SUCCESS_V3' not in text[OWNER]:
    start = text[OWNER].find('    public function verify(Request $request)')
    end = text[OWNER].find('    public function recover(Request $request)', start)
    if start < 0 or end < 0:
        raise SystemExit('ERROR: Owner verify method boundaries missing')
    method = text[OWNER][start:end]
    anchor = '        $codes = $this->prepareRecoveryCodes($site, $identity, $request);\n'
    if method.count(anchor) != 1:
        raise SystemExit('ERROR: Owner verify recovery anchor mismatch')
    method = method.replace(
        anchor,
        "        // PMD_OWNER_TRUST_EXACT_SUCCESS_V3\n        $trustedLogin = app(PmdTrustedLoginDeviceService::class);\n\n" + anchor,
        1,
    )
    old = "            return redirect(admin_url('login'));\n"
    if method.count(old) != 1:
        raise SystemExit('ERROR: Owner verify recovery redirect mismatch')
    method = method.replace(
        old,
        "            $response = redirect(admin_url('login'));\n            return $trustedLogin->rememberVerifiedResponse($request, $response);\n",
        1,
    )
    old = "        return redirect($target)->with('success', 'Security verified.');\n"
    if method.count(old) != 1:
        raise SystemExit('ERROR: Owner verify final redirect mismatch')
    method = method.replace(
        old,
        "        $response = redirect($target)->with('success', 'Security verified.');\n        return $trustedLogin->rememberVerifiedResponse($request, $response);\n",
        1,
    )
    text[OWNER] = text[OWNER][:start] + method + text[OWNER][end:]

if 'use App\\Services\\PmdTrustedLoginDeviceService;' not in text[WORKPLACE]:
    text[WORKPLACE] = text[WORKPLACE].replace(
        'use App\\Services\\PmdSiteAccessSessionBindingService;\n',
        'use App\\Services\\PmdSiteAccessSessionBindingService;\nuse App\\Services\\PmdTrustedLoginDeviceService;\n',
        1,
    )
if 'PMD_STAFF_TRUST_EXACT_SUCCESS_V3' not in text[WORKPLACE]:
    old = "            return redirect((string)$result['redirect'])->with('success', 'Security verified.');\n"
    new = "            // PMD_STAFF_TRUST_EXACT_SUCCESS_V3\n            $response = redirect((string)$result['redirect'])->with('success', 'Security verified.');\n            return app(PmdTrustedLoginDeviceService::class)->rememberVerifiedResponse($request, $response);\n"
    if text[WORKPLACE].count(old) != 1:
        raise SystemExit('ERROR: staff success redirect mismatch')
    text[WORKPLACE] = text[WORKPLACE].replace(old, new, 1)

for marker, path in [
    ('PMD_TRUSTED_LOGIN_DEVICE_V3', TRUSTED),
    ('PMD_TRUSTED_COOKIE_SURVIVES_LOGOUT_V3', GATE),
    ('PMD_TRUSTED_PASSWORD_POST_RESUME_V3', LOGIN),
    ('PMD_OWNER_TRUST_EXACT_SUCCESS_V3', OWNER),
    ('PMD_STAFF_TRUST_EXACT_SUCCESS_V3', WORKPLACE),
]:
    if marker not in text[path]:
        raise SystemExit('ERROR: missing marker ' + marker)

BACKUP.mkdir(parents=True, exist_ok=False)
for path in PATHS:
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print('BACKUP:', BACKUP)

try:
    for path in PATHS:
        path.write_text(text[path], encoding='utf-8')
    for path in PATHS:
        result = subprocess.run(['php', '-l', str(path)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError('PHP lint failed: ' + str(path))
except Exception:
    for path, content in original.items():
        path.write_text(content, encoding='utf-8')
    raise

print('OK: trusted login V13 installed')
