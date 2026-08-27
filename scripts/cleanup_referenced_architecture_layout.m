function summary = cleanup_referenced_architecture_layout(projectRoot)
%CLEANUP_REFERENCED_ARCHITECTURE_LAYOUT Improve the parent model layout only.
%
% This helper preserves block behavior, interfaces, signal properties, and
% model-reference targets. It changes block/annotation positions, asks
% Simulink to reroute existing lines, compiles the model, and saves it.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

modelName = 'ReferencedFlightControlArchitecture';
modelFile = fullfile(projectRoot, 'models', [modelName '.slx']);
assert(isfile(modelFile), 'Training:MissingModel', ...
    'Missing referenced architecture model: %s', modelFile);

openedHere = false;
if bdIsLoaded(modelName)
    localAssertExpectedModelFile(modelName, modelFile);
    assert(strcmpi(get_param(modelName,'Dirty'),'off'), ...
        'Training:DirtyOpenModel', ...
        ['Refusing to clean dirty model %s. Save or discard the learner ' ...
         'changes explicitly, then run this helper again.'], modelName);
else
    load_system(modelFile);
    openedHere = true;
    try
        localAssertExpectedModelFile(modelName, modelFile);
    catch openError
        try
            close_system(modelName,0);
        catch closeError
            openError = addCause(openError, closeError);
        end
        rethrow(openError);
    end
end

backupFile = fullfile(tempdir, sprintf('%s_pre_layout_%s.slx', ...
    modelName, datestr(now, 'yyyymmdd_HHMMSS')));

positions = {
    'q_rate',                         [30 105 60 125]
    'pitch_angle',                    [30 150 60 170]
    'mach',                           [30 195 60 215]
    'air_data_valid',                 [30 240 60 260]
    'mode',                           [30 285 60 305]
    'Create FlightControlBus',        [140 95 190 315]
    'Sensor Processing',              [280 135 480 250]
    'processed_flight_data',          [1450 175 1480 195]
    'Controller Bus Inputs',          [580 300 640 450]
    'Mode Is NORMAL',                 [680 400 810 440]
    'q_cmd_in',                       [690 475 720 495]
    'Pitch Rate Limiter',             [850 450 1050 585]
    'Pitch Controller',               [1150 450 1340 585]
    'Actuator Command',               [1450 450 1640 585]
    'limiter_active',                 [1100 620 1130 640]
    'q_tracking_error',               [1390 620 1420 640]
    'actuator_cmd_deg',               [1730 475 1760 495]
    'actuator_limit_active',          [1680 620 1710 640]
    };

try
    % Complete the structural preflight before changing any learner-visible
    % layout. A missing expected block therefore cannot leave a half-edited
    % already-open model.
    for index = 1:size(positions, 1)
        blockPath = [modelName '/' positions{index, 1}];
        assert(getSimulinkBlockHandle(blockPath) > 0, ...
            'Training:MissingBlock', 'Missing expected block: %s', blockPath);
    end

    [copied, copyMessage] = copyfile(modelFile, backupFile);
    assert(copied, 'Training:BackupFailed', ...
        'Could not create the on-disk model backup: %s', copyMessage);

    for index = 1:size(positions, 1)
        blockPath = [modelName '/' positions{index, 1}];
        set_param(blockPath, 'Position', positions{index, 2});
    end

    annotations = find_system(modelName, 'FindAll', 'on', ...
        'SearchDepth', 1, 'Type', 'annotation');
    for index = 1:numel(annotations)
        try
            text = string(get_param(annotations(index), 'PlainText'));
        catch
            text = string(get_param(annotations(index), 'Text'));
        end
        if contains(text, 'ILLUSTRATIVE REFERENCED FLIGHT-CONTROL ARCHITECTURE')
            set_param(annotations(index), 'Position', [280 35 1220 80]);
        elseif contains(text, 'Interface review focus')
            set_param(annotations(index), 'Position', [280 675 1500 715]);
        end
    end

    % Default to the clean reading view. The onboarding deck shows how to
    % turn these information overlays back on for an interface review.
    set_param(modelName, ...
        'ShowPortDataTypes', 'off', ...
        'ShowLineDimensions', 'off', ...
        'ShowPortUnits', 'off');
    modelParameters = get_param(modelName, 'ObjectParameters');
    if isfield(modelParameters, 'ShowTestPointIcons')
        set_param(modelName, 'ShowTestPointIcons', 'off');
    end

    lineHandles = find_system(modelName, 'FindAll', 'on', ...
        'SearchDepth', 1, 'Type', 'line');
    Simulink.BlockDiagram.routeLine(lineHandles);

    % Preserve a deliberate three-lane reading order after autorouting.
    % Custom signal-logging names remain on the source ports even when a
    % redundant visible line label is suppressed.
    localSetOutputLineRoute([modelName '/Controller Bus Inputs'], 1, ...
        [645 325; 1100 325; 1100 550; 1135 550], false);
    localSetOutputLineRoute([modelName '/Controller Bus Inputs'], 2, ...
        [645 375; 665 375; 665 565; 835 565], false);
    localSetOutputLineRoute([modelName '/Controller Bus Inputs'], 3, ...
        [645 425; 655 425; 655 420; 665 420], false);
    localSetOutputLineRoute([modelName '/Mode Is NORMAL'], 1, ...
        [815 420; 825 420; 825 520; 835 520], true);
    localSetOutputLineRoute([modelName '/q_cmd_in'], 1, ...
        [725 485; 805 485; 805 475; 835 475], true);
    localSetOutputLineRoute([modelName '/Pitch Rate Limiter'], 1, ...
        [1055 485; 1135 485], true);
    localSetOutputLineRoute([modelName '/Pitch Rate Limiter'], 2, ...
        [1055 555; 1085 555; 1085 630], true);
    localSetOutputLineRoute([modelName '/Pitch Controller'], 1, ...
        [1345 485; 1380 485; 1380 520; 1435 520], true);
    localSetOutputLineRoute([modelName '/Pitch Controller'], 2, ...
        [1345 550; 1375 550; 1375 630], true);
    localSetOutputLineRoute([modelName '/Actuator Command'], 1, ...
        [1645 485; 1715 485], true);
    localSetOutputLineRoute([modelName '/Actuator Command'], 2, ...
        [1645 550; 1665 550; 1665 630], true);

    set_param(modelName, 'SimulationCommand', 'update');
    open_system(modelName);
    set_param(modelName, 'ZoomFactor', 'FitSystem');
    localAssertExpectedModelFile(modelName, modelFile);
    save_system(modelName, modelFile);
catch layoutError
    % Never close or discard an already-open learner model. If this helper
    % opened the model itself, it may safely close that unsaved work while
    % retaining the on-disk model and the timestamped backup.
    if openedHere && bdIsLoaded(modelName)
        try
            close_system(modelName,0);
        catch closeError
            layoutError = addCause(layoutError, closeError);
        end
    end
    rethrow(layoutError);
end

summary = struct( ...
    'Model', modelFile, ...
    'Backup', backupFile, ...
    'BlocksRepositioned', size(positions, 1), ...
    'LinesRouted', numel(lineHandles), ...
    'SavedOn', datestr(now, 31));

fprintf(['Cleaned referenced architecture layout: %d blocks repositioned, ' ...
    '%d existing lines rerouted.\nBackup: %s\n'], ...
    summary.BlocksRepositioned, summary.LinesRouted, summary.Backup);
end

function localAssertExpectedModelFile(modelName, expectedFile)
actualFile = get_param(modelName,'FileName');
assert(~isempty(actualFile), 'Training:UnresolvedModelFile', ...
    'Loaded model %s does not report a source file.', modelName);
expectedPath = localCanonicalPath(expectedFile);
actualPath = localCanonicalPath(actualFile);
assert(strcmpi(actualPath, expectedPath), ...
    'Training:UnexpectedModelFile', ...
    ['Model name %s is already bound to a different file.\n' ...
     'Expected: %s\nLoaded: %s'], ...
    modelName, expectedPath, actualPath);
end

function canonicalPath = localCanonicalPath(filePath)
[resolved, attributes] = fileattrib(filePath);
assert(resolved, 'Training:UnresolvedPath', ...
    'Could not resolve file path: %s', filePath);
canonicalPath = strrep(attributes.Name, '/', filesep);
end

function localSetOutputLineRoute(blockPath, outputIndex, points, hideName)
ports = get_param(blockPath, 'PortHandles');
lineHandle = get_param(ports.Outport(outputIndex), 'Line');
assert(lineHandle > 0, 'Training:MissingLine', ...
    'Missing expected output line: %s/%d', blockPath, outputIndex);
set_param(lineHandle, 'Points', points);
if hideName
    set_param(lineHandle, 'Name', '');
end
end
