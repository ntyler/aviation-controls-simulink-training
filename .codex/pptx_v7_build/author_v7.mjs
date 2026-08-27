import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(buildDir));
const starterPath = path.join(buildDir, 'template-starter-frame.pptx');
const outputPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');
const map = JSON.parse(await fs.readFile(path.join(buildDir, 'template-frame-map.json'), 'utf8'));
const sourceByOutput = map.outputSlides.map((entry) => entry.sourceSlide);

const HARNESS_IMAGE = path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Harness.png');
const SDI_IMAGE = path.join(projectRoot, 'screenshots', 'SimulationDataInspector_Onboarding.jpg');
const REPORT_IMAGE = path.join(projectRoot, 'reports', 'PitchRateLimiter_TestReport.png');
const DICTIONARY_IMAGE = path.join(projectRoot, 'screenshots', 'FCS_Data_ModelExplorer_FlightControlBus.jpg');
const BUILD_ROOT = path.join(projectRoot, 'results', 'top_level_codegen_v7_evidence');
const BUILD_LOG = path.join(BUILD_ROOT, 'ReferencedFlightControlArchitecture_slbuild.log');
const GENERATED_C = path.join(BUILD_ROOT, 'codegen', 'ReferencedFlightControlArchitecture_grt_rtw', 'ReferencedFlightControlArchitecture.c');

for (const requiredPath of [starterPath, HARNESS_IMAGE, SDI_IMAGE, REPORT_IMAGE, DICTIONARY_IMAGE, BUILD_LOG, GENERATED_C]) {
  await fs.access(requiredPath);
}

const COLORS = {
  bg: '#F4F8FB', ink: '#0B1F33', body: '#17324A', muted: '#5D7487', rule: '#C9D8E3',
  navy: '#0B2438', dark: '#071521', panelDark: '#0C2133', panelDarker: '#091A29',
  blue: '#2D6CDF', blueTint: '#E2ECFF', teal: '#20B7C5', tealTint: '#DFF6F8',
  amber: '#E9A23B', amberTint: '#FFF0D7', green: '#2CA56F', greenTint: '#E2F4EA',
  red: '#D75A64', redTint: '#FBE7E9', white: '#FFFFFF', slate: '#7D91A0', pale: '#EEF4F8',
};

const darkSourceSlides = new Set([1, 3, 10, 12, 28, 30, 35, 36, 38, 41, 42, 44, 45, 48]);
const replacementSlides = new Set([2, 3, 5, 29, 30, 31, 32, 33, 34, 41, 43, 44, 45, 46, 47, 52, 53, 55]);

const meta = new Map([
  [2, ['ORIENTATION', 'Absolute summary: executable training evidence with bounded claims']],
  [3, ['ORIENTATION', 'Overall completion checklist: verified, explained, or future']],
  [5, ['ORIENTATION', 'Your first session: orient, execute, inspect, trace']],
  [29, ['02 • MODEL HIERARCHY & GALLERY', 'PitchRateLimiter_Harness isolates the unit under test']],
  [30, ['02 • HARNESS DEMO', 'The harness inputs come from one script and three timeseries']],
  [31, ['02 • HARNESS DEMO', 'In the harness, Ctrl+D validates the diagram; Ctrl+B crosses into build']],
  [32, ['02 • BUILD DEMO', 'The retained top-level GRT build creates a traceable file tree']],
  [33, ['03 • SIMULATION DATA INSPECTOR', 'Data Inspector reveals one saved run']],
  [34, ['03 • SIMULATION DATA INSPECTOR', 'Read the SDI run from command, to error, to control effort']],
  [41, ['06 • VERIFICATION WORKFLOW', 'The harness sits inside a controlled relative-file flow']],
  [43, ['06 • VERIFICATION WORKFLOW', 'The limiter suite retains 19 passing assessments']],
  [44, ['06 • VERIFICATION WORKFLOW', 'Read the 19-case result plot from top to bottom']],
  [45, ['06 • VERIFICATION WORKFLOW', 'Callbacks create context; the test driver owns the oracle']],
  [46, ['06 • VERIFICATION WORKFLOW', 'FCS_Data.sldd controls shared parameters and interfaces']],
  [47, ['06 • VERIFICATION WORKFLOW', 'Open FCS_Data.sldd, then inspect FlightControlBus']],
  [52, ['07 • AUTOMATION & ENVIRONMENTS', 'The retained status counts reconcile when their scopes stay separate']],
  [53, ['07 • AUTOMATION & ENVIRONMENTS', 'Demonstrated evidence is narrower than certification evidence']],
  [55, ['08 • FIRST-WEEK TAKEAWAYS', 'Your first week should produce one repeatable chain']],
]);

function textValue(shape) {
  try { return shape.text?.value ?? String(shape.text ?? ''); } catch { return ''; }
}

function findShape(slide, predicate, description, required = true) {
  const shape = slide.shapes.items.find(predicate);
  if (!shape && required) throw new Error(`Unable to find ${description}`);
  return shape;
}

function setText(shape, text, style = null) {
  if (!shape) return null;
  shape.text = text;
  if (style) {
    shape.text.style = {
      typeface: style.typeface ?? 'Aptos',
      fontSize: style.fontSize ?? 18,
      color: style.color ?? COLORS.ink,
      bold: style.bold ?? false,
      alignment: style.alignment ?? 'left',
      verticalAlignment: style.verticalAlignment ?? 'middle',
      insets: style.insets ?? { top: 3, right: 5, bottom: 3, left: 5 },
      wrap: style.wrap ?? 'square',
      autoFit: style.autoFit ?? 'none',
    };
  }
  return shape;
}

function addTextBox(slide, { name, position, text, fontSize = 18, color = COLORS.ink, bold = false,
  alignment = 'left', verticalAlignment = 'middle', insets = { top: 3, right: 5, bottom: 3, left: 5 },
  wrap = 'square', autoFit = 'none', typeface = 'Aptos' }) {
  const shape = slide.shapes.add({
    geometry: 'textbox', name, position, fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  setText(shape, text, { fontSize, color, bold, alignment, verticalAlignment, insets, wrap, autoFit, typeface });
  return shape;
}

function addBox(slide, { name, position, text = '', fill = COLORS.white, lineColor = COLORS.rule,
  lineWidth = 1.4, fontSize = 18, textColor = COLORS.ink, bold = true, alignment = 'center',
  verticalAlignment = 'middle', insets = { top: 5, right: 9, bottom: 5, left: 9 }, geometry = 'roundRect',
  typeface = 'Aptos' }) {
  const shape = slide.shapes.add({
    geometry, name, position, fill,
    line: { style: 'solid', fill: lineColor, width: lineWidth },
    borderRadius: 'rounded-xl',
  });
  if (text) setText(shape, text, { fontSize, color: textColor, bold, alignment, verticalAlignment, insets, typeface });
  return shape;
}

function addLine(slide, { name, left, top, width, height = 0, color = COLORS.rule, lineWidth = 2 }) {
  return slide.shapes.add({
    geometry: 'line', name, position: { left, top, width, height }, fill: 'none',
    line: { style: 'solid', fill: color, width: lineWidth },
  });
}

async function addImage(slide, filePath, position, alt) {
  const contentType = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png';
  return slide.images.add({
    blob: new Uint8Array(await fs.readFile(filePath)), contentType, alt, fit: 'contain', position,
  });
}

function isChrome(shape) {
  const name = String(shape.name || '');
  const value = textValue(shape).trim();
  const position = shape.position || {};
  return name.startsWith('section-') || name.startsWith('title-') ||
    (name.startsWith('line-') && (position.top ?? 999) < 145) ||
    value === 'AVIATION CONTROLS ENGINEERING ONBOARDING' ||
    (/^\d{2}$/.test(value) && (position.top ?? 0) > 640) || /page-\d+/.test(name);
}

function clearMappedContent(slide, slideNumber) {
  if (!replacementSlides.has(slideNumber)) throw new Error(`Slide ${slideNumber} is not mapped for replacement`);
  for (const shape of [...slide.shapes.items]) if (!isChrome(shape)) shape.delete();
  for (const image of [...slide.images.items]) if (typeof image.delete === 'function') image.delete();
}

function findChrome(slide) {
  const section = findShape(slide, (shape) => String(shape.name || '').startsWith('section-'), 'section', false);
  const title = findShape(slide, (shape) => String(shape.name || '').startsWith('title-'), 'title', false);
  const divider = findShape(slide, (shape) => String(shape.name || '').startsWith('line-') && (shape.position?.top ?? 999) < 145, 'divider', false);
  const footer = findShape(slide, (shape) => textValue(shape).trim() === 'AVIATION CONTROLS ENGINEERING ONBOARDING', 'footer', false);
  const page = findShape(slide, (shape) => /^\d{2}$/.test(textValue(shape).trim()) && (shape.position?.top ?? 0) > 640, 'page', false) ||
    findShape(slide, (shape) => /page-\d+/.test(String(shape.name || '')), 'page', false);
  return { section, title, divider, footer, page };
}

function isDark(slideNumber) {
  return darkSourceSlides.has(sourceByOutput[slideNumber - 1]);
}

function styleTitle(shape, text, dark) {
  const size = text.length > 76 ? 33 : text.length > 65 ? 35.5 : 40;
  shape.position = { left: 72, top: 66, width: 1136, height: 56 };
  setText(shape, text, {
    fontSize: size, color: dark ? COLORS.white : COLORS.ink, bold: true,
    alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
}

function setChrome(slide, slideNumber) {
  const chrome = findChrome(slide);
  if (!chrome.page) throw new Error(`Missing page number on slide ${slideNumber}`);
  const dark = isDark(slideNumber);
  chrome.page.position = { left: 1156, top: 676, width: 52, height: 22 };
  setText(chrome.page, String(slideNumber).padStart(2, '0'), {
    fontSize: 14, color: dark ? '#70DCE5' : COLORS.teal, bold: true,
    alignment: 'right', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 }, wrap: 'none',
  });
  if (!meta.has(slideNumber)) return;
  const [sectionText, titleText] = meta.get(slideNumber);
  if (!chrome.section || !chrome.title || !chrome.footer) throw new Error(`Missing inherited chrome on slide ${slideNumber}`);
  chrome.section.position = { left: 72, top: 30, width: 760, height: 26 };
  setText(chrome.section, sectionText, {
    fontSize: 14.5, color: COLORS.teal, bold: true, alignment: 'left', verticalAlignment: 'top',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  styleTitle(chrome.title, titleText, dark);
  if (chrome.divider) chrome.divider.position = { left: 72, top: 127, width: 1136, height: 0 };
  chrome.footer.position = { left: 72, top: 678, width: 550, height: 20 };
  setText(chrome.footer, 'AVIATION CONTROLS ENGINEERING ONBOARDING', {
    fontSize: 11.5, color: COLORS.slate, bold: true, alignment: 'left', verticalAlignment: 'top',
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  });
}

function noteText({ timing, talkTrack, caveats, sources }) {
  return `Timing: ${timing}\n\n${talkTrack}\n\nCaveats\n${caveats.map((item) => `- ${item}`).join('\n')}\n\n[Sources]\n${sources.map((item) => `- ${item}`).join('\n')}`;
}

const notes = new Map([
  [2, noteText({
    timing: '2 minutes',
    talkTrack: 'Orient the learner to the absolute evidence snapshot. The package retains eight delivered models that update, one controlled data dictionary with a five-element bus, one saved SDI run, and one standalone limiter harness assessed at nineteen sample times. The fresh package validation retains 8/8 model updates, 19/19 passing limiter assessments, and 24/24 required exports. A separate controlled 2026-08-27 scripted slbuild generated and compiled five GRT models: the top standalone target plus four referenced targets.',
    caveats: [
      'The 5/5 code-generation build is separate from the validator\'s 24/24 exported-artifact count.',
      'The generated executable was built but not executed or SIL/PIL-verified.',
      'This remains illustrative desktop-MIL training evidence, not production aircraft data or certification approval.',
    ],
    sources: ['README.md', 'results/validation_summary.txt', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'results/environment_inventory.txt', 'results/FCS_DataDictionary_Inventory.csv', 'results/FlightControlBus_Inventory.csv'],
  })],
  [3, noteText({
    timing: '2 minutes',
    talkTrack: 'Use three status words deliberately. VERIFIED means objective artifacts are retained now. EXPLAINED means the deck teaches the workflow and points to the relevant controls or files. FUTURE means no retained completion artifact exists and the activity must still be performed under the approved program process. This prevents an instructional placeholder from being mistaken for engineering evidence.',
    caveats: [
      'Model Advisor, Polyspace Bug Finder, Polyspace Code Prover, and the program-defined RCF are not completed evidence in this package.',
      'SIL, PIL, HIL, bench, and system-integration execution remain outside the retained evidence.',
    ],
    sources: ['results/validation_summary.txt', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'results/environment_inventory.txt', 'results/MATLAB_ProductInventory.csv'],
  })],
  [5, noteText({
    timing: '2 minutes',
    talkTrack: 'Preview the expanded learning sequence. Start from the completion checklist, initialize the folder-based package, choose the correct top-level model, expose semantics and instrumentation, distinguish update from execution and build, inspect the harness inputs and dictionary contract, read the saved SDI and limiter plots, and finish by separating retained evidence from future assurance gates.',
    caveats: [
      'This is a learning path, not a substitute for approved project procedures.',
      'There is no MATLAB Project file; initialization is folder-based.',
    ],
    sources: ['README.md', 'scripts/initialize_training_data.m', 'results/validation_summary.txt'],
  })],
  [29, noteText({
    timing: '3 minutes',
    talkTrack: 'PitchRateLimiter_Harness is an independent executable Simulink model. The three From Workspace blocks read q_cmd_test, normal_mode_test, and input_valid_test. The exact Model block Unit Under Test - PitchRateLimiter references PitchRateLimiter with SimulationMode=Normal, and To Workspace blocks capture q_cmd_out_harness and limiter_active_harness.',
    caveats: [
      'The real nineteen-point stimulus is created by run_pitch_rate_limiter_tests.m; it is not loaded from a standalone stimulus CSV.',
      'Pressing Run on the saved harness uses benign two-sample placeholders, not the retained assessment sequence.',
      'This is not a Simulink Test or Test Manager harness.',
    ],
    sources: ['models/PitchRateLimiter_Harness.slx', 'screenshots/PitchRateLimiter_Harness.png', 'scripts/run_pitch_rate_limiter_tests.m', 'scripts/create_training_models.m'],
  })],
  [30, noteText({
    timing: '4 minutes',
    talkTrack: 'Show where the harness inputs actually come from. FCS_Data.sldd supplies the managed 0.02 second sample time, the twelve degree-per-second magnitude limit, and zero fallback. run_pitch_rate_limiter_tests.m defines nineteen rows, creates q_cmd_test, normal_mode_test, and input_valid_test timeseries, injects them into the harness model workspace, overrides stop time to 0.36 seconds, and simulates once. The harness consumes those variables and the MAT file retains all three input timeseries with the assessed outputs and summary.',
    caveats: [
      'Nineteen of nineteen means one deterministic desktop-MIL simulation assessed at nineteen sample times, not nineteen independent simulations.',
      'There is no standalone stimulus input file and no Test Manager suite file.',
      'The driver refreshes managed dictionary entries before execution; experiment only in an authorized copy.',
    ],
    sources: ['scripts/run_pitch_rate_limiter_tests.m', 'models/PitchRateLimiter_Harness.slx', 'data/FCS_Data.sldd', 'results/PitchRateLimiter_TestResults.mat', 'results/PitchRateLimiter_TestResults.csv'],
  })],
  [31, noteText({
    timing: '4 minutes plus demonstration',
    talkTrack: 'In the harness, press Ctrl+D first. Update Model evaluates parameters, propagates data types, dimensions, and sample times, resolves the referenced component, and exposes update-time errors without advancing simulation time. The package validator used the equivalent SimulationCommand update and retains 8/8. Ctrl+B is the interactive target-dependent build action. The retained integration evidence used scripted slbuild with the same active ReferencedFlightControlArchitecture GRT configuration and generated and compiled five models: the top model plus four references.',
    caveats: [
      'Build the model that matches the task; building the harness is not the same as building the integration top level.',
      'The top executable was built but not run, SIL-tested, PIL-tested, or approved for production.',
      'One non-fatal warning disabled root-level Dataset output logging for the build; compile and link still completed.',
    ],
    sources: ['scripts/validate_training_project.m', '.codex/pptx_v7_build/build_top_level_evidence.m', 'results/validation_summary.txt', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'https://www.mathworks.com/help/simulink/ug/using-the-sim-command.html', 'https://www.mathworks.com/help/simulink/slref/slbuild.html'],
  })],
  [32, noteText({
    timing: '4 minutes',
    talkTrack: 'Read the retained build evidence from left to right. The selected tree identifies the stable build root, the standalone Windows executable, the top-model generated-code folder and report, the four referenced-child targets under slprj/grt, and the cache. The generated top-model C header records R2023b, grt.tlc, Windows x86-64, code-generation validation not run, and includes for all four referenced interfaces. The diary log records successful completion, 5 of 5 models built, zero models already up to date, and a duration of 1 minute 56.965 seconds. Ctrl+B is the interactive analogue; this retained run was produced by scripted slbuild.',
    caveats: [
      'The build produced a 196,608-byte executable; this deck does not claim that executable was run.',
      'GRT is a prototyping target, not Embedded Coder production-airborne output.',
      'Code-generation validation and Advisor checks were not run.',
    ],
    sources: ['.codex/pptx_v7_build/build_top_level_evidence.m', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'results/top_level_codegen_v7_evidence/codegen/ReferencedFlightControlArchitecture_grt_rtw/ReferencedFlightControlArchitecture.c', 'results/top_level_codegen_v7_evidence/codegen/ReferencedFlightControlArchitecture_grt_rtw/html/index.html', 'https://www.mathworks.com/help/simulink/slref/slbuild.html', 'https://www.mathworks.com/help/rtw/ug/build-process-folders.html'],
  })],
  [33, noteText({
    timing: '3 minutes',
    talkTrack: 'This is an authentic Simulation Data Inspector capture of the saved AircraftFeedbackControlLoop onboarding reference run. The retained session contains one run, five signals, and a three-by-one layout. The saved view controls plot assignment, legends, grid, and markers; the saved session contains the signal data. Use this slide to orient to the UI, then use the next slide to read the causal behavior.',
    caveats: [
      'The two retained .mldatx files are SDI artifacts, not Simulink Test or Test Manager artifacts.',
      'Loading the reference session can replace current SDI state only when the caller explicitly permits it; the helper creates recoverable backups.',
    ],
    sources: ['screenshots/SimulationDataInspector_Onboarding.jpg', 'data/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_View.mldatx', 'results/SimulationDataInspector/AircraftFeedbackControlLoop_Onboarding_Session.mldatx', 'scripts/open_data_inspector_reference.m'],
  })],
  [34, noteText({
    timing: '4 minutes',
    talkTrack: 'Read the three aligned plots as one story. The top plot overlays command, dynamic response, and the model-logged tracking error. The middle plot isolates that logged error so step jumps, decay, and overshoot are legible. The bottom plot places actuator effort beside disturbance timing so the learner can correlate cause and response. The saved run retains 1001 points per signal from zero to twenty seconds with 0.02-second point spacing.',
    caveats: [
      'Call Error_deg the model-logged tracking error; do not assume it is an independently recomputed same-row command minus response.',
      'The bottom plot overlays actuator degrees and disturbance degrees per second squared; compare timing and trend, not vertical magnitude.',
      'Use cursor measurements or the retained CSV for exact values rather than visual estimation alone.',
    ],
    sources: ['screenshots/SimulationDataInspector_Onboarding.jpg', 'results/AircraftFeedback_CommandTracking.csv', 'scripts/update_data_inspector.m', 'scripts/run_training_simulations.m'],
  })],
  [41, noteText({
    timing: '3 minutes',
    talkTrack: 'Follow the controlled relative-file flow. initialize_training_data restores managed dictionary entries. run_pitch_rate_limiter_tests defines the nineteen-row stimulus, creates and injects three timeseries, and owns the visible oracle. PitchRateLimiter_Harness contains the From Workspace sources and referenced unit under test. The driver captures outputs and stores four pass fields per row: three row-specific checks plus one suite-level 50 Hz spacing result repeated on all nineteen rows. It writes CSV, MAT, HTML, and PNG, and the MAT file also retains qCommandInput, normalModeInput, and inputValidInput.',
    caveats: [
      'The generated CSV, MAT, HTML, and PNG come from one execution; they are multiple views of the same run, not independent experiments.',
      'The saved harness manual-Run placeholders do not reproduce the nineteen-point suite.',
    ],
    sources: ['scripts/initialize_training_data.m', 'scripts/run_pitch_rate_limiter_tests.m', 'models/PitchRateLimiter_Harness.slx', 'results/PitchRateLimiter_TestResults.mat', 'reports/PitchRateLimiter_TestReport.html'],
  })],
  [43, noteText({
    timing: '3 minutes',
    talkTrack: 'State the retained result precisely. One deterministic 0.36-second desktop-MIL simulation was assessed at nineteen 50 Hz sample times. Every row retains true NumericPass, LimiterActivePass, TimestampPass, and Timing50HzPass fields; the first three are row-specific, while the single suite-level 50 Hz spacing result is copied to every row. The CSV, MAT, HTML, and PNG are retained views produced by the same driver execution. Use the next slide to interpret each plot rather than relying only on the 19/19 badge.',
    caveats: [
      'This is not nineteen independent simulations and not a Simulink Test or Test Manager suite.',
      'The graph is supporting evidence; the row-level CSV/MAT checks determine the retained pass status.',
    ],
    sources: ['results/PitchRateLimiter_TestResults.csv', 'results/PitchRateLimiter_TestResults.mat', 'reports/PitchRateLimiter_TestReport.html', 'reports/PitchRateLimiter_TestReport.png', 'scripts/run_pitch_rate_limiter_tests.m'],
  })],
  [44, noteText({
    timing: '4 minutes',
    talkTrack: 'Read the result plot top to bottom. The top panel clips only the displayed input to plus or minus eighteen so the plus and minus one-thousand cases remain readable; expected and actual outputs overlap, valid Normal-mode commands clamp at plus or minus twelve, and invalid or disabled rows use zero fallback. The middle panel shows expected and actual limiter_active overlapping; active is true only when Normal and valid are true and the input is strictly outside the inclusive limits. The bottom panel is absolute numeric error on a log axis against 1e-9. Every retained error is exactly zero, so no positive error trace can appear on the log axis. Each row retains three row-specific pass fields plus the suite-level timing result.',
    caveats: [
      'A visually blank bottom panel means zero positive error values in this retained run, not missing data.',
      'The executable timing tolerance is 2e-11 seconds while the traceability CSV states 1e-12; exact 0.02-second spacing passes either value, so the retained result is unaffected.',
      'Use shows or retains evidence of, not proves certification compliance.',
    ],
    sources: ['reports/PitchRateLimiter_TestReport.png', 'results/PitchRateLimiter_TestResults.csv', 'scripts/run_pitch_rate_limiter_tests.m', 'docs/PitchRateLimiter_Requirements_Traceability.csv'],
  })],
  [46, noteText({
    timing: '3 minutes',
    talkTrack: 'FCS_Data.sldd is the shared Design Data source. The current dictionary contains thirty-one entries: twenty-six Simulink.Parameter objects, four Simulink.Signal objects, and one Simulink.Bus. Representative values include Sample_time 0.02 seconds, q_limit_normal 12 degrees per second, and q_fallback_command zero. FlightControlBus defines five scalar elements—q_rate, pitch_angle, mach, air_data_valid, and mode—with controlled types, units, dimensions, and descriptions. The next slide shows how to open and query them.',
    caveats: [
      'A dictionary and bus define controlled data and structure; they do not by themselves prove semantic correctness.',
      'The values are illustrative classroom data, not production aircraft data.',
    ],
    sources: ['data/FCS_Data.sldd', 'results/FCS_DataDictionary_Inventory.csv', 'results/FlightControlBus_Inventory.csv', 'scripts/initialize_training_data.m', 'https://www.mathworks.com/help/simulink/ug/what-is-a-data-dictionary.html', 'https://www.mathworks.com/help/simulink/slref/simulink.bus.html'],
  })],
  [45, noteText({
    timing: '3 minutes',
    talkTrack: 'Keep the two execution paths separate. The callback example calls training_callback_preload. When context is absent, preload calls training_callback_setup; setup creates the Dataset and context, and preload stores the returned state. training_callback_postload then configures the standalone PitchRateLimiter model, and the example may optionally simulate it. That lane does not invoke the retained harness driver and does not own an oracle or evidence report. Separately, run_pitch_rate_limiter_tests initializes the baseline, creates and injects q_cmd_test, normal_mode_test, and input_valid_test into PitchRateLimiter_Harness, simulates once, assesses the results, and retains CSV, MAT, HTML, and PNG.',
    caveats: [
      'The test driver is not invoked by callback_workflow_example.m.',
      'The deterministic callback Dataset is created by training_callback_setup.m; preload obtains and stores that context.',
      'Callbacks create context; the retained driver owns the assessment oracle and evidence files.',
    ],
    sources: ['scripts/callback_workflow_example.m', 'scripts/training_callback_preload.m', 'scripts/training_callback_setup.m', 'scripts/training_callback_postload.m', 'scripts/run_pitch_rate_limiter_tests.m'],
  })],
  [47, noteText({
    timing: '4 minutes plus demonstration',
    talkTrack: 'Use the authentic Model Explorer capture to locate the dictionary and inspect FlightControlBus. Add scripts, models, and data to the MATLAB path, run initialize_training_data(projectRoot), and open data/FCS_Data.sldd in Model Explorer. In the Design Data section, select FlightControlBus to inspect its five elements. The MATLAB API reaches the same entries through Simulink.data.dictionary.open, getSection, getEntry, and getValue. Retained CSV inventories provide readable review views.',
    caveats: [
      'Initialization restores the scripted classroom baseline for managed names; make experiments only in an authorized copy.',
      'The screenshot is authentic Model Explorer evidence and the dictionary was not modified while capturing it.',
      'Close the dictionary when finished and follow the project\'s change-control process before editing shared data.',
    ],
    sources: ['screenshots/FCS_Data_ModelExplorer_FlightControlBus.jpg', 'data/FCS_Data.sldd', 'scripts/initialize_training_data.m', 'results/FCS_DataDictionary_Inventory.csv', 'results/FlightControlBus_Inventory.csv', 'https://www.mathworks.com/help/simulink/slref/simulink.data.dictionary.open.html'],
  })],
  [52, noteText({
    timing: '3 minutes',
    talkTrack: 'Report the freshly rechecked status without combining unlike counts. The 2026-08-27 package validation retains 8/8 delivered models updated, 19/19 limiter sample assessments passing, and 24/24 required exports present. Separately, the controlled top-level GRT build generated and compiled the parent and four referenced targets, 5/5. These are complementary evidence records with different scopes.',
    caveats: [
      '8/8 means diagram update/compile accepted; it does not mean eight files were edited.',
      '24/24 counts one HTML report, twenty-one named visual exports, and two SDI .mldatx artifacts; it does not include the new build tree.',
      '5/5 means code generation and compilation completed; the executable was not run.',
    ],
    sources: ['results/validation_summary.txt', 'scripts/validate_training_project.m', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log'],
  })],
  [53, noteText({
    timing: '3 minutes',
    talkTrack: 'The package now demonstrates saved models, controlled data, model update, desktop MIL simulation, a standalone limiter harness, executable MATLAB assessments, traceable reports, a recoverable SDI view/session, and a controlled GRT top-level build. It still does not claim production-aircraft data, an approved baseline, live Requirements links, a Test Manager suite, production or embedded-airborne code approval, generated-code verification, SIL, PIL, HIL, bench, system integration, or certification approval.',
    caveats: [
      'The GRT build is a training/prototyping artifact; it does not turn MIL evidence into code verification.',
      'The two retained .mldatx files are SDI artifacts only.',
    ],
    sources: ['README.md', 'results/validation_summary.txt', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1032046'],
  })],
  [54, noteText({
    timing: '3 minutes',
    talkTrack: 'Treat this as a project-defined completion-record placeholder, not a universal definition of RCF. Use only the approved program form and authority. A real record may identify the model baseline, allocated system requirements, verification criteria, executed evidence, configuration, findings, reviewers, dispositions, dates, and required acceptance. Where the approved process requires independence, the author should not be the sole independent verifier of their own work.',
    caveats: [
      'Do not expand RCF or assign it a universal closure function, authority, or independence requirement unless the approved program plan or form does so.',
      'No RCF, reviewer signature, independent-verification record, or approval record was supplied in this training package.',
      'Passing MIL assessments, Model Advisor checks, or Polyspace findings are evidence inputs; they are not substitutes for the review and acceptance required by the approved process.',
    ],
    sources: ['results/validation_summary.txt', 'docs/PitchRateLimiter_Requirements_Traceability.csv', 'https://www.faa.gov/documentLibrary/media/Order/FAA_Order_8110.49A.pdf', 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1032046', 'https://www.nasa.gov/reference/systems-engineering-handbook/'],
  })],
  [55, noteText({
    timing: '2 minutes',
    talkTrack: 'Close with the repeatable chain the learner should produce. Initialize the folder-based package, choose the correct top-level model, update before execution, run the limiter driver rather than the saved placeholders, inspect the real top-level build tree, explain one SDI transient and all three limiter-result panels, open the dictionary and bus, and trace one requirement to retained evidence. Finish by naming which gates remain future or unsigned.',
    caveats: [
      'End on reproducible engineering practice, not a claim of certification, HIL completion, code verification, or signed approval.',
    ],
    sources: ['README.md', 'results/validation_summary.txt', 'results/top_level_codegen_v7_evidence/ReferencedFlightControlArchitecture_slbuild.log', 'https://www.nasa.gov/reference/systems-engineering-handbook/'],
  })],
]);

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPath));
if (presentation.slides.items.length !== 55) throw new Error(`Expected 55 slides, found ${presentation.slides.items.length}`);
for (let index = 0; index < 55; index += 1) setChrome(presentation.slides.items[index], index + 1);
for (const slideNumber of replacementSlides) clearMappedContent(presentation.slides.items[slideNumber - 1], slideNumber);

// Slide 13 keeps the requested Polyspace placeholders, but rewrites the inherited labels explicitly.
{
  const slide = presentation.slides.items[12];
  const bugFinder = findShape(slide, (shape) => textValue(shape).trim() === 'INSERT BUG FINDER RESULT / REPORT HERE', 'Bug Finder placeholder');
  const codeProver = findShape(slide, (shape) => textValue(shape).trim() === 'INSERT CODE PROVER RESULT / REPORT HERE', 'Code Prover placeholder');
  setText(bugFinder, 'FUTURE INSERT  •  BUG FINDER RESULT / REPORT', { fontSize: 13.2, color: COLORS.blue, bold: true, alignment: 'center' });
  setText(codeProver, 'FUTURE INSERT  •  CODE PROVER RESULT / REPORT', { fontSize: 13.2, color: COLORS.green, bold: true, alignment: 'center' });
}

// Small inherited-slide readability corrections found during full-resolution QA.
{
  const slide10 = presentation.slides.items[9];
  const title10 = findChrome(slide10).title;
  setText(title10, 'Log signals for evidence; use test points for required observability', {
    fontSize: 35.5, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'middle',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });

  const slide54 = presentation.slides.items[53];
  const title54 = findChrome(slide54).title;
  setText(title54, 'A project-defined RCF may record required review and sign-off', {
    fontSize: 37, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'middle',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  const rcfSignoffTitle = findShape(slide54, (shape) => String(shape.name || '') === 's47-signoff-title', 'RCF sign-off heading');
  setText(rcfSignoffTitle, 'REVIEW / SIGN-OFF', {
    fontSize: 18.5, color: COLORS.blue, bold: true, alignment: 'center', verticalAlignment: 'middle',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  const rcfRecordBody = findShape(slide54, (shape) => String(shape.name || '') === 's47-record-body', 'RCF verification record body');
  setText(rcfRecordBody, 'Model / component:  __________________________\nBaseline / version / checksum:  ________________\nAllocated system requirement IDs:  _____________\nVerification method and acceptance criteria:  ______\nExecuted evidence IDs and results:  ______________\nModel settings / test / build configuration:  _______\nFindings, anomalies, and dispositions:  ____________\nRequired review scope completed:  ☐ Yes  ☐ No', {
    fontSize: 14.4, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'top',
    insets: { top: 4, right: 5, bottom: 3, left: 5 },
  });
  const rcfSignoffBody = findShape(slide54, (shape) => String(shape.name || '') === 's47-signoff-body', 'RCF review body');
  setText(rcfSignoffBody, 'Model owner / author:  ________________________\nSignature / date:  _____________________________\n\nReviewer / independent verifier (if required):  ______\nSignature / date:  _____________________________\n\nApprover / designated authority:  _________________\nSignature / date:  _____________________________\n\nCompletion status:  ☐ Accepted  ☐ Conditional  ☐ Open\nConditions / open items:  _______________________', {
    fontSize: 14.4, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'top',
    insets: { top: 4, right: 5, bottom: 3, left: 5 },
  });
  const rcfExit = findShape(slide54, (shape) => String(shape.name || '') === 's47-exit', 'RCF exit condition');
  setText(rcfExit, 'EXIT CONDITION  •  controlled baseline + traceability + executed evidence + resolved findings + review/signature(s) required by approved process', {
    fontSize: 15.3, color: COLORS.white, bold: true, alignment: 'center', verticalAlignment: 'middle',
    insets: { top: 5, right: 9, bottom: 5, left: 9 },
  });
  const rcfCaveat = findShape(slide54, (shape) => String(shape.name || '') === 's47-caveat', 'RCF caveat');
  rcfCaveat.position = { left: 72, top: 625, width: 1136, height: 30 };
  setText(rcfCaveat, 'RCF is project-defined: use the approved form and authority; do not invent an acronym expansion or treat this slide as a completed approval record.', {
    fontSize: 13.2, color: COLORS.body, bold: true, alignment: 'center', verticalAlignment: 'middle',
    insets: { top: 2, right: 5, bottom: 2, left: 5 },
  });
}

// Slide 2 — absolute evidence summary.
{
  const slide = presentation.slides.items[1];
  addBox(slide, { name: 's2-date', position: { left: 72, top: 150, width: 1136, height: 34 }, text: 'EVIDENCE SNAPSHOT  •  MATLAB R2023b UPDATE 8  •  DESKTOP WINDOWS  •  27 AUG 2026', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 14.5, textColor: COLORS.white });
  const metrics = [
    ['8 / 8', 'MODELS UPDATED', COLORS.teal, 'diagram update / compile'],
    ['19 / 19', 'SAMPLE ASSESSMENTS', COLORS.green, '3 row checks + suite timing'],
    ['24 / 24', 'REQUIRED EXPORTS', COLORS.blue, 'validator-defined artifacts'],
    ['5 / 5', 'GRT MODELS BUILT', COLORS.amber, 'top standalone + four refs'],
  ];
  metrics.forEach((m, i) => {
    const x = 72 + i * 290;
    addBox(slide, { name: `s2-kpi-${i}`, position: { left: x, top: 201, width: 266, height: 128 }, fill: COLORS.white, lineColor: m[2], lineWidth: 1.8 });
    addTextBox(slide, { name: `s2-kpi-value-${i}`, position: { left: x + 16, top: 211, width: 234, height: 52 }, text: m[0], fontSize: 32, color: m[2], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s2-kpi-label-${i}`, position: { left: x + 16, top: 264, width: 234, height: 24 }, text: m[1], fontSize: 13, color: COLORS.ink, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s2-kpi-sub-${i}`, position: { left: x + 16, top: 290, width: 234, height: 25 }, text: m[3], fontSize: 12, color: COLORS.muted, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's2-retained', position: { left: 72, top: 354, width: 548, height: 245 }, fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.6 });
  addTextBox(slide, { name: 's2-retained-title', position: { left: 94, top: 368, width: 504, height: 28 }, text: 'WHAT IS RETAINED', fontSize: 18, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's2-retained-body', position: { left: 102, top: 408, width: 488, height: 171 }, text: '✓ 8 Simulink / Stateflow models with explicit roles\n✓ FCS_Data.sldd + five-element FlightControlBus\n✓ one SDI run • five signals • three aligned plots\n✓ standalone PitchRateLimiter harness + scripted oracle\n✓ CSV • MAT • HTML • PNG • build log • generated C', fontSize: 15.4, color: COLORS.ink, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's2-boundary', position: { left: 660, top: 354, width: 548, height: 245 }, fill: COLORS.redTint, lineColor: COLORS.red, lineWidth: 1.6 });
  addTextBox(slide, { name: 's2-boundary-title', position: { left: 682, top: 368, width: 504, height: 28 }, text: 'WHAT THIS IS NOT', fontSize: 18, color: COLORS.red, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's2-boundary-body', position: { left: 690, top: 408, width: 488, height: 171 }, text: '× production aircraft data or approved baseline\n× Simulink Test / Test Manager suite\n× production or Embedded Coder approval\n× SIL • PIL • HIL • bench • system integration\n× Model Advisor / Polyspace / RCF completion\n× certification approval', fontSize: 15.4, color: COLORS.ink, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's2-caveat', position: { left: 72, top: 616, width: 1136, height: 34 }, text: 'BUILD BOUNDARY  •  the standalone executable was compiled, not executed or SIL/PIL-verified', fill: COLORS.amberTint, lineColor: COLORS.amber, fontSize: 14.2, textColor: COLORS.dark });
}

// Slide 3 — completion checklist.
{
  const slide = presentation.slides.items[2];
  addBox(slide, { name: 's3-rule', position: { left: 72, top: 151, width: 1136, height: 40 }, text: 'STATUS WORDS ARE PART OF THE EVIDENCE: VERIFIED ≠ EXPLAINED ≠ FUTURE', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 16, textColor: COLORS.white });
  const columns = [
    { x: 72, title: 'VERIFIED NOW', color: COLORS.green, items: ['✓ 8/8 model updates', '✓ 19/19 assessed samples', '✓ 24/24 required exports', '✓ SDI run + view + session', '✓ 5/5 GRT models built'] },
    { x: 456, title: 'EXPLAINED / DEMO', color: COLORS.teal, items: ['✓ logging vs test points', '✓ model settings review', '✓ Ctrl+D vs Run vs Ctrl+B', '✓ harness input provenance', '✓ SDI + result-plot reading', '✓ dictionary + bus access'] },
    { x: 840, title: 'FUTURE / OPEN', color: COLORS.amber, items: ['○ retained Model Advisor report', '○ Bug Finder result', '○ Code Prover result', '○ project-defined RCF / required sign-off', '○ SIL / PIL / HIL evidence', '○ production-code approval'] },
  ];
  columns.forEach((col, i) => {
    addBox(slide, { name: `s3-col-${i}`, position: { left: col.x, top: 215, width: 344, height: 350 }, fill: COLORS.panelDark, lineColor: col.color, lineWidth: 2 });
    addTextBox(slide, { name: `s3-col-title-${i}`, position: { left: col.x + 18, top: 232, width: 308, height: 32 }, text: col.title, fontSize: 19, color: col.color, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s3-col-body-${i}`, position: { left: col.x + 24, top: 282, width: 296, height: 254 }, text: col.items.join('\n\n'), fontSize: 15.6, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's3-close', position: { left: 72, top: 586, width: 1136, height: 58 }, text: 'OVERALL COMPLETION = retained objective result + explainable workflow + explicitly owned open gate', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 16.5, textColor: COLORS.white });
}

// Slide 5 — expanded first-session roadmap.
{
  const slide = presentation.slides.items[4];
  addBox(slide, { name: 's5-question', position: { left: 72, top: 150, width: 348, height: 460 }, fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 2 });
  addTextBox(slide, { name: 's5-question-label', position: { left: 94, top: 170, width: 304, height: 28 }, text: 'KEEP ASKING', fontSize: 16, color: COLORS.teal, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's5-question-body', position: { left: 102, top: 210, width: 288, height: 196 }, text: 'Which model is top level for this task?\n\nWhat configuration and data are active?\n\nWhat action did I perform?\n\nWhat artifact supports the claim?', fontSize: 17.2, color: COLORS.white, bold: true, verticalAlignment: 'top', alignment: 'center' });
  addBox(slide, { name: 's5-start', position: { left: 98, top: 430, width: 296, height: 145 }, text: 'START HERE\ncompletion checklist\n↓\nfolder initialization\n↓\ncorrect top-level model', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 16, textColor: COLORS.dark });
  const stages = [
    ['1', 'OPERATE', 'open • Ctrl+D • run • stop'],
    ['2', 'READ HIERARCHY', 'top → child → subsystem → harness'],
    ['3', 'EXPOSE SEMANTICS', 'units • types • logging • settings'],
    ['4', 'BUILD DELIBERATELY', 'active model • target • retained files'],
    ['5', 'TRACE INPUTS', 'script • timeseries • SLDD • bus'],
    ['6', 'READ EVIDENCE', 'SDI transients • 19-case plots'],
    ['7', 'CLOSE THE LOOP', 'traceability • open gates • sign-off'],
  ];
  stages.forEach((stage, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 456 + col * 380;
    const y = 150 + row * 112;
    const width = i === 6 ? 736 : 356;
    addBox(slide, { name: `s5-stage-${i}`, position: { left: x, top: y, width, height: 88 }, fill: COLORS.panelDark, lineColor: i === 3 ? COLORS.amber : COLORS.teal, lineWidth: 1.5 });
    addTextBox(slide, { name: `s5-stage-num-${i}`, position: { left: x + 14, top: y + 14, width: 44, height: 44 }, text: stage[0], fontSize: 23, color: i === 3 ? COLORS.amber : COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s5-stage-title-${i}`, position: { left: x + 66, top: y + 10, width: width - 82, height: 28 }, text: stage[1], fontSize: 15.5, color: COLORS.white, bold: true });
    addTextBox(slide, { name: `s5-stage-body-${i}`, position: { left: x + 66, top: y + 40, width: width - 82, height: 34 }, text: stage[2], fontSize: 13.4, color: '#CFE3EC', bold: true, verticalAlignment: 'top' });
  });
}

// Slide 29 — harness image and exact stimulus provenance.
{
  const slide = presentation.slides.items[28];
  addBox(slide, { name: 's29-frame', position: { left: 64, top: 142, width: 1152, height: 454 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.4, geometry: 'rect' });
  await addImage(slide, HARNESS_IMAGE, { left: 74, top: 151, width: 1132, height: 436 }, 'PitchRateLimiter standalone harness with three From Workspace inputs and referenced unit under test');
  addBox(slide, { name: 's29-caption', position: { left: 72, top: 606, width: 1136, height: 44 }, text: 'q_cmd_test • normal_mode_test • input_valid_test  ←  created by scripts/run_pitch_rate_limiter_tests.m  •  no standalone stimulus file', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 14.6, textColor: COLORS.dark });
}

// Slide 30 — actual input sources, variables, and representative rows.
{
  const slide = presentation.slides.items[29];
  addBox(slide, { name: 's30-source-title', position: { left: 72, top: 150, width: 520, height: 34 }, text: 'THREE PRIMARY ARTIFACTS IN THE HARNESS EXECUTION PATH', fill: COLORS.panelDark, lineColor: COLORS.teal, fontSize: 13.7, textColor: COLORS.white });
  const sources = [
    ['1', 'data/FCS_Data.sldd', 'Sample_time = 0.02 s\nq_limit_normal = 12 deg/s\nfallback = 0'],
    ['2', 'scripts/run_pitch_rate_limiter_tests.m', 'defines 19 rows\ncreates 3 timeseries\nowns expected values + oracle'],
    ['3', 'models/PitchRateLimiter_Harness.slx', 'From Workspace → UUT\nModel block in Normal simulation mode\nTo Workspace captures'],
  ];
  sources.forEach((src, i) => {
    const y = 198 + i * 130;
    addBox(slide, { name: `s30-source-${i}`, position: { left: 72, top: y, width: 520, height: 110 }, fill: COLORS.panelDark, lineColor: i === 1 ? COLORS.amber : COLORS.teal, lineWidth: 1.5 });
    addTextBox(slide, { name: `s30-source-num-${i}`, position: { left: 86, top: y + 18, width: 44, height: 44 }, text: src[0], fontSize: 23, color: i === 1 ? COLORS.amber : COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s30-source-name-${i}`, position: { left: 138, top: y + 11, width: 436, height: 25 }, text: src[1], fontSize: 14.4, color: COLORS.white, bold: true, typeface: 'Consolas' });
    addTextBox(slide, { name: `s30-source-body-${i}`, position: { left: 138, top: y + 40, width: 436, height: 58 }, text: src[2], fontSize: 13.4, color: '#CFE3EC', bold: true, verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's30-vars', position: { left: 622, top: 150, width: 586, height: 108 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.5 });
  addTextBox(slide, { name: 's30-vars-title', position: { left: 642, top: 162, width: 546, height: 24 }, text: 'INJECTED INTO THE HARNESS MODEL WORKSPACE', fontSize: 14.5, color: COLORS.teal, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's30-vars-body', position: { left: 642, top: 195, width: 546, height: 48 }, text: 'q_cmd_test  •  normal_mode_test  •  input_valid_test', fontSize: 16, color: COLORS.dark, bold: true, alignment: 'center', typeface: 'Consolas' });
  addBox(slide, { name: 's30-table', position: { left: 622, top: 278, width: 586, height: 270 }, fill: COLORS.panelDark, lineColor: COLORS.amber, lineWidth: 1.5 });
  addTextBox(slide, { name: 's30-table-title', position: { left: 642, top: 291, width: 546, height: 24 }, text: 'THREE REPRESENTATIVE ROWS FROM THE 19-POINT SEQUENCE', fontSize: 14.2, color: COLORS.amber, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's30-table-head', position: { left: 646, top: 327, width: 538, height: 26 }, text: 't(s)   q_cmd   N   V   expected   active', fontSize: 14.2, color: COLORS.teal, bold: true, typeface: 'Consolas' });
  addLine(slide, { name: 's30-table-line', left: 646, top: 358, width: 538, color: COLORS.slate, lineWidth: 1 });
  addTextBox(slide, { name: 's30-table-rows', position: { left: 646, top: 368, width: 538, height: 122 }, text: '0.12   +12.0   1   1     +12.0      0\n\n0.14   +12.1   1   1     +12.0      1\n\n0.20    +8.0   1   0       0.0      0', fontSize: 15, color: COLORS.white, bold: true, typeface: 'Consolas', verticalAlignment: 'top' });
  addTextBox(slide, { name: 's30-table-key', position: { left: 646, top: 500, width: 538, height: 30 }, text: 'N = Normal mode  •  V = Input valid', fontSize: 12.8, color: COLORS.slate, bold: true, alignment: 'center' });
  addBox(slide, { name: 's30-boundary', position: { left: 72, top: 572, width: 1136, height: 68 }, text: 'ONE 0.36 s DESKTOP-MIL RUN  •  19 ASSESSED SAMPLE TIMES  •  NO STANDALONE STIMULUS CSV  •  NO TEST MANAGER SUITE', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 15, textColor: COLORS.white });
}

// Slide 31 — Ctrl+D versus the now-retained top-level build.
{
  const slide = presentation.slides.items[30];
  addBox(slide, { name: 's31-banner', position: { left: 72, top: 150, width: 1136, height: 42 }, text: 'ACTIVE MODEL MATTERS  •  UPDATE THE HARNESS; BUILD THE INTEGRATION TOP LEVEL FOR THIS EVIDENCE', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 15, textColor: COLORS.white });
  const cards = [
    { x: 72, key: 'Ctrl+D', title: 'UPDATE MODEL / DIAGRAM', color: COLORS.teal, body: 'IN THE HARNESS\n• evaluate parameters\n• propagate types / dimensions / timing\n• resolve PitchRateLimiter reference\n• catch update-time errors\n• do not advance simulation time', result: 'RETAINED RESULT\n8 / 8 delivered models updated / compiled' },
    { x: 660, key: 'Ctrl+B', title: 'BUILD ACTIVE MODEL', color: COLORS.amber, body: 'INTERACTIVE ACTION: Ctrl+B\n• active model: ReferencedFlightControlArchitecture\n• target: grt.tlc\n• generate C + report\n• compile/link top + four references\n• create standalone Windows executable', result: 'RETAINED SCRIPTED slbuild\nPASS • 5 / 5 models • 1:56.965' },
  ];
  cards.forEach((card, i) => {
    addBox(slide, { name: `s31-card-${i}`, position: { left: card.x, top: 212, width: 548, height: 335 }, fill: COLORS.panelDark, lineColor: card.color, lineWidth: 2 });
    addTextBox(slide, { name: `s31-key-${i}`, position: { left: card.x + 24, top: 226, width: 500, height: 48 }, text: card.key, fontSize: 32, color: card.color, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s31-title-${i}`, position: { left: card.x + 24, top: 278, width: 500, height: 28 }, text: card.title, fontSize: 16, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s31-body-${i}`, position: { left: card.x + 36, top: 324, width: 476, height: 142 }, text: card.body, fontSize: 14.4, color: '#DDECF3', bold: true, verticalAlignment: 'top' });
    addBox(slide, { name: `s31-result-${i}`, position: { left: card.x + 30, top: 475, width: 488, height: 55 }, text: card.result, fill: i === 0 ? COLORS.greenTint : COLORS.amberTint, lineColor: card.color, lineWidth: 1.2, fontSize: 13.5, textColor: COLORS.dark });
  });
  addBox(slide, { name: 's31-bottom', position: { left: 72, top: 570, width: 1136, height: 70 }, text: 'PROVENANCE  •  Ctrl+B is the interactive analogue; retained evidence used scripted slbuild with the same active GRT configuration.\nBOUNDARY  •  executable built, not run  •  no Embedded Coder / SIL / PIL / approval claim', fill: COLORS.navy, lineColor: COLORS.amber, lineWidth: 1.4, fontSize: 14.1, textColor: COLORS.white });
}

// Slide 32 — authentic selected tree and generated source excerpt.
{
  const slide = presentation.slides.items[31];
  const generatedSource = (await fs.readFile(GENERATED_C, 'utf8')).split(/\r?\n/);
  const generatedHeader = generatedSource.slice(7, 19).join('\n');
  const generatedIncludes = generatedSource.slice(24, 28).join('\n');
  const tree = [
    'top_level_codegen_v7_evidence/',
    '├─ ReferencedFlightControlArchitecture_slbuild.log',
    '├─ codegen/',
    '│  ├─ ReferencedFlightControlArchitecture.exe',
    '│  ├─ ReferencedFlightControlArchitecture_grt_rtw/',
    '│  │  ├─ ReferencedFlightControlArchitecture.c',
    '│  │  ├─ ReferencedFlightControlArchitecture.h',
    '│  │  └─ html/index.html',
    '│  └─ slprj/grt/',
    '│     ├─ SensorProcessingRef/',
    '│     ├─ PitchRateLimiter/',
    '│     ├─ PitchControllerRef/',
    '│     └─ ActuatorCommandRef/',
    '└─ cache/ReferencedFlightControlArchitecture.slxc',
  ].join('\n');
  addBox(slide, { name: 's32-tree-panel', position: { left: 72, top: 150, width: 536, height: 404 }, fill: COLORS.white, lineColor: COLORS.teal, lineWidth: 1.6 });
  addTextBox(slide, { name: 's32-tree-title', position: { left: 92, top: 163, width: 496, height: 26 }, text: 'SELECTED BUILD OUTPUT', fontSize: 15, color: COLORS.teal, bold: true });
  addTextBox(slide, { name: 's32-tree', position: { left: 92, top: 198, width: 496, height: 300 }, text: tree, fontSize: 12.2, color: COLORS.ink, bold: true, typeface: 'Consolas', verticalAlignment: 'top' });
  addTextBox(slide, { name: 's32-tree-caption', position: { left: 92, top: 503, width: 496, height: 36 }, text: 'Top source/report and a 192 KiB executable sit outside the four child slprj/grt targets.', fontSize: 12.2, color: COLORS.muted, bold: true, alignment: 'center' });
  addBox(slide, { name: 's32-code-panel', position: { left: 632, top: 150, width: 576, height: 404 }, fill: '#F7F9FB', lineColor: COLORS.blue, lineWidth: 1.6 });
  addTextBox(slide, { name: 's32-code-title', position: { left: 652, top: 163, width: 536, height: 26 }, text: 'GENERATED TOP-MODEL C  •  LINES 8–19 + 25–28', fontSize: 14.5, color: COLORS.blue, bold: true });
  addTextBox(slide, { name: 's32-code-head', position: { left: 652, top: 195, width: 536, height: 244 }, text: generatedHeader, fontSize: 11.8, color: COLORS.body, bold: false, typeface: 'Consolas', verticalAlignment: 'top', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  addTextBox(slide, { name: 's32-code-omission', position: { left: 652, top: 435, width: 536, height: 24 }, text: '⋮  editorial omission — source lines 20–24', fontSize: 11.1, color: COLORS.muted, bold: true, typeface: 'Consolas', verticalAlignment: 'middle', insets: { top: 1, right: 2, bottom: 1, left: 2 } });
  addTextBox(slide, { name: 's32-code-includes', position: { left: 652, top: 463, width: 536, height: 75 }, text: generatedIncludes, fontSize: 11.8, color: COLORS.body, bold: false, typeface: 'Consolas', verticalAlignment: 'top', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  addBox(slide, { name: 's32-success', position: { left: 72, top: 570, width: 1136, height: 42 }, text: 'BUILD_STATUS=PASS  •  top executable created  •  5/5 models built  •  0 already up to date  •  1:56.965', fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.5, fontSize: 15.2, textColor: COLORS.dark });
  addBox(slide, { name: 's32-warning', position: { left: 72, top: 619, width: 1136, height: 31 }, text: 'Warning: Dataset root-output logging disabled; compile/link completed. Executable not run; code-generation validation not run; no SIL/PIL.', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.2, fontSize: 12.8, textColor: COLORS.dark });
}

// Slide 33 — SDI overview.
{
  const slide = presentation.slides.items[32];
  addBox(slide, { name: 's33-frame', position: { left: 64, top: 147, width: 826, height: 474 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.4, geometry: 'rect' });
  await addImage(slide, SDI_IMAGE, { left: 72, top: 155, width: 810, height: 458 }, 'Simulation Data Inspector onboarding reference run with five signals in three plots');
  addBox(slide, { name: 's33-card', position: { left: 914, top: 148, width: 294, height: 474 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.6 });
  addTextBox(slide, { name: 's33-card-title', position: { left: 934, top: 166, width: 254, height: 28 }, text: 'SAVED REFERENCE', fontSize: 17, color: COLORS.teal, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's33-card-kpi', position: { left: 934, top: 216, width: 254, height: 150 }, text: '1 RUN\n5 SIGNALS\n3 PLOTS\n1001 POINTS / SIGNAL\n0.02 s SPACING', fontSize: 19, color: COLORS.dark, bold: true, alignment: 'center', verticalAlignment: 'top' });
  addLine(slide, { name: 's33-rule', left: 942, top: 386, width: 238, color: COLORS.teal, lineWidth: 1.2 });
  addTextBox(slide, { name: 's33-card-body', position: { left: 934, top: 403, width: 254, height: 116 }, text: 'View = layout / styling\nSession = retained signal data\n\nBoth .mldatx files are SDI artifacts.', fontSize: 14.2, color: COLORS.body, bold: true, alignment: 'center', verticalAlignment: 'top' });
  addBox(slide, { name: 's33-next', position: { left: 934, top: 540, width: 254, height: 58 }, text: 'NEXT  →  READ THE CAUSAL STORY', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 14.2, textColor: COLORS.white });
}

// Slide 34 — SDI causal interpretation.
{
  const slide = presentation.slides.items[33];
  addBox(slide, { name: 's34-frame', position: { left: 64, top: 150, width: 790, height: 438 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.4, geometry: 'rect' });
  await addImage(slide, SDI_IMAGE, { left: 72, top: 158, width: 774, height: 422 }, 'Simulation Data Inspector view used to explain command, tracking error, actuator effort, and disturbance timing');
  const cards = [
    { y: 150, label: 'TOP', color: COLORS.blue, body: 'command steps + dynamic response + model-logged tracking error' },
    { y: 287, label: 'MIDDLE', color: COLORS.teal, body: 'logged error alone: jumps, decay, and overshoot become legible' },
    { y: 424, label: 'BOTTOM', color: COLORS.amber, body: 'actuator effort beside disturbance timing: correlate cause and response' },
  ];
  cards.forEach((card, i) => {
    addBox(slide, { name: `s34-card-${i}`, position: { left: 878, top: card.y, width: 330, height: 116 }, fill: COLORS.white, lineColor: card.color, lineWidth: 1.6 });
    addTextBox(slide, { name: `s34-label-${i}`, position: { left: 894, top: card.y + 12, width: 88, height: 24 }, text: card.label, fontSize: 15.5, color: card.color, bold: true });
    addTextBox(slide, { name: `s34-body-${i}`, position: { left: 894, top: card.y + 40, width: 298, height: 64 }, text: card.body, fontSize: 14.2, color: COLORS.body, bold: true, verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's34-footer', position: { left: 72, top: 606, width: 1136, height: 44 }, text: 'BOTTOM PLOT MIXES UNITS  •  actuator: deg  •  disturbance: deg/s²  •  compare timing/trend, not vertical magnitude', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 13.6, textColor: COLORS.dark });
}

// Slide 41 — controlled relative-file flow with visible inputs.
{
  const slide = presentation.slides.items[40];
  const stages = [
    ['1', 'INITIALIZE', 'initialize_training_data.m\nrestores managed SLDD entries'],
    ['2', 'DEFINE + INJECT', 'run_pitch_rate_limiter_tests.m\n19 rows + 3 timeseries + oracle'],
    ['3', 'EXECUTE', 'PitchRateLimiter_Harness.slx\nFrom Workspace → referenced UUT'],
    ['4', 'CAPTURE', 'q_cmd_out_harness\nlimiter_active_harness'],
    ['5', 'ASSESS', '3 row checks\n+ suite-level 50 Hz spacing'],
    ['6', 'RETAIN', 'CSV • MAT • HTML • PNG\nMAT also retains 3 input timeseries'],
  ];
  stages.forEach((stage, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = 72 + col * 388;
    const y = 158 + row * 195;
    addBox(slide, { name: `s41-stage-${i}`, position: { left: x, top: y, width: 348, height: 154 }, fill: COLORS.panelDark, lineColor: i === 1 ? COLORS.amber : COLORS.teal, lineWidth: 1.6 });
    addTextBox(slide, { name: `s41-num-${i}`, position: { left: x + 16, top: y + 16, width: 42, height: 42 }, text: stage[0], fontSize: 22, color: i === 1 ? COLORS.amber : COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s41-title-${i}`, position: { left: x + 68, top: y + 16, width: 258, height: 28 }, text: stage[1], fontSize: 15.5, color: COLORS.white, bold: true });
    addTextBox(slide, { name: `s41-body-${i}`, position: { left: x + 26, top: y + 66, width: 296, height: 68 }, text: stage[2], fontSize: 14.1, color: '#D9EAF1', bold: true, alignment: 'center', verticalAlignment: 'top' });
    if (col < 2) addTextBox(slide, { name: `s41-arrow-${i}`, position: { left: x + 351, top: y + 55, width: 34, height: 40 }, text: '→', fontSize: 24, color: COLORS.teal, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's41-boundary', position: { left: 72, top: 568, width: 1136, height: 72 }, text: 'MANUAL HARNESS RUN ≠ RETAINED SUITE  •  saved model uses two-sample placeholders\nExecute run_pitch_rate_limiter_tests(projectRoot) to refresh the baseline, inject the 19-point sequence, simulate once, and write evidence.', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 14.5, textColor: COLORS.white });
}

// Slide 43 — overview of retained 19/19 result.
{
  const slide = presentation.slides.items[42];
  addBox(slide, { name: 's43-frame', position: { left: 64, top: 148, width: 810, height: 450 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, REPORT_IMAGE, { left: 72, top: 156, width: 794, height: 434 }, 'PitchRateLimiter executed result plot with input/output, limiter active state, and numeric error');
  addBox(slide, { name: 's43-kpi', position: { left: 898, top: 148, width: 310, height: 450 }, fill: COLORS.panelDark, lineColor: COLORS.green, lineWidth: 1.8 });
  addTextBox(slide, { name: 's43-value', position: { left: 920, top: 170, width: 266, height: 72 }, text: '19 / 19', fontSize: 38, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's43-label', position: { left: 920, top: 246, width: 266, height: 44 }, text: 'ASSESSED SAMPLE TIMES\nPASSED', fontSize: 16, color: COLORS.white, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's43-facts', position: { left: 930, top: 315, width: 246, height: 153 }, text: 'one 0.36 s MIL run\n0.02 s point spacing\n0 failed rows\n\n3 row checks:\nnumeric • active • timestamp\n+ suite timing copied to rows', fontSize: 14.5, color: '#DDECF3', bold: true, alignment: 'center', verticalAlignment: 'top' });
  addBox(slide, { name: 's43-next', position: { left: 930, top: 496, width: 246, height: 70 }, text: 'NEXT  →  READ ALL THREE PANELS', fill: COLORS.greenTint, lineColor: COLORS.green, fontSize: 14.5, textColor: COLORS.dark });
  addBox(slide, { name: 's43-footer', position: { left: 72, top: 610, width: 1136, height: 40 }, text: 'Executable MATLAB assessment of a standalone Simulink harness  •  not 19 independent simulations  •  not Test Manager', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 13.5, textColor: COLORS.white });
}

// Slide 44 — panel-by-panel graph interpretation.
{
  const slide = presentation.slides.items[43];
  addBox(slide, { name: 's44-frame', position: { left: 64, top: 150, width: 772, height: 418 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, REPORT_IMAGE, { left: 72, top: 158, width: 756, height: 402 }, 'PitchRateLimiter result plot annotated by explanatory cards');
  const cards = [
    { y: 150, label: 'TOP  •  OUTPUT', color: COLORS.blue, body: 'Input is clipped to ±18 only for display. Expected and actual overlap; valid Normal-mode inputs clamp at ±12, otherwise fallback is 0.' },
    { y: 287, label: 'MIDDLE  •  ACTIVE', color: COLORS.teal, body: 'Expected and actual limiter state overlap. True only when Normal + valid + strictly outside ±12; inclusive ±12 is inactive.' },
    { y: 424, label: 'BOTTOM  •  ERROR', color: COLORS.amber, body: 'Absolute error vs 1e-9 on a log axis. Every error is exactly zero, so no positive trace can be drawn—blank is not missing data.' },
  ];
  cards.forEach((card, i) => {
    addBox(slide, { name: `s44-card-${i}`, position: { left: 862, top: card.y, width: 346, height: 116 }, fill: COLORS.panelDark, lineColor: card.color, lineWidth: 1.6 });
    addTextBox(slide, { name: `s44-title-${i}`, position: { left: 880, top: card.y + 12, width: 310, height: 24 }, text: card.label, fontSize: 14.8, color: card.color, bold: true });
    addTextBox(slide, { name: `s44-body-${i}`, position: { left: 880, top: card.y + 42, width: 310, height: 63 }, text: card.body, fontSize: 13.1, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's44-categories', position: { left: 72, top: 584, width: 1136, height: 30 }, text: '1 initialization  •  4 boundary  •  4 nominal  •  2 large magnitude  •  3 fallback  •  5 mode transitions', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.2, fontSize: 13.4, textColor: COLORS.white });
  addBox(slide, { name: 's44-footer', position: { left: 72, top: 619, width: 1136, height: 31 }, text: 'Each row retains 3 row-specific pass fields + the suite-level Timing50HzPass copied to all 19 rows.', fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.2, fontSize: 13.1, textColor: COLORS.dark });
}

// Slide 45 — correct the inherited diagram by showing the callback example and retained assessment as separate lanes.
{
  const slide = presentation.slides.items[44];
  addBox(slide, { name: 's45-banner', position: { left: 72, top: 150, width: 1136, height: 40 }, text: 'TWO SEPARATE EXECUTION PATHS  •  DO NOT DRAW A PIPELINE BETWEEN THEM', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 15, textColor: COLORS.white });

  const lanes = [
    {
      x: 72, color: COLORS.teal, fill: COLORS.tealTint, title: 'CALLBACK EXAMPLE',
      steps: [
        'callback_workflow_example.m',
        'preload calls setup when context is absent',
        'setup creates Dataset/context; preload stores state',
        'postload configures standalone PitchRateLimiter',
        'optional standalone simulation',
      ],
      footer: 'NO HARNESS DRIVER  •  NO ORACLE  •  NO EVIDENCE REPORT',
    },
    {
      x: 660, color: COLORS.green, fill: COLORS.greenTint, title: 'RETAINED LIMITER ASSESSMENT',
      steps: [
        'initialize_training_data.m',
        'create + inject 3 test timeseries',
        'simulate PitchRateLimiter_Harness once',
        'assess outputs + status + time + suite spacing',
        'retain CSV • MAT • HTML • PNG',
      ],
      footer: 'run_pitch_rate_limiter_tests.m OWNS ORACLE + EVIDENCE',
    },
  ];
  lanes.forEach((lane, laneIndex) => {
    addBox(slide, { name: `s45-lane-${laneIndex}`, position: { left: lane.x, top: 211, width: 548, height: 348 }, fill: lane.fill, lineColor: lane.color, lineWidth: 1.8 });
    addTextBox(slide, { name: `s45-lane-title-${laneIndex}`, position: { left: lane.x + 20, top: 226, width: 508, height: 29 }, text: lane.title, fontSize: 17.5, color: lane.color, bold: true, alignment: 'center' });
    lane.steps.forEach((step, stepIndex) => {
      const y = 272 + stepIndex * 48;
      addBox(slide, { name: `s45-step-${laneIndex}-${stepIndex}`, position: { left: lane.x + 30, top: y, width: 488, height: 35 }, text: `${stepIndex + 1}  ${step}`, fill: COLORS.white, lineColor: lane.color, lineWidth: 1, fontSize: 12.8, textColor: COLORS.ink, alignment: 'left', insets: { top: 3, right: 8, bottom: 3, left: 10 } });
      if (stepIndex < lane.steps.length - 1) addTextBox(slide, { name: `s45-arrow-${laneIndex}-${stepIndex}`, position: { left: lane.x + 254, top: y + 33, width: 40, height: 18 }, text: '↓', fontSize: 14, color: lane.color, bold: true, alignment: 'center', insets: { top: 0, right: 0, bottom: 0, left: 0 } });
    });
    addTextBox(slide, { name: `s45-lane-footer-${laneIndex}`, position: { left: lane.x + 22, top: 522, width: 504, height: 25 }, text: lane.footer, fontSize: 12.2, color: lane.color, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's45-distinction', position: { left: 72, top: 584, width: 1136, height: 56 }, text: 'KEY DISTINCTION  •  callback_workflow_example.m never invokes run_pitch_rate_limiter_tests.m', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.4, fontSize: 15.2, textColor: COLORS.dark });
}

// Slide 46 — controlled definitions and five-element bus.
{
  const slide = presentation.slides.items[45];
  addBox(slide, { name: 's46-count', position: { left: 72, top: 148, width: 1136, height: 38 }, text: '31 DESIGN DATA ENTRIES  •  26 Simulink.Parameter  •  4 Simulink.Signal  •  1 Simulink.Bus', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 15, textColor: COLORS.white });
  addBox(slide, { name: 's46-params', position: { left: 72, top: 205, width: 548, height: 360 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.6 });
  addTextBox(slide, { name: 's46-params-title', position: { left: 94, top: 220, width: 504, height: 28 }, text: 'REPRESENTATIVE SHARED DEFINITIONS', fontSize: 17, color: COLORS.teal, bold: true, alignment: 'center' });
  const params = [
    ['Sample_time', '0.02 s', '50 Hz base rate'],
    ['q_limit_normal', '12 deg/s', 'inclusive magnitude limit'],
    ['q_fallback_command', '0 deg/s', 'disabled / invalid fallback'],
    ['pitch_Kp / pitch_Ki', '0.6 (1) / 0.025 (1/s)', 'feedback-controller gains'],
    ['actuator_limit_deg', '20 deg', 'illustrative command limit'],
    ['normal_mode_code', 'uint8(2)', 'ENGAGED training code'],
  ];
  params.forEach((p, i) => {
    const y = 263 + i * 47;
    addTextBox(slide, { name: `s46-param-name-${i}`, position: { left: 100, top: y, width: 215, height: 24 }, text: p[0], fontSize: 14, color: COLORS.ink, bold: true, typeface: 'Consolas' });
    addTextBox(slide, { name: `s46-param-value-${i}`, position: { left: 318, top: y, width: 130, height: 24 }, text: p[1], fontSize: 13.5, color: COLORS.teal, bold: true });
    addTextBox(slide, { name: `s46-param-desc-${i}`, position: { left: 446, top: y, width: 150, height: 24 }, text: p[2], fontSize: 12.7, color: COLORS.body, bold: true });
  });
  addBox(slide, { name: 's46-bus', position: { left: 660, top: 205, width: 548, height: 360 }, fill: COLORS.blueTint, lineColor: COLORS.blue, lineWidth: 1.6 });
  addTextBox(slide, { name: 's46-bus-title', position: { left: 682, top: 220, width: 504, height: 28 }, text: 'FlightControlBus  •  FIVE SCALAR ELEMENTS', fontSize: 17, color: COLORS.blue, bold: true, alignment: 'center' });
  const bus = [
    ['q_rate', 'double • deg/s', 'measured pitch rate'],
    ['pitch_angle', 'double • deg', 'measured pitch attitude'],
    ['mach', 'double • 1', 'illustrative Mach number'],
    ['air_data_valid', 'boolean • 1', 'validity flag'],
    ['mode', 'uint8 • 1', '0 OFF • 1 ARMED • 2 ENGAGED • 3 DEGRADED'],
  ];
  bus.forEach((b, i) => {
    const y = 263 + i * 56;
    addBox(slide, { name: `s46-bus-row-${i}`, position: { left: 682, top: y, width: 504, height: 45 }, fill: COLORS.white, lineColor: '#B8CCE8', lineWidth: 1, geometry: 'rect' });
    addTextBox(slide, { name: `s46-bus-name-${i}`, position: { left: 694, top: y + 4, width: 150, height: 20 }, text: b[0], fontSize: 13.6, color: COLORS.ink, bold: true, typeface: 'Consolas' });
    addTextBox(slide, { name: `s46-bus-meta-${i}`, position: { left: 846, top: y + 4, width: 135, height: 20 }, text: b[1], fontSize: 12.8, color: COLORS.blue, bold: true });
    addTextBox(slide, { name: `s46-bus-desc-${i}`, position: { left: 694, top: y + 23, width: 480, height: 17 }, text: b[2], fontSize: 11.9, color: COLORS.body, bold: true });
  });
  addBox(slide, { name: 's46-next', position: { left: 72, top: 588, width: 1136, height: 52 }, text: 'WHAT IS DEFINED HERE  →  HOW TO OPEN AND QUERY IT ON THE NEXT SLIDE', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 15, textColor: COLORS.dark });
}

// Slide 47 — authentic Model Explorer view and access workflow.
{
  const slide = presentation.slides.items[46];
  addBox(slide, { name: 's47-frame', position: { left: 64, top: 146, width: 770, height: 470 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.3, geometry: 'rect' });
  await addImage(slide, DICTIONARY_IMAGE, { left: 72, top: 154, width: 754, height: 454 }, 'Authentic MATLAB Model Explorer view of FCS_Data.sldd with FlightControlBus selected and five bus elements visible');
  addBox(slide, { name: 's47-steps', position: { left: 858, top: 146, width: 350, height: 470 }, fill: COLORS.white, lineColor: COLORS.teal, lineWidth: 1.6 });
  addTextBox(slide, { name: 's47-steps-title', position: { left: 878, top: 162, width: 310, height: 26 }, text: 'HOW TO ACCESS IT', fontSize: 17, color: COLORS.teal, bold: true, alignment: 'center' });
  const steps = [
    ['1  INITIALIZE', 'add scripts, models, data\nrun initialize_training_data(projectRoot)'],
    ['2  GUI', 'open data/FCS_Data.sldd\nModel Explorer → Design Data\nselect FlightControlBus'],
    ['3  MATLAB API', "dd = Simulink.data.dictionary.open( ...\n  'data/FCS_Data.sldd');\nsec = getSection(dd,'Design Data');"],
    ['4  REVIEW', 'results/FCS_DataDictionary_Inventory.csv\nresults/FlightControlBus_Inventory.csv'],
  ];
  steps.forEach((s, i) => {
    const y = 203 + i * 92;
    addTextBox(slide, { name: `s47-step-title-${i}`, position: { left: 878, top: y, width: 310, height: 22 }, text: s[0], fontSize: 13.4, color: i === 2 ? COLORS.blue : COLORS.teal, bold: true });
    addTextBox(slide, { name: `s47-step-body-${i}`, position: { left: 878, top: y + 25, width: 310, height: 61 }, text: s[1], fontSize: i === 2 ? 11.5 : 11.8, color: COLORS.body, bold: true, typeface: i === 2 ? 'Consolas' : 'Aptos', verticalAlignment: 'top', insets: { top: 1, right: 1, bottom: 1, left: 1 } });
  });
  addBox(slide, { name: 's47-caveat', position: { left: 72, top: 623, width: 1136, height: 27 }, text: 'INSPECTION VIEW  •  initialization writes/restores managed classroom entries; experiment only in an authorized copy', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.1, fontSize: 12.4, textColor: COLORS.dark });
}

// Slide 52 — four scopes, kept separate.
{
  const slide = presentation.slides.items[51];
  const cards = [
    ['8 / 8', 'DELIVERED MODELS', 'updated / compiled', COLORS.teal],
    ['19 / 19', 'ASSESSED SAMPLES', '3 row checks + suite timing', COLORS.green],
    ['24 / 24', 'REQUIRED EXPORTS', 'validator-defined files', COLORS.blue],
    ['5 / 5', 'GRT MODELS BUILT', 'top standalone + four refs', COLORS.amber],
  ];
  cards.forEach((c, i) => {
    const x = 72 + i * 290;
    addBox(slide, { name: `s52-card-${i}`, position: { left: x, top: 166, width: 266, height: 260 }, fill: COLORS.panelDark, lineColor: c[3], lineWidth: 2 });
    addTextBox(slide, { name: `s52-value-${i}`, position: { left: x + 18, top: 190, width: 230, height: 70 }, text: c[0], fontSize: 34, color: c[3], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s52-label-${i}`, position: { left: x + 18, top: 273, width: 230, height: 50 }, text: c[1], fontSize: 15.2, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s52-sub-${i}`, position: { left: x + 18, top: 335, width: 230, height: 50 }, text: c[2], fontSize: 13.2, color: '#CFE3EC', bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's52-modelset', position: { left: 72, top: 454, width: 1136, height: 86 }, text: 'VALIDATION RECHECK  •  2026-08-27 10:05  •  MATLAB R2023b Update 8\nUpdate warnings accepted only for student-license Accelerator → Normal fallback in the architecture and harness.', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 14.5, textColor: COLORS.white });
  addBox(slide, { name: 's52-separate', position: { left: 72, top: 565, width: 1136, height: 74 }, text: 'KEEP THE SCOPES SEPARATE\n5/5 build evidence is not part of 24/24 exports • 8/8 update does not mean eight files edited • executable built, not run', fill: COLORS.navy, lineColor: COLORS.amber, lineWidth: 1.4, fontSize: 14.4, textColor: COLORS.white });
}

// Slide 53 — evidence boundary after adding a real GRT build.
{
  const slide = presentation.slides.items[52];
  const slideTitle = findChrome(slide).title;
  setText(slideTitle, 'Demonstrated evidence is narrower than certification evidence', {
    fontSize: 33, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'middle',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  addBox(slide, { name: 's53-does', position: { left: 72, top: 155, width: 542, height: 421 }, fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.8 });
  addBox(slide, { name: 's53-does-not', position: { left: 666, top: 155, width: 542, height: 421 }, fill: COLORS.redTint, lineColor: COLORS.red, lineWidth: 1.8 });
  addTextBox(slide, { name: 's53-does-title', position: { left: 96, top: 174, width: 494, height: 32 }, text: 'THIS PACKAGE DEMONSTRATES', fontSize: 18.5, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's53-does-body', position: { left: 102, top: 218, width: 482, height: 329 }, text: '✓ current saved models update / compile\n✓ standalone desktop MIL behavior\n✓ model-reference integration structure\n✓ scripted limiter harness assessment\n✓ CSV + script + path + result associations\n✓ one saved SDI run, view, and session\n✓ retained CSV, MAT, HTML, PNG, and exports\n✓ controlled GRT build: 5/5 models built', fontSize: 15.3, color: COLORS.ink, bold: true, verticalAlignment: 'top' });
  addTextBox(slide, { name: 's53-does-not-title', position: { left: 690, top: 174, width: 494, height: 32 }, text: 'THIS PACKAGE DOES NOT CLAIM', fontSize: 18.5, color: COLORS.red, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's53-does-not-body', position: { left: 696, top: 218, width: 482, height: 329 }, text: '× production aircraft data or approved baseline\n× live Simulink Requirements links\n× Simulink Test / Test Manager suite\n× production / embedded-airborne code approval\n× generated-code verification or executable verification\n× SIL, PIL, HIL, bench, or system integration\n× certification approval\n× automatic compliance from a model or pipeline', fontSize: 15.3, color: COLORS.ink, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's53-footer', position: { left: 72, top: 596, width: 1136, height: 45 }, text: 'Exactly two .mldatx files are retained, and both are Simulation Data Inspector artifacts. The GRT executable was built—not executed.', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 13.8, textColor: COLORS.dark });
}

// Slide 55 — closing repeatable chain.
{
  const slide = presentation.slides.items[54];
  addTextBox(slide, { name: 's55-left-title', position: { left: 86, top: 158, width: 490, height: 30 }, text: 'WHAT TO REMEMBER', fontSize: 17, color: COLORS.teal, bold: true });
  addTextBox(slide, { name: 's55-left-body', position: { left: 82, top: 208, width: 540, height: 318 }, text: 'MODEL ROLE\nchoose the top level that matches the task\n\nACTION\nupdate, run, build, and test are different\n\nINPUTS + CONFIGURATION\nscript, dictionary, bus, settings, and timeseries are evidence context\n\nRESULTS\nread the plots and row-level checks together\n\nASSURANCE\nname what is retained and what remains future', fontSize: 16.2, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  addLine(slide, { name: 's55-divider', left: 660, top: 158, width: 0, height: 390, color: COLORS.slate, lineWidth: 1.5 });
  addTextBox(slide, { name: 's55-right-title', position: { left: 720, top: 158, width: 430, height: 30 }, text: 'FIRST-WEEK CHECKLIST', fontSize: 17, color: COLORS.teal, bold: true });
  const items = [
    '01  initialize folders + open the correct top level',
    '02  Ctrl+D the harness; run the scripted assessment',
    '03  inspect the retained top-level build tree + generated C',
    '04  explain one SDI transient across all three plots',
    '05  locate the three harness inputs and their source script',
    '06  open FCS_Data.sldd and inspect FlightControlBus',
    '07  explain all three 19-case result panels + stored pass fields',
    '08  trace one requirement and name each open assurance gate',
  ];
  items.forEach((item, i) => {
    const y = 208 + i * 43;
    addBox(slide, { name: `s55-item-${i}`, position: { left: 720, top: y, width: 460, height: 34 }, text: item, fill: COLORS.panelDark, lineColor: i < 7 ? COLORS.teal : COLORS.amber, lineWidth: 1, fontSize: 13.0, textColor: COLORS.white, alignment: 'left', insets: { top: 3, right: 8, bottom: 3, left: 10 } });
  });
  addBox(slide, { name: 's55-baseline', position: { left: 130, top: 590, width: 1020, height: 58 }, text: 'VERIFIED STARTING POINT  •  8/8 updates  •  19/19 assessed samples  •  24/24 exports  •  5/5 GRT models built', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 15.2, textColor: COLORS.white });
}

for (const [slideNumber, value] of notes.entries()) {
  const slide = presentation.slides.items[slideNumber - 1];
  slide.speakerNotes.textFrame.setText(value);
  slide.speakerNotes.setVisible(true);
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPath);

await fs.mkdir(renderDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const padded = String(index + 1).padStart(2, '0');
  const png = await presentation.export({ slide, format: 'png', scale: 2 });
  await fs.writeFile(path.join(renderDir, `final-slide-${padded}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `final-slide-${padded}.layout.json`), await layout.text(), 'utf8');
}
const montage = await presentation.export({ format: 'webp', montage: true, scale: 0.5 });
await fs.writeFile(path.join(buildDir, 'final-deck-montage.webp'), new Uint8Array(await montage.arrayBuffer()));

await fs.writeFile(path.join(buildDir, 'authoring-summary.json'), `${JSON.stringify({
  outputPath,
  slideCount: presentation.slides.items.length,
  sourceSlidesPreserved: 48,
  insertedSlides: [2, 3, 30, 32, 34, 44, 47],
  revisedSlides: [5, 10, 29, 31, 33, 41, 43, 45, 46, 52, 53, 54, 55],
  visibleNotes: presentation.slides.items.filter((slide) => slide.speakerNotes.isVisible()).length,
  authenticAssets: [HARNESS_IMAGE, SDI_IMAGE, REPORT_IMAGE, DICTIONARY_IMAGE, BUILD_LOG, GENERATED_C],
}, null, 2)}\n`, 'utf8');

await fs.writeFile(path.join(buildDir, 'source-notes.txt'), [
  'Authentic local evidence: fresh validation_summary.txt; controlled top-level GRT build log/tree/source/report; harness model and test driver; SDI screenshot/session/view; limiter result CSV/MAT/HTML/PNG; FCS_Data.sldd and retained inventories.',
  'Authentic UI evidence: user-provided Signal and Model Settings screenshots inherited from v6; Model Explorer capture created read-only for v7.',
  'Official external sources in notes are MathWorks, FAA, and NASA only.',
  'Model Advisor, Polyspace, SIL/PIL/HIL, production-code approval, and RCF sign-off remain explicitly unexecuted or unsupplied.',
  '',
].join('\n'), 'utf8');

console.log(`OUTPUT_PPTX=${outputPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`VISIBLE_NOTES=${presentation.slides.items.filter((slide) => slide.speakerNotes.isVisible()).length}`);
