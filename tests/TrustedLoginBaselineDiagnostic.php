<?php

declare(strict_types=1);

namespace Admin\Facades {
    final class AdminAuth
    {
        public static bool $logged = true;
        public static function isLogged(): bool { return self::$logged; }
    }
}

namespace Illuminate\Http {
    class Request
    {
        public $attributes;
        private array $cookies;
        public function __construct(array $cookies = []) { $this->cookies = $cookies; $this->attributes = new \TestSupport\Attributes(); }
        public function cookie($key, $default = null) { return $this->cookies[$key] ?? $default; }
        public function isSecure(): bool { return true; }
        public function userAgent(): string { return 'PMD trusted-device diagnostic'; }
        public function ip(): string { return '127.0.0.1'; }
    }
}

namespace Illuminate\Support\Facades {
    final class Schema
    {
        public static function hasTable($table): bool { return $table === 'pmd_site_access_devices'; }
        public static function hasColumn($table, $column): bool { return $table === 'pmd_site_access_devices' && $column === 'user_id'; }
    }
    final class Cookie
    {
        public static array $queued = [];
        public static function queue($cookie): void { self::$queued[] = $cookie; }
    }
    final class DB
    {
        public static \PDO $pdo;
        public static function table($table): \TestSupport\Query { return new \TestSupport\Query(self::$pdo, $table); }
    }
}

namespace App\Services {
    final class PmdSiteAccessService
    {
        public array $audits = [];
        public function identity(): array { return $GLOBALS['identity']; }
        public function audit(...$arguments): void { $this->audits[] = $arguments; }
    }
    final class PmdSiteAccessSessionBindingService {}
}

namespace TestSupport {
    final class Attributes
    {
        private array $values = [];
        public function set(string $key, $value): void { $this->values[$key] = $value; }
        public function get(string $key, $default = null) { return $this->values[$key] ?? $default; }
    }
    final class CookieValue
    {
        public function __construct(public string $name, public string $value) {}
        public function getName(): string { return $this->name; }
    }
    final class Response
    {
        public array $cookies = [];
        public function withCookie($cookie): self { $copy = clone $this; $copy->cookies[] = $cookie; return $copy; }
    }
    final class Query
    {
        private array $where = [];
        public function __construct(private \PDO $pdo, private string $table) {}
        public function where($column, $value): self { $this->where[] = [$column, '=', $value]; return $this; }
        public function whereNull($column): self { $this->where[] = [$column, 'IS', null]; return $this; }
        private function clause(array &$bindings): string {
            if (!$this->where) return '';
            $parts = [];
            foreach ($this->where as [$column, $operator, $value]) {
                if ($operator === 'IS') $parts[] = '"'.$column.'" IS NULL';
                else { $parts[] = '"'.$column.'" = ?'; $bindings[] = $value; }
            }
            return ' WHERE '.implode(' AND ', $parts);
        }
        public function first() {
            $bindings = [];
            $statement = $this->pdo->prepare('SELECT * FROM "'.$this->table.'"'.$this->clause($bindings).' LIMIT 1');
            $statement->execute($bindings);
            return $statement->fetchObject() ?: null;
        }
        public function insertGetId(array $values): int {
            $columns = array_keys($values);
            $statement = $this->pdo->prepare('INSERT INTO "'.$this->table.'" ('.implode(',', array_map(fn($c) => '"'.$c.'"', $columns)).') VALUES ('.implode(',', array_fill(0, count($columns), '?')).')');
            $statement->execute(array_values($values));
            return (int)$this->pdo->lastInsertId();
        }
        public function update(array $values): int {
            $bindings = array_values($values);
            $set = implode(',', array_map(fn($c) => '"'.$c.'" = ?', array_keys($values)));
            $statement = $this->pdo->prepare('UPDATE "'.$this->table.'" SET '.$set.$this->clause($bindings));
            $statement->execute($bindings);
            return $statement->rowCount();
        }
    }
}

namespace {
    use Admin\Facades\AdminAuth;
    use App\Services\PmdSiteAccessService;
    use App\Services\PmdTrustedLoginDeviceService;
    use Illuminate\Http\Request;
    use Illuminate\Support\Facades\Cookie;
    use Illuminate\Support\Facades\DB;
    use TestSupport\CookieValue;
    use TestSupport\Response;

    $site = new PmdSiteAccessService();
    $GLOBALS['identity'] = ['user_id' => 41, 'location_id' => 7, 'staff_id' => 9, 'user' => null];
    function app($class) { global $site; if ($class === PmdSiteAccessService::class) return $site; throw new RuntimeException('Unexpected service '.$class); }
    function config($key, $default = null) { return $key === 'app.key' ? 'diagnostic-key' : $default; }
    function now(): string { return '2026-08-31 12:00:00'; }
    function cookie($name, $value): CookieValue { return new CookieValue($name, $value); }
    function logger() { return new class { public function warning(...$args) {} public function error(...$args) {} }; }

    require dirname(__DIR__).'/app/Services/PmdTrustedLoginDeviceService.php';

    DB::$pdo = new PDO('sqlite::memory:');
    DB::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    DB::$pdo->exec('CREATE TABLE pmd_site_access_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER NOT NULL,
      user_id INTEGER, device_kind TEXT NOT NULL, staff_id INTEGER,
      pos_device_id INTEGER, device_name TEXT NOT NULL, token_hash TEXT UNIQUE,
      capabilities TEXT, platform_info TEXT, paired_by_staff_id INTEGER,
      paired_at TEXT, last_seen_at TEXT, revoked_at TEXT, created_at TEXT, updated_at TEXT
    )');

    $service = new PmdTrustedLoginDeviceService();
    $request = new Request();
    $checks = [
        'ready' => $service->ready(),
        'logged' => AdminAuth::isLogged(),
        'user_id' => $GLOBALS['identity']['user_id'],
        'location_id' => $GLOBALS['identity']['location_id'],
        'existing' => (bool)$service->current($request, $GLOBALS['identity']),
    ];
    $checks['completion'] = $service->trustAfterVerifiedSecondFactor($request, $GLOBALS['identity']);
    $checks['rows'] = (int)DB::$pdo->query("SELECT COUNT(*) FROM pmd_site_access_devices WHERE device_kind='trusted_login'")->fetchColumn();
    $response = $service->rememberVerifiedResponse($request, new Response());
    $checks['response_cookie'] = count(array_filter($response->cookies, fn($value) => $value->getName() === PmdTrustedLoginDeviceService::COOKIE)) === 1;

    foreach ($checks as $key => $value) echo $key.'='.(is_bool($value) ? ($value ? 'true' : 'false') : $value).PHP_EOL;
    if (!$checks['ready'] || !$checks['logged'] || $checks['existing'] || !$checks['completion'] || $checks['rows'] !== 1 || !$checks['response_cookie']) exit(1);
}
