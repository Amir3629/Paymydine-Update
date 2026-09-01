<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r9Read(string $path): string
{
    $value = @file_get_contents($path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r9ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException(
            'Expected exactly one match for '.$label.'; found '.$count
        );
    }
    return str_replace($search, $replace, $content);
}

function r9Write(string $path, string $content): void
{
    $tmp = $path.'.r9tmp.'.getmypid();
    if (file_put_contents($tmp, $content) === false) {
        throw new RuntimeException('Could not stage '.$path);
    }
    @chmod($tmp, 0644);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Could not install '.$path);
    }
}

$headerPath = $root.'/app/admin/assets/js/pmd-admin-header-actions.js';
$i18nPath = $root.'/app/admin/assets/js/pmd-admin-i18n-v1.js';
$auditPath = $root.'/scripts/pmd-audit-platform-i18n.php';

$header = r9Read($headerPath);
$i18n = r9Read($i18nPath);

$headerMarker = 'PMD_HEADER_CANONICAL_TOOLTIPS_R9';
$i18nMarker = 'PMD_ADMIN_I18N_TOOLTIP_ATTRIBUTE_R9';

$headerNext = $header;
$i18nNext = $i18n;

if (strpos($headerNext, $headerMarker) === false) {
    $needle = <<<'JS'
    function cleanTooltipLabel(label) {
JS;

    $helper = <<<'JS'
    /* PMD_HEADER_CANONICAL_TOOLTIPS_R9
     * Resolve header-only fallback labels from the active canonical catalogue.
     * No locale wording lives in this runtime.
     */
    function pmdHeaderTranslate(source) {
      const english = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
      const active = window.PMD_PLATFORM_MESSAGES || {};
      const sourceText = String(source || '');
      const keys = Object.keys(english);

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (
          String(english[key] || '') === sourceText &&
          typeof active[key] === 'string' &&
          active[key].trim()
        ) {
          return active[key];
        }
      }

      if (
        window.PMDAdminI18n &&
        typeof window.PMDAdminI18n.translate === 'function'
      ) {
        const translated = window.PMDAdminI18n.translate(sourceText);
        if (translated) return translated;
      }

      return sourceText;
    }

    function cleanTooltipLabel(label) {
JS;

    $headerNext = r9ReplaceOnce(
        $headerNext,
        $needle,
        $helper,
        'header canonical helper insertion'
    );

    $headerNext = r9ReplaceOnce(
        $headerNext,
        "      if (/account/i.test(normalized)) return 'Account';\n      if (/notification/i.test(normalized)) return 'Notifications';\n      if (/storefront|preview/i.test(normalized)) return 'Storefront';\n      if (/settings/i.test(normalized)) return normalized.length > 24 ? 'Settings' : normalized;",
        "      if (/account/i.test(normalized)) return pmdHeaderTranslate('Account');\n      if (/notification/i.test(normalized)) return pmdHeaderTranslate('Notifications');\n      if (/storefront|preview/i.test(normalized)) return pmdHeaderTranslate('Storefront');\n      if (/settings/i.test(normalized)) return normalized.length > 24 ? pmdHeaderTranslate('Settings') : normalized;",
        'header cleanTooltipLabel locale fallbacks'
    );

    $oldTooltips = <<<'JS'
      [
        ['.navbar-top #menuitem-preview > a.nav-link', 'Storefront'],
        ['.navbar-top #notifDropdown', 'Notifications'],
        ['.navbar-top #notif-root > span > a.nav-link', 'Notifications'],
        ['.navbar-top #notif-root > a.nav-link', 'Notifications'],
        ['.navbar-top .pmd-header-search', 'Search settings'],
        ['.navbar-top .pmd-topbar-settings-item > span > a.nav-link', 'Settings'],
        ['.navbar-top .pmd-topbar-settings-item > a.nav-link', 'Settings'],
        ['.navbar-top .pmd-topbar-user-item > a.nav-link', 'Account']
      ].forEach(([selector, label]) => {
JS;

    $newTooltips = <<<'JS'
      [
        ['.navbar-top #menuitem-preview > a.nav-link', pmdHeaderTranslate('Storefront')],
        ['.navbar-top #notifDropdown', pmdHeaderTranslate('Notifications')],
        ['.navbar-top #notif-root > span > a.nav-link', pmdHeaderTranslate('Notifications')],
        ['.navbar-top #notif-root > a.nav-link', pmdHeaderTranslate('Notifications')],
        ['.navbar-top .pmd-header-search', pmdHeaderTranslate('Search settings')],
        ['.navbar-top .pmd-topbar-settings-item > span > a.nav-link', pmdHeaderTranslate('Settings')],
        ['.navbar-top .pmd-topbar-settings-item > a.nav-link', pmdHeaderTranslate('Settings')],
        ['.navbar-top .pmd-topbar-user-item > a.nav-link', pmdHeaderTranslate('Account')]
      ].forEach(([selector, label]) => {
JS;

    $headerNext = r9ReplaceOnce(
        $headerNext,
        $oldTooltips,
        $newTooltips,
        'header normalizeHeaderIconTooltips catalogue binding'
    );

    $headerNext = r9ReplaceOnce(
        $headerNext,
        "        back.setAttribute('aria-label', 'Back');",
        "        back.setAttribute('aria-label', pmdHeaderTranslate('Back'));",
        'header Back aria label'
    );

    $headerNext = r9ReplaceOnce(
        $headerNext,
        "        item.innerHTML = '<div class=\"pmd-header-toolbar-actions\" aria-label=\"Page actions\"></div>';",
        "        item.innerHTML = '<div class=\"pmd-header-toolbar-actions\" aria-label=\"' + pmdHeaderTranslate('Page actions').replace(/&/g, '&amp;').replace(/\"/g, '&quot;') + '\"></div>';",
        'header Page actions aria label'
    );
}

if (strpos($i18nNext, $i18nMarker) === false) {
    $i18nNext = r9ReplaceOnce(
        $i18nNext,
        "            'aria-label',\n            'data-original-title',\n            'data-title'",
        "            'aria-label',\n            'data-pmd-tooltip-label', // PMD_ADMIN_I18N_TOOLTIP_ATTRIBUTE_R9\n            'data-bs-original-title',\n            'data-original-title',\n            'data-title'",
        'shared i18n translated attributes'
    );

    $i18nNext = r9ReplaceOnce(
        $i18nNext,
        "                'aria-label',\n                'data-original-title',\n                'data-title',\n                'value'",
        "                'aria-label',\n                'data-pmd-tooltip-label',\n                'data-bs-original-title',\n                'data-original-title',\n                'data-title',\n                'value'",
        'shared i18n observer attributes'
    );
}

if ($headerNext === $header && $i18nNext === $i18n) {
    echo "PMD R9 HEADER CANONICAL I18N: already applied\n";
    exit(0);
}

$user = (string)(getenv('SUDO_USER') ?: getenv('USER') ?: 'ubuntu');
$home = $user === 'root' ? '/root' : '/home/'.$user;
$backup = $home.'/pmd-backups/header-i18n-r9-'.date('Ymd_His');
if (!is_dir($backup) && !mkdir($backup, 0755, true) && !is_dir($backup)) {
    throw new RuntimeException('Could not create backup directory '.$backup);
}

if (!copy($headerPath, $backup.'/pmd-admin-header-actions.js')) {
    throw new RuntimeException('Could not back up header actions JS');
}
if (!copy($i18nPath, $backup.'/pmd-admin-i18n-v1.js')) {
    throw new RuntimeException('Could not back up shared i18n JS');
}

r9Write($headerPath, $headerNext);
r9Write($i18nPath, $i18nNext);

if (!is_file($auditPath)) {
    throw new RuntimeException('Platform i18n audit script is missing after R9 write');
}

echo "PMD R9 HEADER CANONICAL I18N: APPLIED\n";
echo "Backup: {$backup}\n";
echo "Header tooltip fallbacks: canonical catalogue driven\n";
echo "Shared i18n observer: data-pmd-tooltip-label + data-bs-original-title enabled\n";
echo "Canonical language files: unchanged\n";
echo "No tenant/payment/currency/order/reservation/business data changed.\n";
