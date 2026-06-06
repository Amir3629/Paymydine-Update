$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$PartsDir = Join-Path $RootDir "local-snapshot-archive"
$OutputArchive = Join-Path $RootDir "paymydine-local-snapshot.tar.gz"

Write-Host "=== PayMyDine local snapshot unpacker (Windows) ==="

if (!(Test-Path $PartsDir)) {
    throw "Missing $PartsDir. Expected split files like local-snapshot-archive\paymydine-local-snapshot.tar.gz.part-aa"
}

$Parts = Get-ChildItem $PartsDir -Filter "paymydine-local-snapshot.tar.gz.part-*" | Sort-Object Name
if ($Parts.Count -eq 0) {
    throw "No snapshot parts found in $PartsDir. Expected files named paymydine-local-snapshot.tar.gz.part-aa, part-ab, ..."
}

Write-Host "Found $($Parts.Count) snapshot part(s)."
if (Test-Path $OutputArchive) {
    Remove-Item $OutputArchive -Force
}

$OutStream = [System.IO.File]::OpenWrite($OutputArchive)
try {
    foreach ($Part in $Parts) {
        Write-Host "Adding $($Part.Name)"
        $InStream = [System.IO.File]::OpenRead($Part.FullName)
        try {
            $InStream.CopyTo($OutStream)
        }
        finally {
            $InStream.Close()
        }
    }
}
finally {
    $OutStream.Close()
}

Write-Host "Created: $OutputArchive"
Get-Item $OutputArchive | Format-List Name,Length,FullName

$SnapshotDir = Join-Path $RootDir "local-snapshot"
if (Test-Path $SnapshotDir) {
    Remove-Item $SnapshotDir -Recurse -Force
}

Write-Host "=== Extracting local-snapshot/ ==="
tar -xzf $OutputArchive -C $RootDir

Write-Host "=== Snapshot files ==="
Get-ChildItem $SnapshotDir -Recurse -File | ForEach-Object { $_.FullName.Replace("$RootDir\", "") } | Sort-Object

Write-Host "Done. Next run the Windows setup script if available, or run the mac script from Git Bash/WSL."
