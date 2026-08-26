$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SkillDir = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations'
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $PSScriptRoot 'runtime-bin'), (Join-Path $RuntimeRoot 'bin\override'), (Join-Path $RuntimeRoot 'native\git\cmd'), $env:PATH) -join ';'

$Workspace = $PSScriptRoot
$SourceDeck = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v2.pptx'
$FrameMap = Join-Path $Workspace 'template-frame-map.json'
$StarterDeck = Join-Path $Workspace 'template-starter.pptx'
$PreviewDir = Join-Path $Workspace 'template-starter-preview'
$LayoutDir = Join-Path $Workspace 'template-starter-layout'
$ContactSheet = Join-Path $Workspace 'template-starter-contact-sheet.png'

& $env:RUNTIME_NODE (Join-Path $SkillDir 'container_tools\mark_artifact_operation_started.mjs') `
    --operation-kind edit `
    --expected-output-count 1 `
    --output-format pptx
if ($LASTEXITCODE -ne 0) { throw "Artifact operation marker failed with exit code $LASTEXITCODE" }

& $env:RUNTIME_NODE (Join-Path $SkillDir 'template_following_scripts\prepare_template_starter_deck.mjs') `
    --workspace $Workspace `
    --pptx $SourceDeck `
    --map $FrameMap `
    --out $StarterDeck `
    --preview-dir $PreviewDir `
    --layout-dir $LayoutDir `
    --contact-sheet $ContactSheet `
    --scale 1
if ($LASTEXITCODE -ne 0) { throw "Starter-deck preparation failed with exit code $LASTEXITCODE" }

Write-Output "STARTER_DECK=$StarterDeck"
