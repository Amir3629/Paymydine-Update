<?php
/**
 * Real MySQL/Illuminate integration for publication and reporting.
 * Creates four NEW random databases; never loads the application kernel and
 * never reads/copies any production tenant data. Authentication is a fixture.
 */
namespace App\Services\RestaurantGroups {
    // This boundary avoids manufacturing a real admin session on the VPS.
    final class Auth {
        public function __construct(private Store $store,public object $value) {}
        public function owner(bool $mfa=true): object {
            $this->store->access((int)$this->value->id,$this->store->currentTenantId());
            return clone $this->value;
        }
    }
}
namespace {
    use Illuminate\Container\Container;
    use Illuminate\Database\Capsule\Manager as Capsule;
    use Illuminate\Support\Facades\Facade;
    use App\Services\RestaurantGroups\{Store,Schema,Publisher,PublicationData,Snapshot,ReportingProfile,Auth};

    if(PHP_SAPI!=='cli') { http_response_code(404); exit; }
    if(!in_array('--allow-create-test-databases',$argv,true)) {
        fwrite(STDERR,"Usage: php mysql-r3.php /var/www/paymydine --allow-create-test-databases\nCreates and drops four uniquely named test databases only. No application installation.\n");exit(2);
    }
    $root=realpath($argv[1]??'');$bundle=dirname(__DIR__,2);$created=[];$admin=null;$capsule=null;$tests=0;$failures=0;
    function checkR3(string $name,callable $fn): void {
        global $tests,$failures;$tests++;
        try{$fn();echo 'PASS '.$name.PHP_EOL;}catch(\Throwable $e){$failures++;echo 'FAIL '.$name.' ['.get_class($e).']'.PHP_EOL;}
    }
    function sameR3($a,$b): void {if($a!==$b)throw new \RuntimeException('Assertion mismatch');}
    function refuseR3(callable $fn): void {try{$fn();}catch(\Throwable $e){return;}throw new \RuntimeException('Expected rejection');}
    try {
        if(!$root||!is_file($root.'/vendor/autoload.php')||!is_file($root.'/.env'))throw new \RuntimeException('Application root, vendor dependencies and .env are required.');
        if(!extension_loaded('pdo_mysql'))throw new \RuntimeException('pdo_mysql is required.');
        $loader=require $root.'/vendor/autoload.php';
        $classMap=[];
        foreach(glob($bundle.'/app/Services/RestaurantGroups/*.php') as $file) {
            $class='App\\Services\\RestaurantGroups\\'.basename($file,'.php');
            if($class===Auth::class) continue; // Auth is the deliberate fixture above.
            if(class_exists($class,false)) throw new \RuntimeException('A group class was already loaded outside the pinned test bundle.');
            $classMap[$class]=$file;
        }
        // Optimized Composer class maps take precedence over PSR-4 prefixes.
        // Override those entries so the test cannot silently execute VPS code.
        $loader->addClassMap($classMap);
        $loader->addPsr4('App\\Services\\RestaurantGroups\\',$bundle.'/app/Services/RestaurantGroups/',true);
        \Dotenv\Dotenv::createImmutable($root)->safeLoad();
        $env=static fn(string $key,$fallback=null)=>$_ENV[$key]??$_SERVER[$key]??$fallback;
        $host=(string)$env('DB_HOST','127.0.0.1');$port=(int)$env('DB_PORT',3306);
        $user=(string)$env('DB_USERNAME','');$password=(string)$env('DB_PASSWORD','');
        if($user==='')throw new \RuntimeException('DB_USERNAME is not configured.');
        $socket=(string)$env('DB_SOCKET','');
        $dsn=$socket!==''?'mysql:unix_socket='.$socket.';charset=utf8mb4':'mysql:host='.$host.';port='.$port.';charset=utf8mb4';
        $admin=new \PDO($dsn,$user,$password,[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION]);
        $prefix='pmd_rgtest_'.bin2hex(random_bytes(6));$names=[];
        for($i=0;$i<4;$i++) {
            $name=$prefix.'_'.$i;
            if(!preg_match('/^pmd_rgtest_[a-f0-9]{12}_[0-3]$/D',$name))throw new \RuntimeException('Invalid generated test database name.');
            // No IF NOT EXISTS: a collision must fail, never adopt an existing DB.
            $admin->exec('CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            $created[]=$name;$names[$i]=$name;
        }
        echo 'Created fresh test databases: '.implode(', ',$names).PHP_EOL;
        $container=new Container();Container::setInstance($container);Facade::setFacadeApplication($container);Facade::clearResolvedInstances();
        $base=['driver'=>'mysql','host'=>$host,'port'=>$port,'username'=>$user,'password'=>$password,'unix_socket'=>$socket,
            'charset'=>'utf8mb4','collation'=>'utf8mb4_unicode_ci','prefix'=>'ti_','strict'=>true];
        $centralConfig=$base+['database'=>$names[0]];
        $config=new \Illuminate\Config\Repository(['database'=>['default'=>'mysql','connections'=>[
            'mysql'=>$centralConfig,'pmd_groups_central'=>$centralConfig]],
            'pmd_groups'=>['enabled'=>true,'tenant_template'=>$base,'max_publish_targets'=>20,'reporting_storage_timezone'=>'UTC']]);
        $container->instance('config',$config);
        $container->instance('log',new \Psr\Log\NullLogger());
        $container->instance('cache',new \Illuminate\Cache\Repository(new \Illuminate\Cache\ArrayStore()));
        $request=\Illuminate\Http\Request::create('https://rgtest1.paymydine.com/admin/group/context');$container->instance('request',$request);
        $capsule=new Capsule($container);$capsule->addConnection($centralConfig,'mysql');$capsule->addConnection($centralConfig,'pmd_groups_central');$capsule->setAsGlobal();
        $container->instance('db',$capsule->getDatabaseManager());
        $store=new Store();$schema=new Schema();$central=$store->central();$sb=$central->getSchemaBuilder();
        $sb->create('tenants',function($t){$t->engine='InnoDB';$t->bigIncrements('id');$t->string('domain');$t->string('database');$t->string('status');$t->string('country');$t->date('start')->nullable();$t->date('end')->nullable();});
        $schema->installCentral($store);$schema->installCentral($store);
        $ownerId=$central->table('pmd_group_owners')->insertGetId(['uuid'=>'11111111-1111-4111-8111-111111111111','username'=>'rgtest-owner','email'=>'test@example.invalid','name'=>'Test owner','password'=>'not-a-live-account','status'=>'active','auth_version'=>1]);
        $groupId=$central->table('pmd_groups')->insertGetId(['uuid'=>'22222222-2222-4222-8222-222222222222','name'=>'Integration fixture','type'=>'multi_location','status'=>'active','owner_id'=>$ownerId]);
        $dbs=[];
        for($i=1;$i<4;$i++) {
            $central->table('tenants')->insert(['id'=>$i,'domain'=>'rgtest'.$i.'.paymydine.com','database'=>$names[$i],'status'=>'active','country'=>'Germany']);
            $central->table('pmd_group_sites')->insert(['group_id'=>$groupId,'tenant_id'=>$i,'location_id'=>1,'label'=>'Test '.$i,'slug'=>'rgtest'.$i,'database_name'=>$names[$i],'state'=>'ready']);
            $central->table('pmd_group_access')->insert(['owner_id'=>$ownerId,'tenant_id'=>$i,'user_id'=>10,'can_publish'=>1]);
            $db=$store->connection($i);$dbs[$i]=$db;$b=$db->getSchemaBuilder();$schema->installTenant($db);
            $b->create('users',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('user_id')->primary();$t->unsignedBigInteger('staff_id');$t->boolean('super_user');});
            $b->create('staffs',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('staff_id')->primary();$t->boolean('staff_status');});
            $b->create('locations',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('location_id')->primary();$t->boolean('location_status');$t->string('location_timezone');});
            $b->create('locationables',function($t){$t->engine='InnoDB';$t->unsignedBigInteger('location_id');$t->unsignedBigInteger('locationable_id');$t->string('locationable_type');$t->text('options');});
            $b->create('settings',function($t){$t->engine='InnoDB';$t->string('item');$t->string('sort');$t->text('value')->nullable();$t->unique(['item','sort']);});
            $b->create('currencies',function($t){$t->engine='InnoDB';$t->bigIncrements('currency_id');$t->string('currency_code');$t->integer('decimal_position');});
            $b->create('igniter_coupons',function($t){$t->engine='InnoDB';$t->bigIncrements('coupon_id');$t->string('name',191);$t->string('code')->unique();$t->string('type');$t->decimal('discount',12,2);$t->decimal('min_total',12,2);$t->boolean('status');$t->string('card_type');$t->timestamps();});
            $b->create('orders',function($t){$t->engine='InnoDB';$t->bigIncrements('order_id');$t->unsignedBigInteger('location_id');$t->dateTime('settled_at');$t->decimal('settled_amount',15,4);$t->string('settlement_status');$t->boolean('processed');});
            $b->create('order_totals',function($t){$t->engine='InnoDB';$t->bigIncrements('id');$t->unsignedBigInteger('order_id');$t->string('code');$t->decimal('value',15,4);});
            $db->table('users')->insert(['user_id'=>10,'staff_id'=>20,'super_user'=>1]);$db->table('staffs')->insert(['staff_id'=>20,'staff_status'=>1]);
            $db->table('locations')->insert(['location_id'=>1,'location_status'=>1,'location_timezone'=>'Europe/Berlin']);
            $db->table('locationables')->insert(['location_id'=>1,'locationable_id'=>20,'locationable_type'=>'staffs','options'=>serialize([])]);
            $db->table('pmd_group_identity')->insert(['user_id'=>10,'owner_uuid'=>'11111111-1111-4111-8111-111111111111','linked_at'=>now()]);
            $db->table('settings')->insert([['item'=>'default_currency_code','sort'=>'config','value'=>'EUR'],['item'=>'pmd_v2_social_enabled','sort'=>'config','value'=>'0']]);
            $db->table('currencies')->insert(['currency_code'=>'EUR','decimal_position'=>2]);
        }
        $request->attributes->set('tenant',$central->table('tenants')->where('id',1)->first());
        $auth=new Auth($store,(object)['id'=>$ownerId,'auth_version'=>1,'name'=>'Test owner','username'=>'rgtest-owner']);
        $container->instance(Store::class,$store);$container->instance(Auth::class,$auth);
        $container->instance(PublicationData::class,new PublicationData($store));$container->instance(ReportingProfile::class,new ReportingProfile());
        $publisher=new Publisher($store,$auth,$schema);
        function couponR3($db,$code): int {return (int)$db->table('igniter_coupons')->insertGetId(['name'=>'Lunch','code'=>$code,'type'=>'P','discount'=>'10.00','min_total'=>'0.00','status'=>1,'card_type'=>'coupon']);}
        checkR3('real central schema installation is idempotent',fn()=>sameR3($store->installed(),true));
        checkR3('actual Store validates all three tenant owner mappings',function()use($store,$ownerId){for($i=1;$i<4;$i++)sameR3((int)$store->access($ownerId,$i,true)->user_id,10);});
        checkR3('MySQL selected publication and idempotent replay',function()use($publisher,$dbs){$id=couponR3($dbs[1],'SELECTED');$p=$publisher->preview('coupon',(string)$id,[2]);sameR3($dbs[2]->table('igniter_coupons')->where('code','SELECTED')->count(),0);sameR3($publisher->apply($p['operation'])['complete'],true);sameR3($publisher->apply($p['operation'])['results'][0]['state'],'already_applied');sameR3($dbs[2]->table('igniter_coupons')->where('code','SELECTED')->count(),1);sameR3($dbs[3]->table('igniter_coupons')->where('code','SELECTED')->count(),0);});
        checkR3('MySQL foreign coupon code collision is not overwritten',function()use($publisher,$dbs){$id=couponR3($dbs[1],'COLLISION');couponR3($dbs[2],'COLLISION');refuseR3(fn()=>$publisher->preview('coupon',(string)$id,[2]));sameR3($dbs[2]->table('igniter_coupons')->where('code','COLLISION')->value('discount'),'10.00');});
        checkR3('MySQL target drift stops an update',function()use($publisher,$dbs){$id=couponR3($dbs[1],'DRIFT');$p=$publisher->preview('coupon',(string)$id,[2]);$publisher->apply($p['operation']);$p=$publisher->preview('coupon',(string)$id,[2]);$dbs[2]->table('igniter_coupons')->where('code','DRIFT')->update(['discount'=>'77.00']);sameR3($publisher->apply($p['operation'])['complete'],false);sameR3($dbs[2]->table('igniter_coupons')->where('code','DRIFT')->value('discount'),'77.00');});
        checkR3('MySQL partial failure rolls back receipt and retry resumes',function()use($publisher,$dbs){$id=couponR3($dbs[1],'PARTIAL');$p=$publisher->preview('coupon',(string)$id,[2,3]);$dbs[3]->statement('ALTER TABLE `ti_igniter_coupons` MODIFY `name` VARCHAR(3) NOT NULL');sameR3($publisher->apply($p['operation'])['complete'],false);sameR3($dbs[3]->table('pmd_group_receipts')->where('operation_uuid',$p['operation'])->count(),0);$dbs[3]->statement('ALTER TABLE `ti_igniter_coupons` MODIFY `name` VARCHAR(191) NOT NULL');sameR3($publisher->apply($p['operation'])['complete'],true);sameR3($dbs[2]->table('igniter_coupons')->where('code','PARTIAL')->count(),1);});
        checkR3('MySQL source revocation after preview stops publication',function()use($publisher,$dbs,$central,$ownerId){$id=couponR3($dbs[1],'REVOKED');$p=$publisher->preview('coupon',(string)$id,[2]);$central->table('pmd_group_access')->where('owner_id',$ownerId)->where('tenant_id',1)->update(['revoked_at'=>now()]);refuseR3(fn()=>$publisher->apply($p['operation']));$central->table('pmd_group_access')->where('owner_id',$ownerId)->where('tenant_id',1)->update(['revoked_at'=>null]);sameR3($dbs[2]->table('igniter_coupons')->where('code','REVOKED')->count(),0);});
        checkR3('MySQL settings config/prefs namespaces stay separate',function()use($publisher,$dbs){$dbs[1]->table('settings')->where('item','pmd_v2_social_enabled')->update(['value'=>'1']);$dbs[2]->table('settings')->insert(['item'=>'pmd_v2_social_enabled','sort'=>'prefs','value'=>'private']);$p=$publisher->preview('setting','pmd_v2_social_enabled',[2]);sameR3($publisher->apply($p['operation'])['complete'],true);sameR3($dbs[2]->table('settings')->where('sort','prefs')->value('value'),'private');});
        checkR3('MySQL real reporting query filters unpaid orders and aggregates exactly',function()use($dbs,$store,$auth){for($i=1;$i<4;$i++){$order=$dbs[$i]->table('orders')->insertGetId(['location_id'=>1,'settled_at'=>gmdate('Y-m-d H:i:s',time()-1),'settled_amount'=>'0.10','settlement_status'=>'paid','processed'=>1]);$dbs[$i]->table('orders')->insert(['location_id'=>1,'settled_at'=>gmdate('Y-m-d H:i:s',time()-1),'settled_amount'=>'999.00','settlement_status'=>'unpaid','processed'=>0]);$dbs[$i]->table('order_totals')->insert(['order_id'=>$order,'code'=>'tip','value'=>'0.01']);}$r=(new Snapshot($store,$auth))->snapshot('all','last30');sameR3($r['partial'],false);sameR3($r['totals'][0]['revenue'],'0.30');sameR3($r['totals'][0]['tips'],'0.03');sameR3($r['totals'][0]['orders'],3);});
        echo "$tests MySQL/Illuminate tests, $failures failed. Authentication was a fixture; this is not full UI/provisioning acceptance.\n";
    } catch(\Throwable $e) {
        $failures++;$reason=$e->getMessage();
        foreach(array_filter([$password??'', $user??'', $host??''],static fn($v)=>$v!=='') as $sensitive) $reason=str_replace($sensitive,'[redacted]',$reason);
        fwrite(STDERR,'HARNESS ERROR ['.get_class($e).']: '.$reason.'. No production schema was selected.'.PHP_EOL);
        // No raw exception trace or unredacted driver credentials are printed.
    } finally {
        if($capsule)foreach(array_keys($capsule->getDatabaseManager()->getConnections()) as $connectionName) {
            try { $capsule->getDatabaseManager()->disconnect($connectionName); }
            catch(\Throwable $e) { $failures++;fwrite(STDERR,'A test connection could not close; continuing generated-database cleanup.'.PHP_EOL); }
        }
        foreach(array_reverse($created) as $name) {
            try { $admin->exec('DROP DATABASE `'.$name.'`');echo 'Removed test database: '.$name.PHP_EOL; }
            catch(\Throwable $e) { $failures++;fwrite(STDERR,'Cleanup failed for test database '.$name.'. Ask the database administrator to remove only this generated database.'.PHP_EOL); }
        }
    }
    exit($failures?1:0);
}
