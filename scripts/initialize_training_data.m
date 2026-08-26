function dictionaryPath = initialize_training_data(projectRoot)
%INITIALIZE_TRAINING_DATA Create or refresh controlled illustrative FCS data.
%   DICTIONARYPATH = INITIALIZE_TRAINING_DATA(PROJECTROOT) creates or
%   updates data/FCS_Data.sldd. Re-running this function updates entries in
%   place, making it safe to use from model-generation and callback scripts.
%
%   The values are intentionally simple training values. They are not
%   derived from, and must not be represented as, production aircraft data.

    if nargin < 1 || isempty(projectRoot)
        projectRoot = fileparts(fileparts(mfilename('fullpath')));
    end
    projectRoot = localValidateFolder(projectRoot, 'projectRoot');

    if isempty(ver('simulink'))
        error('AviationTraining:SimulinkUnavailable', ...
            'Simulink is required to create FCS_Data.sldd.');
    end

    dataFolder = fullfile(projectRoot, 'data');
    if ~isfolder(dataFolder)
        mkdir(dataFolder);
    end
    if ~localIsOnPath(dataFolder)
        addpath(dataFolder);
    end

    dictionaryPath = fullfile(dataFolder, 'FCS_Data.sldd');
    if isfile(dictionaryPath)
        dictionaryObject = Simulink.data.dictionary.open(dictionaryPath);
    else
        dictionaryObject = Simulink.data.dictionary.create(dictionaryPath);
    end
    dictionaryCleanup = onCleanup(@()localCloseDictionary(dictionaryObject)); %#ok<NASGU>
    designData = getSection(dictionaryObject, 'Design Data');

    sampleTime = 0.02; % 50 Hz
    actuatorTimeConstant = 0.18;
    sensorTimeConstant = 0.08;

    entries = {
        'Sample_time', localParameter(sampleTime, 'double', 's', 0.001, 1, ...
            'Fundamental discrete execution period (50 Hz).');
        'Ts', localParameter(sampleTime, 'double', 's', 0.001, 1, ...
            'Alias for Sample_time used by illustrative scripts.');
        'q_limit_normal', localParameter(12, 'double', 'deg/s', 0, 100, ...
            'Inclusive normal-mode pitch-rate magnitude limit.');
        'q_fallback_command', localParameter(0, 'double', 'deg/s', -100, 100, ...
            'Training fallback command used when mode or input validity is false.');
        'pitch_Kp', localParameter(0.60, 'double', '1', 0, 20, ...
            'Illustrative proportional pitch-controller gain.');
        'pitch_Ki', localParameter(0.025, 'double', '1/s', 0, 20, ...
            'Illustrative integral pitch-controller gain.');
        'pitch_rate_Kp', localParameter(0.30, 'double', 's', 0, 20, ...
            'Illustrative proportional pitch-rate controller gain.');
        'pitch_rate_Ki', localParameter(0.20, 'double', '1', 0, 20, ...
            'Illustrative integral pitch-rate controller gain.');
        'controller_integrator_ic', localParameter(0, 'double', 'deg/s', -100, 100, ...
            'Deterministic controller-integrator initial condition.');
        'actuator_limit_deg', localParameter(20, 'double', 'deg', 0, 60, ...
            'Illustrative symmetric actuator-command magnitude limit.');
        'actuator_filter_alpha', localParameter(exp(-sampleTime / actuatorTimeConstant), ...
            'double', '1', 0, 1, ...
            'Discrete actuator lag retention coefficient at Sample_time.');
        'aircraft_control_effectiveness', localParameter(0.80, 'double', '1/s', 0, 10, ...
            'Illustrative control-to-pitch-rate effectiveness.');
        'aircraft_pitch_damping', localParameter(1.20, 'double', '1/s', 0, 10, ...
            'Illustrative longitudinal pitch-rate damping coefficient.');
        'initial_q_rate', localParameter(0, 'double', 'deg/s', -100, 100, ...
            'Deterministic initial aircraft pitch rate.');
        'initial_pitch_angle', localParameter(0, 'double', 'deg', -180, 180, ...
            'Deterministic initial aircraft pitch angle.');
        'sensor_filter_alpha', localParameter(exp(-sampleTime / sensorTimeConstant), ...
            'double', '1', 0, 1, ...
            'Discrete sensor-lag retention coefficient at Sample_time.');
        'normal_mode_code', localParameter(uint8(FCSMode.ENGAGED), 'uint8', '1', 0, 255, ...
            'Mode code treated as normal/engaged by the illustrative architecture.');
        ... % Time-constant aliases make the coefficient assumptions reviewable.
        'actuator_tau_s', localParameter(actuatorTimeConstant, 'double', 's', 0.001, 10, ...
            'Continuous-time constant used to derive actuator_filter_alpha.');
        'sensor_tau_s', localParameter(sensorTimeConstant, 'double', 's', 0.001, 10, ...
            'Continuous-time constant used to derive sensor_filter_alpha.');
        'aircraft_q_gain', localParameter(1.40, 'double', '1/s', 0, 10, ...
            'Alias for aircraft_control_effectiveness.');
        'aircraft_q_tau_s', localParameter(0.65, 'double', 's', 0.001, 20, ...
            'Illustrative first-order pitch-rate time constant.');
        'actuator_gain', localParameter(1.0, 'double', '1', 0, 10, ...
            'Illustrative actuator static gain.');
        'disturbance_gain', localParameter(0.35, 'double', '1', 0, 10, ...
            'Illustrative disturbance scaling gain.');
        'initial_actuator_command', localParameter(0, 'double', 'deg', -60, 60, ...
            'Deterministic actuator-state initial condition.');
        'initial_sensor_q_rate', localParameter(0, 'double', 'deg/s', -100, 100, ...
            'Deterministic sensor-filter initial condition.');
        'mode_default', localParameter(uint8(FCSMode.OFF), 'uint8', '1', 0, 255, ...
            'Deterministic default mode code (FCSMode.OFF).')
    };

    for index = 1:size(entries, 1)
        localUpsert(designData, entries{index, 1}, entries{index, 2});
    end

    localUpsert(designData, 'FlightControlBus', localFlightControlBus());
    localUpsert(designData, 'q_cmd_in_signal', ...
        localSignal('deg/s', '0', 'Commanded pitch-rate input.'));
    localUpsert(designData, 'q_cmd_out_signal', ...
        localSignal('deg/s', '0', 'Limited pitch-rate command.'));
    localUpsert(designData, 'control_error_signal', ...
        localSignal('deg', '0', 'Command-minus-feedback pitch error.'));
    localUpsert(designData, 'actuator_command_signal', ...
        localSignal('deg', '0', 'Saturated illustrative actuator command.'));

    saveChanges(dictionaryObject);
    fprintf('Training data dictionary ready: %s\n', dictionaryPath);
end

function parameter = localParameter(value, dataType, unit, minimum, maximum, description)
    parameter = Simulink.Parameter;
    parameter.Value = value;
    parameter.DataType = dataType;
    parameter.Unit = unit;
    % Simulink.Parameter metadata bounds are represented as real doubles
    % even when the parameter value itself uses an integer data type.
    parameter.Min = double(minimum);
    parameter.Max = double(maximum);
    parameter.Description = ['ILLUSTRATIVE TRAINING DATA - ' description];
end

function signal = localSignal(unit, initialValue, description)
    signal = Simulink.Signal;
    signal.DataType = 'double';
    signal.Dimensions = 1;
    signal.Complexity = 'real';
    signal.Unit = unit;
    signal.InitialValue = initialValue;
    signal.Description = ['ILLUSTRATIVE TRAINING SIGNAL - ' description];
end

function bus = localFlightControlBus()
    names = {'q_rate', 'pitch_angle', 'mach', 'air_data_valid', 'mode'};
    dataTypes = {'double', 'double', 'double', 'boolean', 'uint8'};
    units = {'deg/s', 'deg', '1', '1', '1'};
    descriptions = {
        'Measured pitch rate.'
        'Measured pitch attitude.'
        'Illustrative Mach number.'
        'Air-data validity flag.'
        'Mode code: 0 OFF, 1 ARMED, 2 ENGAGED, 3 DEGRADED.'
    };

    elements(1, numel(names)) = Simulink.BusElement;
    for index = 1:numel(names)
        elements(index) = Simulink.BusElement;
        elements(index).Name = names{index};
        elements(index).DataType = dataTypes{index};
        elements(index).Dimensions = 1;
        elements(index).Complexity = 'real';
        elements(index).Unit = units{index};
        elements(index).Description = descriptions{index};
    end

    bus = Simulink.Bus;
    bus.Elements = elements;
    bus.Description = ['ILLUSTRATIVE TRAINING INTERFACE - representative ' ...
        'flight-control feedback data; not a production aircraft interface.'];
end

function localUpsert(section, name, value)
    try
        entry = getEntry(section, name);
        setValue(entry, value);
    catch exception
        if strcmp(exception.identifier, ...
                'SLDD:sldd:EntryNotFound') || contains(exception.message, 'does not exist')
            addEntry(section, name, value);
        else
            rethrow(exception);
        end
    end
end

function folder = localValidateFolder(folder, argumentName)
    if isstring(folder) && isscalar(folder)
        folder = char(folder);
    end
    if ~(ischar(folder) && isrow(folder) && isfolder(folder))
        error('AviationTraining:InvalidFolder', ...
            '%s must identify an existing folder.', argumentName);
    end
    [status, attributes] = fileattrib(folder);
    if ~status
        error('AviationTraining:InvalidFolder', ...
            'Could not resolve %s: %s', argumentName, folder);
    end
    folder = attributes.Name;
end

function tf = localIsOnPath(folder)
    entries = strsplit(path, pathsep);
    tf = any(strcmpi(entries, folder));
end

function localCloseDictionary(dictionaryObject)
    try
        saveChanges(dictionaryObject);
    catch
        % Preserve the primary exception, if any.
    end
    try
        close(dictionaryObject);
    catch
        % A loaded model may retain the shared dictionary object.
    end
end
