function artifacts = save_data_inspector_reference(projectRoot)
%SAVE_DATA_INSPECTOR_REFERENCE Build an isolated, portable SDI reference.
%
% The committed view/session are rebuilt from the retained command-tracking
% MAT file and contain exactly one imported onboarding run. The caller's
% current SDI repository and view are backed up under TEMP, then restored
% even when reference generation fails.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

viewDir = fullfile(projectRoot, 'data', 'SimulationDataInspector');
sessionDir = fullfile(projectRoot, 'results', 'SimulationDataInspector');
if ~isfolder(viewDir)
    mkdir(viewDir);
end
if ~isfolder(sessionDir)
    mkdir(sessionDir);
end

viewFile = fullfile(viewDir, ...
    'AircraftFeedbackControlLoop_Onboarding_View.mldatx');
sessionFile = fullfile(sessionDir, ...
    'AircraftFeedbackControlLoop_Onboarding_Session.mldatx');

workDir = tempname;
mkdir(workDir);
backupView = fullfile(workDir, 'Caller_SDI_View.mldatx');
backupSession = fullfile(workDir, 'Caller_SDI_Session.mldatx');
stagedView = fullfile(workDir, ...
    'AircraftFeedbackControlLoop_Onboarding_View.mldatx');
stagedSession = fullfile(workDir, ...
    'AircraftFeedbackControlLoop_Onboarding_Session.mldatx');

callerRunIDs = Simulink.sdi.getAllRunIDs;
callerHadRuns = ~isempty(callerRunIDs);
Simulink.sdi.saveView(backupView);
if callerHadRuns
    Simulink.sdi.save(backupSession);
end

restoreGuard = onCleanup(@() localRestoreCallerRepository( ...
    callerHadRuns, backupSession, backupView, workDir));

runID = update_data_inspector(projectRoot, ...
    'ResetRepository', true, ...
    'OpenViewer', false, ...
    'RunName', 'AircraftFeedbackControlLoop - onboarding reference');

referenceRunIDs = Simulink.sdi.getAllRunIDs;
assert(numel(referenceRunIDs) == 1 && referenceRunIDs(1) == runID, ...
    'Training:InvalidSDIReference', ...
    'Reference generation must produce exactly one intended SDI run.');

Simulink.sdi.saveView(stagedView);
Simulink.sdi.save(stagedSession);

% Validate the staged package in a clean repository before committing it.
Simulink.sdi.clear;
valid = Simulink.sdi.load(stagedSession);
assert(valid, 'Training:InvalidSDISession', ...
    'Unable to reload staged SDI session: %s', stagedSession);
Simulink.sdi.loadView(stagedView);
loadedRunIDs = Simulink.sdi.getAllRunIDs;
assert(numel(loadedRunIDs) == 1, 'Training:InvalidSDIReference', ...
    'The staged SDI session does not contain exactly one run.');

[viewMoved, viewMessage] = movefile(stagedView, viewFile, 'f');
assert(viewMoved, 'Training:SDISaveFailed', ...
    'Unable to commit SDI view template: %s', viewMessage);
[sessionMoved, sessionMessage] = movefile(stagedSession, sessionFile, 'f');
assert(sessionMoved, 'Training:SDISaveFailed', ...
    'Unable to commit SDI session: %s', sessionMessage);

artifacts = struct( ...
    'ViewTemplate', viewFile, ...
    'SessionData', sessionFile, ...
    'RunCount', numel(loadedRunIDs), ...
    'RunName', 'AircraftFeedbackControlLoop - onboarding reference', ...
    'SavedOn', char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss')));

fprintf('Saved isolated SDI view template: %s\n', viewFile);
fprintf('Saved one-run SDI session and data: %s\n', sessionFile);
fprintf('The caller''s SDI repository will be restored from its TEMP backup.\n');
end

function localRestoreCallerRepository(hadRuns, sessionFile, viewFile, workDir)
restored = false;
try
    Simulink.sdi.clear;
    if hadRuns
        valid = Simulink.sdi.load(sessionFile);
        assert(valid, 'Training:SDIRestoreFailed', ...
            'Unable to reload caller SDI session: %s', sessionFile);
    end
    if isfile(viewFile)
        Simulink.sdi.loadView(viewFile);
    end
    restored = true;
catch restoreError
    warning('Training:SDIRestoreFailed', ...
        ['Could not fully restore the caller''s SDI repository. Recovery ' ...
         'files remain in %s. Cause: %s'], workDir, restoreError.message);
end

if restored && isfolder(workDir)
    rmdir(workDir, 's');
end
end
