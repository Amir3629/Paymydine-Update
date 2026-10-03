<?php

namespace App\Services\TerminalPayments;

use Admin\Models\Terminal_devices_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class TerminalPaymentService
{
    public function createAttempt(int $orderId, string $providerCode, ?string $terminalId = null): array
    {
        if (!Schema::hasTable('payment_attempts')) return ['success'=>false,'error'=>'payment_attempts table is missing. Run migrations first.'];
        $order=DB::table('orders')->where('order_id',$orderId)->first();
        if(!$order) return ['success'=>false,'error'=>'Order not found.'];
        $providerCode=strtolower(trim($providerCode));
        // PMD_SQUARE_TERMINAL_CANADA_R10_MARKET_GUARD
        $allowedProviderCodes=array_keys(Terminal_devices_model::listProviderOptions());
        if(!in_array($providerCode,$allowedProviderCodes,true))return ['success'=>false,'error'=>'This terminal provider is not enabled for the active restaurant market.'];
        $provider=$this->provider($providerCode);$config=$this->providerConfig($providerCode);
        if($providerCode==='sumup'){
            $terminal=$this->resolveSumupTerminal($terminalId);
            if(!$terminal) return ['success'=>false,'error'=>'No active SumUp terminal is configured.'];
            $config['reader_id']=(string)$terminal->reader_id;$config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $config['affiliate_key']=trim((string)($terminal->affiliate_key??''))?:($config['affiliate_key']??null);$config['return_url']=$this->sumupReturnUrl();$terminalId=(string)$terminal->reader_id;
        }
        // PMD_VR_TERMINAL_ROUTING_R1
        if($providerCode==='vr_payment'){
            $terminal=$this->resolveVrPaymentTerminal($terminalId);
            if(!$terminal) return ['success'=>false,'error'=>'No active VR Payment terminal is synced. Test the VR Payment connection first.'];
            $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
            if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
            if($providerTerminalId==='')return ['success'=>false,'error'=>'Selected VR Payment terminal has no provider terminal ID. Re-test the provider connection.'];
            $config['terminal_id']=$providerTerminalId;
            $config['provider_terminal_id']=$providerTerminalId;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $terminalId=(string)$terminal->reader_id;
        }
        if($providerCode==='worldline'){
            if(!Schema::hasTable('terminal_devices'))return ['success'=>false,'error'=>'No Worldline terminal devices table is available.'];
            $requested=trim((string)$terminalId);
            $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['worldline'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
            if($requested!=='')$query->where(function($q)use($requested){if(ctype_digit($requested))$q->orWhere('terminal_device_id',(int)$requested);$q->orWhere('reader_id',$requested);});
            $terminal=$query->orderBy('terminal_device_id')->first();
            if(!$terminal)return ['success'=>false,'error'=>'No active Worldline Terminal API device is configured. Add and activate it under Settings > Devices.'];
            $config['terminal_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            if(Schema::hasColumn('terminal_devices','environment'))$config['terminal_environment']=strtolower(trim((string)($terminal->environment??($config['terminal_environment']??'test'))));
            $terminalId=(string)$terminal->reader_id;
        }
        if($providerCode==='square'){
            $terminal=$this->resolveSquareTerminal($terminalId);
            if(!$terminal)return ['success'=>false,'error'=>'No active Square Terminal API device is configured. Add it under Settings > Devices.'];
            $config['device_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $terminalId=(string)$terminal->reader_id;
        }
        $validation=$provider->validateConfiguration($config);if(!($validation['ok']??false)) return ['success'=>false,'error'=>$validation['message']??'Provider is not configured.'];
        $amount=(float)($order->order_total??$order->total??0);if($amount<=0)return ['success'=>false,'error'=>'Order total must be greater than zero.'];
        $currency=(string)($config['currency']??'EUR');
        $requestPayload=['order_id'=>$orderId,'amount'=>$amount,'currency'=>$currency,'provider_code'=>$providerCode,'terminal_device_id'=>$config['terminal_device_id']??null,'reader_id'=>$config['reader_id']??$terminalId,'environment'=>$config['environment']??null];
        $id=DB::table('payment_attempts')->insertGetId($this->filterColumns('payment_attempts',['order_id'=>$orderId,'provider_code'=>$providerCode,'terminal_id'=>$terminalId?:($config['terminal_id']??null),'terminal_device_id'=>$config['terminal_device_id']??null,'amount'=>$amount,'currency'=>$currency,'status'=>'pending','request_payload'=>json_encode($requestPayload),'created_at'=>now(),'updated_at'=>now()]));
        Log::info('PMD_TERMINAL_PAYMENT_CREATE',['attempt_id'=>$id,'order_id'=>$orderId,'provider_code'=>$providerCode,'amount'=>$amount,'currency'=>$currency]);
        if($providerCode==='sumup')$config['return_url']=$this->sumupReturnUrl($id);
        $attempt=(array)DB::table('payment_attempts')->where('id',$id)->first();$result=$provider->createPayment($attempt,$config);$status=($result['ok']??false)?($result['status']??'sent_to_terminal'):'failed';
        DB::table('payment_attempts')->where('id',$id)->update($this->filterColumns('payment_attempts',['status'=>$status,'provider_reference'=>$result['provider_reference']??null,'response_payload'=>json_encode($this->redact($result)),'error_message'=>($result['ok']??false)?null:($result['message']??'Terminal payment failed.'),'updated_at'=>now()]));
        Log::info(($result['ok']??false)?'PMD_TERMINAL_PAYMENT_SENT':'PMD_TERMINAL_PAYMENT_FAILED',['attempt_id'=>$id,'provider_code'=>$providerCode,'status'=>$status]);
        // PMD_TERMINAL_IMMEDIATE_SETTLEMENT_R1
        if($status==='paid')$this->settleSuccessfulAttempt($id,$result);
        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$id,'status'=>$status,'message'=>$result['message']??null];
    }

    public function refreshAttempt(int $attemptId): array
    {
        if(!Schema::hasTable('payment_attempts'))return ['success'=>false,'error'=>'payment_attempts table is missing.'];
        $attempt=(array)(DB::table('payment_attempts')->where('id',$attemptId)->first()?:[]);if(!$attempt)return ['success'=>false,'error'=>'Payment attempt not found.'];
        if(($attempt['status']??'')==='paid'){ $this->settleSuccessfulAttempt($attemptId,[]); return ['success'=>true,'attempt_id'=>$attemptId,'status'=>'paid','message'=>'Payment already confirmed.']; }
        $providerCode=strtolower((string)($attempt['provider_code']??''));$provider=$this->provider($providerCode);$config=$this->providerConfig($providerCode);
        if($providerCode==='sumup'){$terminal=$this->resolveSumupTerminal((string)($attempt['terminal_id']??''));if(!$terminal)return ['success'=>false,'error'=>'SumUp terminal for this attempt was not found.'];$config['reader_id']=(string)$terminal->reader_id;$config['terminal_device_id']=(int)$terminal->terminal_device_id;$config['affiliate_key']=trim((string)($terminal->affiliate_key??''))?:($config['affiliate_key']??null);}
        if($providerCode==='vr_payment'){
            $terminal=$this->resolveVrPaymentTerminal((string)($attempt['terminal_id']??''));
            if(!$terminal)return ['success'=>false,'error'=>'VR Payment terminal for this attempt was not found.'];
            $providerTerminalId=Schema::hasColumn('terminal_devices','provider_terminal_id')?(string)($terminal->provider_terminal_id??''):'';
            if($providerTerminalId===''&&ctype_digit((string)($terminal->reader_id??'')))$providerTerminalId=(string)$terminal->reader_id;
            $config['terminal_id']=$providerTerminalId;
            $config['provider_terminal_id']=$providerTerminalId;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            $config['reader_id']=(string)$terminal->reader_id;
        }
        if($providerCode==='worldline'){
            if(!Schema::hasTable('terminal_devices'))return ['success'=>false,'error'=>'Worldline terminal devices table is unavailable.'];
            $requested=trim((string)($attempt['terminal_id']??''));
            $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['worldline'])->whereNotNull('reader_id')->where('reader_id','!=','');
            if($requested!=='')$query->where(function($q)use($requested){if(ctype_digit($requested))$q->orWhere('terminal_device_id',(int)$requested);$q->orWhere('reader_id',$requested);});
            $terminal=$query->orderBy('terminal_device_id')->first();
            if(!$terminal)return ['success'=>false,'error'=>'Worldline terminal for this attempt was not found.'];
            $config['terminal_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
            if(Schema::hasColumn('terminal_devices','environment'))$config['terminal_environment']=strtolower(trim((string)($terminal->environment??($config['terminal_environment']??'test'))));
        }
        if($providerCode==='square'){
            $terminal=$this->resolveSquareTerminal((string)($attempt['terminal_id']??''));
            if(!$terminal)return ['success'=>false,'error'=>'Square terminal for this attempt was not found.'];
            $config['device_id']=(string)$terminal->reader_id;
            $config['reader_id']=(string)$terminal->reader_id;
            $config['terminal_device_id']=(int)$terminal->terminal_device_id;
        }
        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));
        DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',['status'=>$status,'response_payload'=>json_encode($this->redact($result)),'error_message'=>($result['ok']??false)?null:($result['message']??null),'updated_at'=>now()]));
        if($status==='paid')$this->settleSuccessfulAttempt($attemptId,$result);
        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$attemptId,'status'=>$status,'message'=>$result['message']??null];
    }

    public function handleSumupCallback(int $attemptId,array $payload=[]):array
    {
        Log::info('PMD_SUMUP_TERMINAL_CALLBACK',['attempt_id'=>$attemptId,'payload'=>$this->redact($payload)]);
        return $this->refreshAttempt($attemptId);
    }

    public function provider(string $code):TerminalPaymentProviderInterface
    {
        return match(strtolower($code)){'sumup'=>new SumupTerminalProvider(),'worldline'=>new WorldlineTerminalProvider(),'square'=>new SquareTerminalProvider(),'vr_payment'=>new VrPaymentTerminalProvider(),default=>new NullTerminalProvider($code)};
    }

    public function providerConfig(string $code):array
    {
        $code=strtolower(trim($code));$config=[];
        if($code==='sumup'&&Schema::hasTable('terminal_provider_configs')){
            try{$tenantConfig=app(SumupTenantConnectionService::class)->activeConfig();if(!empty($tenantConfig['ready']))$config=$tenantConfig;}catch(\Throwable $e){Log::warning('PMD_SUMUP_TENANT_CONFIG_FAILED',['message'=>$e->getMessage()]);}
        }
        if(!$config&&(Schema::hasTable('payment_methods')||Schema::hasTable('payments'))){
            try{$model=\Admin\Models\Payments_model::query()->where('code',$code)->where('status',1)->first();if($model&&method_exists($model,'getConfigData'))$config=(array)$model->getConfigData();}catch(\Throwable $e){Log::warning('PMD_TERMINAL_PROVIDER_CONFIG_PRIMARY_FAILED',['provider_code'=>$code,'message'=>$e->getMessage()]);}
        }
        if($code==='sumup'&&(empty($config['access_token'])||empty($config['id_application']))){$legacy=$this->legacySumupConfig();$config=array_merge($legacy,array_filter($config,static fn($value)=>$value!==null&&$value!==''));}
        if($code==='sumup'){$config['url']=rtrim((string)($config['url']??'https://api.sumup.com'),'/');$config['merchant_code']=(string)($config['merchant_code']??$config['id_application']??'');$config['id_application']=(string)($config['id_application']??$config['merchant_code']??'');$config['affiliate_app_id']=(string)($config['affiliate_app_id']??SumupTenantConnectionService::APP_ID);$config['currency']=strtoupper((string)($config['currency']??'EUR'));}
        if($code==='square'){
            $mode=strtolower(trim((string)($config['transaction_mode']??'test')))==='live'?'live':'test';
            $prefix=$mode==='live'?'live_':'test_';
            $config['transaction_mode']=$mode;
            $config['mode']=$mode;
            $config['access_token']=trim((string)($config[$prefix.'access_token']??''));
            $config['location_id']=trim((string)($config[$prefix.'location_id']??''));
            try{$platform=app(\App\Services\Platform\LocationPlatformContext::class);$config['pmd_country_code']=strtoupper((string)($platform->countryCode()??''));$config['currency']=strtoupper((string)($platform->currencyCode()??($config['currency']??'')));}catch(\Throwable $ignored){$config['currency']=strtoupper((string)($config['currency']??''));}
        }
        return $config;
    }

    private function legacySumupConfig():array
    {
        if(!Schema::hasTable('pos_configs')||!Schema::hasTable('pos_devices'))return [];
        try{
            $deviceId=DB::table('pos_devices')->whereRaw('LOWER(code) = ?',['sumup'])->orderByDesc('device_id')->value('device_id');if(!$deviceId)return [];
            $row=DB::table('pos_configs')->where('device_id',(int)$deviceId)->orderByDesc('config_id')->first();if(!$row)return [];
            return ['url'=>rtrim((string)($row->url??'https://api.sumup.com'),'/'),'access_token'=>(string)($row->access_token??''),'id_application'=>(string)($row->id_application??''),'merchant_code'=>(string)($row->id_application??''),'affiliate_key'=>(string)($row->sumup_affiliate_key??''),'affiliate_app_id'=>SumupTenantConnectionService::APP_ID,'legacy_config_id'=>(int)($row->config_id??0),'currency'=>'EUR'];
        }catch(\Throwable $e){Log::warning('PMD_SUMUP_LEGACY_CONFIG_FAILED',['message'=>$e->getMessage()]);return [];}
    }

    private function resolveSumupTerminal(?string $terminalId=null)
    {
        if(!Schema::hasTable('terminal_devices'))return null;$query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['sumup'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');$terminalId=trim((string)$terminalId);
        if($terminalId!=='')$query->where(function($q)use($terminalId){if(ctype_digit($terminalId))$q->orWhere('terminal_device_id',(int)$terminalId);$q->orWhere('reader_id',$terminalId);});return $query->orderBy('terminal_device_id')->first();
    }

    private function resolveVrPaymentTerminal(?string $terminalId=null)
    {
        if(!Schema::hasTable('terminal_devices'))return null;
        $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['vr_payment'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
        $terminalId=trim((string)$terminalId);
        if($terminalId!=='')$query->where(function($q)use($terminalId){
            if(ctype_digit($terminalId)){
                $q->orWhere('terminal_device_id',(int)$terminalId);
                if(Schema::hasColumn('terminal_devices','provider_terminal_id'))$q->orWhere('provider_terminal_id',(int)$terminalId);
            }
            $q->orWhere('reader_id',$terminalId);
        });
        return $query->orderBy('terminal_device_id')->first();
    }

    private function resolveSquareTerminal(?string $terminalId=null)
    {
        if(!Schema::hasTable('terminal_devices'))return null;
        $query=DB::table('terminal_devices')->whereRaw('LOWER(provider_code) = ?',['square'])->where('is_active',1)->whereNotNull('reader_id')->where('reader_id','!=','');
        $terminalId=trim((string)$terminalId);
        if($terminalId!=='')$query->where(function($q)use($terminalId){if(ctype_digit($terminalId))$q->orWhere('terminal_device_id',(int)$terminalId);$q->orWhere('reader_id',$terminalId);});
        return $query->orderBy('terminal_device_id')->first();
    }

    private function sumupReturnUrl(?int $attemptId=null):string
    {
        $base=request()->getSchemeAndHttpHost();$adminUri=trim((string)config('system.adminUri','admin'),'/');$path='/'.$adminUri.'/terminal-payments/sumup/callback';if($attemptId)$path.='/'.$attemptId;return rtrim($base,'/').$path;
    }

    private function settleSuccessfulAttempt(int $attemptId,array $providerResult):void
    {
        DB::transaction(function()use($attemptId,$providerResult){
            $attempt=DB::table('payment_attempts')->where('id',$attemptId)->lockForUpdate()->first();if(!$attempt)throw new \RuntimeException('Payment attempt not found during settlement.');$order=DB::table('orders')->where('order_id',(int)$attempt->order_id)->lockForUpdate()->first();if(!$order)throw new \RuntimeException('Order not found during terminal settlement.');
            $orderTotal=round((float)($order->order_total??$attempt->amount??0),4);$alreadySettled=round((float)($order->settled_amount??0),4);$settlementStatus=strtolower((string)($order->settlement_status??''));
            if($settlementStatus==='paid'||($orderTotal>0&&$alreadySettled>=$orderTotal-.0001)){DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',['status'=>'paid','updated_at'=>now()]));return;}
            if($alreadySettled>.0001){DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',['status'=>'reconciliation_required','error_message'=>'The terminal provider approved the charge after another partial payment was recorded. Manual reconciliation required.','updated_at'=>now()]));Log::error('PMD_TERMINAL_RECONCILIATION_REQUIRED',['attempt_id'=>$attemptId,'order_id'=>(int)$attempt->order_id]);return;}
            $reference=(string)($attempt->provider_reference??'');$transactionId=null;
            if(Schema::hasTable('order_payment_transactions')){$idempotencyKey='terminal-attempt-'.$attemptId;if(Schema::hasColumn('order_payment_transactions','idempotency_key')){$existing=DB::table('order_payment_transactions')->where('idempotency_key',$idempotencyKey)->first();if($existing)$transactionId=(int)$existing->id;}if(!$transactionId){$transactionId=(int)DB::table('order_payment_transactions')->insertGetId($this->filterColumns('order_payment_transactions',['order_id'=>(int)$attempt->order_id,'payment_method'=>'direct_terminal','payment_reference'=>$reference?:null,'amount'=>(float)$attempt->amount,'settlement_status'=>'paid','provider_code'=>(string)$attempt->provider_code,'paid_at'=>now(),'idempotency_key'=>$idempotencyKey,'notes'=>'Confirmed by terminal provider.','created_at'=>now(),'updated_at'=>now()]));}$this->allocateAllOrderItems($transactionId,(int)$attempt->order_id);}
            $orderUpdate=$this->filterColumns('orders',['settled_amount'=>$orderTotal,'settlement_status'=>'paid','settlement_method'=>'direct_terminal','settlement_reference'=>$reference?:null,'settled_at'=>now(),'processed'=>1,'updated_at'=>now()]);if($orderUpdate)DB::table('orders')->where('order_id',(int)$attempt->order_id)->update($orderUpdate);
            DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',['status'=>'paid','response_payload'=>json_encode($this->redact($providerResult)),'error_message'=>null,'updated_at'=>now()]));Log::info('PMD_TERMINAL_PAYMENT_SETTLED',['attempt_id'=>$attemptId,'order_id'=>(int)$attempt->order_id,'provider_code'=>(string)$attempt->provider_code,'transaction_id'=>$transactionId,'amount'=>(float)$attempt->amount]);
        });
    }

    private function allocateAllOrderItems(int $transactionId,int $orderId):void
    {
        if(!Schema::hasTable('order_menus')||!Schema::hasTable('order_payment_transaction_items'))return;if(DB::table('order_payment_transaction_items')->where('transaction_id',$transactionId)->exists())return;$columns=Schema::getColumnListing('order_payment_transaction_items');$allocationColumn=in_array('order_menu_id',$columns,true)?'order_menu_id':(in_array('order_item_id',$columns,true)?'order_item_id':null);if(!$allocationColumn)return;$rows=[];
        foreach(DB::table('order_menus')->where('order_id',$orderId)->get() as $item){$quantity=max(0,(float)($item->quantity??0));$subtotal=(float)($item->subtotal??0);$unitPrice=$quantity>0?round($subtotal/$quantity,4):(float)($item->price??0);$orderMenuId=(int)($item->order_menu_id??0);if($orderMenuId<=0||$quantity<=0)continue;$rows[]=$this->filterColumns('order_payment_transaction_items',['transaction_id'=>$transactionId,$allocationColumn=>$orderMenuId,'order_menu_id'=>$orderMenuId,'menu_id'=>(int)($item->menu_id??0),'quantity_paid'=>$quantity,'unit_price'=>$unitPrice,'line_total'=>$subtotal,'created_at'=>now(),'updated_at'=>now()]);}
        if($rows)DB::table('order_payment_transaction_items')->insert($rows);
    }

    private function filterColumns(string $table,array $data):array{if(!Schema::hasTable($table))return $data;return array_intersect_key($data,array_flip(Schema::getColumnListing($table)));}
    private function redact(array $payload):array{foreach($payload as $key=>$value){if(preg_match('/secret|token|key|password|certificate/i',(string)$key))$payload[$key]='[redacted]';elseif(is_array($value))$payload[$key]=$this->redact($value);}return $payload;}
}
