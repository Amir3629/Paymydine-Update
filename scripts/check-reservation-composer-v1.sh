#!/usr/bin/env bash
set -euo pipefail
root=$(git rev-parse --show-toplevel)
cd "$root"
base=${PMD_COMPOSER_BASE_REF:-}
if [[ -z $base ]]; then
  base=$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD work)
fi

sha256sum -c <<'HASHES'
763d1edc343f557d7052f3ed9aa85cf4b99dc8197a3aca0cf2d67988f19ae414  app/admin/requests/Reservation.php
283cb7199b8093d6a7d272f866a90a5f2451b34b0974736817071cc66e41c0e6  app/admin/assets/js/pmd-reservations2-floor-toolbar-v316.js
7ebf2f7bb21395b6dfe00b8337c37bca19d9f08f2e6c3d6bf418e61e93d80854  app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js
HASHES

mapfile -t existing < <(git diff --name-only --diff-filter=M "$base" --)
allowed='^(app/admin/views/reservations2/index\.blade\.php|app/admin/controllers/Reservations2\.php|app/admin/models/Reservations_model\.php)$'
for file in "${existing[@]}"; do
  [[ $file =~ $allowed ]] || { echo "Unauthorized existing-file modification: $file" >&2; exit 1; }
done
((${#existing[@]} <= 3)) || { echo 'Existing-file budget exceeded' >&2; exit 1; }

[[ -z $(git diff --name-only --diff-filter=DR "$base" --) ]] || { echo 'Deleted or renamed files detected' >&2; exit 1; }
[[ -z $(git diff --name-only "$base" -- app/admin/database/migrations composer.json composer.lock package.json package-lock.json) ]] || { echo 'Migration or dependency change detected' >&2; exit 1; }
[[ -z $(git diff --name-only "$base" -- 'app/admin/assets/js/pmd-reservations2-*.js' 'app/admin/assets/css/pmd-reservations2-*.css' 'app/admin/assets/js/pmd-floor-v1*.js' 'app/admin/assets/css/pmd-floor-v1*.css') ]] || { echo 'Protected Reservations/Floor asset changed' >&2; exit 1; }

last=0
for marker in PMD_CALENDAR_HOUR_STYLE_TOOLBAR_V15 PMD_CALENDAR_FRAME_SEPARATION_V16 PMD_CALENDAR_VERTICAL_RHYTHM_V17 PMD_CALENDAR_HOUR_TOP_GAP_V18; do
  start=$(rg -n "<!-- ${marker} -->" app/admin/views/reservations2/index.blade.php | cut -d: -f1)
  end=$(rg -n "<!-- ${marker}_END -->" app/admin/views/reservations2/index.blade.php | cut -d: -f1)
  [[ $start =~ ^[0-9]+$ && $end =~ ^[0-9]+$ && $start -gt $last && $end -gt $start ]] || { echo "Marker guard failed: $marker" >&2; exit 1; }
  last=$end
done

rg -q "reservations/create" app/admin/views/reservations2/index.blade.php
rg -q "reservations/edit" app/admin/views/reservations2/index.blade.php
! rg -n "MutationObserver|setInterval" app/admin/assets/js/pmd-reservation-composer-v1.js
! rg -n "Europe/Berlin|DB::table|->insert\(|->update\(" app/admin/services/ReservationComposerService.php
! rg -n "https?://.*(icon|svg|tabler)" app/admin/views/reservations2/_reservation_composer.blade.php app/admin/assets/css/pmd-reservation-composer-v1.css app/admin/assets/js/pmd-reservation-composer-v1.js

git diff --check
php -l app/admin/controllers/Reservations2.php
php -l app/admin/models/Reservations_model.php
php -l app/admin/requests/ReservationComposer.php
php -l app/admin/services/ReservationComposerService.php
node --check app/admin/assets/js/pmd-reservation-composer-v1.js

echo 'Reservation Composer V1 safety guards passed.'
