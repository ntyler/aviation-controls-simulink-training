function runID = update_data_inspector(projectRoot)
%UPDATE_DATA_INSPECTOR Load the latest aircraft result into Simulink SDI.
%
% Run run_training_simulations first so the retained result reflects the
% current AircraftFeedbackControlLoop model. Existing SDI runs are kept.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

resultFile = fullfile(projectRoot, 'results', ...
    'AircraftFeedback_CommandTracking.mat');
if ~isfile(resultFile)
    error('Training:MissingResult', ...
        ['Missing %s. Run run_training_simulations before updating ' ...
         'Simulation Data Inspector.'], resultFile);
end

result = load(resultFile, 'trackingTable', 'sampleTime');
if ~isfield(result, 'trackingTable')
    error('Training:InvalidResult', ...
        'The retained result does not contain trackingTable: %s', resultFile);
end

tableData = result.trackingTable;
requiredColumns = {'Time_s', 'Command_deg', 'Response_deg', 'Error_deg', ...
    'ActuatorCommand', 'Disturbance_deg_s2'};
missingColumns = setdiff(requiredColumns, tableData.Properties.VariableNames);
if ~isempty(missingColumns)
    error('Training:InvalidResult', 'Missing retained columns: %s', ...
        strjoin(missingColumns, ', '));
end

command = localSeries(tableData.Time_s, tableData.Command_deg, ...
    'command', 'deg');
response = localSeries(tableData.Time_s, tableData.Response_deg, ...
    'response', 'deg');
trackingError = localSeries(tableData.Time_s, tableData.Error_deg, ...
    'tracking_error', 'deg');
actuator = localSeries(tableData.Time_s, tableData.ActuatorCommand, ...
    'actuator_command', 'deg');
disturbance = localSeries(tableData.Time_s, tableData.Disturbance_deg_s2, ...
    'disturbance', 'deg/s^2');

runName = sprintf('AircraftFeedbackControlLoop - updated model - %s', ...
    datestr(now, 'yyyy-mm-dd HH:MM:SS'));
[runID, ~, signalIDs] = Simulink.sdi.createRun(runName, 'vars', ...
    command, response, trackingError, actuator, disturbance);

runObject = Simulink.sdi.getRun(runID);
if isfield(result, 'sampleTime')
    sampleText = sprintf('%.6g s', result.sampleTime);
else
    sampleText = 'retained result sample time';
end
runObject.Description = sprintf([ ...
    'Fresh desktop Simulink model execution (MIL) from %s. ' ...
    'Imported from %s at %s; not SIL, PIL, HIL, or certification approval.'], ...
    fullfile(projectRoot, 'models', 'AircraftFeedbackControlLoop.slx'), ...
    resultFile, sampleText);

signals = arrayfun(@Simulink.sdi.getSignal, signalIDs, ...
    'UniformOutput', false);
signals{1}.LineColor = [0.10 0.32 0.58];
signals{1}.LineDashed = '--';
signals{2}.LineColor = [0.85 0.33 0.10];
signals{3}.LineColor = [0.49 0.18 0.56];
signals{4}.LineColor = [0.20 0.55 0.35];
signals{5}.LineColor = [0.75 0.25 0.20];

Simulink.sdi.setSubPlotLayout(3, 1);
Simulink.sdi.clearAllSubPlots;
plotOnSubPlot(signals{1}, 1, 1, true);
plotOnSubPlot(signals{2}, 1, 1, true);
plotOnSubPlot(signals{3}, 2, 1, true);
plotOnSubPlot(signals{4}, 3, 1, true);
plotOnSubPlot(signals{5}, 3, 1, true);
Simulink.sdi.setMarkersOn(true);
Simulink.sdi.setGridOn('on');
Simulink.sdi.setLegendPosition('InsideRight');
Simulink.sdi.view;

fprintf('Simulation Data Inspector updated with run %d: %s\n', ...
    runID, runName);
end

function signal = localSeries(time, data, name, units)
signal = timeseries(data, time, 'Name', name);
signal.DataInfo.Units = units;
end
