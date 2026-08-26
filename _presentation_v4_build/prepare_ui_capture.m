projectRoot = fileparts(fileparts(mfilename('fullpath')));
addpath(fullfile(projectRoot,'models'), fullfile(projectRoot,'data'), fullfile(projectRoot,'scripts'));
initialize_training_data(projectRoot);
mdl = 'AircraftFeedbackControlLoop';
load_system(fullfile(projectRoot,'models',[mdl '.slx']));
open_system(mdl);
set_param(mdl,'ShowPortUnits','on','ShowPortDataTypes','on','ShowLineDimensions','on');
set_param(mdl,'SimulationCommand','update');
set_param(mdl,'ZoomFactor','FitSystem');
disp('V4_CAPTURE_READY: AircraftFeedbackControlLoop is open with units, data types, and dimensions enabled.');

