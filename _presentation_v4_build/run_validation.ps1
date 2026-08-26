$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$SkillDir = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations'
$RuntimeRoot = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$env:RUNTIME_NODE = Join-Path $RuntimeRoot 'node\bin\node.exe'
$env:RUNTIME_NODE_MODULES = Join-Path $RuntimeRoot 'node\node_modules'
$env:RUNTIME_BIN_DIR = Join-Path $RuntimeRoot 'bin\override'
$env:PATH = ('C:\Program Files\Git\usr\bin', (Join-Path $PSScriptRoot 'runtime-bin'), (Join-Path $RuntimeRoot 'bin\override'), $env:PATH) -join ';'

& (Join-Path $RuntimeRoot 'python\python.exe') `
  (Join-Path $SkillDir 'container_tools\slides_test.py') `
  (Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx') `
  --width 1600 --height 900 --pad_px 80
if ($LASTEXITCODE -ne 0) { throw "slides_test.py failed with exit code $LASTEXITCODE" }

& $env:RUNTIME_NODE (Join-Path $SkillDir 'template_following_scripts\check_template_fidelity.mjs') `
  --workspace $PSScriptRoot `
  --final-pptx (Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx') `
  --map (Join-Path $PSScriptRoot 'template-frame-map.json') `
  --starter-pptx (Join-Path $PSScriptRoot 'template-starter.pptx') `
  --starter-layout-dir (Join-Path $PSScriptRoot 'template-starter-layout') `
  --final-layout-dir (Join-Path $PSScriptRoot 'final-layout') `
  --edit-dir $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw "check_template_fidelity.mjs failed with exit code $LASTEXITCODE" }

& (Join-Path $PSScriptRoot 'validate_layout.ps1')
