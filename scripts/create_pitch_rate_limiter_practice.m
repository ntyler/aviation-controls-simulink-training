function practice = create_pitch_rate_limiter_practice(projectRoot, learnerTag, varargin)
%CREATE_PITCH_RATE_LIMITER_PRACTICE Create an isolated learner model/harness.
%
% practice = create_pitch_rate_limiter_practice(projectRoot, learnerTag)
% creates a uniquely named limiter and matching harness below
% learner_workspace/<learnerTag>/. It never edits the delivered models.
%
% Use 'ReplaceExisting',true only when intentionally resetting that exact
% learner workspace. Unsaved loaded models are never discarded.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
if nargin < 2 || strlength(string(learnerTag)) == 0
    error('TrainingPractice:MissingLearnerTag', ...
        'Provide a short unique learner tag, for example ''jsmith''.');
end

parser = inputParser;
parser.FunctionName = mfilename;
addParameter(parser, 'ReplaceExisting', false, ...
    @(value) islogical(value) && isscalar(value));
parse(parser, varargin{:});

projectRoot = char(projectRoot);
rawTag = char(string(learnerTag));
if isempty(regexp(rawTag, '^[A-Za-z][A-Za-z0-9_]{0,27}$', 'once'))
    error('TrainingPractice:InvalidLearnerTag', ...
        ['Learner tag must start with a letter and contain at most 28 ' ...
         'letters, numbers, or underscores.']);
end
safeTag = rawTag;

modelsDir = fullfile(projectRoot, 'models');
dataDir = fullfile(projectRoot, 'data');
dictionaryFile = fullfile(dataDir, 'FCS_Data.sldd');
workspaceDir = fullfile(projectRoot, 'learner_workspace', safeTag);
practiceModelsDir = fullfile(workspaceDir, 'models');
modelName = ['PitchRateLimiter_Practice_' safeTag];
harnessName = [modelName '_Harness'];
modelFile = fullfile(practiceModelsDir, [modelName '.slx']);
harnessFile = fullfile(practiceModelsDir, [harnessName '.slx']);

assert(isfile(dictionaryFile), 'TrainingPractice:MissingDictionary', ...
    'Required dictionary not found: %s', dictionaryFile);
localAssertBaselineNotShadowed(modelsDir);
localAssertSafeModelName(modelName, modelFile);
localAssertSafeModelName(harnessName, harnessFile);

if ~isfolder(practiceModelsDir)
    mkdir(practiceModelsDir);
end
localPrepareTarget(modelName, modelFile, parser.Results.ReplaceExisting);
localPrepareTarget(harnessName, harnessFile, parser.Results.ReplaceExisting);

dataWasOnPath = localPathContains(dataDir);
if ~dataWasOnPath
    addpath(dataDir);
end
pathCleanup = onCleanup(@() localRestorePath(dataDir, dataWasOnPath)); %#ok<NASGU>

localCreateComponent(modelName, modelFile);
localCreateHarness(harnessName, harnessFile, modelName);

practice = struct();
practice.LearnerTag = string(safeTag);
practice.WorkspaceDir = string(workspaceDir);
practice.ModelsDir = string(practiceModelsDir);
practice.ModelName = string(modelName);
practice.ModelFile = string(modelFile);
practice.HarnessName = string(harnessName);
practice.HarnessFile = string(harnessFile);
practice.DictionaryFile = string(dictionaryFile);
practice.TestCommand = sprintf([ ...
    'run_pitch_rate_limiter_practice_tests(projectRoot,''%s'')'], safeTag);

fprintf(['Created isolated practice component and harness:\n  %s\n  %s\n' ...
    'Run the learner assessment with:\n  %s\n'], ...
    modelFile, harnessFile, practice.TestCommand);
end


function localCreateComponent(modelName, modelFile)
new_system(modelName, 'Model');
localConfigureModel(modelName, 4.0);
set_param(modelName, 'Description', [ ...
    'Learner-owned 50 Hz pitch-rate magnitude-limiter practice model. ' ...
    'Not production aircraft data and not a managed baseline model.']);

localAddBanner(modelName, [ ...
    'LEARNER PRACTICE COPY - NOT A MANAGED BASELINE OR PRODUCTION MODEL\n' ...
    'Inclusive +/-q_limit_normal magnitude clamp with deterministic fallback']);

localAddInport(modelName, 'q_cmd_in', 1, [35 130 65 150], 'double', 'deg/s');
localAddInport(modelName, 'normal_mode', 2, [35 205 65 225], 'boolean', '1');
localAddInport(modelName, 'input_valid', 3, [35 270 65 290], 'boolean', '1');

logicPath = [modelName '/Pitch Rate Limiter Logic'];
add_block('simulink/Ports & Subsystems/Subsystem', logicPath, ...
    'Position', [190 105 440 315], ...
    'BackgroundColor', 'lightBlue', 'ForegroundColor', 'blue');
localBuildLimiterLogic(logicPath);

localAddOutport(modelName, 'q_cmd_out', 1, [575 145 605 165], 'double', 'deg/s');
localAddOutport(modelName, 'limiter_active', 2, [575 245 605 265], 'boolean', '1');
localAddLine(modelName, 'q_cmd_in/1', 'Pitch Rate Limiter Logic/1', 'q_cmd_in_deg_s', true);
localAddLine(modelName, 'normal_mode/1', 'Pitch Rate Limiter Logic/2', 'normal_mode', true);
localAddLine(modelName, 'input_valid/1', 'Pitch Rate Limiter Logic/3', 'input_valid', true);
localAddLine(modelName, 'Pitch Rate Limiter Logic/1', 'q_cmd_out/1', 'q_cmd_out_deg_s', true);
localAddLine(modelName, 'Pitch Rate Limiter Logic/2', 'limiter_active/1', 'limiter_active', true);

save_system(modelName, modelFile);
set_param(modelName, 'SimulationCommand', 'update');
save_system(modelName);
end


function localBuildLimiterLogic(systemPath)
Simulink.SubSystem.deleteContents(systemPath);
localAddInport(systemPath, 'q_cmd_in', 1, [25 80 55 100], 'double', 'deg/s');
localAddInport(systemPath, 'normal_mode', 2, [25 235 55 255], 'boolean', '1');
localAddInport(systemPath, 'input_valid', 3, [25 290 55 310], 'boolean', '1');

add_block('simulink/Logic and Bit Operations/Logical Operator', ...
    [systemPath '/Normal AND Valid'], 'Operator', 'AND', 'Inputs', '2', ...
    'Position', [135 240 175 300], 'BackgroundColor', 'yellow');
add_block('simulink/Discontinuities/Saturation', ...
    [systemPath '/Magnitude Clamp'], 'UpperLimit', 'q_limit_normal', ...
    'LowerLimit', '-q_limit_normal', 'Position', [155 65 245 115], ...
    'BackgroundColor', 'lightBlue');
add_block('simulink/Sources/Constant', ...
    [systemPath '/Training Fallback Command'], ...
    'Value', 'q_fallback_command', 'OutDataTypeStr', 'double', ...
    'SampleTime', 'Sample_time', 'Position', [160 155 245 185], ...
    'BackgroundColor', 'yellow');
add_block('simulink/Signal Routing/Switch', ...
    [systemPath '/Select Valid Command'], 'Criteria', 'u2 ~= 0', ...
    'Threshold', '0.5', 'Position', [320 80 375 195], ...
    'BackgroundColor', 'yellow');
add_block('simulink/Logic and Bit Operations/Relational Operator', ...
    [systemPath '/Above Positive Limit'], 'Operator', '>', ...
    'Position', [155 360 195 390], 'BackgroundColor', 'yellow');
add_block('simulink/Sources/Constant', [systemPath '/Positive Limit'], ...
    'Value', 'q_limit_normal', 'OutDataTypeStr', 'double', ...
    'SampleTime', 'Sample_time', 'Position', [80 405 135 435], ...
    'BackgroundColor', 'yellow');
add_block('simulink/Logic and Bit Operations/Relational Operator', ...
    [systemPath '/Below Negative Limit'], 'Operator', '<', ...
    'Position', [155 475 195 505], 'BackgroundColor', 'yellow');
add_block('simulink/Sources/Constant', [systemPath '/Negative Limit'], ...
    'Value', '-q_limit_normal', 'OutDataTypeStr', 'double', ...
    'SampleTime', 'Sample_time', 'Position', [80 520 135 550], ...
    'BackgroundColor', 'yellow');
add_block('simulink/Logic and Bit Operations/Logical Operator', ...
    [systemPath '/Outside Inclusive Range'], 'Operator', 'OR', 'Inputs', '2', ...
    'Position', [250 405 290 465], 'BackgroundColor', 'yellow');
add_block('simulink/Logic and Bit Operations/Logical Operator', ...
    [systemPath '/Valid Clamp Active'], 'Operator', 'AND', 'Inputs', '2', ...
    'Position', [350 375 395 435], 'BackgroundColor', 'yellow');

localAddOutport(systemPath, 'q_cmd_out', 1, [465 120 495 140], 'double', 'deg/s');
localAddOutport(systemPath, 'limiter_active', 2, [465 395 495 415], 'boolean', '1');

localAddLine(systemPath, 'normal_mode/1', 'Normal AND Valid/1', 'normal_mode', false);
localAddLine(systemPath, 'input_valid/1', 'Normal AND Valid/2', 'input_valid', false);
localAddLine(systemPath, 'q_cmd_in/1', 'Magnitude Clamp/1', 'q_cmd_raw_deg_s', false);
localAddLine(systemPath, 'Magnitude Clamp/1', 'Select Valid Command/1', 'q_cmd_clamped_deg_s', false);
localAddLine(systemPath, 'Normal AND Valid/1', 'Select Valid Command/2', 'normal_and_valid', false);
localAddLine(systemPath, 'Training Fallback Command/1', 'Select Valid Command/3', 'fallback_deg_s', false);
localAddLine(systemPath, 'Select Valid Command/1', 'q_cmd_out/1', 'q_cmd_selected_deg_s', false);
localAddLine(systemPath, 'q_cmd_in/1', 'Above Positive Limit/1', '', false);
localAddLine(systemPath, 'Positive Limit/1', 'Above Positive Limit/2', '', false);
localAddLine(systemPath, 'q_cmd_in/1', 'Below Negative Limit/1', '', false);
localAddLine(systemPath, 'Negative Limit/1', 'Below Negative Limit/2', '', false);
localAddLine(systemPath, 'Above Positive Limit/1', 'Outside Inclusive Range/1', 'above_positive_limit', false);
localAddLine(systemPath, 'Below Negative Limit/1', 'Outside Inclusive Range/2', 'below_negative_limit', false);
localAddLine(systemPath, 'Outside Inclusive Range/1', 'Valid Clamp Active/1', 'outside_limit', false);
localAddLine(systemPath, 'Normal AND Valid/1', 'Valid Clamp Active/2', '', false);
localAddLine(systemPath, 'Valid Clamp Active/1', 'limiter_active/1', 'limiter_active', false);

localAddNote(systemPath, [30 585 500 635], [ ...
    'Exactly +/-q_limit_normal passes unchanged and leaves limiter_active false. ' ...
    'Invalid or non-normal input selects q_fallback_command.']);
end


function localCreateHarness(harnessName, harnessFile, componentName)
new_system(harnessName, 'Model');
localConfigureModel(harnessName, 2.0);
set_param(harnessName, 'Description', [ ...
    'Learner-owned harness referencing ' componentName '.']);
localAddBanner(harnessName, [ ...
    'LEARNER PRACTICE HARNESS - SCRIPTED 19-POINT INPUTS OVERRIDE PLACEHOLDERS\n' ...
    'From Workspace stimuli -> learner component -> retained outputs']);

placeholderTime = [0; 0.02];
modelWorkspace = get_param(harnessName, 'ModelWorkspace');
assignin(modelWorkspace, 'q_cmd_test', ...
    timeseries([0; 0], placeholderTime, 'Name', 'q_cmd_test'));
assignin(modelWorkspace, 'normal_mode_test', ...
    timeseries(logical([1; 1]), placeholderTime, 'Name', 'normal_mode_test'));
assignin(modelWorkspace, 'input_valid_test', ...
    timeseries(logical([1; 1]), placeholderTime, 'Name', 'input_valid_test'));

localAddFromWorkspace(harnessName, 'q_cmd_test', 'q_cmd_test', [35 105 145 135]);
localAddFromWorkspace(harnessName, 'normal_mode_test', 'normal_mode_test', [35 180 145 210]);
localAddFromWorkspace(harnessName, 'input_valid_test', 'input_valid_test', [35 255 145 285]);

unitPath = [harnessName '/Unit Under Test - ' componentName];
add_block('simulink/Ports & Subsystems/Model', unitPath, ...
    'ModelName', componentName, 'SimulationMode', 'Normal', ...
    'Position', [245 115 455 285], 'BackgroundColor', 'lightBlue');
localAddToWorkspace(harnessName, 'Capture q_cmd_out', 'q_cmd_out_harness', [565 135 690 165]);
localAddToWorkspace(harnessName, 'Capture limiter_active', 'limiter_active_harness', [565 235 690 265]);

unitBlock = ['Unit Under Test - ' componentName];
localAddLine(harnessName, 'q_cmd_test/1', [unitBlock '/1'], 'q_cmd_test', true);
localAddLine(harnessName, 'normal_mode_test/1', [unitBlock '/2'], 'normal_mode_test', true);
localAddLine(harnessName, 'input_valid_test/1', [unitBlock '/3'], 'input_valid_test', true);
localAddLine(harnessName, [unitBlock '/1'], 'Capture q_cmd_out/1', 'q_cmd_out', true);
localAddLine(harnessName, [unitBlock '/2'], 'Capture limiter_active/1', 'limiter_active', true);
localAddNote(harnessName, [160 355 610 410], [ ...
    'run_pitch_rate_limiter_practice_tests.m owns the stimulus and oracle. ' ...
    'Pressing Run alone uses only the benign placeholders.']);

save_system(harnessName, harnessFile);
set_param(harnessName, 'SimulationCommand', 'update');
save_system(harnessName);
end


function localConfigureModel(modelName, stopTime)
set_param(modelName, 'DataDictionary', 'FCS_Data.sldd', ...
    'SolverType', 'Fixed-step', 'Solver', 'FixedStepDiscrete', ...
    'FixedStep', 'Sample_time', 'StartTime', '0.0', ...
    'StopTime', num2str(stopTime), 'SignalLogging', 'on', ...
    'SignalLoggingName', 'logsout', 'SaveTime', 'on', ...
    'TimeSaveName', 'tout', 'SaveOutput', 'on', ...
    'OutputSaveName', 'yout', 'ReturnWorkspaceOutputs', 'on', ...
    'MaxIdLength', '63', 'ScreenColor', 'white', ...
    'ShowPortDataTypes', 'on', 'ShowLineDimensions', 'on');
end


function localAddInport(systemPath, name, port, position, dataType, unit)
add_block('simulink/Sources/In1', [systemPath '/' name], ...
    'Port', num2str(port), 'OutDataTypeStr', dataType, 'Unit', unit, ...
    'SampleTime', 'Sample_time', 'Position', position, ...
    'BackgroundColor', 'lightBlue');
end


function localAddOutport(systemPath, name, port, position, dataType, unit)
add_block('simulink/Sinks/Out1', [systemPath '/' name], ...
    'Port', num2str(port), 'OutDataTypeStr', dataType, 'Unit', unit, ...
    'Position', position, 'BackgroundColor', 'green');
end


function localAddFromWorkspace(systemPath, blockName, variableName, position)
add_block('simulink/Sources/From Workspace', [systemPath '/' blockName], ...
    'VariableName', variableName, 'SampleTime', 'Sample_time', ...
    'Interpolate', 'off', 'OutputAfterFinalValue', 'Holding final value', ...
    'Position', position, 'BackgroundColor', 'lightBlue');
end


function localAddToWorkspace(systemPath, blockName, variableName, position)
add_block('simulink/Sinks/To Workspace', [systemPath '/' blockName], ...
    'VariableName', variableName, 'SaveFormat', 'Timeseries', ...
    'Position', position, 'BackgroundColor', 'green');
end


function localAddLine(systemPath, source, destination, signalName, logSignal)
lineHandle = add_line(systemPath, source, destination, 'autorouting', 'on');
sourcePort = get_param(lineHandle, 'SrcPortHandle');
sourceBlock = get_param(sourcePort, 'Parent');
if ~isempty(signalName) && ...
        ~strcmp(get_param(sourceBlock, 'BlockType'), 'BusSelector')
    set_param(lineHandle, 'Name', signalName);
end
if logSignal
    set_param(sourcePort, 'DataLogging', 'on');
    if ~isempty(signalName)
        set_param(sourcePort, 'DataLoggingNameMode', 'Custom', ...
            'DataLoggingName', signalName);
    end
end
end


function localAddBanner(systemPath, textValue)
textValue = strrep(textValue, '\n', newline);
note = Simulink.Annotation(systemPath, textValue);
note.Position = [25 15 950 60];
note.FontSize = 12;
note.FontWeight = 'bold';
note.ForegroundColor = 'blue';
note.BackgroundColor = 'white';
end


function localAddNote(systemPath, position, textValue)
note = Simulink.Annotation(systemPath, textValue);
note.Position = position;
note.FontSize = 10;
note.BackgroundColor = 'white';
end


function localPrepareTarget(modelName, modelFile, replaceExisting)
if bdIsLoaded(modelName)
    if strcmp(get_param(modelName, 'Dirty'), 'on')
        error('TrainingPractice:DirtyModel', ...
            'Refusing to discard unsaved changes in %s.', modelName);
    end
    close_system(modelName, 0);
end
if isfile(modelFile)
    if ~replaceExisting
        error('TrainingPractice:AlreadyExists', ...
            ['Practice file already exists: %s\nUse a new learner tag, or ' ...
             'explicitly pass ''ReplaceExisting'',true to reset it.'], modelFile);
    end
    delete(modelFile);
end
end


function localAssertBaselineNotShadowed(modelsDir)
expected = localCanonical(fullfile(modelsDir, 'PitchRateLimiter.slx'));
matches = string(which('PitchRateLimiter', '-all'));
matches = matches(strlength(matches) > 0);
if isempty(matches)
    error('TrainingPractice:MissingBaseline', ...
        'PitchRateLimiter.slx is not resolvable. Add the repository models folder.');
end
if ~strcmpi(localCanonical(char(matches(1))), expected)
    error('TrainingPractice:BaselineShadowed', ...
        ['PitchRateLimiter resolves to %s instead of %s. Remove the shadowing ' ...
         'path/file before creating a practice model.'], matches(1), expected);
end
if bdIsLoaded('PitchRateLimiter')
    loadedFile = localCanonical(get_param('PitchRateLimiter', 'FileName'));
    if ~strcmpi(loadedFile, expected)
        error('TrainingPractice:LoadedBaselineShadowed', ...
            'Loaded PitchRateLimiter is not the delivered baseline: %s', loadedFile);
    end
end
end


function localAssertSafeModelName(modelName, intendedFile)
matches = string(which(modelName, '-all'));
matches = matches(strlength(matches) > 0);
for index = 1:numel(matches)
    if ~strcmpi(localCanonical(char(matches(index))), localCanonical(intendedFile))
        error('TrainingPractice:NameConflict', ...
            'Model name %s already resolves elsewhere: %s', modelName, matches(index));
    end
end
end


function result = localCanonical(pathValue)
result = char(java.io.File(pathValue).getCanonicalPath());
end


function result = localPathContains(folder)
parts = string(strsplit(path, pathsep));
result = any(strcmpi(parts, string(folder)));
end


function localRestorePath(dataDir, wasOnPath)
if ~wasOnPath && localPathContains(dataDir)
    rmpath(dataDir);
end
end
