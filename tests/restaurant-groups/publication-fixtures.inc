<?php
namespace {
    class R3Clock extends \DateTimeImmutable {
        public function addMinutes($minutes) { return $this->modify('+'.$minutes.' minutes'); }
        public function greaterThan($other) { return $this > ($other instanceof \DateTimeInterface ? $other : new self($other)); }
        public function toIso8601String() { return $this->format(DATE_ATOM); }
        public function __toString() { return $this->format('Y-m-d H:i:s'); }
    }
    function now() { return new R3Clock('2026-10-04 12:00:00 UTC'); }
    function app($class) { return $GLOBALS['r3_app'][$class]; }
    function config($key,$default=null) { return $default; }
    function logger() { return new class { public function error(...$a) {} }; }
    final class R3Rows implements \IteratorAggregate, \Countable {
        public function __construct(private array $rows) {}
        public function count(): int { return count($this->rows); }
        public function first() { return $this->rows[0]??null; }
        public function isEmpty() { return !$this->rows; }
        public function getIterator(): \Traversable { return new \ArrayIterator($this->rows); }
        public function all() { return $this->rows; }
    }
    final class R3DB {
        public array $tables=[]; public array $columns=[];
        public int $writes=0; public bool $failCommit=false; public bool $failAudit=false;
        public bool $lockBusy=false; public int $locks=0; public int $unlocks=0;
        public array $engine=[];
        public function __construct(public string $name) {}
        public function getDriverName() { return 'mysql'; }
        public function getDatabaseName() { return $this->name; }
        public function getTablePrefix() { return 'ti_'; }
        public function getSchemaBuilder() { return $this; }
        public function hasTable($name) { return array_key_exists($name,$this->tables); }
        public function hasColumn($name,$column) { return in_array($column,$this->getColumnListing($name),true); }
        public function getColumnListing($name) { return $this->columns[$name]??array_keys($this->tables[$name][0]??[]); }
        public function selectOne($sql,$bindings) {
            if(str_contains($sql,'GET_LOCK')) { $this->locks++; return (object)['acquired'=>$this->lockBusy?0:1]; }
            $this->unlocks++; return (object)['released'=>1];
        }
        public function select($sql,$bindings) {
            return array_map(fn($t)=>(object)['TABLE_NAME'=>'ti_'.$t,'ENGINE'=>$this->engine[$t]??'InnoDB'],array_keys($this->tables));
        }
        public function table($table) { if(!$this->hasTable($table)) throw new \RuntimeException('Missing fixture table '.$table); return new R3Query($this,$table); }
        public function transaction(callable $fn) {
            $before=$this->tables; $writes=$this->writes;
            try { $r=$fn(); if($this->failCommit) throw new \RuntimeException('Fixture commit failure'); return $r; }
            catch(\Throwable $e) { $this->tables=$before; $this->writes=$writes; throw $e; }
        }
    }
    final class R3Query {
        private array $filters=[]; private ?string $order=null; private ?int $limit=null;
        public function __construct(private R3DB $db,private string $table) {}
        public function where($key,$value) { $this->filters[]=fn($r)=>($r[$key]??null)==$value; return $this; }
        public function whereIn($key,$values) { $this->filters[]=fn($r)=>in_array($r[$key]??null,$values); return $this; }
        public function whereRaw($sql,$values) {
            if(!preg_match('/^LOWER\(([a-z_]+)\) = \?$/',$sql,$m)) throw new \RuntimeException('Unsupported fixture query '.$sql);
            $key=$m[1]; $this->filters[]=fn($r)=>strtolower((string)($r[$key]??''))===$values[0]; return $this;
        }
        public function lockForUpdate() { return $this; }
        public function orderBy($column) { $this->order=$column; return $this; }
        public function limit($limit) { $this->limit=$limit; return $this; }
        private function matches($row) { foreach($this->filters as $fn) if(!$fn($row)) return false; return true; }
        public function get() {
            $rows=array_values(array_filter($this->db->tables[$this->table],fn($r)=>$this->matches($r)));
            if($this->order) usort($rows,fn($a,$b)=>($a[$this->order]??0)<=>($b[$this->order]??0));
            if($this->limit!==null) $rows=array_slice($rows,0,$this->limit);
            return new R3Rows(array_map(fn($r)=>(object)$r,$rows));
        }
        public function first() { return $this->get()->first(); }
        public function exists() { return $this->first()!==null; }
        public function count() { return $this->get()->count(); }
        public function value($key) { return $this->first()->{$key}??null; }
        public function pluck($key) { return new R3Rows(array_map(fn($r)=>$r->{$key},$this->get()->all())); }
        public function insert($row) { return $this->insertGetId($row)>0; }
        public function insertGetId($row,$key='id') {
            $key=['igniter_coupons'=>'coupon_id'][$this->table]??$key;
            $row[$key]=$row[$key]??(count($this->db->tables[$this->table])+1);
            if($this->table==='pmd_group_receipts') foreach($this->db->tables[$this->table] as $r) if($r['operation_uuid']===$row['operation_uuid']) throw new \RuntimeException('Duplicate receipt');
            $this->db->tables[$this->table][]=$row; $this->db->writes++; return $row[$key];
        }
        public function update($values) {
            $count=0;
            foreach($this->db->tables[$this->table] as &$row) if($this->matches($row)) { $row=array_merge($row,$values); $count++; }
            $this->db->writes+=$count; return $count;
        }
        public function updateOrInsert($where,$values) {
            $q=new self($this->db,$this->table); foreach($where as $k=>$v) $q->where($k,$v);
            if($q->exists()) return $q->update($values); return $q->insert(array_merge($where,$values));
        }
    }
}
namespace Illuminate\Support {
    class Str { public static int $n=0; public static function uuid() { return '00000000-0000-4000-8000-'.str_pad((string)++self::$n,12,'0',STR_PAD_LEFT); } }
}
namespace Illuminate\Support\Facades {
    class Cache { public static array $forgot=[]; public static function forget($key) { self::$forgot[]=$key; } }
}
namespace App\Services\RestaurantGroups {
    final class Schema {}
    final class Auth {
        public function __construct(public object $value) {}
        public function owner($mfa=true) { return clone $this->value; }
    }
    final class Store {
        public array $dbs=[]; public array $denied=[]; public array $sites=[]; public array $groups=[]; public int $source=1;
        public function central() { return $this->dbs[0]; }
        public function currentTenantId() { return $this->source; }
        public function connection($id) { return $this->dbs[$id]; }
        public function access($owner,$tenant,$publish=false) { if(isset($this->denied[$tenant])) throw new \DomainException('Access revoked'); return (object)['user_id'=>10]; }
        public function site($id) { return (object)$this->sites[$id]; }
        public function group($id) { return (object)$this->groups[$id]; }
        public function sitesForOwner($id) { return array_values($this->sites); }
        public function audit($actor,$id,$action,$group,$details) {
            if($this->central()->failAudit) throw new \RuntimeException('Audit failure');
            $this->central()->table('pmd_group_audit')->insert(['action'=>$action,'details'=>$details]);
        }
    }
}
