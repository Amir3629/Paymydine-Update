<?php

declare(strict_types=1);

/*
 * PMD R3 CLEAN apply launcher V2.
 *
 * The original plain R3 apply script is intentionally kept immutable. V2
 * verifies its exact Git blob, repairs the one PHP interpolation hazard in a
 * JavaScript template literal, syntax-checks the generated script, and then
 * executes it from the same directory so its sibling translation/runtime
 * payloads remain authoritative.
 */

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

$sourcePath = __DIR__.'/pmd-r3-clean-apply.php';
$generatedPath = __DIR__.'/.pmd-r3-clean-apply-v2.generated.php';
$expectedSourceBlob = '3b29f774943c24839f5974f51f47c778274418a7';

function pmdR3V2GitBlob(string $content): string
{
    return sha1('blob '.strlen($content)."\0".$content);
}

function pmdR3V2Fail(string $message, int $code): void
{
    fwrite(STDERR, 'ERROR: '.$message."\n");
    exit($code);
}

try {
    if (!is_file($sourcePath)) {
        pmdR3V2Fail('Missing sibling pmd-r3-clean-apply.php', 10);
    }

    $source = file_get_contents($sourcePath);
    if ($source === false || $source === '') {
        pmdR3V2Fail('Could not read pmd-r3-clean-apply.php', 11);
    }

    $actualSourceBlob = pmdR3V2GitBlob($source);
    echo "R3 base apply blob expected: {$expectedSourceBlob}\n";
    echo "R3 base apply blob actual:   {$actualSourceBlob}\n";

    if ($actualSourceBlob !== $expectedSourceBlob) {
        pmdR3V2Fail('Base apply script is not the exact reviewed R3 blob.', 12);
    }

    $unsafe = <<<'PHP_SOURCE'
            "canvas.setAttribute('aria-label', `${template.name} preview`);" => "canvas.setAttribute('aria-label', `${template.name} ${pmdQrT('r3.preview', 'preview')}`);",
PHP_SOURCE;

    $safe = <<<'PHP_SOURCE'
            "canvas.setAttribute('aria-label', `\${template.name} preview`);" => "canvas.setAttribute('aria-label', `\${template.name} \${pmdQrT('r3.preview', 'preview')}`);",
PHP_SOURCE;

    $count = substr_count($source, $unsafe);
    if ($count !== 1) {
        pmdR3V2Fail("Expected exactly one reviewed template-literal hazard; found {$count}.", 13);
    }

    $generated = str_replace($unsafe, $safe, $source);

    if (strpos($generated, $unsafe) !== false) {
        pmdR3V2Fail('Unsafe template-literal source is still present after repair.', 14);
    }

    if (file_put_contents($generatedPath, $generated) === false) {
        pmdR3V2Fail('Could not write generated V2 apply script.', 15);
    }
    @chmod($generatedPath, 0600);

    $lintCommand = escapeshellarg(PHP_BINARY).' -l '.escapeshellarg($generatedPath).' 2>&1';
    $lintOutput = [];
    $lintStatus = 0;
    exec($lintCommand, $lintOutput, $lintStatus);
    foreach ($lintOutput as $line) echo $line."\n";
    if ($lintStatus !== 0) {
        pmdR3V2Fail('Generated V2 apply script failed PHP syntax validation.', 16);
    }

    echo "R3 V2 interpolation repair: OK\n";
    echo "Executing staged R3 apply against: {$root}\n";

    $command = escapeshellarg(PHP_BINARY)
        .' '.escapeshellarg($generatedPath)
        .' --root='.escapeshellarg($root);

    passthru($command, $status);
    @unlink($generatedPath);

    if ($status !== 0) {
        pmdR3V2Fail('Generated R3 apply stopped before successful completion.', $status ?: 17);
    }

    echo "PMD R3 CLEAN apply launcher V2: COMPLETE\n";
} catch (Throwable $error) {
    @unlink($generatedPath);
    pmdR3V2Fail($error->getMessage(), 99);
}
