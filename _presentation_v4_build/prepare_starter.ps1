$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SkillDir = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations'
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $PSScriptRoot 'runtime-bin'), (Join-Path $RuntimeRoot 'bin\override'), (Join-Path $RuntimeRoot 'native\git\cmd'), $env:PATH) -join ';'

$SourceDeck = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx'
$FrameMap = Join-Path $PSScriptRoot 'template-frame-map.json'
$StarterDeck = Join-Path $PSScriptRoot 'template-starter.pptx'
$PreviewDir = Join-Path $PSScriptRoot 'template-starter-preview'
$LayoutDir = Join-Path $PSScriptRoot 'template-starter-layout'

& $env:RUNTIME_NODE (Join-Path $SkillDir 'template_following_scripts\prepare_template_starter_deck.mjs') `
    --workspace $PSScriptRoot `
    --pptx $SourceDeck `
    --map $FrameMap `
    --out $StarterDeck `
    --preview-dir $PreviewDir `
    --layout-dir $LayoutDir `
    --scale 1
if ($LASTEXITCODE -ne 0) { throw "Starter-deck preparation failed with exit code $LASTEXITCODE" }

Write-Output "STARTER_DECK=$StarterDeck"
