# Cloud Phone -- PowerShell terminal UI helpers (PS 5.1+ compatible)

$script:TuiWidth = 68
try {
  $w = $Host.UI.RawUI.WindowSize.Width
  if ($w -gt 44) { $script:TuiWidth = [Math]::Min(76, $w - 4) }
} catch { }

function Write-TuiBanner {
  param([string]$Version = '')
  Clear-Host
  Write-Host ''
  Write-Host '    +=======================================================+' -ForegroundColor Cyan
  Write-Host '    |        Cloud Phone  Install Wizard                    |' -ForegroundColor Cyan
  Write-Host '    +=======================================================+' -ForegroundColor Cyan
  Write-Host '    Local Web Android console -- terminal UI' -ForegroundColor DarkGray
  if ($Version) { Write-Host "    Version $Version" -ForegroundColor DarkGray }
  Write-Host ''
}

function Write-TuiSep {
  Write-Host ('-' * $script:TuiWidth) -ForegroundColor Cyan
}

function Write-TuiBoxOpen {
  param([string]$Title = '')
  Write-TuiSep
  if ($Title) {
    Write-Host "  $Title" -ForegroundColor White
    Write-Host ('-' * $script:TuiWidth) -ForegroundColor DarkGray
  }
}

function Write-TuiBoxLine {
  param([string]$Message = '')
  Write-Host "  $Message"
}

function Write-TuiBoxClose {
  Write-TuiSep
  Write-Host ''
}

function Write-TuiLog {
  param(
    [string]$Level,
    [string]$Message
  )
  switch ($Level) {
    'ok'   { Write-Host '  [OK] ' -ForegroundColor Green  -NoNewline }
    'warn' { Write-Host '  [!]  ' -ForegroundColor Yellow -NoNewline }
    'err'  { Write-Host '  [X]  ' -ForegroundColor Red    -NoNewline }
    'info' { Write-Host '  [i]  ' -ForegroundColor Cyan   -NoNewline }
    'run'  { Write-Host '  [>]  ' -ForegroundColor Blue   -NoNewline }
    default { Write-Host '  [-]  ' -NoNewline }
  }
  Write-Host $Message
}

function Invoke-TuiRun {
  param([string]$Label, [scriptblock]$Action)
  Write-TuiLog run $Label
  $log = "$env:TEMP\cloud-phone-install.log"
  try {
    & $Action 2>&1 | Out-File -FilePath $log -Encoding utf8
    Write-TuiLog ok $Label
    return $true
  } catch {
    Write-TuiLog err "$Label -- $($_.Exception.Message)"
    Get-Content $log -Tail 5 -ErrorAction SilentlyContinue |
      ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    return $false
  }
}

function Read-TuiMenu {
  param([string]$Title, [string[]]$Items)
  $choice = 1
  while ($true) {
    Clear-Host
    Write-TuiBoxOpen $Title
    for ($i = 0; $i -lt $Items.Count; $i++) {
      $n = $i + 1
      if ($n -eq $choice) {
        Write-Host "  > $n) $($Items[$i])" -ForegroundColor Green
      } else {
        Write-Host "    $n) $($Items[$i])"
      }
    }
    Write-TuiBoxClose
    Write-Host '  Enter number + Enter  |  q = quit' -ForegroundColor DarkGray
    $key = Read-Host '  Choice'
    if ($key -match '^[qQ]$') { return $null }
    if ([string]::IsNullOrWhiteSpace($key)) { return $choice }
    $num = 0
    if ([int]::TryParse($key, [ref]$num)) {
      if ($num -ge 1 -and $num -le $Items.Count) { return $num }
    }
  }
}

function Read-TuiConfirm {
  param([string]$Prompt, [bool]$DefaultYes = $true)
  $hint = if ($DefaultYes) { '[Y/n]' } else { '[y/N]' }
  $ans = Read-Host "  $Prompt $hint"
  if ([string]::IsNullOrWhiteSpace($ans)) { return $DefaultYes }
  return $ans -match '^[yY]'
}

function Read-TuiPause {
  Write-Host ''
  Read-Host '  Press Enter to continue' | Out-Null
}
