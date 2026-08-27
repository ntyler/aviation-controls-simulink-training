# Aviation Controls Simulink Training

This folder is the complete, regenerable training package used by the updated aviation controls presentation. Every model, parameter, mode, interface, and result is illustrative and non-production; none of the numerical values are aircraft-program data.

## How to use this package

Open `Aviation_Controls_Engineer_Simulink_DO178C_Training_v8.pptx` in Microsoft PowerPoint with the **Notes** pane visible, and keep this README open beside it. The visible slides provide the route and evidence boundaries; the speaker notes provide the prerequisites, exact learner action, expected result, recovery rule, and source paths for every slide. A slide-only or PDF-only view is not the complete self-guided course.

## Verified environment and limitations

The package was executed and validated on Microsoft Windows with these relevant MATLAB products:

| Product or capability | Verified status |
|---|---|
| Host operating system | Microsoft Windows; the retained GRT helper currently expects a Windows `.exe` output |
| MATLAB | R2023b Update 8, version 23.2.0.2599560 |
| Simulink | R2023b, version 23.2 |
| Stateflow | R2023b, version 23.2; required for the full baseline because `run_training_simulations` executes `AutopilotModeLogic.slx` |
| Simulink Data Dictionary | Available through Simulink; used by `data/FCS_Data.sldd` |
| Simulink Report Generator | Installed, R2023b, version 23.2 |
| Simulink Coder | Installed, R2023b, version 23.2; no production or embedded-code claim is made |
| C/C++ build toolchain | Microsoft Visual C++ 2017 v15.0 with 64-bit `nmake` produced the retained executable; a MathWorks-supported, configured compiler is required to reproduce the compiled GRT build |
| Simulink Test | **Unavailable / unlicensed** |
| Simulink Requirements | **Unavailable / unlicensed** |
| Embedded Coder | **Unavailable / unlicensed** |

The full installed-product inventory is retained in `results/MATLAB_ProductInventory.csv`; the focused license/capability record is `results/environment_inventory.txt`. A limiter-only inspection/test does not require Stateflow, but the full baseline run does. Before attempting the GRT build, confirm that the host is Windows, Simulink Coder is licensed, and MATLAB reports a selected supported C compiler (for example, inspect `mex.getCompilerConfigurations('C','Selected')`). Configuring or changing a compiler is a workstation change and should follow the local engineering environment process.

Because Simulink Test is unavailable, this project contains **no Simulink Test test-suite `.mldatx` file** and makes no Test Manager execution claim. The standalone `models/PitchRateLimiter_Harness.slx` plus the executable assessments in `scripts/run_pitch_rate_limiter_tests.m` provide the training harness workflow. The two retained `.mldatx` files are Simulation Data Inspector (SDI) view/session artifacts only; they are not test suites. Simulink Requirements links and Embedded Coder output are likewise not claimed. Any cache or referenced-model build intermediates under `results/` are regeneration by-products, not production airborne software or certification evidence.

No HIL hardware was used and no Jenkins pipeline was executed. All reported executions are desktop MATLAB/Simulink results.

## Verified outcome

- All 8 delivered models opened and updated: **8/8 PASS**. All five delivered Model-reference blocks are saved in Normal simulation mode. R2023b Student use still emits its known `Simulink:modelReference:MdlRefNotAvailForLicense` Accelerator-fallback message for the two parent models during update; the validator accepts only that exact license message after asserting every saved Model block is Normal, and treats any other warning as a failure.
- Pitch Rate Limiter executable assessments: **19/19 PASS, 0 failed**.
- The limiter checks include the inclusive ±12 deg/s boundaries, just-outside values, nominal and large values, invalid status, normal-mode false, transitions, initialization, `limiter_active`, a 1e-9 deg/s numeric tolerance, and 0.02 s / 50 Hz timestamp behavior.
- Aircraft command-tracking simulation: **PASS**, with command, response, error, and actuator signals retained.
- Stateflow mode-sequence simulation: **PASS**, visiting OFF, ARMED, ENGAGED, and DEGRADED.
- Referenced architecture and child-model interface updates: **5/5 PASS**.
- Required model, visual, SDI, and evidence artifacts checked by the validator: **24/24 present**. The manually captured SDI screenshot is reviewed visually but is not counted as a reproducible automated export.

The authoritative compact record is `results/validation_summary.txt`.

## The 8 delivered Simulink models and their hierarchy

1. `models/PitchRateLimiter.slx` — 50 Hz pitch-rate magnitude limiter with explicit mode/validity fallback and `limiter_active` output.
2. `models/AircraftFeedbackControlLoop.slx` — simplified command/controller/actuator/aircraft/sensor closed loop with disturbance and logged signals.
3. `models/AutopilotModeLogic.slx` — real Stateflow OFF, ARMED, ENGAGED, and DEGRADED training logic.
4. `models/SensorProcessingRef.slx` — referenced sensor-processing child model.
5. `models/PitchControllerRef.slx` — referenced pitch-controller child model.
6. `models/ActuatorCommandRef.slx` — referenced actuator-command child model.
7. `models/ReferencedFlightControlArchitecture.slx` — parent reference architecture using explicit routing and `FlightControlBus`.
8. `models/PitchRateLimiter_Harness.slx` — standalone executable harness used because Simulink Test is unavailable.

`data/FCS_Data.sldd` contains the controlled illustrative parameters and `FlightControlBus`. `data/FCSMode.m` documents the representative mode-code enumeration; the bus mode element remains `uint8` for simple referenced-model interface compatibility.

```text
AircraftFeedbackControlLoop.slx
├─ Pitch Controller PI
├─ Actuator Dynamics
├─ Simplified Longitudinal Aircraft Dynamics
└─ Sensor Processing Lag

AutopilotModeLogic.slx
└─ Autopilot Mode Logic [Stateflow]

ReferencedFlightControlArchitecture.slx
├─ SensorProcessingRef.slx
├─ PitchRateLimiter.slx
│  └─ Pitch Rate Limiter Logic
├─ PitchControllerRef.slx
│  └─ Pitch Rate PI
└─ ActuatorCommandRef.slx

PitchRateLimiter_Harness.slx
└─ references the same PitchRateLimiter.slx
```

All eight models use `data/FCS_Data.sldd` and the controlled fixed-step `Sample_time = 0.02 s` (50 Hz). The closed-loop simulation, referenced integration architecture, component model, and test harness are intentionally separate top-level roles.

The limiter harness should be reviewed with its companion files, in this order:

```text
data/FCS_Data.sldd
  ↓ controlled parameters, types, and sample time
models/PitchRateLimiter_Harness.slx
  └─ references models/PitchRateLimiter.slx
  ↓ executable assessments
scripts/run_pitch_rate_limiter_tests.m
  ↔ docs/PitchRateLimiter_Requirements_Traceability.csv
  ↓ retained evidence
results/PitchRateLimiter_TestResults.csv / .mat
reports/PitchRateLimiter_TestReport.html / .png
```

This is a standalone MATLAB/Simulink harness workflow; no Simulink Test Manager suite is implied.

## Open the project and models

> **Write-safety warning:** use an authorized branch or disposable working copy before running any initializer, simulation driver, test driver, refresh, or regeneration command. `initialize_training_data` updates and saves the managed entries in `data/FCS_Data.sldd`. `run_training_simulations` and `run_pitch_rate_limiter_tests` refresh fixed files under `results/` and `reports/`; they do not create a new versioned result set. Preserve any evidence or dictionary changes that must not be replaced.

Start a normal MATLAB R2023b session with Simulink and set MATLAB's Current Folder to the repository root. The following orientation-only sequence verifies the root, adds repository folders to the path, displays possible model-name conflicts, and opens the delivered limiter by its full path. It does not call a repository writer or refresh retained evidence:

```matlab
projectRoot = pwd;
assert(isfile(fullfile(projectRoot,'README.md')), ...
    'Start MATLAB in the aviation-controls-simulink-training repository root.');
addpath(fullfile(projectRoot,'scripts'), ...
        fullfile(projectRoot,'models'), ...
        fullfile(projectRoot,'data'));
which -all PitchRateLimiter
open_system(fullfile(projectRoot,'models','PitchRateLimiter.slx'));
```

Replace `PitchRateLimiter.slx` with any model name listed above. Open the v8 deck in PowerPoint with Notes visible and keep this README beside it. Earlier decks remain unchanged as version history.

When controlled initialization is intended and dictionary refresh is authorized, run it as a separate write-producing action:

```matlab
dictionaryPath = initialize_training_data(projectRoot);
```

To deliberately refresh and retain the demonstrated aircraft and delivered-limiter evidence, use the controlled drivers rather than a raw `sim` call:

```matlab
simulationSummary = run_training_simulations(projectRoot);
testSummary = run_pitch_rate_limiter_tests(projectRoot);
```

`run_training_simulations` supplies the 20-second command/disturbance sequence and replaces the corresponding aircraft and Stateflow evidence under `results/` and `reports/`. `run_pitch_rate_limiter_tests` initializes the controlled dictionary, executes the delivered `models/PitchRateLimiter_Harness.slx`, and replaces `results/PitchRateLimiter_TestResults.csv`, `results/PitchRateLimiter_TestResults.mat`, `reports/PitchRateLimiter_TestReport.html`, and `reports/PitchRateLimiter_TestReport.png`. A direct `sim('AircraftFeedbackControlLoop')` is a manual in-memory run and does not recreate the controlled stimulus or those retained files.

## Create and test a learner-owned practice limiter safely

The learner lab uses a unique, repository-local sandbox so a practice file cannot overwrite or shadow `models/PitchRateLimiter.slx`. Choose a tag that starts with a letter and contains at most 28 letters, numbers, or underscores. The supplied helpers create and test the practice UUT under `learner_workspace/<LearnerTag>/`; they do not retarget the delivered harness and do not write the delivered limiter result files. The practice runner reads the existing managed dictionary, fails if required entries are missing, and does not call `initialize_training_data`.

```matlab
learnerTag = "TLEE";  % replace with a unique learner or session tag

deliveredModel = fullfile(projectRoot,'models','PitchRateLimiter.slx');
resolvedModel = which('PitchRateLimiter');
assert(strcmpi(resolvedModel, deliveredModel), ...
    ['PitchRateLimiter resolves outside the delivered models folder. ' ...
     'Remove the shadowing path or close the conflicting model first.']);
if bdIsLoaded('PitchRateLimiter')
    assert(strcmpi(get_param('PitchRateLimiter','FileName'), deliveredModel), ...
        'A different PitchRateLimiter model is already loaded.');
end

practiceSummary = create_pitch_rate_limiter_practice( ...
    projectRoot, learnerTag);
practiceTestSummary = run_pitch_rate_limiter_practice_tests( ...
    projectRoot, learnerTag);
```

The expected practice model is `learner_workspace/<LearnerTag>/models/PitchRateLimiter_Practice_<LearnerTag>.slx`; its generated matching harness and test evidence remain beneath the same learner workspace. Never save a learner model as `PitchRateLimiter.slx`, never add the learner `models` folder ahead of the delivered `models` folder on the MATLAB path, and do not commit `learner_workspace/` without project authorization. Inspect `practiceSummary` and `practiceTestSummary` for the exact model, harness, result, and report paths created by the helpers.

The distinction is intentional: `run_pitch_rate_limiter_tests(projectRoot)` always assesses the delivered baseline, while `run_pitch_rate_limiter_practice_tests(projectRoot, learnerTag)` assesses the uniquely named learner UUT and writes learner-local evidence. Do not cite learner evidence as the retained delivered-baseline result.

## Refresh results, screenshots, validation, and Data Inspector

Use this workflow after editing model layouts or logic. It preserves the saved `.slx` files and refreshes the evidence and onboarding assets from the current models:

```matlab
projectRoot = pwd;
addpath(fullfile(projectRoot,'scripts'));
summary = refresh_onboarding_artifacts(projectRoot);
```

This runs the desktop simulations, the 19 limiter assessments, architecture validation, all 15 model/submodel exports, and the isolated SDI session/view save. The SDI save helper backs up and restores the caller's current Data Inspector repository while it builds the one-run reference. It does **not** recreate the models.

## Intentionally recreate and validate everything

Use a normal MATLAB session with JVM support because plot and PNG export use MATLAB figures. From a clean session:

```matlab
projectRoot = pwd;
addpath(fullfile(projectRoot,'scripts'));
summary = regenerate_all(projectRoot);
```

`regenerate_all.m` refreshes the dictionary, **recreates all models**, establishes deterministic callback state, runs the desktop simulations, executes the limiter tests, exports the authentic visuals, creates the two retained SDI `.mldatx` artifacts, validates the package, and saves `results/Regeneration_Summary.mat`. Use it only when intentionally resetting every model to the scripted baseline; it will replace manually adjusted layouts. The current referenced-architecture layout has been synchronized into `create_training_models.m`.

The equivalent reviewable sequence is:

```matlab
initialize_training_data(projectRoot);
create_training_models(projectRoot);
run_training_simulations(projectRoot);
testSummary = run_pitch_rate_limiter_tests(projectRoot);
export_training_visuals(projectRoot);
save_data_inspector_reference(projectRoot);
validationSummary = validate_training_project(projectRoot);
```

`create_training_models` deliberately deletes and recreates the generated `.slx` files after refusing to discard an already-open dirty model. Use an authorized working copy or branch. Do not use the recreation workflow for ordinary layout-safe edits.

## Saved settings versus controlled run-time overrides

The saved model is the reviewable baseline; a controlled driver may override selected settings for one execution without saving those values back to the model:

| Context | Saved stop time | Effective retained run | Fixed step |
|---|---:|---:|---:|
| `AircraftFeedbackControlLoop` | 12 s | 20 s in `run_training_simulations` | 0.02 s |
| `PitchRateLimiter_Harness` | 2 s | 0.36 s in `run_pitch_rate_limiter_tests` | 0.02 s |

Review both the saved Configuration Parameters and the `Simulink.SimulationInput` overrides before attributing a result to a configuration.

## Build the top-level GRT training target

`Ctrl+B` is the interactive Simulink build shortcut: it builds the active model with its active target and current file-generation configuration. Its output location and provenance therefore depend on the current session. The retained v8 tree shown in the deck was **not** produced by an unmanaged Ctrl+B press; it was produced by the controlled helper below, which calls `slbuild` for `ReferencedFlightControlArchitecture`, uses repository-local cache/code-generation folders, and records a manifest and diary log.

Before running the helper, confirm Microsoft Windows, Simulink Coder, and a configured MathWorks-supported C/C++ compiler. The retained v8 build used Microsoft Visual C++ 2017 v15.0 with 64-bit `nmake`. The supported helper creates a unique local evidence folder, updates the integration parent, generates the GRT top model and four referenced targets, and compiles the standalone Windows executable:

```matlab
buildSummary = build_top_level_grt_evidence(projectRoot);
```

To request a stable training label when the folder does not already exist:

```matlab
buildSummary = build_top_level_grt_evidence( ...
    projectRoot, 'RunLabel', 'v8_evidence');
```

Generated cache/code folders are intentionally ignored and should be regenerated locally. The run folder retains a build log and manifest. The retained v8 manifest records `Git dirty at build: 1` but does not retain the dirty-file list, diff, or exact dirty-source snapshot, so do not describe that retained run as fully reproducible from the manifest alone. Use Ctrl+B only for an interactive demonstration of the build action; use `build_top_level_grt_evidence` when the output must match the documented repository-relative evidence structure. The executable is built but not executed; this is not SIL/PIL, generated-code verification, production-code approval, or certification evidence.

## Refresh Simulation Data Inspector from the current model

Run the current 50 Hz desktop simulation first, then load its retained command-tracking result into Simulation Data Inspector:

```matlab
run_training_simulations(projectRoot);
runID = update_data_inspector(projectRoot);
```

The update helper preserves existing Data Inspector runs and opens three linked views: command versus response, tracking error, and actuator command versus disturbance. Its run description uses repository-relative source paths. This is desktop model-in-the-loop (MIL) evidence; it is not SIL, PIL, HIL, or certification approval.

Build the committed onboarding reference from the retained result:

```matlab
saved = save_data_inspector_reference(projectRoot);
```

The save helper temporarily backs up the caller's SDI session/view under the system TEMP folder, clears SDI, creates exactly one deterministic `AircraftFeedbackControlLoop` onboarding run, validates the staged files, and restores the caller's repository. The temporary backup is removed after a successful restore.

Open the reference from a clean SDI repository:

```matlab
opened = open_data_inspector_reference(projectRoot);
```

The safe default refuses to load or merge the reference when SDI already contains runs. To explicitly replace the current repository, request replacement; a recovery session and view are retained under TEMP and their paths are returned in `opened`:

```matlab
opened = open_data_inspector_reference(projectRoot, 'ReplaceCurrent', true);
```

Retained SDI artifacts:

- `data/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_View.mldatx` — reusable plot/layout template.
- `results/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_Session.mldatx` — one intended imported run, its five signals, data, styles, and view.
- `screenshots/SimulationDataInspector_Onboarding.jpg` — the refreshed three-pane onboarding view.

These are SDI artifacts, not Simulink Test Manager files.

## Run only the Pitch Rate Limiter tests

```matlab
projectRoot = pwd;
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

The current presentation is `Aviation_Controls_Engineer_Simulink_DO178C_Training_v8.pptx`. It is a 55-slide, 16:9 onboarding deck with speaker notes on every slide. The 48-slide core now follows a new-hire learning sequence: portable preflight, controlled model creation, settings and dictionary use, harness execution, update/run/build distinctions, SDI and result interpretation, traceability, assurance boundaries, and handoff. Seven reference slides retain the broader model gallery, overlays, and callback material.

Presentation update details and official source links are retained in:

- `.codex/pptx_v8_build/template-audit.txt`
- `.codex/pptx_v8_build/deviation-log.txt`
- `.codex/pptx_v8_build/authoring-summary.json`
- `.codex/pptx_v8_build/final-deck-montage.webp`

## Exact relative deliverable paths

Core package:

- `README.md`
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v8.pptx` — current deck
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx` — preserved prior version
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v6.pptx` — preserved prior version
- `Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx` — preserved prior version
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
- `scripts/create_pitch_rate_limiter_practice.m`
- `scripts/run_pitch_rate_limiter_practice_tests.m`
- `scripts/create_training_models.m`
- `scripts/run_training_simulations.m`
- `scripts/update_data_inspector.m`
- `scripts/save_data_inspector_reference.m`
- `scripts/open_data_inspector_reference.m`
- `scripts/refresh_onboarding_artifacts.m`
- `scripts/cleanup_referenced_architecture_layout.m`
- `scripts/run_pitch_rate_limiter_tests.m`
- `scripts/build_top_level_grt_evidence.m`
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
- `data/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_View.mldatx`
- `results/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_Session.mldatx`
- `results/top_level_codegen_v8_evidence/Build_Evidence_Manifest.txt`
- `results/top_level_codegen_v8_evidence/ReferencedFlightControlArchitecture_slbuild.log`
- `results/top_level_codegen_v8_evidence/codegen/ReferencedFlightControlArchitecture.exe`
- `results/top_level_codegen_v8_evidence/codegen/ReferencedFlightControlArchitecture_grt_rtw/ReferencedFlightControlArchitecture.c`
- `results/top_level_codegen_v8_evidence/codegen/ReferencedFlightControlArchitecture_grt_rtw/html/index.html`

The `learner_workspace/<LearnerTag>/` model, generated matching harness, and learner-local result files are generated practice artifacts, not part of the delivered retained baseline.

Authentic primary visuals used for instruction:

- `screenshots/PitchRateLimiter_Model.png`
- `screenshots/PitchRateLimiter_Implementation.png`
- `screenshots/AircraftFeedbackControlLoop_Model.png`
- `screenshots/AircraftFeedbackControlLoop_Editor.jpg` — full R2023b editor view with the complete feedback return visible
- `screenshots/AircraftFeedback_PitchController.png`
- `screenshots/AircraftFeedback_ActuatorDynamics.png`
- `screenshots/AircraftFeedback_LongitudinalPlant.png`
- `screenshots/AircraftFeedback_SensorProcessingLag.png`
- `screenshots/AutopilotModeLogic_Model.png`
- `screenshots/AutopilotModeLogic_Stateflow.png`
- `screenshots/AutopilotModeLogic_Stateflow_Editor.jpg` — full Stateflow editor view with OFF, ARMED, ENGAGED, and DEGRADED states
- `screenshots/ReferencedFlightControlArchitecture_Model.png`
- `screenshots/ReferencedFlightControlArchitecture_Editor.jpg` — full R2023b editor view of the cleaned three-lane architecture
- `screenshots/SensorProcessingRef_Model.png`
- `screenshots/PitchControllerRef_Model.png`
- `screenshots/PitchControllerRef_PitchRatePI.png`
- `screenshots/ActuatorCommandRef_Model.png`
- `screenshots/PitchRateLimiter_Harness.png`
- `screenshots/FCS_DataDictionary_and_FlightControlBus.png`
- `screenshots/FCS_Data_ModelExplorer_FlightControlBus.jpg`
- `screenshots/PitchRateLimiter_ExecutedTestResults.png`
- `screenshots/PitchRateLimiter_MATLABTestHierarchy.png`
- `screenshots/AircraftFeedback_CommandTracking_Results.png`
- `screenshots/AutopilotModeSequence_Results.png`
- `screenshots/CallbackCode.png`
- `screenshots/CallbackWorkflow.png`
- `screenshots/TrainingEvidenceSummary.png`
- `screenshots/SimulationDataInspector_Onboarding.jpg`
- `screenshots/VisualManifest.csv`

## Certification and evidence boundaries

- DO-178C is an accepted means of compliance within an authority-approved process, not a standalone software certificate.
- DO-331 supplements DO-178C/DO-278A for model-based development and verification.
- A Simulink model is not automatically compliant.
- A passing pipeline or desktop test is an evidence input, not certification approval.
- Test results require controlled configuration, review, traceability, and disposition of failures.
- The simplified plant, parameters, bus, and mode logic are illustrative training assets only.
- No completed HIL, Jenkins, target-execution, production-code, or certification evidence is claimed.
