function runID = update_data_inspector(projectRoot, varargin)
%UPDATE_DATA_INSPECTOR Load the latest aircraft result into Simulink SDI.
%
% Run run_training_simulations first so the retained result reflects the
% current AircraftFeedbackControlLoop model. Existing SDI runs are kept by
% default. Name-value options:
%
%   'ResetRepository'  Clear SDI before importing (default false). This is
%                      intended for controlled reference generation only.
%   'OpenViewer'       Open the SDI application (default true).
%   'RunName'          Override the displayed run name.

if nargin < 1 || strlength(string(projectRoot)) == 0
    projectRoot = fileparts(fileparts(mfilename('fullpath')));
end
projectRoot = char(projectRoot);

parser = inputParser;
parser.FunctionName = mfilename;
addParameter(parser, 'ResetRepository', false, ...
    @(value) islogical(value) && isscalar(value));
addParameter(parser, 'OpenViewer', true, ...
    @(value) islogical(value) && isscalar(value));
addParameter(parser, 'RunName', '', ...
    @(value) ischar(value) || (isstring(value) && isscalar(value)));
parse(parser, varargin{:});
options = parser.Results;

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
    'error', 'deg');
actuator = localSeries(tableData.Time_s, tableData.ActuatorCommand, ...
    'actuator', 'deg');
disturbance = localSeries(tableData.Time_s, tableData.Disturbance_deg_s2, ...
    'disturbance', 'deg/s^2');

if options.ResetRepository
    Simulink.sdi.clear;
end

if strlength(string(options.RunName)) == 0
    runName = sprintf('AircraftFeedbackControlLoop - updated model - %s', ...
        char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss')));
else
    runName = char(options.RunName);
end
[runID, ~, signalIDs] = Simulink.sdi.createRun(runName, 'vars', ...
    command, response, trackingError, actuator, disturbance);

runObject = Simulink.sdi.getRun(runID);
if isfield(result, 'sampleTime')
    sampleText = sprintf('%.6g s', result.sampleTime);
else
    sampleText = 'retained result sample time';
end
runObject.Description = sprintf([ ...
    'Desktop model-in-the-loop (MIL) onboarding data for ' ...
    'models/AircraftFeedbackControlLoop.slx. Imported from ' ...
    'results/AircraftFeedback_CommandTracking.mat at %s; not SIL, PIL, ' ...
    'HIL, or certification approval.'], sampleText);

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
plotOnSubPlot(signals{3}, 1, 1, true);
plotOnSubPlot(signals{3}, 2, 1, true);
plotOnSubPlot(signals{4}, 3, 1, true);
plotOnSubPlot(signals{5}, 3, 1, true);
Simulink.sdi.setMarkersOn(true);
Simulink.sdi.setGridOn('on');
Simulink.sdi.setLegendPosition('InsideRight');
if options.OpenViewer
    Simulink.sdi.view;
end

fprintf('Simulation Data Inspector updated with run %d: %s\n', ...
    runID, runName);
end

function signal = localSeries(time, data, name, units)
signal = timeseries(data, time, 'Name', name);
signal.DataInfo.Units = units;
end
