#!/usr/bin/env bash
set -e
cp /var/www/paymydine/storage/pmd-vr-terminal-simulator-r1/20260905_155312/app/admin/classes/VRPaymentGatewayService.php /var/www/paymydine/app/admin/classes/VRPaymentGatewayService.php
cp /var/www/paymydine/storage/pmd-vr-terminal-simulator-r1/20260905_155312/app/admin/controllers/Payments.php /var/www/paymydine/app/admin/controllers/Payments.php
cp /var/www/paymydine/storage/pmd-vr-terminal-simulator-r1/20260905_155312/app/Services/TerminalPayments/TerminalPaymentService.php /var/www/paymydine/app/Services/TerminalPayments/TerminalPaymentService.php
cp /var/www/paymydine/storage/pmd-vr-terminal-simulator-r1/20260905_155312/app/Services/TerminalPayments/VrPaymentTerminalProvider.php /var/www/paymydine/app/Services/TerminalPayments/VrPaymentTerminalProvider.php
echo 'Source files restored.'
echo 'Remove simulator rows with: php /var/www/paymydine/scripts/pmd-vr-terminal-simulator-r1-seed.php --tenant=tomo --remove'
