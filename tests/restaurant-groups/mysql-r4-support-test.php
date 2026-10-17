<?php
/** Self-tests of the test runner, not provisioning or database integration. */
require __DIR__.'/mysql-r4-support.inc';
$count = 0;
function assertR41(bool $ok, string $name): void { global $count; $count++; if (!$ok) throw new RuntimeException($name); echo 'PASS '.$name.PHP_EOL; }
$out = [];
$checks = new R4SqlChecks(static function ($line) use (&$out) { $out[] = $line; });
$checks->redact(['fixture-password', 'fixture-user', 'fixture-host']);
assertR41($checks->safe('fixture-password at fixture-host as fixture-user') === '[redacted] at [redacted] as [redacted]', 'configured credentials are redacted');
assertR41(!str_contains($checks->safe('Error (SQL: insert into users values (secret))'), 'secret'), 'SQL text is removed');
assertR41(!str_contains($checks->safe("SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'secret' for key 'x' (SQL: insert ...)"), 'secret'), 'SQLSTATE diagnostics omit data values');
assertR41(str_contains($checks->safe('SQLSTATE[42S22]: Column not found: 1054'), '42S22'), 'SQLSTATE is preserved');
assertR41(!str_contains($checks->safe("failure\n\033[31m"), "\033"), 'terminal controls are removed');
assertR41(strlen($checks->safe(str_repeat('x', 800))) === 500, 'diagnostics are bounded');
$checks->run('good', 'success fixture', static function () {});
assertR41($checks->passed === 1 && $checks->failed === 0, 'passing checks are counted');
$checks->run('failure', 'failure fixture', static function () use ($checks) {
    $checks->log('error', 'guard refused', ['exception' => 'DomainException', 'message' => 'wrong connection', 'password' => 'DO-NOT-PRINT', 'sql' => 'DO-NOT-PRINT']);
    throw new RuntimeException('Assertion mismatch');
});
assertR41($checks->failed === 1, 'failed checks are counted');
assertR41(str_contains(implode('\n', $out), 'wrong connection'), 'underlying service error is visible');
assertR41(!str_contains(implode('\n', $out), 'DO-NOT-PRINT'), 'non-allowlisted log context is omitted');
$ran = false;
$checks->run('dependent', 'dependent fixture', static function () use (&$ran) { $ran = true; }, ['failure']);
assertR41(!$ran && $checks->skipped === 1, 'dependent checks skip after failure');
$checks->run('independent', 'independent fixture', static function () {}, ['good']);
assertR41($checks->passed === 2, 'independent checks still run');
$before = count($out);
$checks->run('new-failure', 'fresh failure', static function () { throw new RuntimeException('new'); });
assertR41(!str_contains(implode('\n', array_slice($out, $before)), 'wrong connection'), 'log buffers do not leak between tests');
$checks->run('transitive', 'transitive fixture', static function () { throw new RuntimeException('must not run'); }, ['dependent']);
assertR41($checks->skipped === 2 && $checks->failed === 2, 'skipped prerequisites propagate without synthetic failures');
echo $count.' test-runner checks, 0 failed (no MySQL or provisioning execution).'.PHP_EOL;
