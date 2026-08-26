function artifacts = callback_workflow_example(varargin)
%CALLBACK_WORKFLOW_EXAMPLE Demonstrate a reviewable callback sequence.
%   ARTIFACTS = CALLBACK_WORKFLOW_EXAMPLE demonstrates project setup,
%   dictionary loading, deterministic preload, post-load configuration, and
%   cleanup for PitchRateLimiter. Use 'RunSimulation', true after the models
%   have been generated to execute the prepared SimulationInput.
%
%   Example:
%       callback_workflow_example('RunSimulation', true)
%
%   Expected values and pass/fail assessments intentionally remain in
%   run_pitch_rate_limiter_tests.m or the Simulink Test file.

    parser = inputParser;
    parser.FunctionName = mfilename;
    addParameter(parser, 'ProjectRoot', ...
        fileparts(fileparts(mfilename('fullpath'))), ...
        @(value)ischar(value) || (isstring(value) && isscalar(value)));
    addParameter(parser, 'ModelName', 'PitchRateLimiter', ...
        @(value)ischar(value) || (isstring(value) && isscalar(value)));
    addParameter(parser, 'RunSimulation', false, ...
        @(value)islogical(value) && isscalar(value));
    parse(parser, varargin{:});

    projectRoot = char(parser.Results.ProjectRoot);
    modelName = char(parser.Results.ModelName);
    [~, modelName] = fileparts(modelName);
    modelFile = fullfile(projectRoot, 'models', [modelName '.slx']);
    if ~isfile(modelFile)
        error('AviationTraining:ModelNotFound', ...
            ['Generate the training models before running this example. ' ...
             'Missing model: %s'], modelFile);
    end

    callbackState = training_callback_preload(modelName, projectRoot);
    cleanupGuard = onCleanup(@()training_callback_cleanup(callbackState)); %#ok<NASGU>

    load_system(modelFile);
    callbackState = training_callback_postload(modelName, callbackState);

    simulationInput = Simulink.SimulationInput(modelName);
    simulationInput = setExternalInput(simulationInput, ...
        callbackState.TestCase.InputDataset);
    simulationInput = setModelParameter(simulationInput, ...
        'StartTime', '0', ...
        'StopTime', num2str(callbackState.TestCase.StopTime, 16), ...
        'SolverType', 'Fixed-step', ...
        'Solver', 'FixedStepDiscrete', ...
        'FixedStep', 'Sample_time');

    simulationOutput = [];
    if parser.Results.RunSimulation
        simulationOutput = sim(simulationInput);
    end

    artifacts = struct;
    artifacts.ModelName = modelName;
    artifacts.DictionaryPath = callbackState.DictionaryPath;
    artifacts.InitialConditions = callbackState.InitialConditions;
    artifacts.TestCaseName = callbackState.TestCase.Name;
    artifacts.SimulationInput = simulationInput;
    artifacts.SimulationOutput = simulationOutput;
    artifacts.Note = ['Callback setup contains no pass/fail logic; use the ' ...
        'dedicated test suite for assessments and evidence.'];
end
