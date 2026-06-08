$ErrorActionPreference = "Stop"

$node = "C:\Users\breky\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (-not (Test-Path $node)) {
  $node = "node"
}

if (-not $env:BOT_TOKEN) {
  $envFile = Join-Path $PSScriptRoot ".env"
  if (-not (Test-Path $envFile)) {
    $token = Read-Host "BOT_TOKEN"
    Set-Content -LiteralPath $envFile -Value @(
      "BOT_TOKEN=$token",
      "PORT=3000",
      "PUBLIC_MINIAPP_URL=http://localhost:3000/miniapp/",
      "DB_PATH=data/miniapp.sqlite"
    ) -Encoding UTF8
  }
}

& $node (Join-Path $PSScriptRoot "src/main.mjs")
