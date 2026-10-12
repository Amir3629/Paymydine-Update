<?php
/**
 * Run: php scripts/pmd-shifts-member-password-policy-test.php
 * Standalone, no Laravel bootstrap or production credentials required.
 */
require_once __DIR__.'/../app/Services/PmdShiftMemberPasswordPolicy.php';

use App\Services\PmdShiftMemberPasswordPolicy as Policy;

$cases = [
    ['too short', 'password', '', '', false],
    ['common password', 'Password123!', '', '', false],
    ['common sequence', 'ABcd123456xy!', '', '', false],
    ['only digits', '929183746281', '', '', false],
    ['repeating characters', 'AAAAAAxyZ9!mnop', '', '', false],
    ['contains username', 'ABCmaincashier!98', 'maincashier', '', false],
    ['contains name', 'AlphaAnna27!Beta', '', 'Anna', false],
    ['short two character types', 'GoodPassword12', '', '', false],
    ['mixed strong', 'V3lvet!R1ver#90', 'staff8', 'Marco', true],
    ['strong passphrase', 'Green maple bridge 2026', 'staff8', 'Marco', true],
    ['long mixed password', 'GreatWinterRiver2026', '', '', true],
    ['max length valid', 'Alpha!River1234Mint#Lake2026Abcd', '', '', true],
    ['longer than max', 'Alpha!River1234Mint#Lake2026Abcde', '', '', false],
];
$failures = 0;
foreach ($cases as [$label, $password, $username, $name, $valid]) {
    $reason = Policy::rejectionReason($password, $username, $name);
    if (($reason === null) !== $valid) {
        fwrite(STDERR, "FAIL: {$label}\n");
        $failures++;
    }
}
if ($failures) exit(1);
echo 'PASS: '.count($cases)." Shifts password-policy cases\n";
