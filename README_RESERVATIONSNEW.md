# Reservationsnew

Phase 1 creates `/admin/reservationsnew` as a separate controller/view route while preserving `/admin/reservations2` unchanged.

Deploy with:

```bash
cd /var/www/paymydine/frontend/Paymydine-Update
git fetch origin agent/reservationsnew-clean
git show origin/agent/reservationsnew-clean:deploy/deploy_reservationsnew_phase1.sh > /tmp/deploy_reservationsnew_phase1.sh
chmod +x /tmp/deploy_reservationsnew_phase1.sh
/tmp/deploy_reservationsnew_phase1.sh
```

This phase mirrors the existing Reservations2 view. The next phase replaces that include with isolated assets after the route is verified.
