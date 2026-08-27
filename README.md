# Aviation Controls Simulink Training

This folder is the complete, regenerable training package used by the updated aviation controls presentation. Every model, parameter, mode, interface, and result is illustrative and non-production; none of the numerical values are aircraft-program data.

## Verified environment and limitations

The package was executed and validated on Microsoft Windows with these relevant MATLAB products:

| Product or capability | Verified status |
|---|---|
| MATLAB | R2023b Update 8, version 23.2.0.2599560 |
| Simulink | R2023b, version 23.2 |
| Stateflow | R2023b, version 23.2; used by `AutopilotModeLogic.slx` |
| Simulink Data Dictionary | Available through Simulink; used by `data/FCS_Data.sldd` |
| Simulink Report Generator | Installed, R2023b, version 23.2 |
| Simulink Coder | Installed, R2023b, version 23.2; no production or embedded-code claim is made |
| Simulink Test | **Unavailable / unlicensed** |
| Simulink Requirements | **Unavailable / unlicensed** |
| Embedded Coder | **Unavailable / unlicensed** |

The full installed-product inventory is retained in `results/MATLAB_ProductInventory.csv`; the focused license/capability record is `results/environment_inventory.txt`.

Because Simulink Test is unavailable, this project deliberately contains **no `.mldatx` file** and makes no Test Manager execution claim. The real fallback is the standalone `models/PitchRateLimiter_Harness.slx` plus the executable assessments in `scripts/run_pitch_rate_limiter_tests.m`. Simulink Requirements links and Embedded Coder output are likewise not claimed. Any cache or referenced-model build intermediates under `results/` are regeneration by-products, not production airborne software or certification evidence.

No HIL hardware was used and no Jenkins pipeline was executed. All reported executions are desktop MATLAB/Simulink results.

## Verified outcome

- All 8 delivered models opened and updated without warnings: **8/8 PASS**.
- Pitch Rate Limiter executable assessments: **19/19 PASS, 0 failed**.
- The limiter checks include the inclusive ±12 deg/s boundaries, just-outside values, nominal and large values, invalid status, normal-mode false, transitions, initialization, `limiter_active`, a 1e-9 deg/s numeric tolerance, and 0.02 s / 50 Hz timestamp behavior.
- Aircraft command-tracking simulation: **PASS**, with command, response, error, and actuator signals retained.
- Stateflow mode-sequence simulation: **PASS**, visiting OFF, ARMED, ENGAGED, and DEGRADED.
- Referenced architecture and child-model interface updates: **5/5 PASS**.
- Required visual/evidence artifacts checked by the validator: **14/14 present**.

The authoritative compact record is `results/validation_summary.txt`.

## The 8 delivered Simulink models

1. `models/PitchRateLimiter.slx` — 50 Hz pitch-rate magnitude limiter with explicit mode/validity fallback and `limiter_active` output.
2. `models/AircraftFeedbackControlLoop.slx` — simplified command/controller/actuator/aircraft/sensor closed loop with disturbance and logged signals.
3. `models/AutopilotModeLogic.slx` — real Stateflow OFF, ARMED, ENGAGED, and DEGRADED training logic.
4. `models/SensorProcessingRef.slx` — referenced sensor-processing child model.
5. `models/PitchControllerRef.slx` — referenced pitch-controller child model.
6. `models/ActuatorCommandRef.slx` — referenced actuator-command child model.
7. `models/ReferencedFlightControlArchitecture.slx` — parent reference architecture using explicit routing and `FlightControlBus`.
8. `models/PitchRateLimiter_Harness.slx` — standalone executable harness used because Simulink Test is unavailable.

`data/FCS_Data.sldd` contains the controlled illustrative parameters and `FlightControlBus`. `data/FCSMode.m` documents the representative mode-code enumeration; the bus mode element remains `uint8` for simple referenced-model interface compatibility.

## Open the project and models

Start a normal MATLAB R2023b session with Simulink, then set `projectRoot` to this folder:

```matlab
projectRoot = 'C:\path\to\Aviation_Controls_Simulink_Training';
addpath(fullfile(projectRoot,'scripts'), ...
        fullfile(projectRoot,'models'), ...
        fullfile(projectRoot,'data'));
initialize_training_data(projectRoot);
open_system(fullfile(projectRoot,'models','PitchRateLimiter.slx'));
```

Replace `PitchRateLimiter.slx` with any model name listed above. Open `Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx` in Microsoft PowerPoint to present the current 33-slide deck. The earlier v2 and v3 decks are retained unchanged as version history.

## Regenerate and validate everything

Use a normal MATLAB session with JVM support because plot and PNG export use MATLAB figures. From a clean session:

```matlab
projectRoot = 'C:\path\to\Aviation_Controls_Simulink_Training';
addpath(fullfile(projectRoot,'scripts'));
summary = regenerate_all(projectRoot);
```

`regenerate_all.m` refreshes the dictionary, recreates all models, establishes deterministic callback state, runs the desktop simulations, executes the limiter tests, exports the authentic visuals, validates the package, and saves `results/Regeneration_Summary.mat`.

The equivalent reviewable sequence is:

```matlab
initialize_training_data(projectRoot);
create_training_models(projectRoot);
run_training_simulations(projectRoot);
testSummary = run_pitch_rate_limiter_tests(projectRoot);
export_training_visuals(projectRoot);
validationSummary = validate_training_project(projectRoot);
```

## Refresh Simulation Data Inspector from the current model

Run the current 50 Hz desktop simulation first, then load its retained command-tracking result into Simulation Data Inspector:

```matlab
run_training_simulations(projectRoot);
runID = update_data_inspector(projectRoot);
```

The helper preserves existing Data Inspector runs and opens three linked views: command versus response, tracking error, and actuator command versus disturbance. This is desktop model-in-the-loop (MIL) evidence; it is not SIL, PIL, HIL, or certification approval.

## Run only the Pitch Rate Limiter tests

```matlab
projectRoot = 'C:\path\to\Aviation_Controls_Simulink_Training';
addpath(fullfile(projectRoot,'scripts'), ...
        fullfile(projectRoot,'models'), ...
        fullfile(projectRoot,'data'));
testSummary = run_pitch_rate_limiter_tests(projectRoot);
fprintf('%d/%d passed; %d failed.\n', ...
    testSummary.Passed, testSummary.Total, testSummary.Failed);
```

Pass/fail logic is visible in `scripts/run_pitch_rate_limiter_tests.m`, not hidden in callbacks. Requirement associations are retained in `docs/PitchRateLimiter_Requirements_Traceability.csv`.

## Exercise the deterministic callback workflow

The callback functions load controlled data, prepare deterministic initial conditions and preload stimuli, apply post-load solver/logging configuration, and clean up only state they own. They do not contain expected values or pass/fail decisions.

```matlab
artifacts = callback_workflow_example( ...
    'ProjectRoot', projectRoot, ...
    'ModelName', 'PitchRateLimiter', ...
    'RunSimulation', true);

cleanupReport = cleanup_training_environment( ...
    'ProjectRoot', projectRoot, ...
    'CloseModels', true);
```

Dirty training models are preserved during cleanup so unsaved work is not discarded.

## Updated PowerPoint

The current presentation is `Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx`. It adds first-session operation guidance, an authentic Simulink Editor view, overlay controls, explicit top-level model roles, a Simulation Data Inspector workflow, classroom pseudo requirements, and a visible bidirectional evidence chain. Visible updates are on slides **3, 5–8, 10, 18–19, 27–28, and 33**, with additional lifecycle/certification note clarifications on slides **14, 15, and 32**. The deck remains 16:9 with 33 slides and speaker notes on every slide. It explicitly limits executed evidence to desktop model work and architecture update; it makes no HIL, Jenkins, certification-approval, or generated-code claim.

Presentation update details and official source links are retained in:

- `_presentation_v4_build/template-audit.txt`
- `_presentation_v4_build/deviation-log.txt`
- `_presentation_v4_build/authoring-summary.json`
- `_presentation_v4_build/final-deck-montage.webp`

## Exact relative deliverable paths

Core package:

- `README.md`
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx` — current deck
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx` — preserved prior version
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v2.pptx` — preserved prior version
- `data/FCS_Data.sldd`
- `data/FCSMode.m`
- `models/PitchRateLimiter.slx`
- `models/AircraftFeedbackControlLoop.slx`
- `models/AutopilotModeLogic.slx`
- `models/SensorProcessingRef.slx`
- `models/PitchControllerRef.slx`
- `models/ActuatorCommandRef.slx`
- `models/ReferencedFlightControlArchitecture.slx`
- `models/PitchRateLimiter_Harness.slx`

Repeatable scripts and callbacks:

- `scripts/initialize_training_data.m`
- `scripts/create_training_models.m`
- `scripts/run_training_simulations.m`
- `scripts/update_data_inspector.m`
- `scripts/run_pitch_rate_limiter_tests.m`
- `scripts/export_training_visuals.m`
- `scripts/validate_training_project.m`
- `scripts/regenerate_all.m`
- `scripts/training_callback_setup.m`
- `scripts/training_callback_preload.m`
- `scripts/training_callback_postload.m`
- `scripts/training_callback_cleanup.m`
- `scripts/callback_workflow_example.m`
- `scripts/cleanup_training_environment.m`

Executed test, simulation, and validation evidence:

- `results/PitchRateLimiter_TestResults.csv`
- `results/PitchRateLimiter_TestResults.mat`
- `reports/PitchRateLimiter_TestReport.html`
- `reports/PitchRateLimiter_TestReport.png`
- `docs/PitchRateLimiter_Requirements_Traceability.csv`
- `results/AircraftFeedback_CommandTracking.csv`
- `results/AircraftFeedback_CommandTracking.mat`
- `results/AircraftFeedback_CommandTracking.png`
- `results/AutopilotModeSequence.csv`
- `results/AutopilotModeSequence.mat`
- `results/AutopilotModeSequence.png`
- `results/ReferencedArchitecture_Validation.csv`
- `results/ReferencedArchitecture_Validation.mat`
- `results/SimulationConfiguration.csv`
- `results/SimulationConfiguration.mat`
- `results/FCS_DataDictionary_Inventory.csv`
- `results/FlightControlBus_Inventory.csv`
- `results/TrainingSimulationSummary.mat`
- `reports/TrainingSimulationSummary.txt`
- `results/Regeneration_Summary.mat`
- `results/validation_summary.txt`
- `results/environment_inventory.txt`
- `results/MATLAB_ProductInventory.csv`

Authentic primary visuals used for instruction:

- `screenshots/PitchRateLimiter_Model.png`
- `screenshots/PitchRateLimiter_Implementation.png`
- `screenshots/AircraftFeedbackControlLoop_Model.png`
- `screenshots/AircraftFeedback_PitchController.png`
- `screenshots/AutopilotModeLogic_Stateflow.png`
- `screenshots/ReferencedFlightControlArchitecture_Model.png`
- `screenshots/PitchRateLimiter_Harness.png`
- `screenshots/FCS_DataDictionary_and_FlightControlBus.png`
- `screenshots/PitchRateLimiter_ExecutedTestResults.png`
- `screenshots/PitchRateLimiter_MATLABTestHierarchy.png`
- `screenshots/AircraftFeedback_CommandTracking_Results.png`
- `screenshots/AutopilotModeSequence_Results.png`
- `screenshots/CallbackCode.png`
- `screenshots/CallbackWorkflow.png`
- `screenshots/TrainingEvidenceSummary.png`
- `screenshots/VisualManifest.csv`

## Certification and evidence boundaries

- DO-178C is an accepted means of compliance within an authority-approved process, not a standalone software certificate.
- DO-331 supplements DO-178C/DO-278A for model-based development and verification.
- A Simulink model is not automatically compliant.
- A passing pipeline or desktop test is an evidence input, not certification approval.
- Test results require controlled configuration, review, traceability, and disposition of failures.
- The simplified plant, parameters, bus, and mode logic are illustrative training assets only.
- No completed HIL, Jenkins, target-execution, production-code, or certification evidence is claimed.
