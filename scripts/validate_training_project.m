function summary = validate_training_project(projectRoot)
%VALIDATE_TRAINING_PROJECT Compile every model and verify expected artifacts.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);
modelsDir = fullfile(projectRoot,'models');
dataDir = fullfile(projectRoot,'data');
resultsDir = fullfile(projectRoot,'results');
reportsDir = fullfile(projectRoot,'reports');
screensDir = fullfile(projectRoot,'screenshots');
addpath(modelsDir,dataDir,fullfile(projectRoot,'scripts'));

modelNames = { ...
    'PitchRateLimiter', ...
    'AircraftFeedbackControlLoop', ...
    'AutopilotModeLogic', ...
    'SensorProcessingRef', ...
    'PitchControllerRef', ...
    'ActuatorCommandRef', ...
    'ReferencedFlightControlArchitecture', ...
    'PitchRateLimiter_Harness'};

modelStatus = false(size(modelNames));
modelWarnings = strings(size(modelNames));
for index = 1:numel(modelNames)
    modelName = modelNames{index};
    modelFile = fullfile(modelsDir,[modelName '.slx']);
    assert(isfile(modelFile),'Missing model: %s',modelFile);
    load_system(modelFile);
    lastwarn('');
    set_param(modelName,'SimulationCommand','update');
    [warningText,~] = lastwarn;
    modelWarnings(index) = string(warningText);
    assert(strlength(modelWarnings(index)) == 0, ...
        'Model update produced a warning for %s: %s', ...
        modelName, modelWarnings(index));
    modelStatus(index) = true;
    close_system(modelName,0);
end

dictionaryPath = fullfile(dataDir,'FCS_Data.sldd');
assert(isfile(dictionaryPath),'Missing data dictionary: %s',dictionaryPath);
dictionary = Simulink.data.dictionary.open(dictionaryPath);
dictionaryGuard = onCleanup(@() close(dictionary)); %#ok<NASGU>
section = getSection(dictionary,'Design Data');
requiredEntries = {'Sample_time','q_limit_normal','pitch_Kp','pitch_Ki', ...
    'sensor_filter_alpha','FlightControlBus'};
for index = 1:numel(requiredEntries)
    getEntry(section,requiredEntries{index});
end

resultsCsv = fullfile(resultsDir,'PitchRateLimiter_TestResults.csv');
assert(isfile(resultsCsv),'Missing executed test CSV: %s',resultsCsv);
testTable = readtable(resultsCsv,'TextType','string','Delimiter',',');
passVariable = find(strcmpi(testTable.Properties.VariableNames,'Passed'),1);
assert(~isempty(passVariable),'Test CSV does not contain a Passed column.');
passValues = testTable{:,passVariable};
if iscell(passValues) || isstring(passValues) || ischar(passValues)
    passValues = strcmpi(string(passValues),'true') | strcmpi(string(passValues),'pass') | string(passValues) == "1";
end
assert(all(logical(passValues)),'One or more PitchRateLimiter test assessments failed.');

requiredArtifacts = { ...
    fullfile(reportsDir,'PitchRateLimiter_TestReport.html'), ...
    fullfile(screensDir,'pitch_rate_limiter.png'), ...
    fullfile(screensDir,'aircraft_feedback_loop.png'), ...
    fullfile(screensDir,'pitch_controller_subsystem.png'), ...
    fullfile(screensDir,'autopilot_mode_logic.png'), ...
    fullfile(screensDir,'referenced_architecture.png'), ...
    fullfile(screensDir,'data_dictionary_bus.png'), ...
    fullfile(screensDir,'pitch_rate_limiter_harness.png'), ...
    fullfile(screensDir,'pitch_rate_limiter_test_results.png'), ...
    fullfile(screensDir,'command_tracking_plot.png'), ...
    fullfile(screensDir,'callback_workflow.png'), ...
    fullfile(screensDir,'pitch_rate_limiter_logic.png'), ...
    fullfile(screensDir,'pitch_rate_limiter_test_report.png'), ...
    fullfile(screensDir,'evidence_chain_summary.png')};
for index = 1:numel(requiredArtifacts)
    assert(isfile(requiredArtifacts{index}),'Missing exported artifact: %s',requiredArtifacts{index});
end

summary = struct( ...
    'validatedAt', datetime('now','TimeZone','local'), ...
    'modelNames', {modelNames}, ...
    'modelUpdatePassed', modelStatus, ...
    'modelWarnings', modelWarnings, ...
    'testAssessments', height(testTable), ...
    'testAssessmentsPassed', sum(logical(passValues)), ...
    'dictionaryEntriesResolved', {requiredEntries}, ...
    'requiredArtifacts', {requiredArtifacts}, ...
    'passed', true);

reportPath = fullfile(resultsDir,'validation_summary.txt');
fileId = fopen(reportPath,'w');
assert(fileId ~= -1,'Could not create validation summary: %s',reportPath);
fileGuard = onCleanup(@() fclose(fileId)); %#ok<NASGU>
fprintf(fileId,'Aviation Controls Simulink Training validation\n');
fprintf(fileId,'Generated: %s\n',datestr(now,31));
fprintf(fileId,'MATLAB: %s\n',version);
fprintf(fileId,'Models updated: %d/%d\n',sum(modelStatus),numel(modelStatus));
for index = 1:numel(modelNames)
    fprintf(fileId,'- %s: PASS',modelNames{index});
    if strlength(modelWarnings(index)) > 0
        fprintf(fileId,'; warning: %s',modelWarnings(index));
    end
    fprintf(fileId,'\n');
end
fprintf(fileId,'PitchRateLimiter assessments: %d/%d PASS\n',sum(logical(passValues)),height(testTable));
fprintf(fileId,'Dictionary entries resolved: %d/%d\n',numel(requiredEntries),numel(requiredEntries));
fprintf(fileId,'Required exported artifacts: %d/%d present\n',numel(requiredArtifacts),numel(requiredArtifacts));
fprintf(fileId,'HIL executed: NO\n');
fprintf(fileId,'Jenkins executed: NO\n');
fprintf(fileId,'Overall: PASS\n');
end
