$ErrorActionPreference = 'Stop'

# Load .NET compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$source = "C:\Users\Natth\.minimax-agent\projects\niche-bloom-new"
$zipPath = "C:\Users\Natth\.minimax-agent\projects\niche-bloom-new-clean.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Get all files except node_modules, dist, .git
$files = Get-ChildItem -Path $source -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\pack\.ps1$' }

Write-Host "Files to pack: $($files.Count)"

# Create zip
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

foreach ($f in $files) {
  $relPath = $f.FullName.Substring($source.Length + 1)
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

$archive.Dispose()

Write-Host "Done: $zipPath"
(Get-Item $zipPath).Length
