function info = open_data_inspector_reference(projectRoot, varargin)
%OPEN_DATA_INSPECTOR_REFERENCE Open the retained onboarding SDI reference.
%
% Safe default: loading is refused when the current SDI repository contains
% runs. Pass 'ReplaceCurrent', true to explicitly replace it. In that case,
% a recovery session and view are saved under TEMP and their paths are
% returned in INFO.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

parser = inputParser;
parser.FunctionName = mfilename;
addParameter(parser, 'ReplaceCurrent', false, ...
    @(value) islogical(value) && isscalar(value));
parse(parser, varargin{:});
replaceCurrent = parser.Results.ReplaceCurrent;

viewFile = fullfile(projectRoot, 'data', 'SimulationDataInspector', ...
    'AircraftFeedbackControlLoop_Onboarding_View.mldatx');
sessionFile = fullfile(projectRoot, 'results', 'SimulationDataInspector', ...
    'AircraftFeedbackControlLoop_Onboarding_Session.mldatx');

assert(isfile(viewFile), 'Training:MissingSDIView', ...
    'Missing SDI view template: %s', viewFile);
assert(isfile(sessionFile), 'Training:MissingSDISession', ...
    'Missing SDI session data: %s', sessionFile);

currentRunIDs = Simulink.sdi.getAllRunIDs;
if ~isempty(currentRunIDs) && ~replaceCurrent
    error('Training:SDIRepositoryNotEmpty', [ ...
        'The current SDI repository contains %d run(s), so the reference ' ...
        'was not loaded or merged. Use a clean MATLAB session, or rerun ' ...
        'with ''ReplaceCurrent'', true to create a TEMP recovery copy ' ...
        'before replacement.'], numel(currentRunIDs));
end

recoveryDirectory = '';
recoverySession = '';
recoveryView = '';
if replaceCurrent
    recoveryDirectory = tempname;
    mkdir(recoveryDirectory);
    recoveryView = fullfile(recoveryDirectory, 'Previous_SDI_View.mldatx');
    Simulink.sdi.saveView(recoveryView);
    if ~isempty(currentRunIDs)
        recoverySession = fullfile(recoveryDirectory, ...
            'Previous_SDI_Session.mldatx');
        Simulink.sdi.save(recoverySession);
    end
end

try
    Simulink.sdi.clear;
    valid = Simulink.sdi.load(sessionFile);
    assert(valid, 'Training:InvalidSDISession', ...
        'Unable to load SDI session: %s', sessionFile);
    Simulink.sdi.loadView(viewFile);
    loadedRunIDs = Simulink.sdi.getAllRunIDs;
    assert(numel(loadedRunIDs) == 1, 'Training:InvalidSDIReference', ...
        'The onboarding SDI session must contain exactly one run.');
catch loadError
    Simulink.sdi.clear;
    if replaceCurrent
        if isfile(recoverySession)
            Simulink.sdi.load(recoverySession);
        end
        if isfile(recoveryView)
            Simulink.sdi.loadView(recoveryView);
        end
    end
    rethrow(loadError);
end

Simulink.sdi.view;
info = struct( ...
    'Loaded', true, ...
    'RunCount', numel(loadedRunIDs), ...
    'SessionData', sessionFile, ...
    'ViewTemplate', viewFile, ...
    'RecoveryDirectory', recoveryDirectory, ...
    'RecoverySession', recoverySession, ...
    'RecoveryView', recoveryView);

if replaceCurrent
    fprintf('Loaded one-run onboarding SDI reference.\n');
    fprintf('Previous SDI recovery files: %s\n', recoveryDirectory);
else
    fprintf('Loaded one-run onboarding SDI reference into an empty repository.\n');
end
end
