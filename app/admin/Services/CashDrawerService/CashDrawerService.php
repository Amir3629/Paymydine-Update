<?php

namespace Admin\Services\CashDrawerService;

/**
 * PayMyDine compatibility shim.
 *
 * Some order flows reference:
 * Admin\Services\CashDrawerService\CashDrawerService
 *
 * On production this class may be missing while the real/old Cash Drawer
 * implementation lives elsewhere or is disabled. This shim prevents public
 * order creation from crashing. If a real service exists, calls are proxied.
 * Otherwise calls become safe no-ops with a warning log.
 */
class CashDrawerService
{
    protected $inner = null;

    public function __construct()
    {
        $candidates = [
            '\\Admin\\Services\\CashDrawerService',
            '\\Admin\\Services\\CashDrawer\\CashDrawerService',
            '\\Admin\\Services\\CashDrawer\\Service',
            '\\Admin\\Classes\\CashDrawerService',
        ];

        foreach ($candidates as $class) {
            if (class_exists($class) && $class !== self::class) {
                try {
                    $this->inner = app($class);
                    return;
                } catch (\Throwable $e) {
                    try {
                        $this->inner = new $class();
                        return;
                    } catch (\Throwable $ignored) {
                        $this->inner = null;
                    }
                }
            }
        }
    }

    public function __call($method, $arguments)
    {
        if ($this->inner && method_exists($this->inner, $method)) {
            return $this->inner->{$method}(...$arguments);
        }

        try {
            \Log::warning('PMD CashDrawerService shim no-op', [
                'method' => $method,
                'argument_count' => count($arguments),
            ]);
        } catch (\Throwable $ignored) {
            // Never let logging break order creation.
        }

        return null;
    }

    public static function __callStatic($method, $arguments)
    {
        try {
            $instance = app(static::class);
            return $instance->{$method}(...$arguments);
        } catch (\Throwable $e) {
            try {
                \Log::warning('PMD CashDrawerService shim static no-op', [
                    'method' => $method,
                    'error' => $e->getMessage(),
                ]);
            } catch (\Throwable $ignored) {
                // Never let logging break order creation.
            }

            return null;
        }
    }
}
