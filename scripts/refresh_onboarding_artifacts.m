function summary = refresh_onboarding_artifacts(projectRoot)
%REFRESH_ONBOARDING_ARTIFACTS Refresh evidence, model views, and SDI files.
%
% This workflow intentionally does not recreate models. It preserves the
% saved human-readable layouts, executes the current models, validates the
% package, exports every onboarding model/submodel view, and retains the SDI
% view template plus session data.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

addpath(fullfile(projectRoot, 'scripts'), ...
    fullfile(projectRoot, 'models'), ...
    fullfile(projectRoot, 'data'));

summary = struct;
summary.Simulation = run_training_simulations(projectRoot);
summary.Tests = run_pitch_rate_limiter_tests(projectRoot);
summary.Visuals = export_training_visuals(projectRoot);
summary.DataInspectorRunID = update_data_inspector(projectRoot);
summary.DataInspectorFiles = save_data_inspector_reference(projectRoot);
summary.Validation = validate_training_project(projectRoot);
summary.GeneratedOn = datestr(now, 31);

fprintf('Onboarding artifacts refreshed without recreating saved models.\n');
end
