-- SumUp POS terminal fields (production-safe SQL patch)
-- Run per tenant database if columns do not exist.

ALTER TABLE pos_configs
    ADD COLUMN IF NOT EXISTS sumup_affiliate_key VARCHAR(191) NULL AFTER id_application,
    ADD COLUMN IF NOT EXISTS sumup_reader_id VARCHAR(191) NULL AFTER sumup_affiliate_key,
    ADD COLUMN IF NOT EXISTS sumup_pairing_code VARCHAR(191) NULL AFTER sumup_reader_id,
    ADD COLUMN IF NOT EXISTS sumup_pairing_state VARCHAR(50) NULL AFTER sumup_pairing_code,
    ADD COLUMN IF NOT EXISTS sumup_reader_label VARCHAR(191) NULL AFTER sumup_pairing_state;
