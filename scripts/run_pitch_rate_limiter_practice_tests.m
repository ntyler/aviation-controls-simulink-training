function summary = run_pitch_rate_limiter_practice_tests(projectRoot, learnerTag)
%RUN_PITCH_RATE_LIMITER_PRACTICE_TESTS Assess an isolated learner limiter.
%
% This wrapper targets the uniquely named model/harness created by
% create_pitch_rate_limiter_practice. It writes evidence only below the
% learner workspace; it does not overwrite the retained baseline results.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
if nargin < 2 || strlength(string(learnerTag)) == 0
    error('TrainingPractice:MissingLearnerTag', ...
        'Provide the same learner tag used to create the practice model.');
end

projectRoot = char(projectRoot);
safeTag = char(string(learnerTag));
if isempty(regexp(safeTag, '^[A-Za-z][A-Za-z0-9_]{0,27}$', 'once'))
    error('TrainingPractice:InvalidLearnerTag', ...
        ['Learner tag must start with a letter and contain at most 28 ' ...
         'letters, numbers, or underscores.']);
end

workspaceDir = fullfile(projectRoot, 'learner_workspace', safeTag);
modelsDir = fullfile(workspaceDir, 'models');
evidenceRoot = fullfile(workspaceDir, 'evidence');
modelName = ['PitchRateLimiter_Practice_' safeTag];
harnessName = [modelName '_Harness'];
modelFile = fullfile(modelsDir, [modelName '.slx']);
harnessFile = fullfile(modelsDir, [harnessName '.slx']);

if ~isfile(modelFile) || ~isfile(harnessFile)
    error('TrainingPractice:MissingPracticeArtifacts', ...
        ['Practice component or harness is missing. First run:\n' ...
         'create_pitch_rate_limiter_practice(projectRoot,''%s'')'], safeTag);
end
localVerifyPracticeDictionary(projectRoot);

existing = string(which(modelName, '-all'));
existing = existing(strlength(existing) > 0);
for index = 1:numel(existing)
    if ~strcmpi(localCanonical(char(existing(index))), localCanonical(modelFile))
        error('TrainingPractice:PracticeModelShadowed', ...
            ['%s resolves to another file: %s\nRemove the shadowing path/file ' ...
             'before running the practice assessment.'], modelName, existing(index));
    end
end
if bdIsLoaded(modelName) && ...
        ~strcmpi(localCanonical(get_param(modelName, 'FileName')), ...
        localCanonical(modelFile))
    error('TrainingPractice:LoadedPracticeModelShadowed', ...
        'Loaded %s is not the practice file under %s.', modelName, modelsDir);
end

summary = run_pitch_rate_limiter_tests(projectRoot, ...
    'HarnessName', harnessName, ...
    'HarnessFile', harnessFile, ...
    'OutputRoot', evidenceRoot, ...
    'EvidenceStem', modelName, ...
    'InitializeBaseline', false);
summary.PracticeModel = string(modelName);
summary.PracticeModelFile = string(modelFile);
summary.ManagedBaselineResultsOverwritten = false;

fprintf(['Practice evidence retained below:\n  %s\n' ...
    'The controlled baseline results/ and reports/ folders were not changed.\n'], ...
    evidenceRoot);
end


function result = localCanonical(pathValue)
result = char(java.io.File(pathValue).getCanonicalPath());
end

function localVerifyPracticeDictionary(projectRoot)
dictionaryFile = fullfile(projectRoot, 'data', 'FCS_Data.sldd');
if ~isfile(dictionaryFile)
    error('TrainingPractice:MissingDictionary', ...
        'Practice assessment requires the existing dictionary: %s', ...
        dictionaryFile);
end
dictionary = Simulink.data.dictionary.open(dictionaryFile);
dictionaryGuard = onCleanup(@() close(dictionary)); %#ok<NASGU>
section = getSection(dictionary, 'Design Data');
requiredEntries = {'Sample_time','q_limit_normal','q_fallback_command'};
for index = 1:numel(requiredEntries)
    try
        getEntry(section, requiredEntries{index});
    catch dictionaryError
        error('TrainingPractice:MissingDictionaryEntry', ...
            'FCS_Data.sldd is missing required practice entry %s: %s', ...
            requiredEntries{index}, dictionaryError.message);
    end
end
end
