param(
  [string]$Model = "sora-2",
  [string]$Size = "1280x720",
  [string]$Seconds = "4"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$workDir = Join-Path $root "docs\admin-training-video"
$outDir = Join-Path $workDir "generated"
$cli = "C:\Users\Patompong.l\.codex\skills\sora\scripts\sora.py"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

if (-not $env:OPENAI_API_KEY) {
  $env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
}

if (-not $env:OPENAI_API_KEY) {
  throw "OPENAI_API_KEY is not set. Set it in the User environment before running this script."
}

$shots = @(
  @{ id = "s1-documents"; prompt = "sora-shot-s1-documents.txt"; out = "sora-shot-s1-documents.mp4"; json = "sora-shot-s1-documents.json" },
  @{ id = "s2-officer"; prompt = "sora-shot-s2-officer.txt"; out = "sora-shot-s2-officer.mp4"; json = "sora-shot-s2-officer.json" },
  @{ id = "s3-transition"; prompt = "sora-shot-s3-transition.txt"; out = "sora-shot-s3-transition.mp4"; json = "sora-shot-s3-transition.json" },
  @{ id = "s4-closing"; prompt = "sora-shot-s4-closing.txt"; out = "sora-shot-s4-closing.mp4"; json = "sora-shot-s4-closing.json" }
)

foreach ($shot in $shots) {
  Write-Host "Generating $($shot.id)..."
  python $cli create-and-poll `
    --model $Model `
    --size $Size `
    --seconds $Seconds `
    --prompt-file (Join-Path $workDir $shot.prompt) `
    --no-augment `
    --poll-interval 10 `
    --timeout 900 `
    --download `
    --variant video `
    --out (Join-Path $outDir $shot.out) `
    --json-out (Join-Path $outDir $shot.json) `
    --force
}

Write-Host "Done. Generated videos are in $outDir"
