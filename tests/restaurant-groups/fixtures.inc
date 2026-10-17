<?php
/** Standalone service-test boundaries. No application bootstrap or live DB. */
namespace {
    final class TestSession {
        public array $data = [];
        public string $id = 'test-session';
        public function get($key, $default = null) { return $this->data[$key] ?? $default; }
        public function put($key, $value) { $this->data[$key] = $value; }
        public function forget($keys) { foreach ((array)$keys as $key) unset($this->data[$key]); }
        public function getId() { return $this->id; }
    }
    final class TestDB {
        public array $tables = [];
        public bool $failSchema = false;
        public bool $failCommit = false;
        public $onLock = null;
        public function getSchemaBuilder() { return $this; }
        public function hasTable($name) {
            if ($this->failSchema) throw new \RuntimeException('fixture schema unavailable');
            return array_key_exists($name, $this->tables);
        }
        public function table($name) { return new TestQuery($this, $name); }
        public function transaction($fn) {
            $before = $this->tables;
            try { $result = $fn(); if ($this->failCommit) throw new \RuntimeException('fixture commit failure'); return $result; }
            catch (\Throwable $e) { $this->tables = $before; throw $e; }
        }
    }
    final class TestQuery {
        private array $conditions = [];
        public function __construct(private TestDB $db, private string $table) {}
        public function where($key, $value) { $this->conditions[] = fn($r) => ($r[$key] ?? null) == $value; return $this; }
        public function whereNull($key) { $this->conditions[] = fn($r) => ($r[$key] ?? null) === null; return $this; }
        public function whereRaw($sql, $args) {
            if ($sql !== 'LOWER(username) = ?') throw new \RuntimeException('Unexpected fixture SQL');
            $this->conditions[] = fn($r) => strtolower($r['username'] ?? '') === $args[0]; return $this;
        }
        public function lockForUpdate() {
            if ($this->db->onLock) { $fn = $this->db->onLock; $this->db->onLock = null; $fn($this->db); }
            return $this;
        }
        private function matches($row): bool { foreach ($this->conditions as $fn) if (!$fn($row)) return false; return true; }
        public function first() { foreach ($this->db->tables[$this->table] ?? [] as $r) if ($this->matches($r)) return (object)$r; return null; }
        public function exists(): bool { return $this->first() !== null; }
        public function update($data): int {
            $n = 0;
            foreach ($this->db->tables[$this->table] as &$r) if ($this->matches($r)) { $r = array_merge($r, $data); $n++; }
            return $n;
        }
    }
    final class TestUser {
        public function __construct(public int $id = 10) {}
        public function getKey(): int { return $this->id; }
        public function isSuperUser(): bool { return true; }
        public function clearResetPasswordCode(): void {}
    }
    final class TestManager {
        public $local;
        public bool $failLookup = false;
        public array $logins = [];
        public function __construct() { $this->local = new TestUser(); }
        public function getByCredentials($credentials) { if ($this->failLookup) throw new \RuntimeException('fixture lookup failed'); return $this->local; }
        public function getById($id) { return new TestUser((int)$id); }
        public function login($user, $remember) { $this->logins[] = [$user->getKey(), $remember]; }
    }
    function session() { return $GLOBALS['test_session']; }
    function app($class = null) { return $GLOBALS['test_app'][$class]; }
    function config($key, $default = null) { return $GLOBALS['test_config'][$key] ?? $default; }
    function now() { return gmdate('Y-m-d H:i:s', $GLOBALS['test_clock']); }
    function logger() { return new class { public function warning(...$args) {} public function error(...$args) {} }; }
}
namespace Illuminate\Support\Facades {
    final class DB { public static array $dbs = []; public static function connection($name) { return self::$dbs[$name]; } }
    final class Hash {
        public static function make($value) { return password_hash($value, PASSWORD_BCRYPT, ['cost' => 4]); }
        public static function check($value, $hash) { return password_verify($value, $hash); }
    }
    final class Crypt {
        public static function encryptString($s) { return base64_encode($s); }
        public static function decryptString($s) { $v = base64_decode($s, true); if ($v === false) throw new \RuntimeException('fixture decrypt'); return $v; }
    }
    final class Cookie { public static function queue($c) {} public static function forget($k) { return $k; } }
    final class Session { public static function forget($k) { \session()->forget($k); } }
}
namespace Illuminate\Http { class Request {} }
namespace Admin\Facades {
    final class AdminAuth {
        public static $user;
        public static function getUser() { return self::$user; }
        public static function logout() { self::$user = null; }
    }
}
namespace App\Services {
    class PmdSiteAccessService {
        public array $value = ['user_id' => 10, 'location_id' => 4];
        public bool $cleared = false;
        public function identity() { return $this->value; }
        public function clearVerification() { $this->cleared = true; }
    }
    // Signatures match the repository's canonical parent contracts. Behavior is
    // deliberately minimal so any unexpected legacy fallback is observable.
    class PmdOwnerTotpService {
        public const SESSION_ENROLLMENT = 'pmd_owner_totp_enrollment_v1';
        public const SESSION_VERIFIED = 'pmd_owner_totp_session_v1';
        public static array $calls = [];
        public function ready(): bool { self::$calls[] = 'ready'; return true; }
        public function enabled(int $userId): bool { self::$calls[] = 'enabled'; return true; }
        public function enrollment(int $userId, int $locationId): array { self::$calls[] = 'enrollment'; return ['legacy' => true]; }
        public function provisioningUri(array $enrollment): string { self::$calls[] = 'uri'; return 'legacy'; }
        public function confirmEnrollment(int $userId, int $locationId, string $code): bool { self::$calls[] = 'confirm'; return true; }
        public function verify(int $userId, string $code): bool { self::$calls[] = 'verify'; return true; }
        public function sessionVerified(int $userId, int $locationId, int $maxAgeSeconds = 600): bool {
            self::$calls[] = 'session'; $p = \session()->get(self::SESSION_VERIFIED, []);
            return ($p['user_id'] ?? 0) === $userId && ($p['location_id'] ?? 0) === $locationId
                && ($p['session_id'] ?? '') === \session()->getId();
        }
        public function clearSessionVerification(): void { \session()->forget(self::SESSION_VERIFIED); }
        public function resetEnrollment(): void { \session()->forget(self::SESSION_ENROLLMENT); }
    }
    class PmdTrustedLoginDeviceService {
        public static array $calls = [];
        public static $device;
        public static $onResume;
        public function current(\Illuminate\Http\Request $r, ?array $identity = null) { self::$calls[] = 'current'; return self::$device; }
        public function resumeIfPossible(\Illuminate\Http\Request $r) {
            self::$calls[] = 'resume';
            if (!self::current($r)) return null;
            if (self::$onResume) (self::$onResume)();
            return (object)['redirect' => true];
        }
        public function trustAfterVerifiedSecondFactor(\Illuminate\Http\Request $r, ?array $identity = null): bool { self::$calls[] = 'trust'; return true; }
        public function rememberVerifiedResponse(\Illuminate\Http\Request $r, $response) { self::$calls[] = 'remember'; return $response; }
    }
}
namespace App\Services\RestaurantGroups {
    function time() { return $GLOBALS['test_clock']; }
    // Storage/tenant resolution is a test boundary, not a production replacement.
    final class Store {
        public bool $available = true;
        public bool $active = true;
        public bool $denyAccess = false;
        public bool $failAudit = false;
        public int $tenantId = 2;
        public int $mappedUserId = 10;
        public array $audits = [];
        public function central() { return $GLOBALS['test_central']; }
        public function installed() { return $this->available; }
        public function enabled() { return $this->available && $this->active; }
        public function currentTenantId() { return $this->tenantId; }
        public function access($ownerId, $tenantId, $publish = false) {
            if ($this->denyAccess) throw new \DomainException('fixture access revoked');
            return (object)['user_id' => $this->mappedUserId];
        }
        public function site($tenantId) { return (object)['group_id' => 3, 'location_id' => 4]; }
        public function group($id) { return (object)['name' => str_repeat('Restaurant-', 8)]; }
        public function audit(...$values) { if ($this->failAudit) throw new \RuntimeException('fixture audit failed'); $this->audits[] = $values; }
    }
}
