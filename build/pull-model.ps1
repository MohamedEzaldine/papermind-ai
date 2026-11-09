# Downloads the local AI model through Ollama's HTTP API, without showing a console window.
# Run by the installer through nsExec::ExecToLog, so every line printed here appears in
# the installer's progress list. Output is kept ASCII so it displays correctly there.
param(
  # "auto" picks the model that suits this computer (same rules as the app, see server/hardware.ts).
  [string]$Model = "auto",
  [string]$OllamaExe = "ollama",
  [string]$OllamaHost = "http://127.0.0.1:11434"
)

$ErrorActionPreference = "Stop"

function Test-Ollama {
  try {
    Invoke-RestMethod -Uri "$OllamaHost/api/tags" -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    return $false
  }
}

# 0. Choose the model for this computer: a graphics card with 6+ GB and 12+ GB RAM -> accurate (7B),
#    8+ GB RAM -> balanced (3B), otherwise fast (1.5B). Without a GPU, larger models are far too slow.
if ($Model -eq "auto") {
  $ramGB = 0
  try { $ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1) } catch {}
  $vramGB = 0
  try {
    $smi = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null
    if ($LASTEXITCODE -eq 0 -and $smi) { $vramGB = [math]::Round([double](($smi | Select-Object -First 1).Trim()) / 1024, 1) }
  } catch {}
  if ($vramGB -ge 6 -and $ramGB -ge 12) { $Model = "qwen2.5:7b"; $mode = "accurate" }
  elseif ($ramGB -ge 8) { $Model = "qwen2.5:3b"; $mode = "balanced" }
  else { $Model = "qwen2.5:1.5b"; $mode = "fast" }
  Write-Output ("This computer: {0} GB RAM, graphics memory {1} GB -> {2} mode ({3})" -f $ramGB, $vramGB, $mode, $Model)
}

# 1. Make sure the Ollama service is running.
if (-not (Test-Ollama)) {
  Write-Output "Starting the local AI engine..."
  try {
    Start-Process -FilePath $OllamaExe -ArgumentList "serve" -WindowStyle Hidden | Out-Null
  } catch {
    Write-Output "Could not start Ollama: $($_.Exception.Message)"
    exit 2
  }
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Ollama) { $ready = $true; break }
  }
  if (-not $ready) {
    Write-Output "The local AI engine did not start."
    exit 3
  }
}

# 2. Pull the model, streaming progress as percentages.
Write-Output "Downloading AI model $Model ..."
try {
  $request = [System.Net.HttpWebRequest]::Create("$OllamaHost/api/pull")
  $request.Method = "POST"
  $request.ContentType = "application/json"
  $request.Timeout = [System.Threading.Timeout]::Infinite
  $request.ReadWriteTimeout = 30 * 60 * 1000
  $body = [System.Text.Encoding]::UTF8.GetBytes((@{ name = $Model; stream = $true } | ConvertTo-Json -Compress))
  $request.ContentLength = $body.Length
  $stream = $request.GetRequestStream()
  $stream.Write($body, 0, $body.Length)
  $stream.Close()

  $reader = New-Object System.IO.StreamReader($request.GetResponse().GetResponseStream())
  $lastPercent = -1
  $lastStatus = ""
  $succeeded = $false
  while (-not $reader.EndOfStream) {
    $line = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $msg = $line | ConvertFrom-Json
    if ($msg.error) {
      Write-Output "Model download failed: $($msg.error)"
      exit 4
    }
    if ($msg.total -and $msg.completed -and $msg.total -gt 50MB) {
      # Report every 2% for the large model files only.
      $percent = [math]::Floor(($msg.completed / $msg.total) * 100)
      if ($percent -ge $lastPercent + 2 -or ($percent -eq 100 -and $lastPercent -ne 100)) {
        $doneMb = [math]::Round($msg.completed / 1MB)
        $totalMb = [math]::Round($msg.total / 1MB)
        Write-Output ("Downloading AI model: {0}%  ({1} / {2} MB)" -f $percent, $doneMb, $totalMb)
        $lastPercent = $percent
      }
    } elseif ($msg.status -and $msg.status -ne $lastStatus -and $msg.status -notlike "pulling *") {
      Write-Output ("AI model: " + $msg.status)
      $lastStatus = $msg.status
    }
    if ($msg.status -eq "success") { $succeeded = $true }
  }
  $reader.Close()
  if ($succeeded) {
    Write-Output "AI model is ready."
    exit 0
  }
  Write-Output "Model download ended without confirmation."
  exit 5
} catch {
  Write-Output "Model download failed: $($_.Exception.Message)"
  exit 6
}
