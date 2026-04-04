<?php

namespace Admin\Services\CashDrawerService;

/**
 * Cash Drawer Driver Interface
 * All cash drawer drivers must implement this interface
 */
interface CashDrawerDriverInterface
{
    /**
     * Connect to the cash drawer
     * @return bool
     */
    public function connect(): bool;

    /**
     * Open the cash drawer
     * @return bool
     */
    public function open(): bool;

    /**
     * Test the connection
     * @return bool
     */
    public function test(): bool;

    /**
     * Check if drawer is open (if supported)
     * @return bool|null Returns true if open, false if closed, null if not supported
     */
    public function isOpen(): ?bool;

    /**
     * Disconnect from the cash drawer
     * @return void
     */
    public function disconnect(): void;

    /**
     * Get last error message
     * @return string|null
     */
    public function getLastError(): ?string;
}
