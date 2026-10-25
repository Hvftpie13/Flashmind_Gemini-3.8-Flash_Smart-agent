# flashmind installer (Windows PowerShell)
#   .\install.ps1                          -> Engram + Gemini CLI extension + skills
#   .\install.ps1 antigravity-cli cursor   -> also run `engram setup` for those agents
$ErrorActionPreference = "Stop"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed. Get it from https://nodejs.org (v18+)."
}

function Install-Engram {
  if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "-> Installing Engram with go install..."
    go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest
    $gobin = Join-Path (go env GOPATH) "bin"
    $env:Path = "$gobin;$env:Path"
    if (Get-Command engram -ErrorAction SilentlyContinue) { return }
  }
  Write-Host "-> Downloading the Engram binary from GitHub Releases..."
  $rel = Invoke-RestMethod "https://api.github.com/repos/Gentleman-Programming/engram/releases/latest"
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
  $asset = $rel.assets | Where-Object { $_.name -like "engram_*_windows_$arch.zip" } | Select-Object -First 1
  if (-not $asset) { Write-Error "No Windows asset found in release $($rel.tag_name)." }
  $zip = Join-Path $env:TEMP $asset.name
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip
  $bin = Join-Path $env:USERPROFILE "bin"
  New-Item -ItemType Directory -Force -Path $bin | Out-Null
  Expand-Archive $zip -DestinationPath $bin -Force
  Remove-Item $zip
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$bin*") {
    [Environment]::SetEnvironmentVariable("Path", "$bin;$userPath", "User")
  }
  $env:Path = "$bin;$env:Path"
  Write-Host "Engram installed to $bin (user PATH updated; open a new terminal)."
}

if (Get-Command engram -ErrorAction SilentlyContinue) {
  Write-Host "Engram already installed."
} else {
  Install-Engram
}

node "$Dir\test\smoke.js"

if (Get-Command gemini -ErrorAction SilentlyContinue) {
  Write-Host "-> Installing the Gemini CLI extension (Engram + flashmind + rules + skills)..."
  try { gemini extensions link "$Dir" } catch { gemini extensions install "$Dir" }
} else {
  Write-Host "Gemini CLI not found, skipping the extension."
}

$skillsDest = Join-Path $env:USERPROFILE ".agents\skills"
New-Item -ItemType Directory -Force -Path $skillsDest | Out-Null
Copy-Item -Recurse -Force (Join-Path $Dir "skills\*") $skillsDest
Write-Host "Skills copied to $skillsDest"

foreach ($agent in $args) {
  Write-Host "-> engram setup $agent"
  try { engram setup $agent } catch { Write-Warning "engram setup $agent failed" }
}

$MemPath = node "$Dir\server\index.js" --path
Write-Host @"

Done.
- Engram:    primary memory (%USERPROFILE%\.engram\engram.db)
- flashmind: fallback memory ($MemPath)
- Skills:    plan-first, no-invented-code, systematic-debugging, verify-before-done

Other apps: copy the config from configs\<app>\ and the rules from AGENTS.md.
Or run:     .\install.ps1 antigravity-cli cursor vscode-copilot
"@
