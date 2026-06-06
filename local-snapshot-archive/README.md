# Local Snapshot Archive

Put the split PayMyDine production snapshot parts in this folder.

Expected filenames:

```text
paymydine-local-snapshot.tar.gz.part-aa
paymydine-local-snapshot.tar.gz.part-ab
paymydine-local-snapshot.tar.gz.part-ac
```

Do not commit one large `paymydine-local-snapshot.tar.gz` file directly if it is over GitHub's normal file limit.

After cloning the repo, rebuild the snapshot folder:

```bash
bash scripts/unpack-local-snapshot-parts-mac.sh
bash scripts/setup-local-from-snapshot-mac.sh
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\unpack-local-snapshot-parts-windows.ps1
```
