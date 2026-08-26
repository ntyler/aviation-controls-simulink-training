function state = training_callback_setup(projectRoot)
%TRAINING_CALLBACK_SETUP Establish a deterministic training-test context.
%   STATE = TRAINING_CALLBACK_SETUP(PROJECTROOT) adds only existing project
%   folders to the MATLAB path, refreshes and opens FCS_Data.sldd, creates
%   deterministic initial values, and prepares nominal preload stimuli.
%
%   No expected values or pass/fail decisions live in this callback. Test
%   assessments and baselines remain in the test implementation.

    if nargin < 1 || isempty(projectRoot)
        projectRoot = fileparts(fileparts(mfilename('fullpath')));
    end
    projectRoot = localCanonicalFolder(projectRoot);

    candidateFolders = {
        projectRoot
        fullfile(projectRoot, 'scripts')
        fullfile(projectRoot, 'data')
        fullfile(projectRoot, 'models')
        fullfile(projectRoot, 'tests')
    };
    addedFolders = {};
    for index = 1:numel(candidateFolders)
        folder = candidateFolders{index};
        if isfolder(folder) && ~localIsOnPath(folder)
            addpath(folder);
            addedFolders{end + 1} = folder; %#ok<AGROW>
        end
    end

    previousRandomState = rng;
    rng(314159, 'twister');

    try
        dictionaryPath = initialize_training_data(projectRoot);
        dictionaryObject = Simulink.data.dictionary.open(dictionaryPath);
        designData = getSection(dictionaryObject, 'Design Data');
        sampleTimeEntry = getEntry(designData, 'Sample_time');
        sampleTimeParameter = getValue(sampleTimeEntry);
        sampleTime = double(sampleTimeParameter.Value);
    catch exception
        rng(previousRandomState);
        localRemoveFolders(addedFolders);
        rethrow(exception);
    end

    initialConditions = struct( ...
        'ControllerIntegrator', 0, ...
        'ActuatorCommandDeg', 0, ...
        'PitchRateDegPerSec', 0, ...
        'PitchAngleDeg', 0, ...
        'SensorPitchRateDegPerSec', 0);

    time = (0:sampleTime:1.20).';
    qCommand = zeros(size(time));
    qCommand(time >= 0.20 & time < 0.50) = 6.0;
    qCommand(time >= 0.50 & time < 0.80) = 12.1;
    qCommand(time >= 0.80 & time < 1.00) = -12.1;
    normalMode = true(size(time));
    normalMode(time >= 1.00 & time < 1.10) = false;
    inputValid = true(size(time));
    inputValid(time >= 1.10) = false;

    inputDataset = Simulink.SimulationData.Dataset;
    inputDataset = addElement(inputDataset, ...
        timeseries(qCommand, time, 'Name', 'q_cmd_in'), 'q_cmd_in');
    inputDataset = addElement(inputDataset, ...
        timeseries(normalMode, time, 'Name', 'normal_mode'), 'normal_mode');
    inputDataset = addElement(inputDataset, ...
        timeseries(inputValid, time, 'Name', 'input_valid'), 'input_valid');

    state = struct;
    state.ProjectRoot = projectRoot;
    state.AddedFolders = addedFolders;
    state.PreviousRandomState = previousRandomState;
    state.DictionaryPath = dictionaryPath;
    state.DictionaryObject = dictionaryObject;
    state.SampleTime = sampleTime;
    state.InitialConditions = initialConditions;
    state.TestCase = struct( ...
        'Name', 'CallbackNominalAndValidityTrainingCase', ...
        'Description', ['Deterministic preload stimulus only; expected ' ...
            'results and assessments are intentionally defined elsewhere.'], ...
        'InputDataset', inputDataset, ...
        'StopTime', time(end));
    state.ModelName = '';
    state.Phase = 'setup';
    state.CreatedAt = datetime('now', 'TimeZone', 'UTC');
end

function folder = localCanonicalFolder(folder)
    if isstring(folder) && isscalar(folder)
        folder = char(folder);
    end
    if ~(ischar(folder) && isrow(folder) && isfolder(folder))
        error('AviationTraining:InvalidProjectRoot', ...
            'projectRoot must identify an existing folder.');
    end
    [status, attributes] = fileattrib(folder);
    if ~status
        error('AviationTraining:InvalidProjectRoot', ...
            'Could not resolve projectRoot: %s', folder);
    end
    folder = attributes.Name;
end

function tf = localIsOnPath(folder)
    tf = any(strcmpi(strsplit(path, pathsep), folder));
end

function localRemoveFolders(folders)
    for index = numel(folders):-1:1
        if localIsOnPath(folders{index})
            rmpath(folders{index});
        end
    end
end
