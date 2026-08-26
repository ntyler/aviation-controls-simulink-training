$ErrorActionPreference = 'Stop'

$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$Node = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE = $Node
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ((Join-Path $RuntimeRoot 'bin\override'), (Join-Path $RuntimeRoot 'native\git\cmd'), $env:PATH) -join ';'

& $Node (Join-Path $PSScriptRoot 'author_v3.mjs')
if ($LASTEXITCODE -ne 0) { throw "V3 authoring failed with exit code $LASTEXITCODE" }
