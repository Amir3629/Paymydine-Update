-- Dedicated terminal devices storage (production-safe SQL patch)
-- Run per tenant database (for projects without artisan migrations).

CREATE TABLE IF NOT EXISTS terminal_devices (
    terminal_device_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider_code VARCHAR(50) NOT NULL,
    location_id INT UNSIGNED NULL,
    affiliate_key VARCHAR(191) NULL,
    reader_id VARCHAR(191) NULL,
    reader_label VARCHAR(191) NULL,
    pairing_state VARCHAR(50) NULL,
    terminal_status VARCHAR(191) NULL,
    metadata LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (terminal_device_id),
    INDEX td_provider_idx (provider_code),
    INDEX td_location_idx (location_id),
    INDEX td_reader_idx (reader_id)
);
