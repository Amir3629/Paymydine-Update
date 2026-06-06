# Local snapshot

This folder is the place for files that make a fresh GitHub clone behave like the VPS.

Expected structure:

```text
local-snapshot/
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

The setup script expects the SQL files and media archives in these paths.

Keep sensitive values out of this folder unless the repository access is restricted.
