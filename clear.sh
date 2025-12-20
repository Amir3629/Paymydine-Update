#!/bin/bash
# Run Clear & Optimize

php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan optimize
php artisan optimize:clear
