<?php
require $argv[1];

$roles = new \Admin\Services\PmdDefaultStaffRoleService();

$tests = [
    ['pmd-cashier', 'admin/mobile/pos/open', true],
    ['pmd-waiter', 'admin/mobile/pos/open', true],
    ['pmd-reservations', 'admin/mobile/workspace/open', true],
    ['pmd-kds:grill', 'admin/api/mobile/v1/kds/snapshot', true],
    ['pmd-kds:grill', 'admin/api/mobile/v1/sync/commands', true],
    ['pmd-accountant', 'admin/mobile/workspace/open', true],
    ['pmd-manager', 'admin/mobile/workspace/open', true],

    // Product-workspace isolation must remain closed.
    ['pmd-cashier', 'admin/managerdashboard', false],
    ['pmd-kds:grill', 'admin/pos', false],
    ['pmd-reservations', 'admin/pos', false],

    // Canonical destinations must still work.
    ['pmd-accountant', 'admin/accountantdashboard', true],
    ['pmd-team-member', 'admin/mywork', true],
    ['pmd-sonstige', 'admin/mywork', true],
    ['pmd-kds:grill', 'admin/kitchendisplay/grill', true],
];

$failed = 0;
foreach ($tests as [$role, $path, $expected]) {
    $actual = $roles->mayOpenPath($role, $path);
    printf(
        "%-20s %-44s actual=%-5s expected=%s\n",
        $role,
        $path,
        $actual ? 'true' : 'false',
        $expected ? 'true' : 'false'
    );
    if ($actual !== $expected) {
        $failed++;
    }
}

if ($failed > 0) {
    fwrite(STDERR, "Role transport matrix failed: ".$failed." mismatch(es).\n");
    exit(1);
}
