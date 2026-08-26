$ErrorActionPreference = 'Stop'
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $PSScriptRoot 'runtime-bin'), (Join-Path $RuntimeRoot 'bin\override'), (Join-Path $RuntimeRoot 'native\git\cmd'), $env:PATH) -join ';'
Push-Location $PSScriptRoot
try {
  & $env:RUNTIME_NODE '.\author_v4.mjs'
  if ($LASTEXITCODE -ne 0) { throw "author_v4.mjs failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}
