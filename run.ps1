# run.ps1 - Launch the Video Perception Node (Teammate 5)
#
# Usage:
#   .\run.ps1              # start the DEMO web app (browser dashboard)
#   .\run.ps1 vision       # plain OpenCV preview window version
#   .\run.ps1 verify       # check dependencies + webcam
#   .\run.ps1 test         # unit tests (no camera or Hub needed)
#   .\run.ps1 live         # integration test against the real Hub
#   .\run.ps1 events       # list events currently sitting in the Hub
#   .\run.ps1 mockhub      # local stand-in Hub for offline demos

param([string]$Task = "demo")

$ErrorActionPreference = "Stop"
$root   = $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$node   = Join-Path $root "video_node"

if (-not (Test-Path $python)) {
    Write-Host "Virtual environment not found at .venv" -ForegroundColor Red
    Write-Host "Create it with:  py -3.12 -m venv .venv" -ForegroundColor Yellow
    Write-Host "Then: .venv\Scripts\python.exe -m pip install -r video_node\requirements.txt" -ForegroundColor Yellow
    exit 1
}

# NOTE: deliberately do NOT set API_URL here. video_node\.env is the single
# source of truth for the Hub address, and config.py lets real environment
# variables override it. Forcing a value here would silently ignore .env.

$script = switch ($Task.ToLower()) {
    "demo"    { "app.py" }
    "vision"  { "vision.py" }
    "verify"  { "verify_install.py" }
    "test"    { "test_logic.py" }
    "live"    { "test_live_hub.py" }
    "events"  { "show_events.py" }
    "mockhub" { "mock_hub.py" }
    default   {
        Write-Host "Unknown task '$Task'." -ForegroundColor Red
        Write-Host "Use: demo | vision | verify | test | live | events | mockhub" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Running $script ..." -ForegroundColor Cyan
& $python (Join-Path $node $script)
