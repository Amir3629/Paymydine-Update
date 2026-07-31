<?php return array (
  'app' => 
  array (
    'name' => 'PaymyDine',
    'env' => 'production',
    'debug' => false,
    'url' => 'https://paymydine.com',
    'asset_url' => NULL,
    'timezone' => 'UTC',
    'locale' => 'en',
    'fallback_locale' => 'en',
    'faker_locale' => 'en_US',
    'key' => 'base64:RqLWiJfdCDRVMsaMjqUl+qow08hiMpCk1ZAXfEbmps0=',
    'cipher' => 'AES-256-CBC',
    'providers' => 
    array (
      0 => 'Illuminate\\Broadcasting\\BroadcastServiceProvider',
      1 => 'Illuminate\\Bus\\BusServiceProvider',
      2 => 'Illuminate\\Cache\\CacheServiceProvider',
      3 => 'Illuminate\\Cookie\\CookieServiceProvider',
      4 => 'Illuminate\\Encryption\\EncryptionServiceProvider',
      5 => 'Illuminate\\Foundation\\Providers\\FoundationServiceProvider',
      6 => 'Illuminate\\Hashing\\HashServiceProvider',
      7 => 'Illuminate\\Pagination\\PaginationServiceProvider',
      8 => 'Illuminate\\Pipeline\\PipelineServiceProvider',
      9 => 'Illuminate\\Queue\\QueueServiceProvider',
      10 => 'Illuminate\\Redis\\RedisServiceProvider',
      11 => 'Illuminate\\Session\\SessionServiceProvider',
      12 => 'Illuminate\\View\\ViewServiceProvider',
      13 => 'Laravel\\Tinker\\TinkerServiceProvider',
      14 => 'Igniter\\Flame\\Foundation\\Providers\\ConsoleSupportServiceProvider',
      15 => 'Igniter\\Flame\\Database\\DatabaseServiceProvider',
      16 => 'Igniter\\Flame\\Filesystem\\FilesystemServiceProvider',
      17 => 'Igniter\\Flame\\Flash\\FlashServiceProvider',
      18 => 'Igniter\\Flame\\Html\\HtmlServiceProvider',
      19 => 'Igniter\\Flame\\Mail\\MailServiceProvider',
      20 => 'Igniter\\Flame\\Scaffold\\ScaffoldServiceProvider',
      21 => 'Igniter\\Flame\\Setting\\SettingServiceProvider',
      22 => 'Igniter\\Flame\\Html\\UrlServiceProvider',
      23 => 'Igniter\\Flame\\Validation\\ValidationServiceProvider',
      24 => 'System\\ServiceProvider',
    ),
    'aliases' => 
    array (
      'App' => 'Illuminate\\Support\\Facades\\App',
      'Artisan' => 'Illuminate\\Support\\Facades\\Artisan',
      'Broadcast' => 'Illuminate\\Support\\Facades\\Broadcast',
      'Bus' => 'Illuminate\\Support\\Facades\\Bus',
      'Cache' => 'Illuminate\\Support\\Facades\\Cache',
      'Config' => 'Illuminate\\Support\\Facades\\Config',
      'Cookie' => 'Illuminate\\Support\\Facades\\Cookie',
      'Crypt' => 'Illuminate\\Support\\Facades\\Crypt',
      'DB' => 'Illuminate\\Support\\Facades\\DB',
      'Eloquent' => 'Illuminate\\Database\\Eloquent\\Model',
      'Event' => 'Illuminate\\Support\\Facades\\Event',
      'Input' => 'Illuminate\\Support\\Facades\\Request',
      'Hash' => 'Illuminate\\Support\\Facades\\Hash',
      'Http' => 'Illuminate\\Support\\Facades\\Http',
      'Lang' => 'Illuminate\\Support\\Facades\\Lang',
      'Log' => 'Illuminate\\Support\\Facades\\Log',
      'Mail' => 'Illuminate\\Support\\Facades\\Mail',
      'Queue' => 'Illuminate\\Support\\Facades\\Queue',
      'Redirect' => 'Illuminate\\Support\\Facades\\Redirect',
      'Redis' => 'Illuminate\\Support\\Facades\\Redis',
      'Request' => 'Illuminate\\Support\\Facades\\Request',
      'Response' => 'Illuminate\\Support\\Facades\\Response',
      'Route' => 'Illuminate\\Support\\Facades\\Route',
      'Schema' => 'Illuminate\\Support\\Facades\\Schema',
      'Session' => 'Illuminate\\Support\\Facades\\Session',
      'Storage' => 'Illuminate\\Support\\Facades\\Storage',
      'URL' => 'Illuminate\\Support\\Facades\\URL',
      'Validator' => 'Illuminate\\Support\\Facades\\Validator',
      'View' => 'Illuminate\\Support\\Facades\\View',
      'Assets' => 'System\\Facades\\Assets',
      'Country' => 'System\\Facades\\Country',
      'File' => 'Igniter\\Flame\\Support\\Facades\\File',
      'Flash' => 'Igniter\\Flame\\Flash\\Facades\\Flash',
      'Form' => 'Igniter\\Flame\\Html\\FormFacade',
      'Html' => 'Igniter\\Flame\\Html\\HtmlFacade',
      'Model' => 'Igniter\\Flame\\Database\\Model',
      'Parameter' => 'Igniter\\Flame\\Setting\\Facades\\Parameter',
      'Setting' => 'Igniter\\Flame\\Setting\\Facades\\Setting',
      'Str' => 'Igniter\\Flame\\Support\\Str',
      'Admin' => 'Admin\\Facades\\Admin',
      'AdminAuth' => 'Admin\\Facades\\AdminAuth',
      'AdminLocation' => 'Admin\\Facades\\AdminLocation',
      'AdminMenu' => 'Admin\\Facades\\AdminMenu',
      'Auth' => 'Main\\Facades\\Auth',
      'Template' => 'Admin\\Facades\\Template',
      'SystemException' => 'Igniter\\Flame\\Exception\\SystemException',
      'ApplicationException' => 'Igniter\\Flame\\Exception\\ApplicationException',
      'AjaxException' => 'Igniter\\Flame\\Exception\\AjaxException',
      'ValidationException' => 'Igniter\\Flame\\Exception\\ValidationException',
    ),
  ),
  'broadcasting' => 
  array (
    'default' => 'log',
    'connections' => 
    array (
      'pusher' => 
      array (
        'driver' => 'pusher',
        'key' => NULL,
        'secret' => NULL,
        'app_id' => NULL,
        'options' => 
        array (
        ),
      ),
      'ably' => 
      array (
        'driver' => 'ably',
        'key' => NULL,
      ),
      'redis' => 
      array (
        'driver' => 'redis',
        'connection' => 'default',
      ),
      'log' => 
      array (
        'driver' => 'log',
      ),
      'null' => 
      array (
        'driver' => 'null',
      ),
    ),
  ),
  'cache' => 
  array (
    'default' => 'file',
    'stores' => 
    array (
      'apc' => 
      array (
        'driver' => 'apc',
      ),
      'array' => 
      array (
        'driver' => 'array',
        'serialize' => false,
      ),
      'database' => 
      array (
        'driver' => 'database',
        'table' => 'cache',
        'connection' => NULL,
      ),
      'file' => 
      array (
        'driver' => 'file',
        'path' => '/var/www/paymydine/storage/framework/cache/data/tenant_paymydine_com_cache',
      ),
      'memcached' => 
      array (
        'driver' => 'memcached',
        'persistent_id' => NULL,
        'sasl' => 
        array (
          0 => NULL,
          1 => NULL,
        ),
        'options' => 
        array (
        ),
        'servers' => 
        array (
          0 => 
          array (
            'host' => '127.0.0.1',
            'port' => 11211,
            'weight' => 100,
          ),
        ),
      ),
      'redis' => 
      array (
        'driver' => 'redis',
        'connection' => 'default',
      ),
      'dynamodb' => 
      array (
        'driver' => 'dynamodb',
        'key' => NULL,
        'secret' => NULL,
        'region' => 'us-east-1',
        'table' => 'cache',
        'endpoint' => NULL,
      ),
    ),
    'prefix' => 'tenant_paymydine_com_cache',
  ),
  'cors' => 
  array (
    'paths' => 
    array (
      0 => 'api/*',
      1 => 'sanctum/csrf-cookie',
    ),
    'allowed_methods' => 
    array (
      0 => '*',
    ),
    'allowed_origins' => 
    array (
      0 => '*',
    ),
    'allowed_origins_patterns' => 
    array (
    ),
    'allowed_headers' => 
    array (
      0 => '*',
    ),
    'exposed_headers' => 
    array (
    ),
    'max_age' => 0,
    'supports_credentials' => false,
  ),
  'database' => 
  array (
    'default' => 'mysql',
    'connections' => 
    array (
      'sqlite' => 
      array (
        'driver' => 'sqlite',
        'url' => NULL,
        'database' => 'paymydine',
        'prefix' => '',
        'foreign_key_constraints' => true,
      ),
      'mysql' => 
      array (
        'driver' => 'mysql',
        'url' => NULL,
        'host' => '127.0.0.1',
        'port' => '3306',
        'database' => 'paymydine',
        'username' => 'paymydine',
        'password' => 'P@ssw0rd@123',
        'unix_socket' => '',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => 'ti_',
        'prefix_indexes' => true,
        'strict' => false,
        'engine' => NULL,
        'options' => 
        array (
        ),
      ),
      'tenant' => 
      array (
        'driver' => 'mysql',
        'url' => NULL,
        'host' => '127.0.0.1',
        'port' => '3306',
        'database' => 'paymydine',
        'username' => 'paymydine',
        'password' => 'P@ssw0rd@123',
        'unix_socket' => '',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => 'ti_',
        'prefix_indexes' => true,
        'strict' => false,
        'engine' => NULL,
        'options' => 
        array (
        ),
      ),
      'pgsql' => 
      array (
        'driver' => 'pgsql',
        'url' => NULL,
        'host' => '127.0.0.1',
        'port' => '3306',
        'database' => 'paymydine',
        'username' => 'paymydine',
        'password' => 'P@ssw0rd@123',
        'charset' => 'utf8',
        'prefix' => '',
        'prefix_indexes' => true,
        'schema' => 'public',
        'sslmode' => 'prefer',
      ),
      'sqlsrv' => 
      array (
        'driver' => 'sqlsrv',
        'url' => NULL,
        'host' => '127.0.0.1',
        'port' => '3306',
        'database' => 'paymydine',
        'username' => 'paymydine',
        'password' => 'P@ssw0rd@123',
        'charset' => 'utf8',
        'prefix' => '',
        'prefix_indexes' => true,
      ),
    ),
    'migrations' => 'migrations',
    'redis' => 
    array (
      'client' => 'phpredis',
      'options' => 
      array (
        'cluster' => 'redis',
        'prefix' => 'paymydine_database_',
      ),
      'default' => 
      array (
        'url' => NULL,
        'host' => '127.0.0.1',
        'password' => NULL,
        'port' => '6379',
        'database' => '0',
      ),
      'cache' => 
      array (
        'url' => NULL,
        'host' => '127.0.0.1',
        'password' => NULL,
        'port' => '6379',
        'database' => '1',
      ),
    ),
    'dbal' => 
    array (
      'types' => 
      array (
        'timestamp' => 'Illuminate\\Database\\DBAL\\TimestampType',
      ),
    ),
  ),
  'filesystems' => 
  array (
    'default' => 'local',
    'cloud' => 's3',
    'disks' => 
    array (
      'local' => 
      array (
        'driver' => 'local',
        'root' => '/var/www/paymydine/storage/app',
      ),
      'media' => 
      array (
        'driver' => 'local',
        'root' => '/var/www/paymydine/assets/media',
      ),
      'public' => 
      array (
        'driver' => 'local',
        'root' => '/var/www/paymydine/storage/app/public',
        'url' => 'https://paymydine.com/storage',
        'visibility' => 'public',
      ),
      's3' => 
      array (
        'driver' => 's3',
        'key' => NULL,
        'secret' => NULL,
        'region' => NULL,
        'bucket' => NULL,
        'url' => NULL,
        'endpoint' => NULL,
      ),
    ),
    'links' => 
    array (
      '/var/www/paymydine/storage' => '/var/www/paymydine/storage/app/public',
    ),
  ),
  'hashing' => 
  array (
    'driver' => 'bcrypt',
    'bcrypt' => 
    array (
      'rounds' => 10,
    ),
    'argon' => 
    array (
      'memory' => 1024,
      'threads' => 2,
      'time' => 2,
    ),
  ),
  'logging' => 
  array (
    'default' => 'stack',
    'channels' => 
    array (
      'stack' => 
      array (
        'driver' => 'stack',
        'channels' => 
        array (
          0 => 'single',
        ),
        'ignore_exceptions' => false,
      ),
      'single' => 
      array (
        'driver' => 'single',
        'path' => '/var/www/paymydine/storage/logs/system.log',
        'level' => 'debug',
      ),
      'daily' => 
      array (
        'driver' => 'daily',
        'path' => '/var/www/paymydine/storage/logs/system.log',
        'level' => 'debug',
        'days' => 14,
      ),
      'sumup' => 
      array (
        'driver' => 'daily',
        'path' => '/var/www/paymydine/storage/logs/sumup.log',
        'level' => 'debug',
        'days' => 30,
      ),
      'slack' => 
      array (
        'driver' => 'slack',
        'url' => NULL,
        'username' => 'TastyIgniter Log',
        'emoji' => ':boom:',
        'level' => 'critical',
      ),
      'papertrail' => 
      array (
        'driver' => 'monolog',
        'level' => 'debug',
        'handler' => 'Monolog\\Handler\\SyslogUdpHandler',
        'handler_with' => 
        array (
          'host' => NULL,
          'port' => NULL,
        ),
      ),
      'stderr' => 
      array (
        'driver' => 'monolog',
        'handler' => 'Monolog\\Handler\\StreamHandler',
        'with' => 
        array (
          'stream' => 'php://stderr',
        ),
      ),
      'syslog' => 
      array (
        'driver' => 'syslog',
        'level' => 'debug',
      ),
      'errorlog' => 
      array (
        'driver' => 'errorlog',
        'level' => 'debug',
      ),
      'null' => 
      array (
        'driver' => 'monolog',
        'handler' => 'Monolog\\Handler\\NullHandler',
      ),
      'emergency' => 
      array (
        'path' => '/var/www/paymydine/storage/logs/system.log',
      ),
    ),
  ),
  'mail' => 
  array (
    'default' => 'log',
    'mailers' => 
    array (
      'smtp' => 
      array (
        'transport' => 'smtp',
        'host' => NULL,
        'port' => NULL,
        'encryption' => NULL,
        'username' => NULL,
        'password' => NULL,
        'timeout' => NULL,
        'auth_mode' => NULL,
      ),
      'ses' => 
      array (
        'transport' => 'ses',
      ),
      'mailgun' => 
      array (
        'transport' => 'mailgun',
      ),
      'postmark' => 
      array (
        'transport' => 'postmark',
      ),
      'sendmail' => 
      array (
        'transport' => 'sendmail',
        'path' => '/usr/sbin/sendmail -bs',
      ),
      'log' => 
      array (
        'transport' => 'log',
        'channel' => NULL,
      ),
      'array' => 
      array (
        'transport' => 'array',
      ),
    ),
    'from' => 
    array (
      'address' => 'noreply@paymydine.com',
      'name' => 'PaymyDine',
    ),
    'markdown' => 
    array (
      'theme' => 'default',
      'paths' => 
      array (
        0 => '/var/www/paymydine/resources/views/vendor/mail',
      ),
    ),
    'log_channel' => NULL,
  ),
  'queue' => 
  array (
    'default' => 'sync',
    'connections' => 
    array (
      'sync' => 
      array (
        'driver' => 'sync',
      ),
      'database' => 
      array (
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'default',
        'retry_after' => 90,
      ),
      'beanstalkd' => 
      array (
        'driver' => 'beanstalkd',
        'host' => 'localhost',
        'queue' => 'default',
        'retry_after' => 90,
      ),
      'sqs' => 
      array (
        'driver' => 'sqs',
        'key' => NULL,
        'secret' => NULL,
        'prefix' => 'https://sqs.us-east-1.amazonaws.com/your-account-id',
        'queue' => 'your-queue-name',
        'suffix' => NULL,
        'region' => 'us-east-1',
      ),
      'redis' => 
      array (
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'default',
        'retry_after' => 90,
        'block_for' => NULL,
      ),
    ),
    'failed' => 
    array (
      'driver' => 'database-uuids',
      'database' => 'mysql',
      'table' => 'failed_jobs',
    ),
  ),
  'services' => 
  array (
    'mailgun' => 
    array (
      'domain' => NULL,
      'secret' => NULL,
      'endpoint' => 'api.mailgun.net',
    ),
    'postmark' => 
    array (
      'token' => NULL,
    ),
    'ses' => 
    array (
      'key' => NULL,
      'secret' => NULL,
      'region' => 'us-east-1',
    ),
    'frontend' => 
    array (
      'static_origin' => 'http://127.0.0.1:3000',
    ),
  ),
  'session' => 
  array (
    'driver' => 'file',
    'lifetime' => '120',
    'expire_on_close' => false,
    'encrypt' => false,
    'files' => '/var/www/paymydine/storage/framework/sessions',
    'connection' => NULL,
    'table' => 'sessions',
    'store' => NULL,
    'lottery' => 
    array (
      0 => 2,
      1 => 10000,
    ),
    'cookie' => 'paymydine_session',
    'path' => '/',
    'domain' => '.paymydine.com',
    'secure' => true,
    'http_only' => true,
    'same_site' => 'lax',
  ),
  'system' => 
  array (
    'locationMode' => 'multiple',
    'defaultTheme' => 'tastyigniter-orange',
    'adminUri' => '/admin',
    'themesDir' => '/themes',
    'assetsDir' => '/assets',
    'modules' => 
    array (
      0 => 'System',
      1 => 'Admin',
      2 => 'Main',
    ),
    'enableRoutesCache' => false,
    'urlMapCacheTtl' => 10,
    'parsedTemplateCacheTTL' => 10,
    'parsedTemplateCachePath' => '/var/www/paymydine/storage/system/cache',
    'assets' => 
    array (
      'media' => 
      array (
        'disk' => 'media',
        'folder' => 'uploads',
        'path' => '/assets/media/uploads',
      ),
      'attachment' => 
      array (
        'disk' => 'media',
        'folder' => 'attachments',
        'path' => '/assets/media/attachments',
      ),
    ),
    'urlPolicy' => 'detect',
    'enableAssetCombiner' => false,
    'assetsCombinerUri' => '/_assets',
    'filePermissions' => '644',
    'folderPermissions' => '755',
    'enableCsrfProtection' => true,
  ),
  'view' => 
  array (
    'paths' => 
    array (
      0 => '/var/www/paymydine/app/admin/views',
      1 => '/var/www/paymydine/app/main/views',
      2 => '/var/www/paymydine/app/system/views',
    ),
    'compiled' => '/var/www/paymydine/storage/framework/views',
  ),
  'currency' => 
  array (
    'default' => 'USD',
    'converter' => 'openexchangerates',
    'converters' => 
    array (
      'fixerio' => 
      array (
        'class' => 'Igniter\\Flame\\Currency\\Converters\\FixerIO',
        'apiKey' => '',
      ),
      'openexchangerates' => 
      array (
        'class' => 'Igniter\\Flame\\Currency\\Converters\\OpenExchangeRates',
        'apiKey' => '',
      ),
    ),
    'model' => 'Igniter\\Flame\\Currency\\Models\\Currency',
    'cache_driver' => NULL,
    'ratesCacheDuration' => 4320,
    'formatter' => NULL,
    'formatters' => 
    array (
      'php_intl' => 
      array (
        'class' => 'Igniter\\Flame\\Currency\\Formatters\\PHPIntl',
      ),
    ),
  ),
  'geocoder' => 
  array (
    'default' => 'chain',
    'providers' => 
    array (
      'google' => 
      array (
        'endpoints' => 
        array (
          'geocode' => 'https://maps.googleapis.com/maps/api/geocode/json?address=%s',
          'reverse' => 'https://maps.googleapis.com/maps/api/geocode/json?latlng=%F,%F',
          'distance' => 'https://maps.googleapis.com/maps/api/distancematrix/json?destinations=%F,%F&origins=%F,%F',
        ),
        'locale' => 'en-GB',
        'region' => 'GB',
        'apiKey' => NULL,
      ),
      'nominatim' => 
      array (
        'endpoints' => 
        array (
          'geocode' => 'https://nominatim.openstreetmap.org/search?q=%s&format=json&addressdetails=1&limit=%d',
          'reverse' => 'https://nominatim.openstreetmap.org/reverse?format=json&lat=%F&lon=%F&addressdetails=1&zoom=%d',
          'distance' => 'https://routing.openstreetmap.de/routed-%s/route/v1/driving/%F,%F;%F,%F',
        ),
        'locale' => 'en-GB',
        'region' => 'GB',
      ),
    ),
    'cache' => 
    array (
      'store' => NULL,
      'duration' => 43200,
    ),
    'precision' => 8,
  ),
  'tinker' => 
  array (
    'commands' => 
    array (
    ),
    'alias' => 
    array (
    ),
    'dont_alias' => 
    array (
      0 => 'App\\Nova',
    ),
  ),
);
