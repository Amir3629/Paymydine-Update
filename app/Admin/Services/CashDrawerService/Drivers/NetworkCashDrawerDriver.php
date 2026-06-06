<?php

namespace Admin\Services\CashDrawerService\Drivers;

use Admin\Services\CashDrawerService\CashDrawerDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Network/Ethernet Cash Drawer Driver
 * Opens drawer via TCP/IP network connection
 */
class NetworkCashDrawerDriver implements CashDrawerDriverInterface
{
    protected $ip;
    protected $port;
    protected $connected = false;
    protected $lastError = null;
    protected $socket = null;
    protected $timeout = 5;

    public function __construct($ip, $port = 9100)
    {
        $this->ip = $ip;
        $this->port = $port;
    }

    public function connect(): bool
    {
        try {
            // Create socket connection
            $this->socket = @fsockopen($this->ip, $this->port, $errno, $errstr, $this->timeout);

            if ($this->socket) {
                stream_set_timeout($this->socket, $this->timeout);
                $this->connected = true;
                return true;
            }

            $this->lastError = "Failed to connect: $errstr ($errno)";
            return false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to connect network drawer', [
                'ip' => $this->ip,
                'port' => $this->port,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function open(): bool
    {
        try {
            if (!$this->connected) {
                if (!$this->connect()) {
                    return false;
                }
            }

            // Send ESC/POS drawer open command
            $command = [chr(27), 'p', chr(0), chr(60), chr(120)];
            $commandString = implode('', $command);

            if ($this->socket) {
                $written = @fwrite($this->socket, $commandString);
                @fflush($this->socket);

                if ($written !== false) {
                    Log::info('Cash Drawer: Opened via network', [
                        'ip' => $this->ip,
                        'port' => $this->port,
                    ]);
                    return true;
                }
            }

            $this->lastError = 'Failed to write to network socket';
            return false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to open network drawer', [
                'ip' => $this->ip,
                'port' => $this->port,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function test(): bool
    {
        // Test connection by trying to open
        return $this->open();
    }

    public function isOpen(): ?bool
    {
        // Some network drawers support status checking via HTTP API
        // For now, return null (not supported)
        return null;
    }

    public function disconnect(): void
    {
        if ($this->socket) {
            @fclose($this->socket);
            $this->socket = null;
        }
        $this->connected = false;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}
