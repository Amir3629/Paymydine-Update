<?php
/**
 * Real MySQL checkpoint/link/activation tests against NEW disposable databases.
 * TLS and regional/native migration services are fixtures. No HTTP/app bootstrap.
 */
use Illuminate\Container\Container;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Facade;
use App\Services\RestaurantGroups\{Store,Schema,OwnerLinker,SiteProvisioner};
use App\Services\{SuperAdminTenantLifecycleService,SuperAdminTenantDomainProvisioner};
use App\Services\Platform\SuperAdminTenantMarketService;

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (!in_array('--allow-create-test-databases', $argv, true)) {
    fwrite(STDERR, "Usage: php mysql-provisioning-r4.php /var/www/paymydine --allow-create-test-databases\nCreates/drops up to five fresh test databases. Does not install the application.\n");
    exit(2);
}
require __DIR__.'/mysql-r4-support.inc';
$root=realpath($argv[1]??'');$bundle=dirname(__DIR__,2);$created=[];$admin=null;$capsule=null;$failures=0;
$checks=new R4SqlChecks();
function verifyR4Sql(string $key,string $name,callable $fn,array $requires=[]):void {
    $GLOBALS['checks']->run($key,$name,$fn,$requires);
}
function equalR4Sql($a,$b):void {if($a!==$b)throw new RuntimeException('Assertion mismatch');}
try {
    if(!$root||!is_file($root.'/vendor/autoload.php')||!is_file($root.'/.env'))throw new RuntimeException('Application root, vendor and .env are required.');
    if(!extension_loaded('pdo_mysql'))throw new RuntimeException('pdo_mysql is required.');
    $loader=require $root.'/vendor/autoload.php';
    // Keep caught service errors available to a failing assertion. Do not expose
    // raw SQL, credentials, or unrelated context when diagnostics are printed.
    class R4SqlDiagnosticLogger extends Psr\Log\AbstractLogger {
        public function log($level,$message,array $context=[]):void {
            $GLOBALS['checks']->log($level,$message,$context);
        }
    }
    $classMap=[SuperAdminTenantLifecycleService::class=>$bundle.'/app/Services/SuperAdminTenantLifecycleService.php'];
    foreach(glob($bundle.'/app/Services/RestaurantGroups/*.php') as $file)$classMap['App\\Services\\RestaurantGroups\\'.basename($file,'.php')]=$file;
    foreach($classMap as $class=>$file) {
        if(!is_file($file)||class_exists($class,false))throw new RuntimeException('Pinned test class is missing or was already loaded.');
    }
    $loader->addClassMap($classMap);
    Dotenv\Dotenv::createImmutable($root)->safeLoad();
    $env=static fn($key,$fallback=null)=>$_ENV[$key]??$_SERVER[$key]??$fallback;
    $host=(string)$env('DB_HOST','127.0.0.1');$port=(int)$env('DB_PORT',3306);$socket=(string)$env('DB_SOCKET','');
    $user=(string)$env('DB_USERNAME','');$password=(string)$env('DB_PASSWORD','');
    $checks->redact([$password,$user,$host,$socket,(string)$env('APP_KEY','')]);
    if($user==='')throw new RuntimeException('DB_USERNAME is not configured.');
    $dsn=$socket!==''?'mysql:unix_socket='.$socket.';charset=utf8mb4':'mysql:host='.$host.';port='.$port.';charset=utf8mb4';
    $admin=new PDO($dsn,$user,$password,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $prefix='pmd_rgtest_r4_'.bin2hex(random_bytes(6));$names=[];
    for($i=0;$i<5;$i++)$names[$i]=$prefix.'_'.$i;
    for($i=0;$i<2;$i++) {
        $admin->exec('CREATE DATABASE `'.$names[$i].'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $created[]=$names[$i];echo 'Created fresh test database: '.$names[$i].PHP_EOL;
    }
    $GLOBALS['r4_sql_template']=$names[1];$GLOBALS['r4_sql_targets']=array_slice($names,2);
    $container=new Container();Container::setInstance($container);Facade::setFacadeApplication($container);Facade::clearResolvedInstances();
    $base=['driver'=>'mysql','host'=>$host,'port'=>$port,'username'=>$user,'password'=>$password,'unix_socket'=>$socket,
        'charset'=>'utf8mb4','collation'=>'utf8mb4_unicode_ci','prefix'=>'ti_','strict'=>true];
    $centralConfig=$base+['database'=>$names[0]];
    $container->instance('config',new Illuminate\Config\Repository(['database'=>['default'=>'mysql','connections'=>[
        'mysql'=>$centralConfig,'pmd_groups_central'=>$centralConfig]],'pmd_groups'=>['enabled'=>true,'tenant_template'=>$base]]));
    $container->instance('log',new R4SqlDiagnosticLogger());
    $container->instance('hash',new Illuminate\Hashing\BcryptHasher(['rounds'=>4]));
    $session=new Illuminate\Session\Store('rgtest-r4',new Illuminate\Session\ArraySessionHandler(120));$session->start();$session->put('superadmin_id',1);
    $container->instance('session',$session);
    $container->instance('request',Illuminate\Http\Request::create('https://paymydine.com/superadmin/groups'));
    $capsule=new Capsule($container);
    // Capsule's constructor overwrites database.default with 'default'. Restore
    // the named CENTRAL TEST connection after construction. The production
    // createDeferred() central-context guard is intentionally unchanged.
    $capsule->getDatabaseManager()->setDefaultConnection('mysql');
    $capsule->addConnection($centralConfig,'mysql');$capsule->addConnection($centralConfig,'pmd_groups_central');
    $capsule->addConnection($base+['database'=>$names[1]],'r4_template');$capsule->setAsGlobal();$container->instance('db',$capsule->getDatabaseManager());
    $store=new Store();$schema=new Schema();$central=$store->central();$sb=$central->getSchemaBuilder();
    $sb->create('tenants',function($t){$t->engine='InnoDB';$t->bigIncrements('id');foreach(['name','email','phone','type','country','status'] as $k)$t->string($k);$t->string('domain')->unique();$t->string('database')->unique();$t->text('description')->nullable();$t->date('start');$t->date('end');$t->timestamps();});
    $schema->installCentral($store);
    $ownerId=$central->table('pmd_group_owners')->insertGetId(['uuid'=>'11111111-1111-4111-8111-111111111111','username'=>'r4-owner','email'=>'test@example.invalid','name'=>'Test group Owner','password'=>'not-a-live-login','status'=>'active','auth_version'=>1]);
    $groupId=$central->table('pmd_groups')->insertGetId(['uuid'=>'22222222-2222-4222-8222-222222222222','name'=>'R4 MySQL fixture','type'=>'multi_location','status'=>'provisioning','owner_id'=>$ownerId]);
    $template=$capsule->getConnection('r4_template');$b=$template->getSchemaBuilder();
    $b->create('users',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('user_id')->primary();$t->unsignedBigInteger('staff_id');$t->boolean('super_user');$t->string('username')->unique();$t->string('password');$t->string('reset_code');});
    $b->create('staffs',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('staff_id')->primary();$t->unsignedBigInteger('staff_role_id');$t->boolean('staff_status');$t->string('staff_name');$t->string('staff_email');});
    $b->create('staff_roles',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('staff_role_id')->primary();$t->string('code');});
    $b->create('locations',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('location_id')->primary();$t->boolean('location_status');$t->string('location_name');});
    $b->create('locationables',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('location_id');$t->unsignedBigInteger('locationable_id');$t->string('locationable_type');$t->text('options');});
    $schema->installTenant($template);
    $b->create('pmd_sync_events',function($t){$t->engine='InnoDB';$t->bigIncrements('id');$t->string('secret');});
    $template->table('users')->insert([['user_id'=>10,'staff_id'=>20,'super_user'=>1,'username'=>'template-owner','password'=>'template-password','reset_code'=>'template-code'],['user_id'=>11,'staff_id'=>21,'super_user'=>0,'username'=>'template-cashier','password'=>'template-password','reset_code'=>'template-code']]);
    $template->table('staffs')->insert([['staff_id'=>20,'staff_role_id'=>30,'staff_status'=>1,'staff_name'=>'T','staff_email'=>'template@example.invalid'],['staff_id'=>21,'staff_role_id'=>31,'staff_status'=>1,'staff_name'=>'C','staff_email'=>'cashier@example.invalid']]);
    $template->table('staff_roles')->insert(['staff_role_id'=>30,'code'=>'pmd-owner']);
    $template->table('locations')->insert(['location_id'=>40,'location_status'=>1,'location_name'=>'Template']);
    $template->table('pmd_group_identity')->insert(['user_id'=>10,'owner_uuid'=>'99999999-9999-4999-8999-999999999999','linked_at'=>now()]);
    $template->table('pmd_sync_events')->insert(['secret'=>'must-not-be-cloned']);
    $siteIds=[];
    for($i=2;$i<5;$i++) {
        $slug='rgtest-r4-'.$i;
        $payload=['name'=>'Test '.$i,'domain'=>$slug.'.paymydine.com','database'=>$names[$i],'email'=>'test@example.invalid','phone'=>'000',
            'country'=>'Germany','country_code'=>'DE','type'=>'fixture','start'=>now()->subDay()->toDateString(),'end'=>now()->addYear()->toDateString()];
        $siteIds[$i]=(int)$central->table('pmd_group_sites')->insertGetId(['group_id'=>$groupId,'tenant_id'=>null,'location_id'=>null,
            'label'=>'Test '.$i,'slug'=>$slug,'database_name'=>$names[$i],'state'=>'pending','payload'=>json_encode($payload)]);
    }
    // Real DDL and registry writes; native migration/theme finalization is omitted.
    class R4SqlCreator extends SuperAdminTenantLifecycleService {
        public int $clones=0;public bool $interrupt=false;
        protected function schemaExists(string $name):bool{return parent::schemaExists($name==='newtenantdb'?$GLOBALS['r4_sql_template']:$name);}
        protected function cloneTemplateDatabase(string $source,string $target,bool $group=false):void {
            if(!in_array($target,$GLOBALS['r4_sql_targets'],true))throw new RuntimeException('Target is not an owned test database.');
            // Called only after canonical CREATE DATABASE succeeds.
            $GLOBALS['created'][]=$target;echo 'Created fresh test database: '.$target.PHP_EOL;$this->clones++;
            parent::cloneTemplateDatabase($GLOBALS['r4_sql_template'],$target,$group);
            if($this->interrupt)throw new RuntimeException('Simulated interruption before native finalization.');
        }
        protected function finalizeTenantDatabase(string $db,string $central,array $data,bool $group=false):void {
            if(!in_array($db,$GLOBALS['r4_sql_targets'],true))throw new RuntimeException('Not a test database.');
            $this->restoreCentralConnection($central);
        }
    }
    $creator=new R4SqlCreator();
    $domain=new class {public int $calls=0;public bool $fail=false;public function provision($domain){$this->calls++;return ['ok'=>!$this->fail,'message'=>'TLS fixture only'];}};
    $market=new class {public int $calls=0;public function applyToTenant($tenant,$country){$this->calls++;return ['database'=>$tenant->database,'warnings'=>[]];}};
    $container->instance(SuperAdminTenantLifecycleService::class,$creator);$container->instance(SuperAdminTenantDomainProvisioner::class,$domain);$container->instance(SuperAdminTenantMarketService::class,$market);
    $linker=new OwnerLinker($store,$schema);$workflow=new SiteProvisioner($store,$linker);
    $site=fn($i)=>$central->table('pmd_group_sites')->where('id',$siteIds[$i])->first();
    verifyR4Sql('context','Capsule default and live selection point to the central test database',function()use($capsule,$central,$names){
        $manager=$capsule->getDatabaseManager();
        equalR4Sql($manager->getDefaultConnection(),'mysql');
        equalR4Sql($manager->connection()->getDatabaseName(),$names[0]);
        equalR4Sql($manager->connection()->selectOne('SELECT DATABASE() AS selected')->selected,$names[0]);
        equalR4Sql($central->getDatabaseName(),$names[0]);
        equalR4Sql($central->selectOne('SELECT DATABASE() AS selected')->selected,$names[0]);
    });
    verifyR4Sql('guard','production guard still refuses a noncentral default before allocation',function()use($capsule,$creator,$central){
        $manager=$capsule->getDatabaseManager();
        $before=$central->table('tenants')->count();$clones=$creator->clones;$refused=false;
        $manager->setDefaultConnection('r4_template');
        try {
            $creator->createDeferred([],static function(){throw new RuntimeException('Unexpected checkpoint.');});
        } catch(DomainException $error) {
            $refused=$error->getMessage()==='Group provisioning must start in the central database context.';
        } finally { $manager->setDefaultConnection('mysql'); }
        equalR4Sql($refused,true);
        equalR4Sql($central->table('tenants')->count(),$before);
        equalR4Sql($creator->clones,$clones);
    },['context']);
    verifyR4Sql('allocation','real disabled allocation, owner linking and atomic activation',function()use($workflow,$siteIds,$site,$store,$ownerId){equalR4Sql($workflow->run($siteIds[2])['ok'],true);equalR4Sql($site(2)->state,'ready');equalR4Sql((int)$store->access($ownerId,(int)$site(2)->tenant_id)->user_id,10);},['context','guard']);
    verifyR4Sql('clone','real template clone excludes foreign group identity and sync tokens',function()use($site,$store){$db=$store->connection((int)$site(2)->tenant_id);equalR4Sql($db->table('pmd_sync_events')->count(),0);equalR4Sql($db->table('pmd_group_identity')->value('owner_uuid'),'11111111-1111-4111-8111-111111111111');},['allocation']);
    verifyR4Sql('credentials','real local template credentials are rotated and extra staff disabled',function()use($site,$store){$db=$store->connection((int)$site(2)->tenant_id);equalR4Sql($db->table('users')->where('password','template-password')->count(),0);equalR4Sql($db->table('users')->where('reset_code','template-code')->count(),0);equalR4Sql((int)$db->table('staffs')->where('staff_id',21)->value('staff_status'),0);},['allocation']);
    verifyR4Sql('replay','real ready replay has no TLS or password changes',function()use($workflow,$siteIds,$site,$store,$domain){$db=$store->connection((int)$site(2)->tenant_id);$before=$db->table('users')->where('user_id',10)->value('password');$calls=$domain->calls;equalR4Sql($workflow->run($siteIds[2])['state'],'already_ready');equalR4Sql($domain->calls,$calls);equalR4Sql($db->table('users')->where('user_id',10)->value('password'),$before);},['allocation']);
    verifyR4Sql('tls','real TLS failure preserves prepared database and active sibling',function()use($workflow,$siteIds,$site,$store,$domain,$central){$domain->fail=true;equalR4Sql($workflow->run($siteIds[3])['ok'],false);equalR4Sql($store->tenant((int)$site(3)->tenant_id,false)->status,'disabled');equalR4Sql($store->tenant((int)$site(2)->tenant_id,false)->status,'active');equalR4Sql($central->table('pmd_group_access')->where('tenant_id',$site(3)->tenant_id)->count(),0);},['allocation']);
    verifyR4Sql('owner_rollback','real failed Owner write rolls back local credentials and access',function()use($workflow,$siteIds,$site,$store,$domain,$central){$domain->fail=false;$db=$store->connection((int)$site(3)->tenant_id,false);$db->statement('ALTER TABLE `ti_staffs` MODIFY `staff_name` VARCHAR(3) NOT NULL');equalR4Sql($workflow->run($siteIds[3])['ok'],false);equalR4Sql($db->table('users')->where('user_id',10)->value('password'),'template-password');equalR4Sql($db->table('pmd_group_identity')->count(),0);equalR4Sql($central->table('pmd_group_access')->where('tenant_id',$site(3)->tenant_id)->count(),0);$db->statement('ALTER TABLE `ti_staffs` MODIFY `staff_name` VARCHAR(191) NOT NULL');},['tls']);
    verifyR4Sql('audit_rollback','real activation audit failure rolls back central state only',function()use($workflow,$siteIds,$site,$store,$central){$central->table('pmd_group_audit')->delete();$central->statement('ALTER TABLE `ti_pmd_group_audit` MODIFY `details` VARCHAR(1) NOT NULL');try{equalR4Sql($workflow->run($siteIds[3])['ok'],false);equalR4Sql($store->tenant((int)$site(3)->tenant_id,false)->status,'disabled');equalR4Sql($central->table('pmd_group_access')->where('tenant_id',$site(3)->tenant_id)->count(),0);equalR4Sql($store->connection((int)$site(3)->tenant_id,false)->table('pmd_group_identity')->count(),1);}finally{$central->statement('ALTER TABLE `ti_pmd_group_audit` MODIFY `details` LONGTEXT NOT NULL');}},['owner_rollback']);
    verifyR4Sql('retry','real retry after audit failure reuses local identity without recloning',function()use($workflow,$siteIds,$site,$store,$creator,$domain){$db=$store->connection((int)$site(3)->tenant_id,false);$before=$db->table('users')->where('user_id',10)->value('password');$clones=$creator->clones;$calls=$domain->calls;equalR4Sql($workflow->run($siteIds[3])['ok'],true);equalR4Sql($db->table('users')->where('user_id',10)->value('password'),$before);equalR4Sql($creator->clones,$clones);equalR4Sql($domain->calls,$calls);},['audit_rollback']);
    verifyR4Sql('interruption','real interrupted preparation cannot be automatically recloned',function()use($workflow,$siteIds,$site,$store,$creator){$creator->interrupt=true;equalR4Sql($workflow->run($siteIds[4])['ok'],false);$clones=$creator->clones;$creator->interrupt=false;equalR4Sql($workflow->run($siteIds[4])['ok'],false);equalR4Sql($creator->clones,$clones);equalR4Sql($store->tenant((int)$site(4)->tenant_id,false)->status,'disabled');},['context','guard']);
    verifyR4Sql('disabled','real retry cannot reactivate a manually disabled ready restaurant',function()use($central,$workflow,$siteIds,$site,$store){$id=(int)$site(2)->tenant_id;$central->table('tenants')->where('id',$id)->update(['status'=>'disabled']);$workflow->run($siteIds[2]);equalR4Sql($store->tenant($id,false)->status,'disabled');},['allocation']);
    echo ($checks->passed+$checks->failed+$checks->skipped)." MySQL provisioning checks: {$checks->passed} passed, {$checks->failed} failed, {$checks->skipped} skipped. TLS, native migrations and HTTP authentication were not executed.".PHP_EOL;
} catch(Throwable $e) {
    $failures++;$checks->setupFailure($e);
    fwrite(STDERR,'No production installation was performed. Do not increase production DB privileges to run this test.'.PHP_EOL);
} finally {
    if($capsule){foreach(array_keys($capsule->getDatabaseManager()->getConnections()) as $connection){try{$capsule->getDatabaseManager()->purge($connection);}catch(Throwable $e){$failures++;fwrite(STDERR,'Test connection disconnect failed; database cleanup will still be attempted.'.PHP_EOL);}}}
    if($admin){foreach(array_reverse(array_unique($created)) as $name){
        if(!preg_match('/^pmd_rgtest_r4_[a-f0-9]{12}_[0-4]$/D',$name)){ $failures++;continue; }
        try{$admin->exec('DROP DATABASE `'.$name.'`');echo 'Removed test database: '.$name.PHP_EOL;}
        catch(Throwable $e){$failures++;fwrite(STDERR,'Could not remove owned test database: '.$name.PHP_EOL);}
    }}
}
exit(($failures || $checks->failed || $checks->skipped)?1:0);
