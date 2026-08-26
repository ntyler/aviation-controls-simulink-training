function state = training_callback_postload(modelName, state)
%TRAINING_CALLBACK_POSTLOAD Apply deterministic model configuration.
%   STATE = TRAINING_CALLBACK_POSTLOAD(MODELNAME, STATE) associates the
%   controlled data dictionary and applies repeatable fixed-step settings.
%   This callback contains configuration only, never pass/fail logic.

    if nargin < 1 || isempty(modelName)
        modelName = bdroot;
    end
    if isstring(modelName) && isscalar(modelName)
        modelName = char(modelName);
    end
    [~, modelName] = fileparts(modelName);
    if isempty(modelName)
        error('AviationTraining:MissingModelName', ...
            'Specify the model name when no block diagram is current.');
    end

    stateKey = 'AviationControlsTrainingCallbackState';
    if nargin < 2 || isempty(state)
        if isappdata(0, stateKey)
            state = getappdata(0, stateKey);
        else
            state = training_callback_preload(modelName);
        end
    end

    if ~bdIsLoaded(modelName)
        modelFile = fullfile(state.ProjectRoot, 'models', [modelName '.slx']);
        if ~isfile(modelFile)
            error('AviationTraining:ModelNotFound', ...
                'Training model was not found: %s', modelFile);
        end
        load_system(modelFile);
    end

    localSetIfDifferent(modelName, 'DataDictionary', 'FCS_Data.sldd');
    localSetIfDifferent(modelName, 'SolverType', 'Fixed-step');
    localSetIfDifferent(modelName, 'Solver', 'FixedStepDiscrete');
    localSetIfDifferent(modelName, 'FixedStep', 'Sample_time');
    localSetIfDifferent(modelName, 'StartTime', '0');
    localSetIfDifferent(modelName, 'StopTime', num2str(state.TestCase.StopTime, 16));
    localSetIfDifferent(modelName, 'SignalLogging', 'on');
    localSetIfDifferent(modelName, 'SignalLoggingName', 'logsout');
    localSetIfDifferent(modelName, 'SaveTime', 'on');
    localSetIfDifferent(modelName, 'TimeSaveName', 'tout');
    localSetIfDifferent(modelName, 'ReturnWorkspaceOutputs', 'on');

    state.ModelName = modelName;
    state.Phase = 'postload';
    state.PostLoadCompletedAt = datetime('now', 'TimeZone', 'UTC');
    state.Configuration = struct( ...
        'DataDictionary', state.DictionaryPath, ...
        'Solver', 'FixedStepDiscrete', ...
        'FixedStepExpression', 'Sample_time', ...
        'SampleTimeSeconds', state.SampleTime, ...
        'SignalLogging', true);
    setappdata(0, stateKey, state);
end

function localSetIfDifferent(modelName, parameterName, desiredValue)
    currentValue = get_param(modelName, parameterName);
    if isnumeric(currentValue)
        isSame = isequal(currentValue, desiredValue);
    else
        isSame = strcmp(char(currentValue), char(desiredValue));
    end
    if ~isSame
        set_param(modelName, parameterName, desiredValue);
    end
end
