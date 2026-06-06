# PayMyDine local/VPS parity guide

Goal: a fresh GitHub clone should run locally with the same code, tenant databases, menu data, and media files as the VPS.

Important: code alone is not enough for PayMyDine. The admin menu images and food records depend on both database rows and real files under `assets/media` / `storage/app/public`. If one side is missing or from a different snapshot, the admin falls back to `/app/admin/assets/images/default-image.png`, foods can look wrong, or pages can return