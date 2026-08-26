$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $PSScriptRoot 'runtime-bin'), (Join-Path $RuntimeRoot 'bin\override'), (Join-Path $RuntimeRoot 'native\git\cmd'), $env:PATH) -join ';'

$SkillDir = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations'
$InputDeck = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx'

& $env:RUNTIME_NODE (Join-Path $SkillDir 'template_following_scripts\inspect_template_deck.mjs') `
  --workspace $PSScriptRoot `
  --pptx $InputDeck
if ($LASTEXITCODE -ne 0) { throw "V4 source inspection failed with exit code $LASTEXITCODE" }
