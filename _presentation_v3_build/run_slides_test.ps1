$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SkillDir = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations'
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $RuntimeRoot 'bin\override'), $env:PATH) -join ';'

& (Join-Path $RuntimeRoot 'python\python.exe') `
    (Join-Path $SkillDir 'container_tools\slides_test.py') `
    (Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx') `
    --width 1600 `
    --height 900 `
    --pad_px 80
if ($LASTEXITCODE -ne 0) { throw "slides_test.py failed with exit code $LASTEXITCODE" }
