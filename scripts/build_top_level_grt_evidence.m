function summary = build_top_level_grt_evidence(projectRoot, options)
%BUILD_TOP_LEVEL_GRT_EVIDENCE Build and retain the training GRT top model.
%
%   SUMMARY = BUILD_TOP_LEVEL_GRT_EVIDENCE() derives the repository root
%   from this file and writes a uniquely named run below results/.
%
%   SUMMARY = BUILD_TOP_LEVEL_GRT_EVIDENCE(PROJECTROOT, ...
%   'RunLabel', LABEL) writes results/top_level_codegen_LABEL. The function
%   refuses to overwrite an existing evidence folder.
%
%   This is a desktop training build. It generates and compiles the GRT
%   standalone target but does not execute the executable, run SIL/PIL, or
%   establish production-code or certification approval.

arguments
    projectRoot (1,1) string = ""
    options.RunLabel (1,1) string = ""
end

if strlength(projectRoot) == 0
    projectRoot = string(fileparts(fileparts(mfilename('fullpath'))));
end
[status, attributes] = fileattrib(char(projectRoot));
assert(status, 'Training:InvalidProjectRoot', ...
    'Could not resolve project root: %s', projectRoot);
projectRoot = string(attributes.Name);

modelName = "ReferencedFlightControlArchitecture";
modelFile = fullfile(projectRoot, "models", modelName + ".slx");
assert(isfile(modelFile), 'Training:MissingTopModel', ...
    'Missing top model: %s', modelFile);

runLabel = options.RunLabel;
if strlength(runLabel) == 0
    runLabel = string(datetime('now','Format','yyyyMMdd_HHmmss'));
end
runLabel = regexprep(runLabel, '[^A-Za-z0-9_-]', '_');
runRoot = fullfile(projectRoot, "results", ...
    "top_level_codegen_" + runLabel);
assert(~isfolder(runRoot), 'Training:BuildEvidenceExists', ...
    'Refusing to overwrite existing evidence folder: %s', runRoot);

cacheRoot = fullfile(runRoot, "cache");
codeRoot = fullfile(runRoot, "codegen");
mkdir(runRoot);

addpath(fullfile(projectRoot,"models"), ...
    fullfile(projectRoot,"data"), fullfile(projectRoot,"scripts"));

previousFileGen = Simulink.fileGenControl('getConfig');
fileGenGuard = onCleanup(@() Simulink.fileGenControl( ...
    'setConfig','config',previousFileGen)); %#ok<NASGU>
Simulink.fileGenControl('set', ...
    'CacheFolder',char(cacheRoot), ...
    'CodeGenFolder',char(codeRoot), ...
    'CodeGenFolderStructure', ...
        Simulink.filegen.CodeGenFolderStructure.ModelSpecific, ...
    'createDir',true);

load_system(char(modelFile));
modelGuard = onCleanup(@() close_system(char(modelName),0)); %#ok<NASGU>
assert(strcmp(get_param(modelName,'SystemTargetFile'),'grt.tlc'), ...
    'Training:UnexpectedCodeTarget', 'Expected grt.tlc.');
assert(strcmp(get_param(modelName,'GenCodeOnly'),'off'), ...
    'Training:UnexpectedGenCodeOnly', ...
    'Expected GenCodeOnly=off for the standalone executable build.');

set_param(modelName,'GenerateReport','on','LaunchReport','off');
logPath = fullfile(runRoot, modelName + "_slbuild.log");
diary(char(logPath));
diaryGuard = onCleanup(@() diary('off')); %#ok<NASGU>

fprintf('RUN_ROOT=%s\n', runRoot);
fprintf('MODEL=%s\n', modelName);
fprintf('MATLAB=%s\n', version);
fprintf('SYSTEM_TARGET=%s\n', get_param(modelName,'SystemTargetFile'));
fprintf('CODEGEN_FOLDER=%s\n', codeRoot);

set_param(modelName,'SimulationCommand','update');
slbuild(modelName,'StandaloneCoderTarget','ForceTopModelBuild',true);
fprintf('BUILD_STATUS=PASS\n');
diary('off');
clear diaryGuard;

executablePath = fullfile(codeRoot, modelName + ".exe");
sourcePath = fullfile(codeRoot, modelName + "_grt_rtw", ...
    modelName + ".c");
reportPath = fullfile(codeRoot, modelName + "_grt_rtw", ...
    "html", "index.html");
assert(isfile(executablePath), 'Training:MissingBuildExecutable', ...
    'Build completed but the expected executable is missing: %s', ...
    executablePath);
assert(isfile(sourcePath), 'Training:MissingBuildSource', ...
    'Build completed but the expected generated source is missing: %s', ...
    sourcePath);
assert(isfile(reportPath), 'Training:MissingBuildReport', ...
    'Build completed but the expected HTML report is missing: %s', ...
    reportPath);

[gitStatus, gitCommit] = system(sprintf( ...
    'git -C "%s" rev-parse HEAD', projectRoot));
if gitStatus ~= 0
    gitCommit = "unavailable";
end
[dirtyStatus, dirtyText] = system(sprintf( ...
    'git -C "%s" status --porcelain', projectRoot));
if dirtyStatus ~= 0
    dirtyText = "unavailable";
end

summary = struct();
summary.GeneratedOn = datetime('now','TimeZone','local');
summary.ProjectRoot = projectRoot;
summary.RunRoot = runRoot;
summary.Model = modelName;
summary.SystemTargetFile = string(get_param(modelName,'SystemTargetFile'));
summary.MATLAB = string(version);
summary.GitCommit = strtrim(string(gitCommit));
summary.GitDirty = strlength(strtrim(string(dirtyText))) > 0;
summary.Executable = executablePath;
summary.GeneratedSource = sourcePath;
summary.HtmlReport = reportPath;
summary.BuildLog = logPath;
summary.ExecutableBuilt = true;
summary.ExecutableExecuted = false;
summary.CodeGenerationValidationRun = false;
summary.SILPILRun = false;
summary.Status = "PASS";

save(fullfile(runRoot,'Build_Evidence_Summary.mat'),'summary');
localWriteManifest(fullfile(runRoot,'Build_Evidence_Manifest.txt'), summary);
end

function localWriteManifest(fileName, summary)
fileId = fopen(fileName,'w');
assert(fileId ~= -1, 'Training:CannotWriteBuildManifest', ...
    'Could not create build manifest: %s', fileName);
fileGuard = onCleanup(@() fclose(fileId)); %#ok<NASGU>
fprintf(fileId,'ReferencedFlightControlArchitecture GRT build evidence\n');
fprintf(fileId,'Generated: %s\n',string(summary.GeneratedOn));
fprintf(fileId,'Status: %s\n',summary.Status);
fprintf(fileId,'MATLAB: %s\n',summary.MATLAB);
fprintf(fileId,'System target: %s\n',summary.SystemTargetFile);
fprintf(fileId,'Git commit: %s\n',summary.GitCommit);
fprintf(fileId,'Git dirty at build: %d\n',summary.GitDirty);
fprintf(fileId,'Executable: %s\n',summary.Executable);
fprintf(fileId,'Generated source: %s\n',summary.GeneratedSource);
fprintf(fileId,'HTML report: %s\n',summary.HtmlReport);
fprintf(fileId,'Build log: %s\n',summary.BuildLog);
fprintf(fileId,'Executable executed: NO\n');
fprintf(fileId,'Code-generation validation run: NO\n');
fprintf(fileId,'SIL/PIL run: NO\n');
fprintf(fileId,['Boundary: desktop GRT training build only; not production ' ...
    'code approval or certification evidence.\n']);
end
