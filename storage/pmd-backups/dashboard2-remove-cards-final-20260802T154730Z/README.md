# Dashboard2 reservation-card removal backup

Run `./rollback.sh` from any working directory to restore all four source files and verify their original SHA-256 hashes. After rollback on the production host, run `sudo -u www-data php artisan optimize:clear`.
