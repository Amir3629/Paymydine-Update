<?php
/** Isolated boundaries: in-memory SQL, domain/TLS and template finalization. */
namespace {
    final class R4Rows implements \IteratorAggregate {
        public function __construct(public array $rows) {}
        public function getIterator(): \Traversable { return new \ArrayIterator($this->rows); }
        public function count(): int { return count($this->rows); }
        public function first() { return $this->rows[0] ?? null; }
    }
    final class R4DB {
        public array $tables = [];
        public array $schemaColumns = [];
        public bool $busy = false;
        public bool $locked = false;
        public bool $failAudit = false;
        public bool $failCommit = false;
        public bool $nonTransactional = false;
        public array $statements = [];
        public $onLock = null;
        public function __construct(public string $name) {}
        public function getDatabaseName() { return $this->name; }
        public function getDriverName() { return 'mysql'; }
        public function getTablePrefix() { return ''; }
        public function table($table) { return new R4Query($this, $table); }
        public function transaction($fn) {
            $before = $this->tables;
            try {
                $result = $fn();
                if ($this->failCommit) { $this->failCommit = false; throw new \RuntimeException('fixture failed commit'); }
                return $result;
            } catch (\Throwable $e) { $this->tables = $before; throw $e; }
        }
        public function getSchemaBuilder() { return $this; }
        public function hasTable($table) { return array_key_exists($table, $this->tables); }
        public function hasColumn($table,$column) { return in_array($column,$this->schemaColumns[$table]??array_keys($this->tables[$table][0]??[]),true); }
        public function selectOne($sql, $args=[]) {
            if (str_contains($sql,'GET_LOCK')) { if($this->busy)return (object)['acquired'=>0];$this->locked=true;return (object)['acquired'=>1]; }
            if (str_contains($sql,'RELEASE_LOCK')) { $this->locked=false;return (object)['released'=>1]; }
            throw new \RuntimeException('Unexpected fixture selectOne');
        }
        public function select($sql, $args=[]) {
            if (!str_contains($sql,'information_schema.TABLES')) throw new \RuntimeException('Unexpected fixture select');
            return array_map(fn($t)=>(object)['TABLE_NAME'=>$t,'ENGINE'=>$this->nonTransactional?'MyISAM':'InnoDB'],array_slice($args,1));
        }
        public function statement($sql) {
            $this->statements[]=$sql;
            if (preg_match('/^CREATE DATABASE `([^`]+)`/', $sql, $m)) {
                if(isset($GLOBALS['r4_databases'][$m[1]]))throw new \RuntimeException('database exists');
                $GLOBALS['r4_databases'][$m[1]]=new R4DB($m[1]);
            } elseif (preg_match('/^DROP DATABASE IF EXISTS `([^`]+)`/', $sql,$m)) {
                unset($GLOBALS['r4_databases'][$m[1]]);
            } else throw new \RuntimeException('Unexpected fixture statement');
        }
    }
    final class R4Query {
        private array $filters=[];
        public function __construct(private R4DB $db,private string $table) {}
        public function where($key,$op,$value=null) {
            if(func_num_args()===2){$value=$op;$op='=';}
            $this->filters[]=fn($row)=>$op==='!='?($row[$key]??null)!=$value:($row[$key]??null)==$value;return $this;
        }
        public function whereIn($key,$values) { $this->filters[]=fn($r)=>in_array($r[$key]??null,$values,true);return $this; }
        public function whereRaw($sql,$args) {
            if($sql!=='LOWER(username) = ?')throw new \RuntimeException('Unexpected raw query');
            $this->filters[]=fn($r)=>strtolower($r['username']??'')===$args[0];return $this;
        }
        public function orderBy(...$args){return $this;}
        public function lockForUpdate(){if($this->db->onLock){$f=$this->db->onLock;$this->db->onLock=null;$f();}return $this;}
        private function matches($row): bool {foreach($this->filters as $fn)if(!$fn($row))return false;return true;}
        public function get(){return new R4Rows(array_values(array_map(fn($r)=>(object)$r,array_filter($this->db->tables[$this->table]??[],fn($r)=>$this->matches($r)))));}
        public function first(){return $this->get()->first();}
        public function exists(){return $this->first()!==null;}
        public function insert(array $data) {
            if($this->table==='pmd_group_audit' && $this->db->failAudit && ($data['action']??'')==='group_site_activated')throw new \RuntimeException('fixture audit failure');
            if (!isset($data['id']) && in_array($this->table,['tenants','pmd_groups','pmd_group_owners','pmd_group_sites','pmd_group_access','pmd_group_audit'],true)) { $id=1; foreach($this->db->tables[$this->table]??[] as $r) $id=max($id,($r['id']??0)+1); $data['id']=$id; }
            $this->db->tables[$this->table][]=$data;return true;
        }
        public function insertGetId(array $data){$id=1;foreach($this->db->tables[$this->table]??[] as $r)$id=max($id,($r['id']??0)+1);$data['id']=$id;$this->insert($data);return $id;}
        public function update(array $data){$n=0;foreach($this->db->tables[$this->table] as &$r)if($this->matches($r)){$r=array_merge($r,$data);$n++;}return $n;}
        public function delete(){$before=count($this->db->tables[$this->table]);$this->db->tables[$this->table]=array_values(array_filter($this->db->tables[$this->table],fn($r)=>!$this->matches($r)));return $before-count($this->db->tables[$this->table]);}
    }
    function app($class) { return $GLOBALS['r4_app'][$class]; }
    function now() { return '2026-10-04 10:00:00'; }
    function config($key,$fallback=null) {return $GLOBALS['r4_config'][$key]??$fallback;}
    function session(){return new class {public function get($key,$fallback=null){return $key==='superadmin_id'?11:$fallback;}};}
    function logger(){return new class {public function error(...$args){$GLOBALS['r4_logs'][]=$args;}};}
}
namespace Illuminate\Support\Facades {
    class DB {public static function getDefaultConnection(){return $GLOBALS['r4_config']['database.default']??'mysql';}public static function connection($name){return $GLOBALS['r4_databases'][$GLOBALS['r4_config']['database.connections.mysql.database']];}public static function purge($name){}public static function reconnect($name){}}
    class Config {public static function get($key,$default=null){return \config($key,$default);}public static function set($key,$value){$GLOBALS['r4_config'][$key]=$value;}}
    class Log {public static function error(...$args){$GLOBALS['r4_logs'][]=$args;}public static function warning(...$args){}}
    class Hash {public static function make($text){return password_hash($text,PASSWORD_BCRYPT,['cost'=>4]);}}
}
namespace Illuminate\Support {
    class Str {public static function random($n){return substr(bin2hex(random_bytes($n)),0,$n);}public static function uuid(){return '00000000-0000-4000-8000-'.bin2hex(random_bytes(6));}}
}
namespace App\Services {
    class SuperAdminTenantDomainProvisioner {
        public int $calls=0;public bool $fail=false;public $during=null;
        public function provision($domain){$this->calls++;if($this->during)($this->during)();return ['ok'=>!$this->fail,'message'=>'fixture TLS'];}
    }
}
namespace App\Services\Platform {
    class SuperAdminTenantMarketService {
        public int $calls=0;public bool $fail=false;public array $warnings=[];public $during=null;
        public function applyToTenant($tenant,$country){$this->calls++;if($this->during)($this->during)();if($this->fail)throw new \RuntimeException('fixture market failure');return ['database'=>$tenant->database,'warnings'=>$this->warnings];}
    }
    class CountryPlatformProfileRegistry {public function profile($country){return $country==='DE'?['country_name'=>'Germany','country_code'=>'DE']:null;}}
}
namespace App\Services\RestaurantGroups {
    // Policy behavior is exercised separately by the existing R2/R3 suites.
    final class Policy {
        public static function canonical(array $x):string{return json_encode($x,JSON_THROW_ON_ERROR);}
        public static function type(string $v):string{if(!in_array($v,['independent','multi_location','food_court'],true))throw new \DomainException('fixture invalid type');return $v;}
        public static function slug(string $v):string{if(!preg_match('/^[a-z][a-z0-9-]*$/D',$v))throw new \DomainException('fixture slug');return $v;}
    }
    final class Store {
        public bool $on=true;
        public function enabled(){return $this->on;}
        public function central(){return $GLOBALS['r4_databases']['landlord'];}
        public function site($tenant){$s=$this->central()->table('pmd_group_sites')->where('tenant_id',$tenant)->first();if(!$s)throw new \DomainException('missing site');return $s;}
        public function group($id){return $this->central()->table('pmd_groups')->where('id',$id)->first();}
        public function tenant($id,$active=true){$t=$this->central()->table('tenants')->where('id',$id)->first();if(!$t)throw new \DomainException('missing tenant');return $t;}
        public function connection($id,$active=true){return $GLOBALS['r4_databases'][$this->tenant($id)->database];}
    }
    final class Schema {public function installTenant($db){if(!isset($db->tables['pmd_group_identity']))$db->tables['pmd_group_identity']=[];}}
}
