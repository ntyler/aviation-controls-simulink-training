function report = cleanup_training_environment(varargin)
%CLEANUP_TRAINING_ENVIRONMENT Clean only resources owned by this project.
%   REPORT = CLEANUP_TRAINING_ENVIRONMENT leaves loaded models open by
%   default. Pass 'CloseModels', true to close clean training models. Dirty
%   models are always preserved so unsaved work is never discarded.

    parser = inputParser;
    parser.FunctionName = mfilename;
    addParameter(parser, 'ProjectRoot', ...
        fileparts(fileparts(mfilename('fullpath'))), ...
        @(value)ischar(value) || (isstring(value) && isscalar(value)));
    addParameter(parser, 'CloseModels', false, ...
        @(value)islogical(value) && isscalar(value));
    parse(parser, varargin{:});

    projectRoot = localCanonicalFolder(char(parser.Results.ProjectRoot));
    closedModels = {};
    preservedDirtyModels = {};

    if parser.Results.CloseModels && ~isempty(ver('simulink'))
        loadedDiagrams = find_system('SearchDepth', 0, 'Type', 'block_diagram');
        for index = 1:numel(loadedDiagrams)
            diagram = loadedDiagrams{index};
            fileName = get_param(diagram, 'FileName');
            if isempty(fileName) || ~localIsUnderRoot(fileName, projectRoot)
                continue;
            end
            if strcmp(get_param(diagram, 'Dirty'), 'on')
                preservedDirtyModels{end + 1} = diagram; %#ok<AGROW>
            else
                bdclose(diagram);
                closedModels{end + 1} = diagram; %#ok<AGROW>
            end
        end
    end

    callbackReport = training_callback_cleanup;

    % Remove known project paths even if setup failed before storing state.
    candidateFolders = {
        fullfile(projectRoot, 'tests')
        fullfile(projectRoot, 'models')
        fullfile(projectRoot, 'data')
        fullfile(projectRoot, 'scripts')
        projectRoot
    };
    removedFolders = callbackReport.RemovedFolders;
    for index = 1:numel(candidateFolders)
        folder = candidateFolders{index};
        if localIsOnPath(folder)
            rmpath(folder);
            removedFolders{end + 1} = folder; %#ok<AGROW>
        end
    end

    report = struct( ...
        'ClosedModels', {closedModels}, ...
        'PreservedDirtyModels', {preservedDirtyModels}, ...
        'DictionaryClosed', callbackReport.DictionaryClosed, ...
        'RandomStateRestored', callbackReport.RandomStateRestored, ...
        'RemovedFolders', {unique(removedFolders, 'stable')});
end

function folder = localCanonicalFolder(folder)
    if ~(ischar(folder) && isrow(folder) && isfolder(folder))
        error('AviationTraining:InvalidProjectRoot', ...
            'ProjectRoot must identify an existing folder.');
    end
    [status, attributes] = fileattrib(folder);
    if ~status
        error('AviationTraining:InvalidProjectRoot', ...
            'Could not resolve ProjectRoot: %s', folder);
    end
    folder = attributes.Name;
end

function tf = localIsUnderRoot(fileName, projectRoot)
    [status, attributes] = fileattrib(fileName);
    if ~status
        tf = false;
        return;
    end
    fileName = attributes.Name;
    rootWithSeparator = [projectRoot filesep];
    tf = strncmpi(fileName, rootWithSeparator, numel(rootWithSeparator));
end

function tf = localIsOnPath(folder)
    tf = any(strcmpi(strsplit(path, pathsep), folder));
end
