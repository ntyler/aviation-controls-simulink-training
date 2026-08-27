function summary = regenerate_all(projectRoot)
%REGENERATE_ALL Rebuild, execute, verify, and export the training project.
%   This is the single-command entry point used for clean-session validation.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

resultsDir = fullfile(projectRoot, 'results');
cacheFolder = fullfile(resultsDir, 'simulink_cache');
codeGenerationFolder = fullfile(resultsDir, 'model_reference_build');
if ~isfolder(cacheFolder), mkdir(cacheFolder); end
if ~isfolder(codeGenerationFolder), mkdir(codeGenerationFolder); end
Simulink.fileGenControl('set', ...
    'CacheFolder', cacheFolder, ...
    'CodeGenFolder', codeGenerationFolder, ...
    'createDir', true);

fprintf('Aviation controls training regeneration started: %s\n', datestr(now, 31));
initialize_training_data(projectRoot);
create_training_models(projectRoot);
state = training_callback_setup(projectRoot);
cleanupGuard = onCleanup(@() training_callback_cleanup(state)); %#ok<NASGU>
simulation = run_training_simulations(projectRoot);
tests = run_pitch_rate_limiter_tests(projectRoot);
visuals = export_training_visuals(projectRoot);
dataInspectorFiles = save_data_inspector_reference(projectRoot);
validation = validate_training_project(projectRoot);

summary = struct( ...
    'generatedAt', datetime('now','TimeZone','local'), ...
    'projectRoot', projectRoot, ...
    'matlabVersion', version, ...
    'simulation', simulation, ...
    'tests', tests, ...
    'visuals', visuals, ...
    'dataInspectorFiles', dataInspectorFiles, ...
    'validation', validation);

save(fullfile(projectRoot,'results','Regeneration_Summary.mat'),'summary');
fprintf('Aviation controls training regeneration completed: %s\n', datestr(now, 31));
end
