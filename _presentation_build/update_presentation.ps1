param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$deckPath = Join-Path $ProjectRoot 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v2.pptx'
$buildDir = Join-Path $ProjectRoot '_presentation_build'
$screensDir = Join-Path $ProjectRoot 'screenshots'
$notesPath = Join-Path $buildDir 'notes_append.json'
$preEditBackup = Join-Path $buildDir 'template-starter.pptx'

if (-not (Test-Path -LiteralPath $deckPath)) { throw "Working deck not found: $deckPath" }
if (-not (Test-Path -LiteralPath $notesPath)) { throw "Notes append file not found: $notesPath" }
if (-not (Test-Path -LiteralPath $preEditBackup)) {
    Copy-Item -LiteralPath $deckPath -Destination $preEditBackup
}

$artifactMap = [ordered]@{
    6  = @{ File='pitch_rate_limiter.png'; Caption='Illustrative training model • typed ports, explicit 50 Hz contract, and reviewable hierarchy'; Dark=$false; Alt='Authentic PitchRateLimiter top-level Simulink model' }
    8  = @{ File='aircraft_feedback_loop.png'; Caption='Illustrative training model • command → controller → actuator/plant → sensor → feedback'; Dark=$true; Alt='Authentic aircraft feedback control loop Simulink model' }
    9  = @{ File='pitch_controller_subsystem.png'; Caption='Illustrative training subsystem • parameterized PI law and deterministic integrator state'; Dark=$false; Alt='Authentic pitch controller subsystem' }
    10 = @{ File='command_tracking_plot.png'; Caption='Executed desktop simulation • simplified training plant; command, response, error, and actuator are logged'; Dark=$false; Alt='Actual command tracking simulation plot' }
    11 = @{ File='autopilot_mode_logic.png'; Caption='Illustrative Stateflow training model • guards govern OFF, ARMED, ENGAGED, and DEGRADED'; Dark=$false; Alt='Authentic Stateflow autopilot mode logic chart' }
    18 = @{ File='pitch_rate_limiter_test_results.png'; Caption='Executed desktop tests • boundaries, modes, validity, active flag, tolerance, and 50 Hz timing'; Dark=$true; Alt='Actual PitchRateLimiter test results' }
    19 = @{ File='pitch_rate_limiter_logic.png'; Caption='Magnitude clamp—not a slew-rate limiter • invalid or non-normal command falls back to zero'; Dark=$false; Alt='Authentic PitchRateLimiter implementation subsystem' }
    20 = @{ File='data_dictionary_bus.png'; Caption='Actual FCS_Data.sldd inventory • FlightControlBus and controlled illustrative parameters'; Dark=$false; Alt='Actual data dictionary and FlightControlBus inventory' }
    22 = @{ File='pitch_rate_limiter_harness.png'; Caption='Standalone executable harness • Simulink Test unavailable; assessment logic remains in MATLAB'; Dark=$false; Alt='Authentic standalone PitchRateLimiter harness model' }
    24 = @{ File='pitch_rate_limiter_test_report.png'; Caption='No .mldatx manufactured • executed MATLAB suite with retained CSV, MAT, HTML, and image results'; Dark=$true; Alt='Actual executable MATLAB test-suite report summary' }
    25 = @{ File='callback_workflow.png'; Caption='Actual external callback functions • setup, preload, post-load, simulate/assess, and cleanup'; Dark=$false; Alt='Actual callback workflow and code summary' }
    26 = @{ File='referenced_architecture.png'; Caption='Updated architecture • model references, explicit routing, FlightControlBus, and resolved interfaces'; Dark=$false; Alt='Authentic referenced flight-control architecture' }
    31 = @{ File='evidence_chain_summary.png'; Caption='Verified desktop training chain • no Jenkins or HIL execution claimed'; Dark=$true; Alt='Actual desktop training evidence-chain summary' }
}

foreach ($entry in $artifactMap.GetEnumerator()) {
    $imagePath = Join-Path $screensDir $entry.Value.File
    if (-not (Test-Path -LiteralPath $imagePath)) { throw "Required presentation image missing: $imagePath" }
}

$notesAppend = Get-Content -Raw -LiteralPath $notesPath | ConvertFrom-Json
$resultsCsv = Join-Path $ProjectRoot 'results\PitchRateLimiter_TestResults.csv'
$testSummary = 'Executed test summary was retained with the project.'
if (Test-Path -LiteralPath $resultsCsv) {
    $rows = @(Import-Csv -LiteralPath $resultsCsv)
    $passProperty = $null
    if ($rows.Count -gt 0) {
        $passProperty = @($rows[0].PSObject.Properties.Name | Where-Object { $_ -ieq 'Passed' }) | Select-Object -First 1
    }
    if ($passProperty) {
        $passed = @($rows | Where-Object {
            $value = [string]($_.$passProperty)
            $value -match '^(?i:true|pass|1)$'
        }).Count
        $testSummary = "Executed result: $passed of $($rows.Count) recorded assessments passed."
    }
}

$architectureSummary = 'The referenced architecture update completed with the delivered controlled interfaces.'
$validationPath = Join-Path $ProjectRoot 'results\validation_summary.txt'
if (Test-Path -LiteralPath $validationPath) {
    $validationText = Get-Content -Raw -LiteralPath $validationPath
    if ($validationText -match 'Models updated:\s*(\d+)\/(\d+)') {
        $architectureSummary = "Architecture validation: $($Matches[1]) of $($Matches[2]) delivered models updated successfully."
    }
}

function Get-Rgb([int]$Red,[int]$Green,[int]$Blue) {
    return $Red + (256 * $Green) + (65536 * $Blue)
}

function Get-NotesBody($Slide) {
    $notesPage = $Slide.NotesPage
    for ($index = 1; $index -le $notesPage.Shapes.Count; $index++) {
        $shape = $notesPage.Shapes.Item($index)
        try {
            if ($shape.Type -eq 14 -and $shape.PlaceholderFormat.Type -eq 2) { return $shape }
        } catch { }
    }
    throw "Notes body placeholder not found on slide $($Slide.SlideIndex)."
}

function Replace-SuggestedVisual([string]$Existing,[string]$NewVisual) {
    return [regex]::Replace($Existing,'(?s)(Suggested visual:\s*).*?(\s*Speaker notes:)',("`$1" + $NewVisual + "`r`r`$2"),1)
}

function Rewrite-SpeakerParagraph([string]$Existing,[string]$NewParagraph) {
    return [regex]::Replace($Existing,'(?s)(Speaker notes:\s*).*?(\s*Key teaching points:)',("`$1" + $NewParagraph + "`r`r`$2"),1)
}

$suggestedVisuals = @{
    6='An authentic export of the delivered PitchRateLimiter top level labels typed ports, hierarchy, and 50 Hz execution.'
    8='An authentic export of the delivered closed-loop feedback model shows command, control, plant, sensor, feedback, and disturbance paths.'
    9='The real Pitch Controller subsystem exposes proportional and integral paths with controlled parameters.'
    10='An actual desktop simulation plot shows command, measured response, error, actuator response, and a disturbance.'
    11='The real Stateflow chart shows OFF, ARMED, ENGAGED, and DEGRADED states with guarded transitions.'
    18='An executed result plot summarizes the real limiter boundary, mode, validity, flag, tolerance, and timing assessments.'
    19='The real Pitch Rate Limiter Logic subsystem shows magnitude saturation, validity selection, fallback, and active-flag logic.'
    20='A dictionary-derived inventory shows FlightControlBus elements and controlled training parameters from FCS_Data.sldd.'
    22='The real standalone PitchRateLimiter_Harness model shows sources, referenced component, and retained outputs.'
    24='An actual report summary shows the executable MATLAB fallback used because Simulink Test is unavailable.'
    25='A generated view of the delivered external callback functions shows setup through cleanup.'
    26='The authentic referenced architecture model shows FlightControlBus, model references, and explicit routing.'
    31='An executed desktop evidence summary connects requirements, controlled artifacts, tests, results, and validation without HIL claims.'
}

$paragraphRewrites = @{
    22='Because Simulink Test is unavailable, the delivered project uses a standalone executable Simulink harness. From Workspace blocks provide deterministic q_cmd_in, normal_mode, and input_valid signals at 50 Hz. A Model block references PitchRateLimiter, and To Workspace blocks retain q_cmd_out and limiter_active. run_pitch_rate_limiter_tests.m evaluates expected values, active-flag behavior, numeric tolerance, and timing outside the harness. This preserves the important separation: the harness supplies and captures data, while the requirement oracle remains in reviewable assessment code. No .mldatx file is manufactured.'
    24='Simulink Test is not installed or licensed on this computer, so the delivered project deliberately contains no .mldatx file. The authentic visual summarizes the executable MATLAB assessment suite and retained CSV, MAT, HTML, and PNG results. In a licensed environment, Test Manager can organize test files, suites, cases, callbacks, assessments, and iterations. That organization is useful, but the artifact alone would still require controlled configuration, traceability, review, and disposition of failures. The fallback used here is explicit, repeatable, and honest about the available products.'
    31='Narrate the verified desktop training chain only. PRL-001 through PRL-005 define the illustrative limiter behavior and interface expectations. FCS_Data.sldd controls parameters and FlightControlBus. PitchRateLimiter.slx implements the magnitude clamp and fallback; the standalone harness executes deterministic 50 Hz stimuli; MATLAB assessments retain actual and expected values, pass/fail, configuration, and reports; the referenced architecture update validates interface consistency. No .mldatx, Jenkins run, HIL hardware, generated code, or certification approval is claimed. The value is a reproducible, inspectable training evidence path—not a completed aircraft certification package.'
}

function Set-SlideTitle($Slide,[string]$NewText) {
    for ($index = 1; $index -le $Slide.Shapes.Count; $index++) {
        $shape = $Slide.Shapes.Item($index)
        try {
            if ($shape.HasTextFrame -and $shape.TextFrame.HasText -and $shape.Top -ge 40 -and $shape.Top -le 90 -and $shape.Width -gt 700) {
                $range = $shape.TextFrame.TextRange
                $fontName = $range.Font.Name
                $fontSize = $range.Font.Size
                $fontBold = $range.Font.Bold
                $fontColor = $range.Font.Color.RGB
                $alignment = $range.ParagraphFormat.Alignment
                $range.Text = $NewText
                $range.Font.Name = $fontName
                $range.Font.Size = $fontSize
                $range.Font.Bold = $fontBold
                $range.Font.Color.RGB = $fontColor
                $range.ParagraphFormat.Alignment = $alignment
                return
            }
        } catch { }
    }
    throw "Title shape not found on slide $($Slide.SlideIndex)."
}

function Clear-Body($Slide) {
    for ($index = $Slide.Shapes.Count; $index -ge 1; $index--) {
        $shape = $Slide.Shapes.Item($index)
        $top = [double]$shape.Top
        if ($top -ge 105 -and $top -lt 500) { $shape.Delete() }
    }
}

function Add-Artifact($Slide,[string]$ImagePath,[string]$Caption,[bool]$Dark,[string]$AltText) {
    Clear-Body $Slide
    $picture = $Slide.Shapes.AddPicture($ImagePath,0,-1,0,0,-1,-1)
    $picture.LockAspectRatio = -1
    $maxWidth = 820.0
    $maxHeight = 338.0
    $originalWidth = [double]$picture.Width
    $originalHeight = [double]$picture.Height
    $scale = [math]::Min($maxWidth / $originalWidth,$maxHeight / $originalHeight)
    # With aspect ratio locked, setting both dimensions would apply the scale twice.
    # Set width once and let PowerPoint derive the matching height.
    $picture.Width = $originalWidth * $scale
    $picture.Left = (960.0 - [double]$picture.Width) / 2.0
    $picture.Top = 112.0 + (($maxHeight - [double]$picture.Height) / 2.0)
    $picture.Line.Visible = -1
    $picture.Line.ForeColor.RGB = Get-Rgb 42 181 196
    $picture.Line.Weight = 1.25
    $picture.AlternativeText = $AltText
    $captionShape = $Slide.Shapes.AddTextbox(1,70,458,820,33)
    $captionShape.Name = 'V2 Artifact Caption'
    $captionShape.TextFrame.TextRange.Text = $Caption
    $captionShape.TextFrame.TextRange.Font.Name = 'Aptos'
    $captionShape.TextFrame.TextRange.Font.Size = 12.5
    $captionShape.TextFrame.TextRange.Font.Bold = -1
    $captionShape.TextFrame.TextRange.ParagraphFormat.Alignment = 2
    $captionShape.TextFrame.VerticalAnchor = 3
    $captionShape.TextFrame.MarginLeft = 0
    $captionShape.TextFrame.MarginRight = 0
    $captionShape.TextFrame.MarginTop = 0
    $captionShape.TextFrame.MarginBottom = 0
    if ($Dark) {
        $captionShape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb 105 220 230
    } else {
        $captionShape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb 16 36 58
    }
    $captionShape.Fill.Visible = 0
    $captionShape.Line.Visible = 0
}

$existingPowerPointPids = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$app = $null
$presentation = $null
try {
    $app = New-Object -ComObject PowerPoint.Application
    $app.DisplayAlerts = 1
    $presentation = $app.Presentations.Open($deckPath,$false,$false,$false)
    if ($presentation.Slides.Count -ne 32) { throw "Unexpected slide count before edit: $($presentation.Slides.Count)" }

    Set-SlideTitle $presentation.Slides.Item(24) 'MATLAB tests preserve intent without .mldatx'

    foreach ($entry in $artifactMap.GetEnumerator()) {
        $slideNumber = [int]$entry.Key
        $config = $entry.Value
        Add-Artifact $presentation.Slides.Item($slideNumber) (Join-Path $screensDir $config.File) $config.Caption $config.Dark $config.Alt
    }

    foreach ($entry in $artifactMap.GetEnumerator()) {
        $slideNumber = [int]$entry.Key
        $slide = $presentation.Slides.Item($slideNumber)
        $notesBody = Get-NotesBody $slide
        $existing = [string]$notesBody.TextFrame.TextRange.Text
        if ($suggestedVisuals.ContainsKey($slideNumber)) {
            $existing = Replace-SuggestedVisual $existing $suggestedVisuals[$slideNumber]
        }
        if ($paragraphRewrites.ContainsKey($slideNumber)) {
            $existing = Rewrite-SpeakerParagraph $existing $paragraphRewrites[$slideNumber]
        }
        $existing = $existing.Replace('PitchRateLimiter_Test_Results.csv','PitchRateLimiter_TestResults.csv')
        $existing = $existing.Replace('{{TEST_SUMMARY}}',$testSummary).Replace('{{ARCHITECTURE_SUMMARY}}',$architectureSummary)
        $appendText = [string]$notesAppend.PSObject.Properties[[string]$slideNumber].Value
        $appendText = $appendText.Replace('{{TEST_SUMMARY}}',$testSummary).Replace('{{ARCHITECTURE_SUMMARY}}',$architectureSummary)
        # Make reruns idempotent by removing the prior V2 artifact appendix.
        $existing = [regex]::Replace($existing,'(?s)\r?\n\r?\nV2 (?:artifact update|environment note):.*$','')
        $notesBody.TextFrame.TextRange.Text = $existing.TrimEnd() + "`r`r" + $appendText.Trim()
    }

    $presentation.Save()
    $presentation.Close()
    $presentation = $null

    $check = $app.Presentations.Open($deckPath,$true,$false,$false)
    if ($check.Slides.Count -ne 32) { throw "Unexpected slide count after edit: $($check.Slides.Count)" }
    foreach ($entry in $artifactMap.GetEnumerator()) {
        $slide = $check.Slides.Item([int]$entry.Key)
        $pictureCount = 0
        for ($index = 1; $index -le $slide.Shapes.Count; $index++) {
            if ($slide.Shapes.Item($index).Type -eq 13) { $pictureCount++ }
        }
        if ($pictureCount -lt 1) { throw "Slide $($entry.Key) has no embedded artifact image after save." }
        $notesBody = Get-NotesBody $slide
        if (-not $notesBody.TextFrame.HasText) { throw "Slide $($entry.Key) has no speaker notes after save." }
    }
    $check.Close()
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($check) | Out-Null
    Write-Output "Updated and re-opened presentation successfully: $deckPath"
} finally {
    if ($presentation) { try { $presentation.Close() } catch { } }
    if ($app -and $existingPowerPointPids.Count -eq 0) { try { $app.Quit() } catch { } }
    if ($presentation) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) | Out-Null }
    if ($app) { [Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
