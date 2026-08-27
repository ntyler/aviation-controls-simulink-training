projectRoot = 'D:\GitHub\aviation-controls-simulink-training';
modelName = 'ReferencedFlightControlArchitecture';
runRoot = fullfile(projectRoot, 'results', 'top_level_codegen_v7_evidence');
cacheRoot = fullfile(runRoot, 'cache');
codeRoot = fullfile(runRoot, 'codegen');

if isfolder(runRoot)
    error('Training:BuildEvidenceExists', ...
        'Refusing to reuse existing evidence folder: %s', runRoot);
end

mkdir(runRoot);
addpath(fullfile(projectRoot, 'models'), ...
    fullfile(projectRoot, 'data'), ...
    fullfile(projectRoot, 'scripts'));

Simulink.fileGenControl('set', ...
    'CacheFolder', cacheRoot, ...
    'CodeGenFolder', codeRoot, ...
    'CodeGenFolderStructure', ...
        Simulink.filegen.CodeGenFolderStructure.ModelSpecific, ...
    'createDir', true);

load_system(fullfile(projectRoot, 'models', [modelName '.slx']));
assert(strcmp(get_param(modelName, 'SystemTargetFile'), 'grt.tlc'), ...
    'Expected the active GRT system target.');
assert(strcmp(get_param(modelName, 'GenCodeOnly'), 'off'), ...
    'Expected GenCodeOnly to be off for a standalone build.');

set_param(modelName, 'GenerateReport', 'on', 'LaunchReport', 'off');
logPath = fullfile(runRoot, [modelName '_slbuild.log']);
diary(logPath);

try
    fprintf('RUN_ROOT=%s\n', runRoot);
    fprintf('MODEL=%s\n', modelName);
    fprintf('MATLAB_RELEASE=%s\n', version('-release'));
    fprintf('SYSTEM_TARGET=%s\n', get_param(modelName, 'SystemTargetFile'));
    fprintf('CODEGEN_FOLDER=%s\n', codeRoot);
    set_param(modelName, 'SimulationCommand', 'update');
    slbuild(modelName, 'StandaloneCoderTarget', 'ForceTopModelBuild', true);
    fprintf('BUILD_STATUS=PASS\n');
catch buildException
    fprintf(2, 'BUILD_STATUS=FAIL\n%s\n', ...
        getReport(buildException, 'extended', 'hyperlinks', 'off'));
    diary('off');
    close_system(modelName, 0);
    rethrow(buildException);
end

diary('off');
close_system(modelName, 0);
fprintf('BUILD_LOG=%s\n', logPath);
