function report = training_callback_cleanup(state)
%TRAINING_CALLBACK_CLEANUP Release callback-owned deterministic state.
%   This function restores the random-number generator and removes only
%   paths added by training_callback_setup. It does not close models,
%   delete results, clear the base workspace, or affect unrelated work.

    stateKey = 'AviationControlsTrainingCallbackState';
    if nargin < 1 || isempty(state)
        if isappdata(0, stateKey)
            state = getappdata(0, stateKey);
        else
            report = struct('DictionaryClosed', true, ...
                'RandomStateRestored', true, 'RemovedFolders', {{}});
            return;
        end
    end

    dictionaryClosed = true;
    if isfield(state, 'DictionaryObject') && ~isempty(state.DictionaryObject)
        try
            close(state.DictionaryObject);
        catch
            % A loaded model may legitimately retain the shared dictionary.
            dictionaryClosed = false;
        end
    end

    randomStateRestored = false;
    if isfield(state, 'PreviousRandomState') && ~isempty(state.PreviousRandomState)
        rng(state.PreviousRandomState);
        randomStateRestored = true;
    end

    removedFolders = {};
    if isfield(state, 'AddedFolders')
        for index = numel(state.AddedFolders):-1:1
            folder = state.AddedFolders{index};
            if localIsOnPath(folder)
                rmpath(folder);
                removedFolders{end + 1} = folder; %#ok<AGROW>
            end
        end
    end

    if isappdata(0, stateKey)
        rmappdata(0, stateKey);
    end
    report = struct('DictionaryClosed', dictionaryClosed, ...
        'RandomStateRestored', randomStateRestored, ...
        'RemovedFolders', {removedFolders});
end

function tf = localIsOnPath(folder)
    tf = any(strcmpi(strsplit(path, pathsep), folder));
end
