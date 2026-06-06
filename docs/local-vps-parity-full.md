# PayMyDine local/VPS parity checklist

Goal: a fresh GitHub clone should run locally with the same code, tenant databases, menu data, and media files as the VPS.

## Current finding

The GitHub repo alone is not yet a complete VPS mirror. The old local tests showed that code can run, but images and foods become wrong when the database dump and media files are missing or from different snapshots.

The local version needs these pieces together:

1. Code from `main`.
2. Composer dependencies installed locally.
3. Local `.env` configured for MySQL and tenant hostnames.
4. Databases: `paymydine`, `mimoza`, `rosana`, `persian`.
5. Media folders: `assets/media` and `storage/app/public`.
6. A repeatable restore/sync script.
7. A parity audit script.

If DB rows and files are not from the same VPS snapshot, menu images can fall back to `/app/admin/assets/images/default-image.png`, food records can look different from production, and some pages can return HTTP 500.

## Correct local URLs

Use tenant hostnames, not only `127.0.0.1`:

```text
http://mimoza.lvh.me:8000/admin
http://rosana.lvh.me:8000/admin
http://persian.lvh.me:8000/admin
```

`lvh.me` resolves to localhost and allows the tenant middleware to detect the subdomain.

## Recommended repo structure

Because the repo may become private, a complete developer snapshot can be organized like this:

```text
local-snapshot/
  README.md
  dbs/
    paymydine.sql
    mimoza.sql
    rosana.sql
    persian.sql
  env/
    .env.local.example
  media/
    assets-media.tar.gz
    storage-public.tar.gz
```

Safer option: keep only `local-snapshot/README.md` and `.env.local.example` in GitHub, and store large DB/media archives in a private release or copy them from VPS.

## Final desired fresh-clone flow

```bash
git clone https://github.com/Amir3629/Paymydine-Update.git
cd Paymydine-Update
composer install
cp local-snapshot/env/.env.local.example .env
bash scripts/setup-local-from-snapshot-mac.sh
php -S 127.0.0.1:8000 server.php
```

Then open:

```text
http://mimoza.lvh.me:8000/admin
```

## Verification after every sync

Run:

```bash
bash scripts/audit-local-parity-mac.sh
```

The audit must check:

- required PHP/autoload files exist;
- `.env` exists;
- tenant DBs exist;
- `ti_menus` rows exist in tenant DBs;
- `ti_media_attachments` rows exist;
- media directories exist;
- sample DB media rows resolve to real files on disk.

## Do not forget

Do not commit real production passwords while the repo is public. Even after making it private, prefer `.env.local.example` with placeholders and keep real credentials outside GitHub.
