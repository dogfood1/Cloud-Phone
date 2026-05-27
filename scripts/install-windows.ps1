# Cloud Phone -- Windows auto-install wizard
# Usage: powershell -ExecutionPolicy Bypass -File scripts\install-windows.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = (Resolve-Path (Join-Path $ScriptDir '..')).Path
. (Join-Path $ScriptDir 'lib\tui.ps1')

# ---------------------------------------------------------------------------
function Get-AppVersion {
  $vf = Join-Path $RepoRoot 'backend\node\src\config\version.js'
  if (Test-Path $vf) {
    $m = Select-String -Path $vf -Pattern 'APP_VERSION = "([^"]+)"'
    if ($m) { return $m.Matches.Groups[1].Value }
  }
  return 'unknown'
}

function Test-NodeOk {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
  try {
    $major = [int](node -p "process.versions.node.split('.')[0]" 2>$null)
    return $major -ge 18
  } catch { return $false }
}

function Install-NodeWindows {
  if (Test-NodeOk) { Write-TuiLog ok "Node $(node -v) already installed"; return }
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Invoke-TuiRun 'winget install Node.js LTS' {
      winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } | Out-Null
    # refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
    if (Test-NodeOk) { return }
  }
  if (Get-Command choco -ErrorAction SilentlyContinue) {
    Invoke-TuiRun 'choco install nodejs-lts' { choco install nodejs-lts -y } | Out-Null
    if (Test-NodeOk) { return }
  }
  Write-TuiLog warn 'Please install Node.js 18+ from https://nodejs.org then rerun this script'
}

function Install-JdkWindows {
  # Android Studio JBR
  $jbr = 'C:\Program Files\Android\Android Studio\jbr'
  if (Test-Path $jbr) {
    Write-TuiLog ok "Android Studio JBR found: $jbr"
    $env:CLOUD_PHONE_JAVA_HOME = $jbr
    return
  }
  # Existing JDK 17+ in common locations
  foreach ($root in @(
    'C:\Program Files\Java',
    'C:\Program Files\Eclipse Adoptium',
    'C:\Program Files\Microsoft'
  )) {
    if (-not (Test-Path $root)) { continue }
    $found = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match 'jdk-?(1[7-9]|[2-9]\d)' } |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($found) {
      Write-TuiLog ok "JDK found: $($found.FullName)"
      $env:CLOUD_PHONE_JAVA_HOME = $found.FullName
      return
    }
  }
  # Try winget
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Invoke-TuiRun 'winget install Microsoft OpenJDK 17' {
      winget install Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements
    } | Out-Null
  } else {
    Write-TuiLog warn 'Please install JDK 17+ or Android Studio and set CLOUD_PHONE_JAVA_HOME'
  }
}

function Set-AndroidEnvWindows {
  $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  if (Test-Path $sdk) {
    $env:ANDROID_HOME     = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
    Write-TuiLog ok "ANDROID_HOME = $sdk"
  } else {
    Write-TuiLog warn 'Android SDK not found. Install Android Studio to get SDK.'
  }
}

function Copy-EnvFile {
  $envFile = Join-Path $RepoRoot '.env'
  $example = Join-Path $RepoRoot '.env.example'
  if (Test-Path $envFile) {
    Write-TuiLog info '.env already exists -- skipping'
  } elseif (Test-Path $example) {
    Copy-Item $example $envFile
    Write-TuiLog ok 'Created .env from .env.example'
  } else {
    Write-TuiLog warn '.env.example not found'
  }
}

function Install-NpmAll {
  $dirs = @(
    @{ Path = $RepoRoot;                            Label = 'root' },
    @{ Path = Join-Path $RepoRoot 'backend\node';   Label = 'backend/node' },
    @{ Path = Join-Path $RepoRoot 'frontend\web';   Label = 'frontend/web' }
  )
  foreach ($d in $dirs) {
    if (-not (Test-Path (Join-Path $d.Path 'package.json'))) { continue }
    $label = $d.Label
    $dpath = $d.Path
    Invoke-TuiRun "npm install -- $label" {
      Push-Location $dpath
      try { npm install --no-fund --no-audit }
      finally { Pop-Location }
    } | Out-Null
  }
}

function Build-ScrcpyServer {
  $tool = Join-Path $RepoRoot 'tools\build-scrcpy-server.mjs'
  if (-not (Test-Path $tool)) { Write-TuiLog warn 'build-scrcpy-server.mjs not found'; return }
  Invoke-TuiRun 'Build modded scrcpy-server (Gradle)' {
    Push-Location $RepoRoot
    try { node tools\build-scrcpy-server.mjs }
    finally { Pop-Location }
  } | Out-Null
}

function Show-Finish {
  $fe = 5173; $be = 3000
  $envPath = Join-Path $RepoRoot '.env'
  if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
      if ($_ -match '^FRONTEND_PORT=(\d+)') { $fe = $Matches[1] }
      if ($_ -match '^BACKEND_PORT=(\d+)')  { $be = $Matches[1] }
    }
  }
  Clear-Host
  Write-TuiBoxOpen 'Install complete'
  Write-TuiBoxLine "Repo  : $RepoRoot"
  Write-TuiBoxLine 'Start : cd <repo> then  npm run dev'
  Write-TuiBoxLine "Front : http://localhost:$fe"
  Write-TuiBoxLine "Back  : http://localhost:$be/health"
  Write-TuiBoxLine 'Login : admin  (please change the password)'
  Write-TuiBoxClose
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
$ver = Get-AppVersion
Write-TuiBanner $ver

# Environment info
$archLabel = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
$hasWinget  = if (Get-Command winget -ErrorAction SilentlyContinue) { 'yes' } else { 'no' }
$nodeInfo   = if (Test-NodeOk) { "$(node -v)" } else { 'not installed' }

Write-TuiBoxOpen 'Environment -- Windows'
Write-TuiBoxLine "OS     : $([Environment]::OSVersion.VersionString)"
Write-TuiBoxLine "Arch   : $archLabel"
Write-TuiBoxLine "Node   : $nodeInfo"
Write-TuiBoxLine "winget : $hasWinget"
Write-TuiBoxClose
Read-TuiPause

# Mode selection
$mode = Read-TuiMenu 'Select install mode' @(
  'Recommended -- Node.js + npm deps  (uses bundled ADB)',
  'Full        -- Node + npm + JDK 17 + build scrcpy-server',
  'npm only    -- skip Node install (Node already present)'
)
if ($null -eq $mode) { exit 0 }

$optNode  = $true
$optNpm   = $true
$optJdk   = $false
$optBuild = $false

switch ($mode) {
  1 { }
  2 { $optJdk = $true; $optBuild = $true }
  3 { $optNode = $false }
}

if (-not (Read-TuiConfirm 'Start install?')) { exit 0 }

if ($optNode)  { Install-NodeWindows }
if ($optJdk)   { Install-JdkWindows; Set-AndroidEnvWindows }
Copy-EnvFile
if ($optNpm) {
  if (-not (Test-NodeOk)) {
    Write-TuiLog err 'Node 18+ is required. Install it and rerun.'
    exit 1
  }
  Install-NpmAll
}
if ($optBuild) { Build-ScrcpyServer }

Show-Finish
