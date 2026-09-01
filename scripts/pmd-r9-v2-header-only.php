<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');
$path = $root.'/app/admin/assets/js/pmd-admin-header-actions.js';
$audit = $root.'/scripts/pmd-audit-platform-i18n.php';

function r9v2Read(string $path): string
{
    $value = @file_get_contents($path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r9v2ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException('Expected exactly one match for '.$label.'; found '.$count);
    }
    return str_replace($search, $replace, $content);
}

function r9v2Write(string $path, string $content): void
{
    $tmp = $path.'.r9v2tmp.'.getmypid();
    if (file_put_contents($tmp, $content) === false) {
        throw new RuntimeException('Could not stage '.$path);
    }
    @chmod($tmp, 0644);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Could not install '.$path);
    }
}

$current = r9v2Read($path);
$marker = 'PMD_HEADER_CANONICAL_TOOLTIPS_R9_V2';

if (strpos($current, $marker) !== false) {
    echo "PMD R9 V2 HEADER CANONICAL I18N: already applied\n";
    exit(0);
}

$next = $current;

$needle = <<<'JS'
    function cleanTooltipLabel(label) {
JS;

$helper = <<<'JS'
    /* PMD_HEADER_CANONICAL_TOOLTIPS_R9_V2
     * Header fallback copy comes from the active canonical catalogue.
     * No locale-specific wording lives in this runtime.
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

$next = r9v2ReplaceOnce($next, $needle, $helper, 'canonical helper insertion');

$oldFallbacks = <<<'JS'
      if (/account/i.test(normalized)) return 'Account';
      if (/notification/i.test(normalized)) return 'Notifications';
      if (/storefront|preview/i.test(normalized)) return 'Storefront';
      if (/settings/i.test(normalized)) return normalized.length > 24 ? 'Settings' : normalized;
JS;

$newFallbacks = <<<'JS'
      if (/account/i.test(normalized)) return pmdHeaderTranslate('Account');
      if (/notification/i.test(normalized)) return pmdHeaderTranslate('Notifications');
      if (/storefront|preview/i.test(normalized)) return pmdHeaderTranslate('Storefront');
      if (/settings/i.test(normalized)) return normalized.length > 24 ? pmdHeaderTranslate('Settings') : normalized;
JS;

$next = r9v2ReplaceOnce($next, $oldFallbacks, $newFallbacks, 'cleanTooltipLabel fallbacks');

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

$next = r9v2ReplaceOnce($next, $oldTooltips, $newTooltips, 'header tooltip fallback list');

if ($next === $current) {
    throw new RuntimeException('R9 V2 produced no source change');
}
if (!is_file($audit)) {
    throw new RuntimeException('Platform i18n audit script is missing');
}

$user = (string)(getenv('SUDO_USER') ?: getenv('USER') ?: 'ubuntu');
$home = $user === 'root' ? '/root' : '/home/'.$user;
$backup = $home.'/pmd-backups/header-i18n-r9-v2-'.date('Ymd_His');
if (!is_dir($backup) && !mkdir($backup, 0755, true) && !is_dir($backup)) {
    throw new RuntimeException('Could not create backup '.$backup);
}
if (!copy($path, $backup.'/pmd-admin-header-actions.js')) {
    throw new RuntimeException('Could not back up header JS');
}

r9v2Write($path, $next);

echo "PMD R9 V2 HEADER CANONICAL I18N: APPLIED\n";
echo "Backup: {$backup}\n";
echo "Changed only: app/admin/assets/js/pmd-admin-header-actions.js\n";
echo "Shared pmd-admin-i18n-v1.js: unchanged\n";
echo "Canonical language files: unchanged\n";
echo "No tenant/payment/currency/order/reservation/business data changed.\n";
