$ErrorActionPreference = 'Stop'

$Python = 'C:\Users\Tyler\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$MontageTool = 'C:\Users\Tyler\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations\container_tools\create_montage.py'
$SlidesDir = Join-Path $PSScriptRoot 'template-inspect\source-slides'
$OutDir = Join-Path $PSScriptRoot 'source-montages'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

for ($group = 0; $group -lt 4; $group++) {
    $start = $group * 8 + 1
    $end = [Math]::Min($start + 7, 32)
    $files = @()
    for ($slide = $start; $slide -le $end; $slide++) {
        $files += Join-Path $SlidesDir ('source-slide-{0:D2}.png' -f $slide)
    }
    $outFile = Join-Path $OutDir ('source-slides-{0:D2}-{1:D2}.png' -f $start, $end)
    & $Python $MontageTool --input_files @files --output_file $outFile --num_col 4 --cell_width 640 --cell_height 360 --gap 18 --label_mode filename --fail_on_image_error
    if ($LASTEXITCODE -ne 0) { throw "Montage generation failed for slides $start-$end" }
}
