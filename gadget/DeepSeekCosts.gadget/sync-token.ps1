#requires -Version 5.1
<#
    sync-token.ps1 - holt den DeepSeek-Web-Session-Token aus dem Standardbrowser
    und legt ihn in %USERPROFILE%\.config\opencode\secrets\deepseek-platform-token ab.

    Hintergrund: Der Token liegt in der Local-Storage-LevelDB des Browsers als
    {"value":"...","__version":"0"}. LevelDB-Dateien sind waehrend der Laufzeit
    gesperrt - deshalb wird mit FileShare.ReadWrite gelesen.

    Aufruf: powershell.exe -NoProfile -ExecutionPolicy Bypass -File sync-token.ps1
    Exit 0 = gueltiger Token liegt in der Datei, 1 = kein gueltiger Token gefunden.
    Gibt den Token nie aus.
#>
param(
    [string]$TokenFile = (Join-Path $env:USERPROFILE '.config\opencode\secrets\deepseek-platform-token'),
    [switch]$Quiet
)

$ErrorActionPreference = 'SilentlyContinue'
$script:log = @()

function Say([string]$msg) { if (-not $Quiet) { Write-Output $msg } }

# --- 1. Kandidaten-Ordner (Local Storage aller Profile) -----------------------
$userDataRoots = @(
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome for Testing\User Data'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'),
    (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\User Data')
)

$leveldbDirs = @()
foreach ($root in $userDataRoots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($prof in Get-ChildItem $root -Directory) {
        $ls = Join-Path $prof.FullName 'Local Storage\leveldb'
        if (Test-Path $ls) { $leveldbDirs += $ls }
    }
}
Say ("Local-Storage-Ordner: {0}" -f $leveldbDirs.Count)

# --- 2. Kandidaten aus den LevelDB-Dateien lesen ------------------------------
function Read-Shared([string]$path) {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read,
                                 ([System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete))
    try {
        $ms = New-Object System.IO.MemoryStream
        $fs.CopyTo($ms)
        # GetEncoding(28591) = ISO-8859-1, in Windows PowerShell 5.1 vorhanden (Encoding.Latin1 erst ab .NET 5)
        return [System.Text.Encoding]::GetEncoding(28591).GetString($ms.ToArray())
    } finally { $fs.Close() }
}

$candidates = New-Object System.Collections.Generic.List[string]
foreach ($dir in $leveldbDirs) {
    $files = Get-ChildItem $dir -File | Where-Object { $_.Extension -in '.log', '.ldb' } |
             Sort-Object LastWriteTime -Descending | Select-Object -First 8
    foreach ($f in $files) {
        $text = Read-Shared $f.FullName
        if (-not $text) { continue }
        # Wertform 1: {"value":"<token>","__version":"0"}
        foreach ($m in [regex]::Matches($text, '\{"value":"([^"]{20,300})","__version"')) {
            $candidates.Add($m.Groups[1].Value)
        }
        # Wertform 2: reiner String direkt hinter dem Schluessel userToken
        foreach ($m in [regex]::Matches($text, 'userToken[\x00-\x1F]{0,4}([A-Za-z0-9_\-\.]{40,300})')) {
            $candidates.Add($m.Groups[1].Value)
        }
    }
}
$unique = @($candidates | Select-Object -Unique)
Say ("Kandidaten: {0}" -f $unique.Count)

# --- 3. Kandidaten gegen die API pruefen --------------------------------------
function Test-Token([string]$t) {
    try {
        $r = Invoke-WebRequest -Uri 'https://platform.deepseek.com/api/v0/users/get_user_summary' `
             -Headers @{ Authorization = "Bearer $t"; Accept = 'application/json' } `
             -UseBasicParsing -TimeoutSec 15
        return ($r.StatusCode -eq 200 -and $r.Content -match '"code"\s*:\s*0')
    } catch { return $false }
}

$valid = $null
foreach ($c in $unique) {
    if (Test-Token $c) { $valid = $c; break }
}

if (-not $valid) {
    Say 'Kein gueltiger Token gefunden (nicht angemeldet oder Token abgelaufen).'
    exit 1
}

# --- 4. In die Datei schreiben (nur bei Aenderung) ----------------------------
$dir = Split-Path $TokenFile -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$current = $null
if (Test-Path $TokenFile) { $current = (Get-Content -Raw -LiteralPath $TokenFile).Trim() }

if ($current -eq $valid) {
    Say 'Token unveraendert.'
    exit 0
}

[System.IO.File]::WriteAllText($TokenFile, $valid, (New-Object System.Text.UTF8Encoding($false)))
Say ("Token aktualisiert: {0} ({1} Zeichen)" -f $TokenFile, $valid.Length)
exit 0
