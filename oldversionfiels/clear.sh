#!/bin/bash
# Run Clear & Optimize

sudo php artisan route:clear
sudo php artisan config:clear
sudo php artisan cache:clear
sudo php artisan optimize

