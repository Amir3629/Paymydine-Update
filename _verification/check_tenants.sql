-- Tenant Database Connection Check
-- This query shows all active tenants and their database connection details

SELECT 
    id,
    domain,
    database,
    db_host,
    db_user as db_username,
    status
FROM ti_tenants
WHERE status = 'active'
ORDER BY id;

-- Expected output format:
-- +----+----------------------+------------+---------------+--------------+--------+
-- | id | domain               | database   | db_host       | db_username  | status |
-- +----+----------------------+------------+---------------+--------------+--------+
-- |  1 | amir.paymydine.com   | amir_db    | 127.0.0.1     | paymydine    | active |
-- |  2 | rosana.paymydine.com | rosana_db  | 127.0.0.1     | paymydine    | active |
-- +----+----------------------+------------+---------------+--------------+--------+

