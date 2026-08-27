function summary = run_training_simulations(projectRoot)
%RUN_TRAINING_SIMULATIONS Execute and archive the training demonstrations.
%
% This function runs the illustrative aircraft command-tracking case and
% the autopilot mode sequence, then updates every model in the referenced
% flight-control architecture.  Results are written beneath ../results and
% ../reports.  No production aircraft data are used.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);
modelsDir = fullfile(projectRoot, 'models');
dataDir = fullfile(projectRoot, 'data');
resultsDir = fullfile(projectRoot, 'results');
reportsDir = fullfile(projectRoot, 'reports');

localEnsureFolder(resultsDir);
localEnsureFolder(reportsDir);
localConfigureFileGeneration(projectRoot, resultsDir);
addpath(modelsDir, dataDir, fileparts(mfilename('fullpath')));

if exist('initialize_training_data', 'file') == 2
    initialize_training_data(projectRoot);
end

sampleTime = localTrainingSampleTime(projectRoot);
fprintf('Running training simulations at %.6g s (%.3g Hz).\n', ...
    sampleTime, 1/sampleTime);

aircraftModel = localRequireModel(modelsDir, 'AircraftFeedbackControlLoop');
autopilotModel = localRequireModel(modelsDir, 'AutopilotModeLogic');
architectureModel = localRequireModel(modelsDir, ...
    'ReferencedFlightControlArchitecture');

aircraft = localRunAircraftCase(aircraftModel, sampleTime, resultsDir);
autopilot = localRunAutopilotCase(autopilotModel, sampleTime, resultsDir);
architecture = localValidateArchitecture(architectureModel, resultsDir);

allModels = unique([string({aircraftModel; autopilotModel; architectureModel}); ...
    string(architecture.Model(:))], 'stable');
configuration = localCaptureConfiguration(allModels, resultsDir);

summary = struct();
summary.GeneratedOn = datetime('now', 'TimeZone', 'local');
summary.Release = string(version('-release'));
summary.SampleTime_s = sampleTime;
summary.Aircraft = aircraft.Summary;
summary.Autopilot = autopilot.Summary;
summary.Architecture = architecture;
summary.Configuration = configuration;
summary.Disclaimer = "Illustrative training models; not production aircraft data.";

save(fullfile(resultsDir, 'TrainingSimulationSummary.mat'), 'summary');
localWriteSummaryText(summary, fullfile(reportsDir, ...
    'TrainingSimulationSummary.txt'));

fprintf('Training simulations completed. Results: %s\n', resultsDir);
end

function result = localRunAircraftCase(model, sampleTime, resultsDir)
load_system(model);

stopTime = 20;
t = (0:sampleTime:stopTime).';
command = zeros(size(t));
command(t >= 1 & t < 9) = 5;
command(t >= 9 & t < 15) = -2;
command(t >= 15) = 3;

disturbance = zeros(size(t));
disturbance(t >= 7 & t < 7.5) = 1.5;
disturbance(t >= 13 & t < 13.4) = -1.0;

inputData = containers.Map( ...
    {'pitchcmddeg', 'command', 'commandinput', 'guidancecommand', ...
     'disturbancedegs2', 'disturbance', 'disturbanceinput', 'gust'}, ...
    {command, command, command, command, disturbance, disturbance, ...
     disturbance, disturbance});
externalInput = localExternalInputDataset(model, t, inputData);

simIn = Simulink.SimulationInput(model);
simIn = simIn.setExternalInput(externalInput);
simIn = simIn.setModelParameter( ...
    'StopTime', sprintf('%.15g', stopTime), ...
    'SolverType', 'Fixed-step', ...
    'FixedStep', sprintf('%.15g', sampleTime), ...
    'SaveTime', 'on', ...
    'TimeSaveName', 'tout', ...
    'SaveOutput', 'on', ...
    'OutputSaveName', 'yout', ...
    'SaveFormat', 'Dataset', ...
    'SignalLogging', 'on', ...
    'SignalLoggingName', 'logsout', ...
    'ReturnWorkspaceOutputs', 'on');

set_param(model, 'SimulationCommand', 'update');
simOut = sim(simIn);

commandSignal = localRequireSignal(simOut, ...
    {'command', 'pitch_cmd_deg', 'pitch_command', 'command_input'}, ...
    'logged command');
responseSignal = localRequireSignal(simOut, ...
    {'response', 'pitch_response_deg', 'pitch_response', 'measured_pitch'}, ...
    'logged response');
errorSignal = localRequireSignal(simOut, ...
    {'error', 'tracking_error', 'pitch_error'}, 'logged tracking error');
actuatorSignal = localRequireSignal(simOut, ...
    {'actuator', 'actuator_cmd', 'actuator_command', 'elevator_command'}, ...
    'logged actuator signal');

time = t;
commandLogged = localResample(commandSignal, time, 'previous');
responseLogged = localResample(responseSignal, time, 'linear');
errorLogged = localResample(errorSignal, time, 'linear');
actuatorLogged = localResample(actuatorSignal, time, 'linear');

trackingTable = table(time, commandLogged, responseLogged, errorLogged, ...
    actuatorLogged, disturbance, 'VariableNames', ...
    {'Time_s', 'Command_deg', 'Response_deg', 'Error_deg', ...
     'ActuatorCommand', 'Disturbance_deg_s2'});
writetable(trackingTable, fullfile(resultsDir, ...
    'AircraftFeedback_CommandTracking.csv'));

signalMetadata = struct( ...
    'CommandSource', commandSignal.Name, ...
    'ResponseSource', responseSignal.Name, ...
    'ErrorSource', errorSignal.Name, ...
    'ActuatorSource', actuatorSignal.Name);
save(fullfile(resultsDir, 'AircraftFeedback_CommandTracking.mat'), ...
    'trackingTable', 'signalMetadata', 'sampleTime');

plotFile = fullfile(resultsDir, ...
    'AircraftFeedback_CommandTracking.png');
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
tiledlayout(fig, 3, 1, 'TileSpacing', 'compact', 'Padding', 'compact');

nexttile;
plot(time, commandLogged, '--', 'LineWidth', 1.8, ...
    'Color', [0.10 0.32 0.58]);
hold on;
plot(time, responseLogged, 'LineWidth', 1.8, ...
    'Color', [0.85 0.33 0.10]);
grid on;
ylabel('Pitch angle (deg)');
legend('Command', 'Response', 'Location', 'best');
title('Illustrative command tracking at 50 Hz');

nexttile;
plot(time, errorLogged, 'LineWidth', 1.6, ...
    'Color', [0.49 0.18 0.56]);
yline(0, ':', 'Color', [0.35 0.35 0.35]);
grid on;
ylabel('Error (deg)');

nexttile;
yyaxis left;
plot(time, actuatorLogged, 'LineWidth', 1.6, ...
    'Color', [0.20 0.55 0.35]);
ylabel('Actuator command');
yyaxis right;
area(time, disturbance, 'FaceAlpha', 0.18, 'EdgeColor', ...
    [0.65 0.15 0.15], 'FaceColor', [0.75 0.25 0.20]);
ylabel('Disturbance (deg/s^2)');
grid on;
xlabel('Time (s)');
sgtitle('Aircraft Feedback Control Loop — Illustrative Training Model');
exportgraphics(fig, plotFile, 'Resolution', 200);

result = struct();
result.Table = trackingTable;
result.PlotFile = string(plotFile);
result.Summary = struct( ...
    'Model', string(model), ...
    'StopTime_s', stopTime, ...
    'Samples', height(trackingTable), ...
    'PeakAbsError_deg', max(abs(errorLogged)), ...
    'PeakAbsActuator', max(abs(actuatorLogged)), ...
    'DisturbancePulses', 2, ...
    'Status', "PASS - simulation completed and required signals logged");
end

function result = localRunAutopilotCase(model, sampleTime, resultsDir)
load_system(model);

stopTime = 6;
t = (0:sampleTime:stopTime).';
engageRequest = t >= 0.5 & t < 5.0;
sensorValid = ~(t >= 3.5 & t < 4.5);
engagementSuccessful = t >= 1.0 & t < 3.5;
faultDetected = t >= 3.5 & t < 4.5;
disengageRequest = t >= 4.5 & t < 4.7;
resetRequest = t >= 4.5 & t < 4.7;

inputData = containers.Map( ...
    {'pilotengagementrequest', 'pilotengagerequest', 'engagerequest', ...
     'engagereq', 'validsensordata', 'sensorvalid', 'sensordata valid', ...
     'engagementsuccessful', 'engagesuccess', 'engagementsuccess', ...
     'faultdetected', 'fault', 'invaliddata', ...
     'disengagementrequest', 'disengagerequest', 'disengage', ...
     'resetrequest', 'reset'}, ...
    {engageRequest, engageRequest, engageRequest, engageRequest, ...
     sensorValid, sensorValid, sensorValid, ...
     engagementSuccessful, engagementSuccessful, engagementSuccessful, ...
     faultDetected, faultDetected, ~sensorValid, ...
     disengageRequest, disengageRequest, disengageRequest, ...
     resetRequest, resetRequest});
externalInput = localExternalInputDataset(model, t, inputData);

simIn = Simulink.SimulationInput(model);
simIn = simIn.setExternalInput(externalInput);
simIn = simIn.setModelParameter( ...
    'StopTime', sprintf('%.15g', stopTime), ...
    'SolverType', 'Fixed-step', ...
    'FixedStep', sprintf('%.15g', sampleTime), ...
    'SaveTime', 'on', ...
    'TimeSaveName', 'tout', ...
    'SaveOutput', 'on', ...
    'OutputSaveName', 'yout', ...
    'SaveFormat', 'Dataset', ...
    'SignalLogging', 'on', ...
    'SignalLoggingName', 'logsout', ...
    'ReturnWorkspaceOutputs', 'on');

set_param(model, 'SimulationCommand', 'update');
simOut = sim(simIn);
modeSignal = localRequireSignal(simOut, ...
    {'mode_code', 'mode', 'autopilot_mode', 'mode_output', 'active_mode'}, ...
    'autopilot mode output');
modeRaw = localResample(modeSignal, t, 'previous');
[modeCode, modeName] = localModeRepresentation(modeRaw);

modeTable = table(t, engageRequest, sensorValid, engagementSuccessful, ...
    faultDetected, disengageRequest, resetRequest, modeCode, modeName, ...
    'VariableNames', {'Time_s', 'PilotEngagementRequest', 'SensorValid', ...
    'EngagementSuccessful', 'FaultDetected', 'DisengageRequest', ...
    'ResetRequest', 'ModeCode', 'Mode'});
writetable(modeTable, fullfile(resultsDir, 'AutopilotModeSequence.csv'));
save(fullfile(resultsDir, 'AutopilotModeSequence.mat'), ...
    'modeTable', 'sampleTime');

plotFile = fullfile(resultsDir, 'AutopilotModeSequence.png');
fig = figure('Visible', 'off', 'Color', 'white', ...
    'Position', [100 100 1600 900]);
cleanupFigure = onCleanup(@() close(fig)); %#ok<NASGU>
tiledlayout(fig, 2, 1, 'TileSpacing', 'compact', 'Padding', 'compact');

nexttile;
stairs(t, modeCode, 'LineWidth', 2.2, 'Color', [0.10 0.32 0.58]);
grid on;
ylabel('Mode');
yticks(0:3);
yticklabels({'OFF', 'ARMED', 'ENGAGED', 'DEGRADED'});
ylim([-0.25 3.25]);
title('Mode output');

nexttile;
stairs(t, double(engageRequest), 'LineWidth', 1.4);
hold on;
stairs(t, double(sensorValid), 'LineWidth', 1.4);
stairs(t, double(engagementSuccessful), 'LineWidth', 1.4);
stairs(t, double(faultDetected), 'LineWidth', 1.4);
stairs(t, double(resetRequest), 'LineWidth', 1.4);
grid on;
ylim([-0.1 1.35]);
yticks([0 1]);
xlabel('Time (s)');
ylabel('Boolean input');
legend('Engage request', 'Sensor valid', 'Engagement successful', ...
    'Fault detected', 'Reset/disengage', 'Location', 'eastoutside');
sgtitle('Autopilot Mode Logic — Illustrative Training Sequence');
exportgraphics(fig, plotFile, 'Resolution', 200);

visited = unique(modeName, 'stable');
result = struct();
result.Table = modeTable;
result.PlotFile = string(plotFile);
result.Summary = struct( ...
    'Model', string(model), ...
    'StopTime_s', stopTime, ...
    'Samples', height(modeTable), ...
    'VisitedModes', join(visited, ", "), ...
    'Status', "PASS - mode-sequence simulation completed");
end

function validationTable = localValidateArchitecture(model, resultsDir)
load_system(model);

referenceBlocks = find_system(model, 'LookUnderMasks', 'all', ...
    'FollowLinks', 'on', 'BlockType', 'ModelReference');
referenceModels = strings(0, 1);
for index = 1:numel(referenceBlocks)
    referencedName = string(get_param(referenceBlocks{index}, 'ModelName'));
    if strlength(referencedName) > 0
        referenceModels(end+1, 1) = referencedName; %#ok<AGROW>
    end
end
referenceModels = unique(referenceModels, 'stable');
modelsToValidate = [referenceModels; string(model)];

status = strings(numel(modelsToValidate), 1);
checksum = strings(numel(modelsToValidate), 1);
message = strings(numel(modelsToValidate), 1);
for index = 1:numel(modelsToValidate)
    currentModel = char(modelsToValidate(index));
    try
        load_system(currentModel);
        set_param(currentModel, 'SimulationCommand', 'update');
        status(index) = "PASS";
        checksum(index) = localChecksumText(currentModel);
        message(index) = "Diagram update completed; interfaces resolved.";
    catch updateError
        status(index) = "FAIL";
        checksum(index) = "";
        message(index) = string(updateError.message);
    end
end

validationTable = table(modelsToValidate, status, checksum, message, ...
    'VariableNames', {'Model', 'UpdateStatus', 'Checksum', 'Message'});
writetable(validationTable, fullfile(resultsDir, ...
    'ReferencedArchitecture_Validation.csv'));
save(fullfile(resultsDir, 'ReferencedArchitecture_Validation.mat'), ...
    'validationTable', 'referenceBlocks');

failed = validationTable.UpdateStatus == "FAIL";
if any(failed)
    details = join(validationTable.Model(failed) + ": " + ...
        validationTable.Message(failed), newline);
    error('Training:ArchitectureUpdateFailed', ...
        'Referenced architecture update failed:\n%s', details);
end
end

function configuration = localCaptureConfiguration(models, resultsDir)
models = string(models(:));
models = models(strlength(models) > 0);
solver = strings(size(models));
solverType = strings(size(models));
fixedStep = strings(size(models));
stopTime = strings(size(models));
modelFile = strings(size(models));

for index = 1:numel(models)
    model = char(models(index));
    try
        load_system(model);
        solver(index) = string(get_param(model, 'Solver'));
        solverType(index) = string(get_param(model, 'SolverType'));
        fixedStep(index) = string(get_param(model, 'FixedStep'));
        stopTime(index) = string(get_param(model, 'StopTime'));
        modelFile(index) = string(get_param(model, 'FileName'));
    catch configurationError
        solver(index) = "UNAVAILABLE: " + string(configurationError.message);
    end
end

modelConfiguration = table(models, modelFile, solver, solverType, ...
    fixedStep, stopTime, 'VariableNames', ...
    {'Model', 'ModelFile', 'Solver', 'SolverType', 'FixedStep', 'StopTime'});
writetable(modelConfiguration, fullfile(resultsDir, ...
    'SimulationConfiguration.csv'));

installed = ver;
productName = string({installed.Name}).';
productVersion = string({installed.Version}).';
productRelease = string({installed.Release}).';
products = table(productName, productVersion, productRelease, ...
    'VariableNames', {'Product', 'Version', 'Release'});
writetable(products, fullfile(resultsDir, 'MATLAB_ProductInventory.csv'));

configuration = struct();
configuration.GeneratedOn = datetime('now', 'TimeZone', 'local');
configuration.MATLABVersion = string(version);
configuration.Release = string(version('-release'));
configuration.Computer = string(computer);
configuration.Models = modelConfiguration;
configuration.Products = products;
save(fullfile(resultsDir, 'SimulationConfiguration.mat'), 'configuration');
end

function dataset = localExternalInputDataset(model, time, inputData)
inports = find_system(model, 'SearchDepth', 1, 'BlockType', 'Inport');
if isempty(inports)
    error('Training:NoRootInports', ...
        'Model %s has no root Inports for the scripted scenario.', model);
end

ports = zeros(size(inports));
for index = 1:numel(inports)
    ports(index) = str2double(get_param(inports{index}, 'Port'));
end
[~, order] = sort(ports);
inports = inports(order);

dataset = Simulink.SimulationData.Dataset;
for index = 1:numel(inports)
    signalName = get_param(inports{index}, 'Name');
    key = localNormalizeName(signalName);
    if ~isKey(inputData, key)
        known = strjoin(keys(inputData), ', ');
        error('Training:UnmappedInput', ...
            'No scripted stimulus is mapped to %s/%s. Known aliases: %s', ...
            model, signalName, known);
    end
    values = inputData(key);
    dataset = dataset.addElement(timeseries(values, time), signalName);
end
end

function signal = localRequireSignal(simOut, candidates, description)
signal = localFindSignal(simOut, candidates);
if isempty(signal)
    error('Training:MissingLoggedSignal', ...
        'Simulation did not produce the required %s. Expected one of: %s', ...
        description, strjoin(candidates, ', '));
end
end

function signal = localFindSignal(simOut, candidates)
signal = [];
candidateKeys = cellfun(@localNormalizeName, candidates, ...
    'UniformOutput', false);

try
    outputNames = simOut.who;
catch
    outputNames = {};
end

% First inspect direct SimulationOutput variables (including To Workspace).
for candidateIndex = 1:numel(candidateKeys)
    for outputIndex = 1:numel(outputNames)
        if strcmp(localNormalizeName(outputNames{outputIndex}), ...
                candidateKeys{candidateIndex})
            value = simOut.get(outputNames{outputIndex});
            signal = localAsSignal(value, outputNames{outputIndex});
            if ~isempty(signal)
                return;
            end
        end
    end
end

% Then inspect logged Dataset containers.
containerNames = {'logsout', 'yout'};
for containerIndex = 1:numel(containerNames)
    containerName = containerNames{containerIndex};
    if ~any(strcmp(outputNames, containerName))
        continue;
    end
    dataset = simOut.get(containerName);
    if ~isa(dataset, 'Simulink.SimulationData.Dataset')
        continue;
    end
    for candidateIndex = 1:numel(candidateKeys)
        for elementIndex = 1:dataset.numElements
            element = dataset.getElement(elementIndex);
            elementName = char(string(element.Name));
            if strcmp(localNormalizeName(elementName), ...
                    candidateKeys{candidateIndex})
                signal = localAsSignal(element.Values, elementName);
                if ~isempty(signal)
                    return;
                end
            end
        end
    end
end

% A conservative substring fallback accommodates labels such as
% "controller_error" without confusing generic command labels.
for containerIndex = 1:numel(containerNames)
    containerName = containerNames{containerIndex};
    if ~any(strcmp(outputNames, containerName))
        continue;
    end
    dataset = simOut.get(containerName);
    if ~isa(dataset, 'Simulink.SimulationData.Dataset')
        continue;
    end
    for candidateIndex = 1:numel(candidateKeys)
        key = candidateKeys{candidateIndex};
        if strlength(string(key)) < 5
            continue;
        end
        for elementIndex = 1:dataset.numElements
            element = dataset.getElement(elementIndex);
            elementName = char(string(element.Name));
            if contains(localNormalizeName(elementName), key)
                signal = localAsSignal(element.Values, elementName);
                if ~isempty(signal)
                    return;
                end
            end
        end
    end
end
end

function signal = localAsSignal(value, name)
signal = [];
if isa(value, 'timeseries')
    signal = struct('Time', double(value.Time(:)), ...
        'Data', value.Data, 'Name', string(name));
elseif isa(value, 'timetable')
    signal = struct('Time', seconds(value.Properties.RowTimes), ...
        'Data', value.Variables, 'Name', string(name));
elseif isstruct(value) && isfield(value, 'time') && ...
        isfield(value, 'signals') && isfield(value.signals, 'values')
    signal = struct('Time', double(value.time(:)), ...
        'Data', value.signals.values, 'Name', string(name));
end

if ~isempty(signal)
    signal.Data = squeeze(signal.Data);
    if ~isvector(signal.Data)
        signal.Data = signal.Data(:, 1);
    end
    signal.Data = signal.Data(:);
end
end

function values = localResample(signal, queryTime, method)
signalTime = double(signal.Time(:));
signalData = signal.Data(:);
[signalTime, uniqueIndex] = unique(signalTime, 'stable');
signalData = signalData(uniqueIndex);

if numel(signalTime) == 1
    values = repmat(signalData, size(queryTime));
    return;
end

if islogical(signalData) || isinteger(signalData)
    method = 'previous';
end
values = interp1(signalTime, double(signalData), queryTime, method, 'extrap');
end

function [code, name] = localModeRepresentation(raw)
if isnumeric(raw) || islogical(raw)
    code = double(raw(:));
    name = strings(size(code));
    knownNames = ["OFF", "ARMED", "ENGAGED", "DEGRADED"];
    for index = 1:numel(code)
        integerCode = round(code(index));
        if integerCode >= 0 && integerCode <= 3
            name(index) = knownNames(integerCode + 1);
        else
            name(index) = "UNKNOWN(" + string(code(index)) + ")";
        end
    end
else
    name = string(raw(:));
    code = nan(size(name));
    knownNames = ["OFF", "ARMED", "ENGAGED", "DEGRADED"];
    for index = 1:numel(name)
        match = find(strcmpi(name(index), knownNames), 1);
        if ~isempty(match)
            code(index) = match - 1;
        end
    end
end
end

function checksum = localChecksumText(model)
try
    raw = Simulink.BlockDiagram.getChecksum(model);
    if isnumeric(raw)
        checksum = string(mat2str(raw));
    elseif isstruct(raw)
        checksum = string(jsonencode(raw));
    else
        checksum = string(raw);
    end
catch
    checksum = "not available";
end
end

function sampleTime = localTrainingSampleTime(projectRoot)
sampleTime = 0.02;
dictionaryFile = fullfile(projectRoot, 'data', 'FCS_Data.sldd');
if exist(dictionaryFile, 'file') ~= 2
    return;
end

dictionary = Simulink.data.dictionary.open(dictionaryFile);
cleanupDictionary = onCleanup(@() close(dictionary)); %#ok<NASGU>
designData = getSection(dictionary, 'Design Data');
try
    entry = getEntry(designData, 'Sample_time');
    value = getValue(entry);
    if isa(value, 'Simulink.Parameter')
        value = value.Value;
    end
    validateattributes(value, {'numeric'}, {'scalar', 'positive', 'finite'});
    sampleTime = double(value);
catch dictionaryError
    warning('Training:SampleTimeFallback', ...
        ['Could not read Sample_time from FCS_Data.sldd (%s). ' ...
         'Using the documented 0.02 s training rate.'], dictionaryError.message);
end
end

function model = localRequireModel(modelsDir, modelName)
modelFile = fullfile(modelsDir, [modelName '.slx']);
if ~isfile(modelFile)
    error('Training:MissingModel', 'Required model not found: %s', modelFile);
end
model = modelName;
end

function key = localNormalizeName(name)
key = lower(regexprep(char(string(name)), '[^a-zA-Z0-9]', ''));
end

function localEnsureFolder(folder)
if exist(folder, 'dir') ~= 7
    mkdir(folder);
end
end

function localConfigureFileGeneration(projectRoot, resultsDir)
cacheFolder = fullfile(resultsDir, 'simulink_cache');
codeGenerationFolder = fullfile(resultsDir, 'model_reference_build');
localEnsureFolder(cacheFolder);
localEnsureFolder(codeGenerationFolder);
try
    Simulink.fileGenControl('set', ...
        'CacheFolder', cacheFolder, ...
        'CodeGenFolder', codeGenerationFolder, ...
        'createDir', true);
catch fileGenerationError
    error('Training:FileGenerationConfiguration', ...
        'Could not place generated Simulink artifacts under %s: %s', ...
        projectRoot, fileGenerationError.message);
end
end

function localWriteSummaryText(summary, fileName)
file = fopen(fileName, 'w');
if file < 0
    error('Training:CannotWriteReport', 'Cannot write %s.', fileName);
end
cleanupFile = onCleanup(@() fclose(file)); %#ok<NASGU>
fprintf(file, 'AVIATION CONTROLS SIMULINK TRAINING - SIMULATION SUMMARY\n');
fprintf(file, 'Illustrative training models; not production aircraft data.\n\n');
fprintf(file, 'Generated: %s\n', char(string(summary.GeneratedOn)));
fprintf(file, 'MATLAB release: %s\n', summary.Release);
fprintf(file, 'Discrete sample time: %.6g s (%.3g Hz)\n\n', ...
    summary.SampleTime_s, 1/summary.SampleTime_s);
fprintf(file, 'Aircraft loop: %s\n', summary.Aircraft.Status);
fprintf(file, '  Samples: %d\n', summary.Aircraft.Samples);
fprintf(file, '  Peak absolute tracking error: %.6g deg\n', ...
    summary.Aircraft.PeakAbsError_deg);
fprintf(file, 'Autopilot logic: %s\n', summary.Autopilot.Status);
fprintf(file, '  Visited modes: %s\n', summary.Autopilot.VisitedModes);
fprintf(file, 'Referenced architecture: %d model(s) updated; %d failure(s).\n', ...
    height(summary.Architecture), ...
    nnz(summary.Architecture.UpdateStatus == "FAIL"));
end
