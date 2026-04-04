# Oracle Simphony Toolkit for PayMyDine

## Files
- oracle_simphony.env
- oracle_openid_config.sh
- oracle_organizations.sh
- oracle_locations.sh
- oracle_revenue_centers.sh
- oracle_menus_summary.sh
- oracle_refresh_token.sh

## First steps
1. Edit oracle_simphony.env
2. Run:
   ./oracle_openid_config.sh
   ./oracle_organizations.sh
   ./oracle_locations.sh <orgShortName>
   ./oracle_revenue_centers.sh <orgShortName> <locRef>
   ./oracle_menus_summary.sh <orgShortName> <locRef> <rvcRef>

## Notes
- ORACLE_BASE_URL should be only the base host, example:
  https://your-oracle-host.example.com
- Do NOT append /api/v1 manually.
- Bearer token for API calls should be Oracle id_token.
