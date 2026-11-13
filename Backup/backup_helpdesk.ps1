<#
.SYNOPSIS
  Automated Backup Script for Wesleyan Christian Academy (WCA) Helpdesk
  Backs up project source code, configurations, Google Apps Script files, and Antigravity conversation transcripts.

.DESCRIPTION
  This script creates:
  1. A structured uncompressed mirror in "Backup/latest/"
     - project_source/ (all application source code, assets, configs, minus node_modules and .git)
     - conversation_brain/ (conversation logs, transcripts, scratch scripts, user uploads)
  2. A timestamped, compressed ZIP archive in "Backup/archives/Helpdesk_Full_Backup_YYYY-MM-DD.zip"
#>

[CmdletBinding()]
param(
    [string]$ProjectDir = "G:\Shared drives\INFOTECH\GOOGLE\AntiGravity Projects\Helpdesk",
    [string]$ConversationId = "7d203432-5439-4385-a24a-775a71111322"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Wesleyan Christian Academy Helpdesk - Automated Backup" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Define paths
$backupDir = Join-Path $ProjectDir "Backup"
$latestDir = Join-Path $backupDir "latest"
$projectDest = Join-Path $latestDir "project_source"
$brainDest = Join-Path $latestDir "conversation_brain"
$archiveDir = Join-Path $backupDir "archives"

$userProfileDir = [System.Environment]::GetFolderPath('UserProfile')
$brainSource = Join-Path $userProfileDir (".gemini\antigravity\brain\" + $ConversationId)

# Ensure target directories exist
New-Item -ItemType Directory -Force -Path $projectDest | Out-Null
New-Item -ItemType Directory -Force -Path $brainDest | Out-Null
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

# 1. Backup Project Source
Write-Host "`n[1/3] Backing up Project Source Code & Configs..." -ForegroundColor Green

# Copy root files (exclude .git, .firebase cache, node_modules, and Google Drive pointer files like .gdoc)
Get-ChildItem -Path $ProjectDir -File | Where-Object { 
    $_.Name -notmatch '^\.git' -and 
    $_.Name -notmatch '\.cache$' -and 
    $_.Name -notmatch '\.log$' -and
    $_.Extension -notmatch '^\.g(doc|sheet|slides|draw)$'
} | ForEach-Object {
    try {
        Copy-Item -Path $_.FullName -Destination $projectDest -Force
    } catch {
        Write-Warning "Skipped file: $($_.Name) - $($_.Exception.Message)"
    }
}

# Copy key subfolders
$foldersToCopy = @('src', 'public', 'google-apps-script', 'functions')
foreach ($folder in $foldersToCopy) {
    $srcFolder = Join-Path $ProjectDir $folder
    if (Test-Path $srcFolder) {
        $destFolder = Join-Path $projectDest $folder
        Write-Host "  -> Copying $folder..." -ForegroundColor Gray
        Copy-Item -Path $srcFolder -Destination $destFolder -Recurse -Force
    }
}

# 2. Backup Antigravity Conversation Brain & Transcripts
Write-Host "`n[2/3] Backing up Conversation Logs & Brain Artifacts..." -ForegroundColor Green
if (Test-Path $brainSource) {
    # Transcripts
    $logsDir = Join-Path $brainSource ".system_generated\logs"
    if (Test-Path $logsDir) {
        Write-Host "  -> Copying transcript.jsonl & transcript_full.jsonl..." -ForegroundColor Gray
        Get-ChildItem -Path $logsDir -Filter "*.jsonl" | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $brainDest -Force
        }
    }

    # Uploaded media (screenshots, attachments)
    $uploadedDir = Join-Path $brainSource ".user_uploaded"
    if (Test-Path $uploadedDir) {
        Write-Host "  -> Copying user-uploaded media..." -ForegroundColor Gray
        Copy-Item -Path $uploadedDir -Destination (Join-Path $brainDest "user_uploaded") -Recurse -Force
    }

    # Scratch scripts
    $scratchDir = Join-Path $brainSource "scratch"
    if (Test-Path $scratchDir) {
        Write-Host "  -> Copying diagnostic/scratch scripts..." -ForegroundColor Gray
        Copy-Item -Path $scratchDir -Destination (Join-Path $brainDest "scratch") -Recurse -Force
    }
} else {
    Write-Warning "Conversation directory not found at $brainSource"
}

# 3. Create Timestamped Zip Archive
Write-Host "`n[3/3] Generating Compressed ZIP Archive..." -ForegroundColor Green
$timestamp = (Get-Date).ToString("yyyy-MM-dd_HHmmss")
$dateOnly = (Get-Date).ToString("yyyy-MM-dd")
$zipFileName = "Helpdesk_Full_Backup_$dateOnly.zip"
$zipPath = Join-Path $archiveDir $zipFileName

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $latestDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

$zipInfo = Get-Item $zipPath
$zipSizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Backup Completed Successfully!" -ForegroundColor Green
Write-Host "  - Mirror Folder: $latestDir" -ForegroundColor White
Write-Host "  - Archive ZIP:   $zipPath ($zipSizeMB MB)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
