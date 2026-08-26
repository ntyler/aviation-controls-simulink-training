function state = training_callback_preload(modelName, projectRoot)
%TRAINING_CALLBACK_PRELOAD Prepare dictionary, signals, ICs, and test input.
%   This function is suitable for a model PreLoadFcn or test-file setup.
%   It prepares deterministic inputs but deliberately performs no assessment.

    if nargin < 1 || isempty(modelName)
        modelName = 'PitchRateLimiter';
    end
    if isstring(modelName) && isscalar(modelName)
        modelName = char(modelName);
    end
    if ~(ischar(modelName) && isrow(modelName))
        error('AviationTraining:InvalidModelName', ...
            'modelName must be a character vector or string scalar.');
    end
    [~, modelName] = fileparts(modelName);

    if nargin < 2 || isempty(projectRoot)
        projectRoot = fileparts(fileparts(mfilename('fullpath')));
    end

    stateKey = 'AviationControlsTrainingCallbackState';
    if isappdata(0, stateKey)
        state = getappdata(0, stateKey);
        sameRoot = strcmpi(state.ProjectRoot, localCanonicalFolder(projectRoot));
        if ~sameRoot
            training_callback_cleanup(state);
            state = training_callback_setup(projectRoot);
        end
    else
        state = training_callback_setup(projectRoot);
    end

    state.ModelName = modelName;
    state.Phase = 'preload';
    state.PreloadCompletedAt = datetime('now', 'TimeZone', 'UTC');
    setappdata(0, stateKey, state);
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
