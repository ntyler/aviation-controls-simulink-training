function manifest = export_training_visuals(projectRoot)
%EXPORT_TRAINING_VISUALS Export authentic diagrams and executed evidence.
%
% Model images are exported directly from the generated Simulink systems.
% Result images are derived from saved simulation/test data.  Every image
% is labeled as an illustrative training artifact; no desktop screenshots,
% personal information, production aircraft data, or invented evidence are
% introduced by this function.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);
modelsDir = fullfile(projectRoot, 'models');
scriptsDir = fullfile(projectRoot, 'scripts');
dataDir = fullfile(projectRoot, 'data');
resultsDir = fullfile(projectRoot, 'results');
reportsDir = fullfile(projectRoot, 'reports');
screenshotsDir = fullfile(projectRoot, 'screenshots');

localEnsureFolder(screenshotsDir);
localEnsureFolder(resultsDir);
addpath(modelsDir, dataDir, scriptsDir);

records = repmat(localRecord(), 0, 1);

diagramRequests = { ...
    'PitchRateLimiter', 'PitchRateLimiter_Model.png', ...
        'Pitch-rate limiter component';
    'PitchRateLimiter/Pitch Rate Limiter Logic', ...
        'PitchRateLimiter_Implementation.png', ...
        'Mode, validity, fallback, and magnitude limiting';
    'AircraftFeedbackControlLoop', ...
        'AircraftFeedbackControlLoop_Model.png', ...
        'Illustrative closed-loop architecture';
    'AircraftFeedbackControlLoop/Pitch Controller PI', ...
        'AircraftFeedback_PitchController.png', ...
        'Pitch-control subsystem';
    'AutopilotModeLogic/Autopilot Mode Logic', ...
        'AutopilotModeLogic_Stateflow.png', ...
        'OFF, ARMED, ENGAGED, and DEGRADED mode logic';
    'ReferencedFlightControlArchitecture', ...
        'ReferencedFlightControlArchitecture_Model.png', ...
        'Referenced flight-control architecture';
    'PitchRateLimiter_Harness', ...
        'PitchRateLimiter_Harness.png', ...
        'Standalone executable MATLAB/Simulink harness'};

for index = 1:size(diagramRequests, 1)
    system = diagramRequests{index, 1};
    fileName = fullfile(screenshotsDir, diagramRequests{index, 2});
    caption = diagramRequests{index, 3};
    actualSystem = localResolveSystem(system, modelsDir);
    localExportSystem(actualSystem, fileName, caption, screenshotsDir);
    records(end+1) = localRecord(diagramRequests{index, 2}, ...
        'Simulink diagram', actualSystem, ...
        'Direct export from generated Simulink model'); %#ok<AGROW>
end

dictionaryFile = fullfile(dataDir, 'FCS_Data.sldd');
dictionaryImage = fullfile(screenshotsDir, ...
    'FCS_DataDictionary_and_FlightControlBus.png');
[dictionaryInventory, busInventory] = localExportDictionary( ...
    dictionaryFile, dictionaryImage, resultsDir);
records(end+1) = localRecord('FCS_DataDictionary_and_FlightControlBus.png', ...
    'Controlled data', 'data/FCS_Data.sldd', ...
    'Rendered from actual dictionary entries and FlightControlBus elements');

testCsv = fullfile(resultsDir, 'PitchRateLimiter_TestResults.csv');
testPng = fullfile(reportsDir, 'PitchRateLimiter_TestReport.png');
if exist(testCsv, 'file') ~= 2 || exist(testPng, 'file') ~= 2
    error('Training:MissingTestEvidence', ...
        ['Execute run_pitch_rate_limiter_tests before exporting visuals. ' ...
         'Required evidence is missing.']);
end
testResultsImage = fullfile(screenshotsDir, ...
    'PitchRateLimiter_ExecutedTestResults.png');
localFrameExistingImage(testPng, testResultsImage, ...
    'Executed Pitch Rate Limiter Harness Results', ...
    'Real 50 Hz desktop-simulation output; illustrative training evidence');
records(end+1) = localRecord('PitchRateLimiter_ExecutedTestResults.png', ...
    'Test results', 'reports/PitchRateLimiter_TestReport.png', ...
    'Framed copy of executed harness result plot');

hierarchyImage = fullfile(screenshotsDir, ...
    'PitchRateLimiter_MATLABTestHierarchy.png');
localExportTestHierarchy(testCsv, hierarchyImage);
records(end+1) = localRecord('PitchRateLimiter_MATLABTestHierarchy.png', ...
    'Test organization', 'results/PitchRateLimiter_TestResults.csv', ...
    ['Actual MATLAB-suite hierarchy; Simulink Test unavailable, ' ...
     'therefore no .mldatx is represented']);

trackingPng = fullfile(resultsDir, ...
    'AircraftFeedback_CommandTracking.png');
if exist(trackingPng, 'file') ~= 2
    error('Training:MissingSimulationEvidence', ...
        ['Execute run_training_simulations before exporting visuals. ' ...
         'Command-tracking evidence is missing.']);
end
trackingImage = fullfile(screenshotsDir, ...
    'AircraftFeedback_CommandTracking_Results.png');
localFrameExistingImage(trackingPng, trackingImage, ...
    'Aircraft Feedback Command-Tracking Results', ...
    'Executed illustrative desktop simulation with commanded steps and disturbances');
records(end+1) = localRecord( ...
    'AircraftFeedback_CommandTracking_Results.png', ...
    'Simulation results', 'results/AircraftFeedback_CommandTracking.png', ...
    'Framed copy of executed command-tracking result plot');

modePng = fullfile(resultsDir, 'AutopilotModeSequence.png');
if exist(modePng, 'file') == 2
    modeImage = fullfile(screenshotsDir, ...
        'AutopilotModeSequence_Results.png');
    localFrameExistingImage(modePng, modeImage, ...
        'Autopilot Mode Sequence Results', ...
        'Executed OFF → ARMED → ENGAGED → DEGRADED training scenario');
    records(end+1) = localRecord('AutopilotModeSequence_Results.png', ...
        'Simulation results', 'results/AutopilotModeSequence.png', ...
        'Framed copy of executed mode-sequence plot');
end

callbackFiles = localFindCallbackFiles(scriptsDir);
callbackCodeImage = fullfile(screenshotsDir, 'CallbackCode.png');
localExportCallbackCode(callbackFiles, callbackCodeImage, projectRoot);
records(end+1) = localRecord('CallbackCode.png', 'Callback example', ...
    localRelativeFileList(callbackFiles, projectRoot), ...
    'Rendered from the actual reviewed external callback functions');

callbackWorkflowImage = fullfile(screenshotsDir, 'CallbackWorkflow.png');
localExportCallbackWorkflow(callbackFiles, callbackWorkflowImage);
records(end+1) = localRecord('CallbackWorkflow.png', 'Callback workflow', ...
    localRelativeFileList(callbackFiles, projectRoot), ...
    'Workflow labels derived from the actual callback function files');

evidenceSummaryImage = fullfile(screenshotsDir, ...
    'TrainingEvidenceSummary.png');
localExportEvidenceSummary(resultsDir, testCsv, evidenceSummaryImage);
records(end+1) = localRecord('TrainingEvidenceSummary.png', ...
    'Evidence summary', 'results/*.csv', ...
    'Counts and statuses read from executed test and validation result files');

% Stable, presentation-friendly aliases. Each alias is a byte-for-byte copy
% of an authentic diagram or executed result generated above.
aliasMap = {
    'PitchRateLimiter_Model.png', 'pitch_rate_limiter.png';
    'PitchRateLimiter_Implementation.png', 'pitch_rate_limiter_logic.png';
    'AircraftFeedbackControlLoop_Model.png', 'aircraft_feedback_loop.png';
    'AircraftFeedback_PitchController.png', 'pitch_controller_subsystem.png';
    'AutopilotModeLogic_Stateflow.png', 'autopilot_mode_logic.png';
    'ReferencedFlightControlArchitecture_Model.png', 'referenced_architecture.png';
    'FCS_DataDictionary_and_FlightControlBus.png', 'data_dictionary_bus.png';
    'PitchRateLimiter_Harness.png', 'pitch_rate_limiter_harness.png';
    'PitchRateLimiter_ExecutedTestResults.png', 'pitch_rate_limiter_test_results.png';
    'PitchRateLimiter_MATLABTestHierarchy.png', 'pitch_rate_limiter_test_report.png';
    'AircraftFeedback_CommandTracking_Results.png', 'command_tracking_plot.png';
    'CallbackWorkflow.png', 'callback_workflow.png';
    'TrainingEvidenceSummary.png', 'evidence_chain_summary.png'};
for aliasIndex = 1:size(aliasMap, 1)
    sourceName = aliasMap{aliasIndex, 1};
    aliasName = aliasMap{aliasIndex, 2};
    sourcePath = fullfile(screenshotsDir, sourceName);
    aliasPath = fullfile(screenshotsDir, aliasName);
    if exist(sourcePath, 'file') ~= 2
        error('Training:MissingAliasSource', ...
            'Cannot create presentation alias; source is missing: %s', sourcePath);
    end
    copyfile(sourcePath, aliasPath, 'f');
    records(end+1) = localRecord(aliasName, 'Presentation alias', ...
        sourceName, 'Byte-for-byte copy of the authentic exported artifact'); %#ok<AGROW>
end

manifest = struct2table(records);
manifest.Disclaimer = repmat( ...
    "Illustrative training artifact; not production or certification approval.", ...
    height(manifest), 1);
writetable(manifest, fullfile(screenshotsDir, 'VisualManifest.csv'));
save(fullfile(screenshotsDir, 'VisualManifest.mat'), 'manifest', ...
    'dictionaryInventory', 'busInventory');

fprintf('Exported %d authentic training visuals to %s\n', ...
    height(manifest), screenshotsDir);
end

function actualSystem = localResolveSystem(requestedSystem, modelsDir)
parts = split(string(requestedSystem), '/');
model = char(parts(1));
modelFile = fullfile(modelsDir, [model '.slx']);
if ~isfile(modelFile)
    error('Training:MissingModel', 'Required model not found: %s', modelFile);
end
load_system(model);

if numel(parts) == 1
    actualSystem = model;
    return;
end

requestedSystem = char(requestedSystem);
try
    get_param(requestedSystem, 'Handle');
    actualSystem = requestedSystem;
    return;
catch
end

requestedLeaf = char(parts(end));
allSystems = find_system(model, 'LookUnderMasks', 'all', ...
    'FollowLinks', 'on', 'Type', 'Block');
names = cellfun(@(path) get_param(path, 'Name'), allSystems, ...
    'UniformOutput', false);
normalizedLeaf = localNormalizeName(requestedLeaf);
match = find(strcmp(cellfun(@localNormalizeName, names, ...
    'UniformOutput', false), normalizedLeaf), 1);
if isempty(match)
    error('Training:MissingSystem', ...
        'Could not find requested system %s in %s.', requestedSystem, model);
end
actualSystem = allSystems{match};
end

function localExportSystem(system, outputFile, caption, screenshotsDir)
model = strtok(system, '/');
load_system(model);
try
    open_system(system);
catch openError
    warning('Training:OpenSystemForExport', ...
        'open_system reported: %s', openError.message);
end
try
    set_param(system, 'ZoomFactor', 'FitSystem');
catch
end

rawFile = [tempname(screenshotsDir) '.png'];
cleanupRaw = onCleanup(@() localDeleteIfPresent(rawFile)); %#ok<NASGU>
try
    print(['-s' system], '-dpng', '-r220', rawFile);
catch exportError
    error('Training:DiagramExportFailed', ...
        'Could not export %s: %s', system, exportError.message);
end

localFrameExistingImage(rawFile, outputFile, caption, ...
    sprintf('Direct Simulink export: %s — illustrative training model', system));
end

function [entryTable, busTable] = localExportDictionary( ...
        dictionaryFile, outputFile, resultsDir)
if exist(dictionaryFile, 'file') ~= 2
    error('Training:MissingDictionary', ...
        'Training data dictionary not found: %s', dictionaryFile);
end

dictionary = Simulink.data.dictionary.open(dictionaryFile);
cleanupDictionary = onCleanup(@() close(dictionary)); %#ok<NASGU>
designData = getSection(dictionary, 'Design Data');
entries = find(designData);

entryName = strings(numel(entries), 1);
entryClass = strings(numel(entries), 1);
entryValue = strings(numel(entries), 1);
for index = 1:numel(entries)
    entryName(index) = string(entries(index).Name);
    value = getValue(entries(index));
    entryClass(index) = string(class(value));
    entryValue(index) = localValueSummary(value);
end
entryTable = table(entryName, entryClass, entryValue, ...
    'VariableNames', {'Entry', 'Class', 'ControlledValue'});
entryTable = sortrows(entryTable, 'Entry');
writetable(entryTable, fullfile(resultsDir, ...
    'FCS_DataDictionary_Inventory.csv'));

try
    busEntry = getEntry(designData, 'FlightControlBus');
    bus = getValue(busEntry);
catch dictionaryError
    error('Training:MissingFlightControlBus', ...
        'FlightControlBus is not available in FCS_Data.sldd: %s', ...
        dictionaryError.message);
end
if ~isa(bus, 'Simulink.Bus')
    error('Training:InvalidFlightControlBus', ...
        'FlightControlBus dictionary entry is %s, not Simulink.Bus.', class(bus));
end

elements = bus.Elements;
signal = strings(numel(elements), 1);
dataType = strings(numel(elements), 1);
dimensions = strings(numel(elements), 1);
units = strings(numel(elements), 1);
description = strings(numel(elements), 1);
for index = 1:numel(elements)
    signal(index) = string(elements(index).Name);
    dataType(index) = string(elements(index).DataType);
    dimensions(index) = string(mat2str(elements(index).Dimensions));
    units(index) = string(elements(index).Unit);
    description(index) = string(elements(index).Description);
end
busTable = table(signal, dataType, dimensions, units, description, ...
    'VariableNames', {'Signal', 'DataType', 'Dimensions', 'Units', ...
    'Description'});
writetable(busTable, fullfile(resultsDir, ...
    'FlightControlBus_Inventory.csv'));

fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
axesHandle = axes(fig, 'Position', [0.04 0.06 0.92 0.87]);
axis(axesHandle, [0 1 0 1]);
axis(axesHandle, 'off');
title(axesHandle, 'FCS Data Dictionary and FlightControlBus', ...
    'FontSize', 24, 'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);

text(axesHandle, 0.01, 0.94, ...
    'CONTROLLED DESIGN DATA (actual FCS_Data.sldd entries)', ...
    'FontWeight', 'bold', 'FontSize', 14, 'Color', [0.10 0.32 0.58]);
dictionaryLines = strings(min(height(entryTable), 12), 1);
for index = 1:numel(dictionaryLines)
    dictionaryLines(index) = sprintf('%-25s  %-22s  %s', ...
        localClip(entryTable.Entry(index), 25), ...
        localClip(entryTable.Class(index), 22), ...
        localClip(entryTable.ControlledValue(index), 55));
end
text(axesHandle, 0.02, 0.90, join(dictionaryLines, newline), ...
    'VerticalAlignment', 'top', 'FontName', 'Consolas', ...
    'FontSize', 11, 'Interpreter', 'none', 'Color', [0.12 0.16 0.22]);

text(axesHandle, 0.01, 0.46, ...
    'BUS INTERFACE: FlightControlBus (actual Simulink.Bus elements)', ...
    'FontWeight', 'bold', 'FontSize', 14, 'Color', [0.10 0.32 0.58]);
busLines = strings(height(busTable) + 1, 1);
busLines(1) = sprintf('%-20s %-18s %-10s %-12s %s', ...
    'SIGNAL', 'DATA TYPE', 'DIMS', 'UNITS', 'DESCRIPTION');
for index = 1:height(busTable)
    busLines(index + 1) = sprintf('%-20s %-18s %-10s %-12s %s', ...
        localClip(busTable.Signal(index), 20), ...
        localClip(busTable.DataType(index), 18), ...
        localClip(busTable.Dimensions(index), 10), ...
        localClip(busTable.Units(index), 12), ...
        localClip(busTable.Description(index), 45));
end
text(axesHandle, 0.02, 0.42, join(busLines, newline), ...
    'VerticalAlignment', 'top', 'FontName', 'Consolas', ...
    'FontSize', 12, 'Interpreter', 'none', 'Color', [0.12 0.16 0.22]);
text(axesHandle, 0.01, 0.015, ...
    'Illustrative training data only — no proprietary or production program values', ...
    'FontSize', 11, 'FontAngle', 'italic', 'Color', [0.45 0.20 0.12]);
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function localExportTestHierarchy(csvFile, outputFile)
results = readtable(csvFile, 'TextType', 'string', 'Delimiter', ',');
suites = unique(results.Suite, 'stable');
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
ax = axes(fig, 'Position', [0.05 0.07 0.90 0.86]);
axis(ax, [0 1 0 1]);
axis(ax, 'off');
title(ax, 'Pitch Rate Limiter — Executable MATLAB Test Hierarchy', ...
    'FontSize', 24, 'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);

text(ax, 0.03, 0.92, ...
    'Pitch Rate Limiter MATLAB Suite', 'FontSize', 17, ...
    'FontWeight', 'bold', 'Color', [0.10 0.32 0.58]);
for suiteIndex = 1:numel(suites)
    column = 1 + (suiteIndex > ceil(numel(suites)/2));
    xHeading = 0.05 + (column-1)*0.49;
    xCase = xHeading + 0.035;
    firstInColumn = suiteIndex == 1 || ...
        suiteIndex == ceil(numel(suites)/2) + 1;
    if firstInColumn
        y = 0.84;
    end
    selector = results.Suite == suites(suiteIndex);
    suiteCount = nnz(selector);
    suitePass = nnz(results.Passed(selector));
    text(ax, xHeading, y, sprintf('%s  —  %d/%d passed', ...
        suites(suiteIndex), suitePass, suiteCount), ...
        'FontSize', 14, 'FontWeight', 'bold', 'Interpreter', 'none');
    y = y - 0.038;
    cases = results.TestCase(selector);
    casePass = results.Passed(selector);
    iterations = results.Iteration(selector);
    for caseIndex = 1:numel(cases)
        marker = 'PASS';
        color = [0.08 0.46 0.24];
        if ~casePass(caseIndex)
            marker = 'FAIL';
            color = [0.70 0.12 0.12];
        end
        text(ax, xCase, y, sprintf('[%s] Iteration %02d — %s', ...
            marker, iterations(caseIndex), cases(caseIndex)), ...
            'FontSize', 9.5, 'FontName', 'Consolas', ...
            'Color', color, 'Interpreter', 'none');
        y = y - 0.028;
    end
    y = y - 0.02;
end
text(ax, 0.03, 0.025, ...
    ['Simulink Test is unavailable in this environment. This is the actual ' ...
     'standalone-harness MATLAB suite; no .mldatx file was manufactured.'], ...
    'FontSize', 11, 'FontAngle', 'italic', 'Color', [0.45 0.20 0.12]);
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function files = localFindCallbackFiles(scriptsDir)
listing = dir(fullfile(scriptsDir, '*.m'));
files = strings(0, 1);
keywords = {'callback', 'setup', 'preload', 'postload', 'cleanup', ...
    'deterministic', 'test_case'};
for index = 1:numel(listing)
    lowerName = lower(listing(index).name);
    if any(cellfun(@(word) contains(lowerName, word), keywords))
        files(end+1, 1) = string(fullfile(listing(index).folder, ...
            listing(index).name)); %#ok<AGROW>
    end
end
files = unique(files, 'stable');
if isempty(files)
    error('Training:MissingCallbackFiles', ...
        'No reviewed external callback/setup functions were found in %s.', ...
        scriptsDir);
end
end

function localExportCallbackCode(files, outputFile, projectRoot)
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
ax = axes(fig, 'Position', [0.04 0.06 0.92 0.88]);
axis(ax, [0 1 0 1]);
axis(ax, 'off');
hold(ax, 'on');
title(ax, 'Reviewed External Callback Code', 'FontSize', 24, ...
    'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);

selected = files(1:min(2, numel(files)));
columnWidth = 0.46;
for fileIndex = 1:numel(selected)
    code = fileread(selected(fileIndex));
    lines = splitlines(string(code));
    lines = lines(1:min(34, numel(lines)));
    x = 0.01 + (fileIndex - 1) * 0.50;
    relative = localRelativePath(selected(fileIndex), projectRoot);
    text(ax, x, 0.93, relative, 'FontSize', 13, ...
        'FontWeight', 'bold', 'Color', [0.10 0.32 0.58], ...
        'Interpreter', 'none');
    patch(ax, [x x+columnWidth x+columnWidth x], ...
        [0.89 0.89 0.08 0.08], [0.96 0.97 0.98], ...
        'EdgeColor', [0.72 0.78 0.83]);
    text(ax, x + 0.012, 0.875, join(lines, newline), ...
        'VerticalAlignment', 'top', 'FontName', 'Consolas', ...
        'FontSize', 9.3, 'Color', [0.10 0.12 0.16], ...
        'Interpreter', 'none');
end
text(ax, 0.01, 0.02, ...
    ['Complex setup is kept in reviewable .m functions; expected values and ' ...
     'pass/fail logic remain in the assessment suite. Illustrative training workflow.'], ...
    'FontSize', 10.5, 'FontAngle', 'italic', 'Color', [0.45 0.20 0.12]);
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function localExportCallbackWorkflow(files, outputFile)
names = strings(size(files));
for index = 1:numel(files)
    [~, name] = fileparts(files(index));
    names(index) = name + ".m";
end

labels = [ ...
    "1  Project / test-file setup";
    "2  Load FCS_Data.sldd + initialize signals";
    "3  Test-case preload + deterministic initial conditions";
    "4  Post-load configuration";
    "5  Execute model + external assessments";
    "6  Cleanup training environment"];
fileHints = [ ...
    localBestCallbackName(names, {'setup', 'initialize'});
    localBestCallbackName(names, {'initialize', 'setup'});
    localBestCallbackName(names, {'preload', 'callback'});
    localBestCallbackName(names, {'postload', 'callback'});
    "run_pitch_rate_limiter_tests.m";
    localBestCallbackName(names, {'cleanup'})];

fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
ax = axes(fig, 'Position', [0 0 1 1]);
axis(ax, [0 1 0 1]);
axis(ax, 'off');
hold(ax, 'on');
text(ax, 0.5, 0.94, 'Deterministic Callback Workflow', ...
    'HorizontalAlignment', 'center', 'FontSize', 24, ...
    'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);

xPositions = [0.03 0.36 0.69 0.69 0.36 0.03];
yPositions = [0.64 0.64 0.64 0.28 0.28 0.28];
boxWidth = 0.28;
boxHeight = 0.18;
for index = 1:numel(labels)
    rectangle(ax, 'Position', [xPositions(index), yPositions(index), ...
        boxWidth, boxHeight], 'Curvature', 0.06, ...
        'FaceColor', [0.93 0.96 0.98], ...
        'EdgeColor', [0.10 0.32 0.58], 'LineWidth', 1.8);
    text(ax, xPositions(index) + boxWidth/2, ...
        yPositions(index) + boxHeight*0.62, labels(index), ...
        'HorizontalAlignment', 'center', 'FontSize', 10.5, ...
        'FontWeight', 'bold', 'Color', [0.08 0.19 0.31]);
    text(ax, xPositions(index) + boxWidth/2, ...
        yPositions(index) + boxHeight*0.27, fileHints(index), ...
        'HorizontalAlignment', 'center', 'FontSize', 9.5, ...
        'FontName', 'Consolas', 'Color', [0.45 0.20 0.12], ...
        'Interpreter', 'none');
end

localArrow(ax, [0.30 0.37], [0.73 0.73]);
localArrow(ax, [0.62 0.69], [0.73 0.73]);
localArrow(ax, [0.815 0.815], [0.64 0.46]);
localArrow(ax, [0.69 0.62], [0.37 0.37]);
localArrow(ax, [0.37 0.30], [0.37 0.37]);

text(ax, 0.5, 0.08, ...
    ['Callbacks establish repeatable context. Pass/fail criteria remain visible ' ...
     'in expected outputs and assessments, not hidden in setup code.'], ...
    'HorizontalAlignment', 'center', 'FontSize', 12, ...
    'FontAngle', 'italic', 'Color', [0.35 0.35 0.35]);
text(ax, 0.5, 0.035, ...
    'Illustrative training workflow — not a certification process claim', ...
    'HorizontalAlignment', 'center', 'FontSize', 10.5, ...
    'Color', [0.45 0.20 0.12]);
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function localExportEvidenceSummary(resultsDir, testCsv, outputFile)
tests = readtable(testCsv, 'TextType', 'string', 'Delimiter', ',');
validationFile = fullfile(resultsDir, ...
    'ReferencedArchitecture_Validation.csv');
configurationFile = fullfile(resultsDir, 'SimulationConfiguration.csv');
if exist(validationFile, 'file') ~= 2 || ...
        exist(configurationFile, 'file') ~= 2
    error('Training:MissingValidationEvidence', ...
        'Architecture validation/configuration results are missing.');
end
validation = readtable(validationFile, 'TextType', 'string', 'Delimiter', ',');
configuration = readtable(configurationFile, 'TextType', 'string', 'Delimiter', ',');

testPass = nnz(tests.Passed);
testFail = height(tests) - testPass;
statusIndex = find(strcmpi(validation.Properties.VariableNames, ...
    'UpdateStatus'), 1);
if isempty(statusIndex)
    normalizedNames = cellfun(@localNormalizeName, ...
        validation.Properties.VariableNames, 'UniformOutput', false);
    statusIndex = find(strcmp(normalizedNames, 'updatestatus'), 1);
end
if isempty(statusIndex)
    error('Training:MissingArchitectureStatus', ...
        'Architecture validation CSV has no UpdateStatus column.');
end
architectureStatus = string(validation{:, statusIndex});
architecturePass = nnz(architectureStatus == "PASS");
architectureFail = height(validation) - architecturePass;

fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
ax = axes(fig, 'Position', [0.05 0.07 0.90 0.86]);
axis(ax, [0 1 0 1]);
axis(ax, 'off');
title(ax, 'Executed Training Evidence Summary', 'FontSize', 24, ...
    'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);

localSummaryCard(ax, [0.04 0.59 0.27 0.25], ...
    'Limiter harness', sprintf('%d PASS\n%d FAIL', testPass, testFail), ...
    testFail == 0);
localSummaryCard(ax, [0.365 0.59 0.27 0.25], ...
    'Architecture update', sprintf('%d PASS\n%d FAIL', ...
    architecturePass, architectureFail), architectureFail == 0);
localSummaryCard(ax, [0.69 0.59 0.27 0.25], ...
    'Configuration captured', sprintf('%d models\nMAT/CSV saved', ...
    height(configuration)), height(configuration) > 0);

text(ax, 0.04, 0.48, 'What this evidence supports', ...
    'FontWeight', 'bold', 'FontSize', 15, 'Color', [0.10 0.32 0.58]);
supportText = [ ...
    "• Boundary, fallback, transition, status, tolerance, and 50 Hz checks ran on the harness.";
    "• Command-tracking and disturbance scenarios ran on the illustrative feedback loop.";
    "• Referenced models updated with resolved interfaces and recorded checksums.";
    "• Configuration and installed-product inventories were saved with results."];
text(ax, 0.06, 0.43, join(supportText, newline), ...
    'VerticalAlignment', 'top', 'FontSize', 13, ...
    'Interpreter', 'none', 'Color', [0.12 0.16 0.22]);

text(ax, 0.04, 0.22, 'What this evidence does not claim', ...
    'FontWeight', 'bold', 'FontSize', 15, 'Color', [0.65 0.18 0.12]);
limitText = [ ...
    "• No HIL hardware was used; all results are desktop simulations.";
    "• A passing script or pipeline is evidence input, not certification approval.";
    "• Simulink Test was unavailable; no Test Manager .mldatx evidence was created.";
    "• DO-331 supplements DO-178C; a model is not automatically compliant."];
text(ax, 0.06, 0.17, join(limitText, newline), ...
    'VerticalAlignment', 'top', 'FontSize', 13, ...
    'Interpreter', 'none', 'Color', [0.25 0.20 0.18]);
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function localSummaryCard(ax, position, heading, value, passed)
faceColor = [0.91 0.97 0.93];
edgeColor = [0.10 0.48 0.26];
if ~passed
    faceColor = [0.99 0.92 0.92];
    edgeColor = [0.70 0.12 0.12];
end
rectangle(ax, 'Position', position, 'Curvature', 0.06, ...
    'FaceColor', faceColor, 'EdgeColor', edgeColor, 'LineWidth', 2);
text(ax, position(1) + position(3)/2, position(2) + position(4)*0.72, ...
    heading, 'HorizontalAlignment', 'center', 'FontSize', 14, ...
    'FontWeight', 'bold', 'Color', [0.08 0.19 0.31]);
text(ax, position(1) + position(3)/2, position(2) + position(4)*0.36, ...
    value, 'HorizontalAlignment', 'center', 'FontSize', 18, ...
    'FontWeight', 'bold', 'Color', edgeColor);
end

function localFrameExistingImage(sourceFile, outputFile, titleText, caption)
if exist(sourceFile, 'file') ~= 2
    error('Training:MissingImage', 'Source image not found: %s', sourceFile);
end

imageData = imread(sourceFile);
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
ax = axes(fig, 'Position', [0.025 0.075 0.95 0.84]);
image(ax, imageData);
axis(ax, 'image');
axis(ax, 'off');
annotation(fig, 'textbox', [0.025 0.925 0.95 0.055], ...
    'String', titleText, 'EdgeColor', 'none', ...
    'HorizontalAlignment', 'center', 'FontSize', 19, ...
    'FontWeight', 'bold', 'Color', [0.07 0.25 0.43]);
annotation(fig, 'textbox', [0.025 0.015 0.95 0.045], ...
    'String', caption, 'EdgeColor', 'none', ...
    'HorizontalAlignment', 'center', 'FontSize', 10.5, ...
    'FontAngle', 'italic', 'Color', [0.45 0.20 0.12], ...
    'Interpreter', 'none');
exportgraphics(fig, outputFile, 'Resolution', 180, ...
    'BackgroundColor', 'white');
end

function summary = localValueSummary(value)
if isa(value, 'Simulink.Parameter')
    valueText = localScalarText(value.Value);
    units = string(value.Unit);
    if strlength(units) == 0
        units = "unitless";
    end
    summary = "Parameter = " + valueText + " " + units + ...
        ", type " + string(value.DataType);
elseif isa(value, 'Simulink.Bus')
    summary = "Bus with " + string(numel(value.Elements)) + " elements";
elseif isnumeric(value) || islogical(value) || ischar(value) || isstring(value)
    summary = localScalarText(value);
else
    summary = string(class(value));
end
end

function text = localScalarText(value)
if isnumeric(value) || islogical(value)
    text = string(mat2str(value));
else
    text = string(value);
end
end

function clipped = localClip(value, width)
clipped = char(string(value));
if numel(clipped) > width
    clipped = [clipped(1:max(1, width-1)) '…'];
end
end

function name = localBestCallbackName(names, keywords)
name = "reviewed external .m function";
for keywordIndex = 1:numel(keywords)
    match = find(contains(lower(names), lower(string(keywords{keywordIndex}))), 1);
    if ~isempty(match)
        name = names(match);
        return;
    end
end
if ~isempty(names)
    name = names(1);
end
end

function localArrow(ax, x, y)
quiver(ax, x(1), y(1), x(2)-x(1), y(2)-y(1), 0, ...
    'Color', [0.10 0.32 0.58], 'LineWidth', 2, ...
    'MaxHeadSize', 0.6);
end

function paths = localRelativeFileList(files, projectRoot)
relative = strings(size(files));
for index = 1:numel(files)
    relative(index) = localRelativePath(files(index), projectRoot);
end
paths = join(relative, '; ');
end

function path = localRelativePath(file, projectRoot)
file = string(file);
projectRoot = string(projectRoot);
prefix = projectRoot + filesep;
if startsWith(file, prefix, 'IgnoreCase', true)
    path = extractAfter(file, strlength(prefix));
else
    [~, name, extension] = fileparts(file);
    path = name + extension;
end
end

function record = localRecord(file, category, source, authenticity)
if nargin == 0
    file = "";
    category = "";
    source = "";
    authenticity = "";
end
record = struct('File', string(file), 'Category', string(category), ...
    'Source', string(source), 'Authenticity', string(authenticity));
end

function key = localNormalizeName(name)
key = lower(regexprep(char(string(name)), '[^a-zA-Z0-9]', ''));
end

function localDeleteIfPresent(file)
if exist(file, 'file') == 2
    delete(file);
end
end

function localEnsureFolder(folder)
if exist(folder, 'dir') ~= 7
    mkdir(folder);
end
end
