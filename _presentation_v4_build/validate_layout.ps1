$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$InspectPath = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx.inspect.ndjson'
$Inspect = Get-Content $InspectPath | ForEach-Object { $_ | ConvertFrom-Json }
$Notes = @($Inspect | Where-Object { $_.kind -eq 'notes' })
$Slides = @($Inspect | Where-Object { $_.kind -eq 'slide' })
if ($Slides.Count -ne 33) { throw "Expected 33 slide records, found $($Slides.Count)" }
if ($Notes.Count -ne 33) { throw "Expected 33 note records, found $($Notes.Count)" }
$BlankNotes = @($Notes | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.text) })
if ($BlankNotes.Count -gt 0) { throw "Blank speaker notes on slides: $($BlankNotes.slide -join ', ')" }

$OutOfBounds = @()
$PageFailures = @()
$FooterFailures = @()
$TitleWraps = @()
for ($n = 1; $n -le 33; $n++) {
  $layoutPath = Join-Path $PSScriptRoot ('final-layout\final-slide-{0:D2}.layout.json' -f $n)
  $layout = Get-Content $layoutPath -Raw | ConvertFrom-Json
  foreach ($element in $layout.elements) {
    if ($null -eq $element.bbox -or $element.bbox.Count -ne 4) { continue }
    $x = [double]$element.bbox[0]; $y = [double]$element.bbox[1]
    $w = [double]$element.bbox[2]; $h = [double]$element.bbox[3]
    if ($x -lt -0.5 -or $y -lt -0.5 -or ($x + $w) -gt 1280.5 -or ($y + $h) -gt 720.5) {
      $OutOfBounds += "slide $n $($element.name) [$x,$y,$w,$h]"
    }
  }
  $expected = '{0:D2}' -f $n
  $page = @($layout.elements | Where-Object { ([string]$_.text).Trim() -eq $expected -and [double]$_.bbox[0] -ge 1100 -and [double]$_.bbox[1] -ge 665 })
  if ($page.Count -eq 0) { $PageFailures += $n }
  $footer = @($layout.elements | Where-Object { ([string]$_.text).Trim() -eq 'AVIATION CONTROLS ENGINEERING ONBOARDING' -and [double]$_.bbox[0] -le 100 -and [double]$_.bbox[1] -ge 665 })
  if ($footer.Count -eq 0) { $FooterFailures += $n }
  $title = @($layout.elements | Where-Object { $_.name -like 'title-*' }) | Select-Object -First 1
  if ($null -ne $title -and $null -ne $title.textLayout -and [int]$title.textLayout.lineCount -gt 1) { $TitleWraps += $n }
}
if ($OutOfBounds.Count -gt 0) { throw "Out-of-bounds elements:`n$($OutOfBounds -join "`n")" }
if ($PageFailures.Count -gt 0) { throw "Missing/misplaced page markers on slides: $($PageFailures -join ', ')" }
if ($FooterFailures.Count -gt 0) { throw "Missing/misplaced footers on slides: $($FooterFailures -join ', ')" }
if ($TitleWraps.Count -gt 0) { throw "Unexpected wrapped titles on slides: $($TitleWraps -join ', ')" }

$v3Hash = (Get-FileHash (Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx') -Algorithm SHA256).Hash
if ($v3Hash -ne '66C9D620E45BA8CD704769EC56036B8D90EAC5F68A0E862638CF38B7C0E4F98B') { throw "v3 hash changed: $v3Hash" }
Write-Output 'LAYOUT_AUDIT=PASS'
Write-Output 'SLIDE_COUNT=33'
Write-Output 'NOTES_NONEMPTY=33'
Write-Output 'PAGE_MARKERS=01-33'
Write-Output "V3_SHA256=$v3Hash"

