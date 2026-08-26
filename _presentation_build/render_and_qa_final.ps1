param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$deckPath = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v2.pptx'
$renderDir = Join-Path $PSScriptRoot 'final_render'
$qaCsv = Join-Path $PSScriptRoot 'final_presentation_qa.csv'
$qaText = Join-Path $PSScriptRoot 'final_presentation_qa.txt'
$targetSlides = @(6,8,9,10,11,18,19,20,22,24,25,26,31)

if (-not (Test-Path -LiteralPath $deckPath)) { throw "Final deck not found: $deckPath" }
[IO.Directory]::CreateDirectory($renderDir) | Out-Null

function Get-NotesText($Slide) {
    $notesPage = $Slide.NotesPage
    for ($index = 1; $index -le $notesPage.Shapes.Count; $index++) {
        $shape = $notesPage.Shapes.Item($index)
        try {
            if ($shape.Type -eq 14 -and $shape.PlaceholderFormat.Type -eq 2) {
                return [string]$shape.TextFrame.TextRange.Text
            }
        } catch { }
    }
    return ''
}

$existingPowerPointPids = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$app = $null
$presentation = $null
$rows = @()
$allNotesText = @()
try {
    $app = New-Object -ComObject PowerPoint.Application
    $app.DisplayAlerts = 1
    $presentation = $app.Presentations.Open($deckPath,$true,$false,$false)

    if ($presentation.Slides.Count -ne 32) { throw "Expected 32 slides, found $($presentation.Slides.Count)." }
    if ([math]::Abs([double]$presentation.PageSetup.SlideWidth - 960.0) -gt 0.1 -or
        [math]::Abs([double]$presentation.PageSetup.SlideHeight - 540.0) -gt 0.1) {
        throw "Expected 16:9 960 x 540 points, found $($presentation.PageSetup.SlideWidth) x $($presentation.PageSetup.SlideHeight)."
    }

    for ($slideNumber = 1; $slideNumber -le $presentation.Slides.Count; $slideNumber++) {
        $slide = $presentation.Slides.Item($slideNumber)
        $renderPath = Join-Path $renderDir ('slide-{0:D2}.png' -f $slideNumber)
        $slide.Export($renderPath,'PNG',1920,1080)

        $notesText = (Get-NotesText $slide).Trim()
        $allNotesText += $notesText
        $pictureCount = 0
        $artifactPictureCount = 0
        $captionCount = 0
        $overflowCount = 0
        $titleText = ''
        for ($index = 1; $index -le $slide.Shapes.Count; $index++) {
            $shape = $slide.Shapes.Item($index)
            if ($shape.Type -eq 13) {
                $pictureCount++
                if (-not [string]::IsNullOrWhiteSpace([string]$shape.AlternativeText)) { $artifactPictureCount++ }
            }
            if ([string]$shape.Name -eq 'V2 Artifact Caption') { $captionCount++ }
            if ([double]$shape.Left -lt -2 -or [double]$shape.Top -lt -2 -or
                ([double]$shape.Left + [double]$shape.Width) -gt 962 -or
                ([double]$shape.Top + [double]$shape.Height) -gt 542) { $overflowCount++ }
            try {
                if ([string]::IsNullOrWhiteSpace($titleText) -and $shape.HasTextFrame -and $shape.TextFrame.HasText -and
                    [double]$shape.Top -ge 35 -and [double]$shape.Top -le 95 -and [double]$shape.Width -gt 700) {
                    $titleText = [string]$shape.TextFrame.TextRange.Text
                }
            } catch { }
        }

        $isTarget = $targetSlides -contains $slideNumber
        $rows += [pscustomobject]@{
            Slide = $slideNumber
            Title = $titleText.Trim()
            NotesCharacters = $notesText.Length
            HasNotes = (-not [string]::IsNullOrWhiteSpace($notesText))
            PictureCount = $pictureCount
            ArtifactPicturesWithAltText = $artifactPictureCount
            ArtifactCaptionCount = $captionCount
            TargetSlide = $isTarget
            ShapeOverflowCount = $overflowCount
            RenderBytes = (Get-Item -LiteralPath $renderPath).Length
        }
    }

    $slide24Title = [string]($rows | Where-Object Slide -eq 24 | Select-Object -ExpandProperty Title)
    if ($slide24Title -ne 'MATLAB tests preserve intent without .mldatx') { throw "Unexpected slide 24 title: $slide24Title" }
    if (@($rows | Where-Object { -not $_.HasNotes }).Count -ne 0) { throw 'One or more slides have no speaker notes.' }
    if (@($rows | Where-Object { $_.TargetSlide -and ($_.ArtifactPicturesWithAltText -lt 1 -or $_.ArtifactCaptionCount -lt 1) }).Count -ne 0) {
        throw 'One or more updated slides lacks an embedded artifact image with alt text or its artifact caption.'
    }
    if (@($rows | Where-Object { $_.RenderBytes -lt 10000 }).Count -ne 0) { throw 'One or more slide renders is unexpectedly small.' }
    $notesCorpus = $allNotesText -join "`n"
    if ($notesCorpus -match '\{\{(?:TEST_SUMMARY|ARCHITECTURE_SUMMARY)\}\}') { throw 'Unresolved summary token remains in speaker notes.' }
    if ($notesCorpus -match 'PitchRateLimiter_Test_Results') { throw 'Legacy evidence filename remains in speaker notes.' }

    $rows | Export-Csv -LiteralPath $qaCsv -NoTypeInformation -Encoding UTF8
    $summary = @(
        'FINAL PRESENTATION QA',
        "Deck: $deckPath",
        "Slides: $($presentation.Slides.Count)",
        "Slide size: $($presentation.PageSetup.SlideWidth) x $($presentation.PageSetup.SlideHeight) points (16:9)",
        "Rendered slides: $(@(Get-ChildItem -LiteralPath $renderDir -Filter 'slide-*.png').Count)",
        "Slides with notes: $(@($rows | Where-Object HasNotes).Count)/$($rows.Count)",
        "Updated slides with artifact image, alt text, and caption: $(@($rows | Where-Object { $_.TargetSlide -and $_.ArtifactPicturesWithAltText -ge 1 -and $_.ArtifactCaptionCount -ge 1 }).Count)/$($targetSlides.Count)",
        "Slides reporting any off-canvas shape: $(@($rows | Where-Object { $_.ShapeOverflowCount -gt 0 }).Count)",
        "Slide 24 title: $slide24Title",
        'Speaker-note summary tokens and evidence paths: PASS',
        'PowerPoint open and PNG export: PASS'
    )
    Set-Content -LiteralPath $qaText -Value $summary -Encoding UTF8
    $summary
} finally {
    if ($presentation) { try { $presentation.Close() } catch { } }
    if ($app -and $existingPowerPointPids.Count -eq 0) { try { $app.Quit() } catch { } }
    if ($presentation) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) | Out-Null }
    if ($app) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
