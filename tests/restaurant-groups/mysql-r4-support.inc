<?php
/** Test-only diagnostics. Never dump SQL bindings, credentials or application state. */
final class R4SqlChecks
{
    private array $outcomes = [];
    private array $logs = [];
    private array $redactions = [];
    private $output;
    public int $passed = 0;
    public int $failed = 0;
    public int $skipped = 0;

    public function __construct(?callable $output = null)
    {
        $this->output = $output ?: static function (string $line): void { echo $line.PHP_EOL; };
    }

    public function redact(array $values): void
    {
        $this->redactions = array_values(array_filter($values, static fn ($v) => is_string($v) && $v !== ''));
        usort($this->redactions, static fn ($a, $b) => strlen($b) <=> strlen($a));
    }

    public function safe(string $text): string
    {
        // Laravel QueryException appends SQL with interpolated values. Suppress
        // the entire query, and suppress driver text which can contain bindings.
        if (preg_match('/SQLSTATE\[([A-Z0-9]{5})\](?:[^:]*:\s*([0-9]{1,6}))?/i', $text, $m)) {
            return 'SQLSTATE '.$m[1].(isset($m[2]) ? ' / driver '.$m[2] : '').' (query and values omitted)';
        }
        $text = preg_replace('/\(SQL:.*$/is', '(SQL omitted)', $text);
        $text = str_replace($this->redactions, '[redacted]', $text);
        $text = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $text);
        return substr($text, 0, 500);
    }

    public function log($level, $message, array $context = []): void
    {
        $entry = strtoupper((string)$level).' '.$this->safe((string)$message);
        foreach (['reference', 'site_id', 'exception', 'error', 'message'] as $key) {
            if (isset($context[$key]) && is_scalar($context[$key])) {
                $entry .= ' '.$key.'='.$this->safe((string)$context[$key]);
            }
        }
        $this->logs[] = $entry;
        $this->logs = array_slice($this->logs, -8);
    }

    public function run(string $key, string $name, callable $work, array $requires = []): void
    {
        if (array_key_exists($key, $this->outcomes)) throw new LogicException('Duplicate test key.');
        foreach ($requires as $dependency) {
            if (($this->outcomes[$dependency] ?? false) !== true) {
                $this->outcomes[$key] = false;
                $this->skipped++;
                ($this->output)('SKIP '.$name.' (prerequisite '.$dependency.' did not pass)');
                return;
            }
        }
        $this->logs = [];
        try {
            $work();
            $this->outcomes[$key] = true;
            $this->passed++;
            ($this->output)('PASS '.$name);
        } catch (Throwable $error) {
            $this->outcomes[$key] = false;
            $this->failed++;
            ($this->output)('FAIL '.$name.' ['.get_class($error).']: '.$this->safe($error->getMessage()));
            foreach ($this->logs as $entry) ($this->output)('  diagnostic: '.$entry);
        }
    }

    public function setupFailure(Throwable $error): void
    {
        ($this->output)('Test setup stopped ['.get_class($error).']: '.$this->safe($error->getMessage()));
        foreach ($this->logs as $entry) ($this->output)('  diagnostic: '.$entry);
    }
}
