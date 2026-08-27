function summary = run_pitch_rate_limiter_tests(projectRoot, varargin)
%RUN_PITCH_RATE_LIMITER_TESTS Execute the MATLAB-based limiter test suite.
%
% Simulink Test is not required by this suite.  The standalone
% PitchRateLimiter_Harness model is driven with deterministic 50 Hz
% timeseries data, and its real simulation outputs are assessed here.
% Evidence is saved as CSV, MAT, HTML, and PNG files.  This function does
% not create or imply the existence of an .mldatx Test Manager file.
%
% Name-value options support the isolated learner-practice workflow without
% changing the controlled baseline defaults:
%   HarnessName       Model name (default PitchRateLimiter_Harness)
%   HarnessFile       Full path to the harness SLX
%   OutputRoot        Root that receives results/ and reports/
%   EvidenceStem      File-name prefix for retained evidence
%   InitializeBaseline  Refresh managed FCS_Data.sldd entries first

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);
modelsDir = fullfile(projectRoot, 'models');
dataDir = fullfile(projectRoot, 'data');

parser = inputParser;
parser.FunctionName = mfilename;
addParameter(parser, 'HarnessName', 'PitchRateLimiter_Harness', ...
    @(value) ischar(value) || (isstring(value) && isscalar(value)));
addParameter(parser, 'HarnessFile', '', ...
    @(value) ischar(value) || (isstring(value) && isscalar(value)));
addParameter(parser, 'OutputRoot', projectRoot, ...
    @(value) ischar(value) || (isstring(value) && isscalar(value)));
addParameter(parser, 'EvidenceStem', 'PitchRateLimiter', ...
    @(value) ischar(value) || (isstring(value) && isscalar(value)));
addParameter(parser, 'InitializeBaseline', true, ...
    @(value) islogical(value) && isscalar(value));
parse(parser, varargin{:});

harness = char(string(parser.Results.HarnessName));
outputRoot = char(string(parser.Results.OutputRoot));
evidenceStem = char(string(parser.Results.EvidenceStem));
if isempty(outputRoot)
    outputRoot = projectRoot;
end
if any(contains(evidenceStem, {'/', '\\', ':'})) || isempty(evidenceStem)
    error('Training:InvalidEvidenceStem', ...
        'EvidenceStem must be a nonempty file-name stem, not a path.');
end
resultsDir = fullfile(outputRoot, 'results');
reportsDir = fullfile(outputRoot, 'reports');

localEnsureFolder(resultsDir);
localEnsureFolder(reportsDir);
scriptsDir = fileparts(mfilename('fullpath'));

harnessFile = char(string(parser.Results.HarnessFile));
if isempty(harnessFile)
    harnessFile = fullfile(modelsDir, [harness '.slx']);
end
harnessDir = fileparts(harnessFile);
localAssertHarnessIdentity(harness, harnessFile, false);
pathCandidates = {harnessDir, modelsDir, dataDir, scriptsDir};
pathsAddedHere = strings(0,1);
for pathIndex = 1:numel(pathCandidates)
    candidate = pathCandidates{pathIndex};
    if ~localPathContains(candidate)
        addpath(candidate);
        pathsAddedHere(end+1,1) = string(candidate); %#ok<AGROW>
    end
end
pathGuard = onCleanup(@() localRemoveTemporaryPaths(pathsAddedHere)); %#ok<NASGU>
localAssertHarnessIdentity(harness, harnessFile, false);

if parser.Results.InitializeBaseline && exist('initialize_training_data', 'file') == 2
    initialize_training_data(projectRoot);
end

if ~isfile(harnessFile)
    error('Training:MissingHarness', ...
        'Required standalone harness not found: %s', harnessFile);
end

sampleTime = localTrainingValue(projectRoot, 'Sample_time', 0.02);
limit = localTrainingValue(projectRoot, 'q_limit_normal', 12.0);
tolerance = 1.0e-9;
requiredSampleTime = 0.02;
timingTolerance = max(1.0e-12, requiredSampleTime * 1.0e-9);
sampleTimeConfigurationPass = ...
    abs(sampleTime - requiredSampleTime) <= timingTolerance;

[testDefinition, qCommand, normalMode, inputValid] = ...
    localTestDefinition(requiredSampleTime, limit);
testTime = testDefinition.Time_s;

qCommandInput = timeseries(qCommand, testTime);
qCommandInput.Name = 'q_cmd_test';
qCommandInput.DataInfo.Units = 'deg/s';
normalModeInput = timeseries(logical(normalMode), testTime);
normalModeInput.Name = 'normal_mode_test';
inputValidInput = timeseries(logical(inputValid), testTime);
inputValidInput.Name = 'input_valid_test';

load_system(harnessFile);
localAssertHarnessIdentity(harness, harnessFile, true);
set_param(harness, 'SimulationCommand', 'update');

simIn = Simulink.SimulationInput(harness);
simIn = simIn.setVariable('q_cmd_test', qCommandInput, 'Workspace', harness);
simIn = simIn.setVariable('normal_mode_test', normalModeInput, 'Workspace', harness);
simIn = simIn.setVariable('input_valid_test', inputValidInput, 'Workspace', harness);
simIn = simIn.setModelParameter( ...
    'StopTime', sprintf('%.15g', testTime(end)), ...
    'SolverType', 'Fixed-step', ...
    'FixedStep', sprintf('%.15g', requiredSampleTime), ...
    'SaveTime', 'on', ...
    'TimeSaveName', 'tout', ...
    'ReturnWorkspaceOutputs', 'on');

simulationStarted = datetime('now', 'TimeZone', 'local');
simOut = sim(simIn);
simulationEnded = datetime('now', 'TimeZone', 'local');

qOutputSignal = localRequireOutput(simOut, 'q_cmd_out_harness');
limiterActiveSignal = localRequireOutput(simOut, 'limiter_active_harness');

[qActual, qTimestampPass] = localSampleAtTimes( ...
    qOutputSignal.Time, qOutputSignal.Data, testTime, timingTolerance);
[activeActualNumeric, activeTimestampPass] = localSampleAtTimes( ...
    limiterActiveSignal.Time, limiterActiveSignal.Data, testTime, ...
    timingTolerance);
activeActual = logical(round(activeActualNumeric));

expectedOutput = zeros(size(qCommand));
enabled = normalMode & inputValid;
expectedOutput(enabled) = min(max(qCommand(enabled), -limit), limit);
expectedActive = enabled & (qCommand < -limit | qCommand > limit);

numericError = qActual - expectedOutput;
numericPass = abs(numericError) <= tolerance;
activePass = activeActual == expectedActive;
timestampPass = qTimestampPass & activeTimestampPass;
[spacingPass, observedStep] = localAssessTiming( ...
    qOutputSignal.Time, limiterActiveSignal.Time, ...
    requiredSampleTime, timingTolerance);
timingPass = sampleTimeConfigurationPass && spacingPass;
passed = numericPass & activePass & timestampPass & timingPass;

testResults = testDefinition;
testResults.Input_q_cmd_deg_s = qCommand;
testResults.NormalMode = logical(normalMode);
testResults.InputValid = logical(inputValid);
testResults.Expected_q_cmd_deg_s = expectedOutput;
testResults.Actual_q_cmd_deg_s = qActual;
testResults.NumericError_deg_s = numericError;
testResults.Tolerance_deg_s = repmat(tolerance, size(qCommand));
testResults.ExpectedLimiterActive = expectedActive;
testResults.ActualLimiterActive = activeActual;
testResults.NumericPass = numericPass;
testResults.LimiterActivePass = activePass;
testResults.TimestampPass = timestampPass;
testResults.RequiredSampleTime_s = repmat(requiredSampleTime, size(qCommand));
testResults.DictionarySampleTime_s = repmat(sampleTime, size(qCommand));
testResults.SampleTimeConfigurationPass = ...
    repmat(sampleTimeConfigurationPass, size(qCommand));
testResults.Timing50HzPass = repmat(timingPass, size(qCommand));
testResults.Passed = passed;

csvFile = fullfile(resultsDir, [evidenceStem '_TestResults.csv']);
matFile = fullfile(resultsDir, [evidenceStem '_TestResults.mat']);
htmlFile = fullfile(reportsDir, [evidenceStem '_TestReport.html']);
pngFile = fullfile(reportsDir, [evidenceStem '_TestReport.png']);
writetable(testResults, csvFile);

summary = struct();
summary.GeneratedOn = simulationEnded;
summary.SimulationStarted = simulationStarted;
summary.Harness = string(harness);
summary.HarnessFile = string(harnessFile);
summary.OutputRoot = string(outputRoot);
summary.EvidenceStem = string(evidenceStem);
summary.EvidenceType = ...
    "Executable MATLAB assessment of standalone Simulink harness";
summary.SimulinkTestUsed = false;
summary.TestManagerFileCreated = false;
summary.SampleTime_s = requiredSampleTime;
summary.RequiredSampleTime_s = requiredSampleTime;
summary.DictionarySampleTime_s = sampleTime;
summary.SampleTimeConfigurationPass = sampleTimeConfigurationPass;
summary.ExecutionRate_Hz = 1/requiredSampleTime;
summary.ObservedOutputStep_s = observedStep;
summary.NumericTolerance_deg_s = tolerance;
summary.TimingTolerance_s = timingTolerance;
summary.OutputSpacingPass = spacingPass;
summary.Total = height(testResults);
summary.Passed = nnz(passed);
summary.Failed = nnz(~passed);
summary.Timing50HzPass = timingPass;
summary.Status = localPassFail(summary.Failed == 0);
summary.Disclaimer = ...
    "Illustrative desktop simulation evidence; not certification approval.";

save(matFile, 'testResults', 'summary', 'qOutputSignal', ...
    'limiterActiveSignal', 'qCommandInput', 'normalModeInput', ...
    'inputValidInput');
localWriteHtmlReport(htmlFile, summary, testResults);
localWritePngReport(pngFile, summary, testResults, limit);

fprintf(['Pitch-rate limiter tests: %d passed, %d failed. ' ...
    'Evidence: %s\n'], summary.Passed, summary.Failed, reportsDir);

if summary.Failed > 0
    failedNames = join(testResults.TestCase(~testResults.Passed), ', ');
    error('Training:PitchRateLimiterTestFailure', ...
        '%d pitch-rate limiter test(s) failed: %s', ...
        summary.Failed, failedNames);
end
end

function [definition, q, normalMode, inputValid] = ...
        localTestDefinition(sampleTime, limit)
testCase = [ ...
    "Initialization";
    "Boundary below lower limit";
    "Inclusive lower boundary";
    "Nominal negative command";
    "Nominal zero command";
    "Nominal positive command";
    "Inclusive upper boundary";
    "Boundary above upper limit";
    "Large positive command";
    "Large negative command";
    "Invalid input fallback";
    "Normal mode false fallback";
    "Mode transition - disabled";
    "Mode transition - enabled";
    "Validity transition - invalid";
    "Validity transition - valid";
    "Limiter active after recovery";
    "Both validity conditions false";
    "Final nominal command"];

suite = [ ...
    "Initialization";
    "Boundary Values";
    "Boundary Values";
    "Nominal Values";
    "Nominal Values";
    "Nominal Values";
    "Boundary Values";
    "Boundary Values";
    "Large Magnitudes";
    "Large Magnitudes";
    "Fallback Behavior";
    "Fallback Behavior";
    "Mode Transitions";
    "Mode Transitions";
    "Mode Transitions";
    "Mode Transitions";
    "Mode Transitions";
    "Fallback Behavior";
    "Nominal Values"];

q = [0; -12.1; -12.0; -5.75; 0; 7.25; 12.0; 12.1; ...
    1000; -1000; 8; -8; 4; 4; 6; 6; 13; -9; 2.5];
normalMode = logical([1; 1; 1; 1; 1; 1; 1; 1; 1; 1; ...
    1; 0; 0; 1; 1; 1; 1; 0; 1]);
inputValid = logical([1; 1; 1; 1; 1; 1; 1; 1; 1; 1; ...
    0; 1; 1; 1; 0; 1; 1; 0; 1]);

assert(limit == 12, ...
    'The documented boundary test vector assumes q_limit_normal = 12 deg/s.');
time = (0:numel(q)-1).' * sampleTime;
iteration = (1:numel(q)).';
requirement = repmat("PRL-001 magnitude limiting; PRL-003 status", size(q));
requirement(~normalMode | ~inputValid) = ...
    "PRL-002 deterministic fallback; PRL-003 status";
    requirement(10) = requirement(10) + ...
        "; PRL-005 same-frame magnitude response";
requirement(13:17) = ...
    "PRL-002 mode/validity transitions; PRL-003 status";
requirement = requirement + "; PRL-004 50 Hz execution";

definition = table(repmat("Pitch Rate Limiter MATLAB Suite", size(q)), ...
    suite, testCase, iteration, requirement, time, ...
    'VariableNames', {'TestSuite', 'Suite', 'TestCase', 'Iteration', ...
    'AssociatedRequirement', 'Time_s'});
end

function output = localRequireOutput(simOut, outputName)
try
    names = simOut.who;
catch
    names = {};
end
if ~any(strcmp(names, outputName))
    error('Training:MissingHarnessOutput', ...
        ['Harness output %s was not returned. Confirm the To Workspace ' ...
         'block uses Timeseries format and ReturnWorkspaceOutputs is on.'], ...
        outputName);
end

value = simOut.get(outputName);
if isa(value, 'timeseries')
    output = struct('Name', string(outputName), ...
        'Time', double(value.Time(:)), 'Data', squeeze(value.Data));
elseif isstruct(value) && isfield(value, 'time') && ...
        isfield(value, 'signals') && isfield(value.signals, 'values')
    output = struct('Name', string(outputName), ...
        'Time', double(value.time(:)), 'Data', squeeze(value.signals.values));
else
    error('Training:UnsupportedHarnessOutput', ...
        'Harness output %s has unsupported type %s.', ...
        outputName, class(value));
end
output.Data = output.Data(:);
end

function [sampled, timestampPass] = localSampleAtTimes( ...
        signalTime, signalData, requestedTime, timingTolerance)
signalTime = double(signalTime(:));
signalData = signalData(:);
sampled = nan(size(requestedTime));
timestampPass = false(size(requestedTime));
for index = 1:numel(requestedTime)
    [distance, nearest] = min(abs(signalTime - requestedTime(index)));
    if ~isempty(nearest)
        sampled(index) = double(signalData(nearest));
        timestampPass(index) = distance <= timingTolerance;
    end
end
end

function [passed, observedStep] = localAssessTiming( ...
        qTime, activeTime, sampleTime, tolerance)
qTime = unique(double(qTime(:)), 'stable');
activeTime = unique(double(activeTime(:)), 'stable');
qSteps = diff(qTime);
activeSteps = diff(activeTime);
allSteps = [qSteps(qSteps > tolerance); activeSteps(activeSteps > tolerance)];
if isempty(allSteps)
    observedStep = NaN;
    passed = false;
    return;
end
observedStep = median(allSteps);
passed = all(abs(allSteps - sampleTime) <= tolerance) && ...
    abs(observedStep - sampleTime) <= tolerance;
end

function value = localTrainingValue(projectRoot, entryName, fallback)
value = fallback;
dictionaryFile = fullfile(projectRoot, 'data', 'FCS_Data.sldd');
if exist(dictionaryFile, 'file') ~= 2
    return;
end

dictionary = Simulink.data.dictionary.open(dictionaryFile);
cleanupDictionary = onCleanup(@() close(dictionary)); %#ok<NASGU>
designData = getSection(dictionary, 'Design Data');
try
    entry = getEntry(designData, entryName);
    entryValue = getValue(entry);
    if isa(entryValue, 'Simulink.Parameter')
        entryValue = entryValue.Value;
    end
    validateattributes(entryValue, {'numeric'}, ...
        {'scalar', 'real', 'finite', 'positive'});
    value = double(entryValue);
catch dictionaryError
    warning('Training:DictionaryFallback', ...
        'Could not read %s from FCS_Data.sldd (%s); using %.15g.', ...
        entryName, dictionaryError.message, fallback);
end
end

function localWriteHtmlReport(fileName, summary, results)
file = fopen(fileName, 'w');
if file < 0
    error('Training:CannotWriteReport', 'Cannot write %s.', fileName);
end
cleanupFile = onCleanup(@() fclose(file)); %#ok<NASGU>

fprintf(file, ['<!doctype html><html><head><meta charset="utf-8">' ...
    '<title>Pitch Rate Limiter Test Report</title><style>' ...
    'body{font-family:Segoe UI,Arial,sans-serif;margin:36px;color:#17253b}' ...
    'h1{color:#123f6d}.notice{background:#edf4fa;padding:12px;border-left:5px solid #2d6f9f}' ...
    'table{border-collapse:collapse;width:100%%;font-size:12px}' ...
    'th,td{border:1px solid #c8d2dc;padding:6px;text-align:left}' ...
    'th{background:#123f6d;color:white}.pass{color:#146b3a;font-weight:700}' ...
    '.fail{color:#a32323;font-weight:700}.summary{font-size:18px}</style></head><body>']);
fprintf(file, '<h1>Pitch Rate Limiter — Executable Test Report</h1>');
fprintf(file, ['<p class="notice"><strong>Illustrative training evidence.</strong> ' ...
    'Desktop simulation only; not production aircraft data and not certification approval. ' ...
    'Simulink Test was not used, and no Test Manager .mldatx file was created. ' ...
    'The package retains two SDI .mldatx artifacts.</p>']);
fprintf(file, ['<p>Generated: %s<br>Harness: %s<br>Required rate: %.3g Hz ' ...
    '(%.6g s)<br>Dictionary Sample_time: %.15g s — configuration %s<br>'], ...
    localHtml(summary.GeneratedOn), localHtml(summary.Harness), ...
    summary.ExecutionRate_Hz, summary.RequiredSampleTime_s, ...
    summary.DictionarySampleTime_s, ...
    localPassFail(summary.SampleTimeConfigurationPass));
fprintf(file, ['Numeric tolerance: %.3g deg/s<br>Timing tolerance: %.3g s<br>' ...
    'Observed output step: %.15g s</p>'], ...
    summary.NumericTolerance_deg_s, summary.TimingTolerance_s, ...
    summary.ObservedOutputStep_s);
statusClass = 'pass';
if summary.Failed > 0
    statusClass = 'fail';
end
fprintf(file, '<p class="summary %s">%s — %d passed, %d failed</p>', ...
    statusClass, summary.Status, summary.Passed, summary.Failed);
fprintf(file, ['<table><thead><tr><th>Suite</th><th>Case</th><th>Time (s)</th>' ...
    '<th>Input</th><th>Normal</th><th>Valid</th><th>Expected</th>' ...
    '<th>Actual</th><th>Expected active</th><th>Actual active</th>' ...
    '<th>Result</th></tr></thead><tbody>']);
for index = 1:height(results)
    className = 'pass';
    resultText = 'PASS';
    if ~results.Passed(index)
        className = 'fail';
        resultText = 'FAIL';
    end
    fprintf(file, ['<tr><td>%s</td><td>%s</td><td>%.2f</td><td>%.6g</td>' ...
        '<td>%d</td><td>%d</td><td>%.6g</td><td>%.6g</td><td>%d</td>' ...
        '<td>%d</td><td class="%s">%s</td></tr>'], ...
        localHtml(results.Suite(index)), localHtml(results.TestCase(index)), ...
        results.Time_s(index), results.Input_q_cmd_deg_s(index), ...
        results.NormalMode(index), results.InputValid(index), ...
        results.Expected_q_cmd_deg_s(index), results.Actual_q_cmd_deg_s(index), ...
        results.ExpectedLimiterActive(index), ...
        results.ActualLimiterActive(index), className, resultText);
end
fprintf(file, '</tbody></table>');
fprintf(file, ['<h2>Evidence interpretation</h2><p>A passing result shows that this ' ...
    'configured desktop simulation met these scripted expectations. It is one ' ...
    'evidence input; review, traceability, configuration control, and failure ' ...
    'disposition remain necessary.</p></body></html>']);
end

function localWritePngReport(fileName, summary, results, limit)
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
tiledlayout(fig, 3, 1, 'TileSpacing', 'compact', 'Padding', 'compact');

nexttile;
displayBound = 18;
displayInput = min(max(results.Input_q_cmd_deg_s, -displayBound), displayBound);
stairs(results.Time_s, displayInput, ':', ...
    'LineWidth', 1.5, 'Color', [0.40 0.40 0.40]);
hold on;
stairs(results.Time_s, results.Expected_q_cmd_deg_s, '--', ...
    'LineWidth', 1.6, 'Color', [0.20 0.55 0.35]);
stairs(results.Time_s, results.Actual_q_cmd_deg_s, 'LineWidth', 2.1, ...
    'Color', [0.10 0.32 0.58]);
yline(limit, '--', '+12 deg/s', 'Color', [0.75 0.20 0.15]);
yline(-limit, '--', '-12 deg/s', 'Color', [0.75 0.20 0.15]);
grid on;
ylim([-20 20]);
ylabel('Command (deg/s)');
legend('Input (clipped at +/-18 for display)', 'Expected output', ...
    'Actual output', 'Location', 'eastoutside');
title(sprintf('%d/%d assessments passed — numeric tolerance %.3g deg/s', ...
    summary.Passed, summary.Total, summary.NumericTolerance_deg_s));

nexttile;
stairs(results.Time_s, double(results.ExpectedLimiterActive), '--', ...
    'LineWidth', 1.5, 'Color', [0.45 0.45 0.45]);
hold on;
stairs(results.Time_s, double(results.ActualLimiterActive), ...
    'LineWidth', 2.0, 'Color', [0.85 0.33 0.10]);
grid on;
ylim([-0.15 1.25]);
yticks([0 1]);
ylabel('Limiter active');
legend('Expected', 'Actual', 'Location', 'eastoutside');

nexttile;
stem(results.Time_s, abs(results.NumericError_deg_s), 'filled', ...
    'LineWidth', 1.2, 'Color', [0.49 0.18 0.56]);
hold on;
yline(summary.NumericTolerance_deg_s, '--', 'Tolerance');
set(gca, 'YScale', 'log');
grid on;
xlabel('Simulation time (s)');
ylabel('|numeric error| (deg/s)');
sgtitle(sprintf(['Pitch Rate Limiter Harness Results — %s\n' ...
    'Illustrative training model, %.3g Hz desktop simulation'], ...
    summary.Status, summary.ExecutionRate_Hz));
exportgraphics(fig, fileName, 'Resolution', 200);
end

function text = localHtml(value)
text = char(string(value));
text = strrep(text, '&', '&amp;');
text = strrep(text, '<', '&lt;');
text = strrep(text, '>', '&gt;');
text = strrep(text, '"', '&quot;');
end

function result = localPassFail(condition)
if condition
    result = "PASS";
else
    result = "FAIL";
end
end

function localEnsureFolder(folder)
if exist(folder, 'dir') ~= 7
    mkdir(folder);
end
end

function result = localPathContains(folder)
parts = string(strsplit(path, pathsep));
result = any(strcmpi(parts, string(folder)));
end

function localRemoveTemporaryPaths(pathsAddedHere)
for index = numel(pathsAddedHere):-1:1
    folder = char(pathsAddedHere(index));
    if localPathContains(folder)
        rmpath(folder);
    end
end
end

function localAssertHarnessIdentity(harness, harnessFile, requireLoaded)
expected = localCanonicalPath(harnessFile);
matches = string(which(harness, '-all'));
matches = matches(strlength(matches) > 0);
for index = 1:numel(matches)
    actual = localCanonicalPath(char(matches(index)));
    assert(strcmpi(actual, expected), ...
        'Training:HarnessShadowed', ...
        ['Harness name %s resolves to another file.\nExpected: %s\n' ...
         'Resolved: %s'], harness, expected, actual);
end
if bdIsLoaded(harness)
    loadedFile = get_param(harness, 'FileName');
    assert(~isempty(loadedFile), 'Training:UnresolvedHarnessFile', ...
        'Loaded harness %s does not report a source file.', harness);
    actualLoaded = localCanonicalPath(loadedFile);
    assert(strcmpi(actualLoaded, expected), ...
        'Training:LoadedHarnessShadowed', ...
        ['Loaded harness %s is not the requested file.\nExpected: %s\n' ...
         'Loaded: %s'], harness, expected, actualLoaded);
elseif requireLoaded
    error('Training:HarnessDidNotLoad', ...
        'Requested harness did not load: %s', harnessFile);
end
end

function result = localCanonicalPath(pathValue)
[resolved, attributes] = fileattrib(pathValue);
assert(resolved, 'Training:UnresolvedPath', ...
    'Could not resolve file path: %s', pathValue);
result = strrep(attributes.Name, '/', filesep);
end
