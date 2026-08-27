import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(buildDir));
const starterPptxPath = path.join(buildDir, 'template-starter-frame.pptx');
const outputPptxPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v6.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');
const map = JSON.parse(await fs.readFile(path.join(buildDir, 'template-frame-map.json'), 'utf8'));
const sourceByOutput = map.outputSlides.map((entry) => entry.sourceSlide);

const SIGNAL_IMAGE = 'C:\\Users\\Tyler\\AppData\\Local\\Temp\\codex-clipboard-e5d21118-9dad-4a75-82a9-2a5160d3f802.png';
const SETTINGS_IMAGE = 'C:\\Users\\Tyler\\AppData\\Local\\Temp\\codex-clipboard-d9e899b5-6682-46cb-a779-dad318695522.png';

const COLORS = {
  bg: '#F4F8FB', ink: '#0B1F33', body: '#17324A', muted: '#5D7487', rule: '#C9D8E3',
  navy: '#0B2438', dark: '#071521', panelDark: '#0C2133', blue: '#2D6CDF', blueTint: '#E2ECFF',
  teal: '#20B7C5', tealTint: '#DFF6F8', amber: '#E9A23B', amberTint: '#FFF0D7',
  green: '#2CA56F', greenTint: '#E2F4EA', red: '#D75A64', redTint: '#FBE7E9',
  white: '#FFFFFF', slate: '#7D91A0', pale: '#EEF4F8',
};

const darkSourceSlides = new Set([1, 3, 8, 25, 30, 31, 33, 36, 37, 39, 40, 42]);
const insertedMeta = new Map([
  [8,  ['Log signals for evidence; reserve test points for required observability', '01 • HANDS-ON DEMO']],
  [9,  ['Check the active model settings before update, simulation, or build', '01 • HANDS-ON DEMO']],
  [10, ['Model Advisor checks the selected component against chosen rules', '01 • HANDS-ON DEMO']],
  [11, ['Placeholders: Bug Finder screens code; Code Prover deepens proof', '01 • HANDS-ON DEMO']],
  [28, ['In the harness, Ctrl+D validates the diagram; Ctrl+B crosses into build', '02 • HARNESS DEMO']],
  [47, ['RCF closes the model with independent verification and sign-off', '08 • COMPLETION & SIGN-OFF']],
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
      typeface: 'Aptos', fontSize: style.fontSize ?? 18, color: style.color ?? COLORS.ink,
      bold: style.bold ?? false, alignment: style.alignment ?? 'left',
      verticalAlignment: style.verticalAlignment ?? 'middle',
      insets: style.insets ?? { top: 3, right: 5, bottom: 3, left: 5 },
      wrap: style.wrap ?? 'square', autoFit: style.autoFit ?? 'none',
    };
  }
  return shape;
}

function addTextBox(slide, { name, position, text, fontSize = 18, color = COLORS.ink, bold = false,
  alignment = 'left', verticalAlignment = 'middle', insets = { top: 3, right: 5, bottom: 3, left: 5 },
  wrap = 'square', autoFit = 'none' }) {
  const shape = slide.shapes.add({ geometry: 'textbox', name, position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  setText(shape, text, { fontSize, color, bold, alignment, verticalAlignment, insets, wrap, autoFit });
  return shape;
}

function addBox(slide, { name, position, text = '', fill = COLORS.white, lineColor = COLORS.rule, lineWidth = 1.5,
  fontSize = 18, textColor = COLORS.ink, bold = true, alignment = 'center', verticalAlignment = 'middle',
  insets = { top: 5, right: 9, bottom: 5, left: 9 }, geometry = 'roundRect' }) {
  const shape = slide.shapes.add({ geometry, name, position, fill, line: { style: 'solid', fill: lineColor, width: lineWidth }, borderRadius: 'rounded-xl' });
  if (text) setText(shape, text, { fontSize, color: textColor, bold, alignment, verticalAlignment, insets, wrap: 'square', autoFit: 'none' });
  return shape;
}

function addLine(slide, { name, left, top, width, height = 0, color = COLORS.rule, lineWidth = 2 }) {
  return slide.shapes.add({ geometry: 'line', name, position: { left, top, width, height }, fill: 'none', line: { style: 'solid', fill: color, width: lineWidth } });
}

function isChrome(shape) {
  const name = String(shape.name || '');
  const value = textValue(shape).trim();
  const position = shape.position || {};
  return name.startsWith('section-') || name.startsWith('title-') ||
    (name.startsWith('line-') && (position.top ?? 999) < 145) ||
    value === 'AVIATION CONTROLS ENGINEERING ONBOARDING' ||
    (/^\d{2}$/.test(value) && (position.top ?? 0) > 640) ||
    /page-\d+/.test(name);
}

function clearContent(slide) {
  for (const shape of [...slide.shapes.items]) if (!isChrome(shape)) shape.delete();
  for (const image of [...slide.images.items]) if (typeof image.delete === 'function') image.delete();
}

function findChrome(slide) {
  const section = findShape(slide, (shape) => String(shape.name || '').startsWith('section-'), 'section shape', false);
  const title = findShape(slide, (shape) => String(shape.name || '').startsWith('title-'), 'title shape', false);
  const divider = findShape(slide, (shape) => String(shape.name || '').startsWith('line-') && (shape.position?.top ?? 999) < 145, 'title divider', false);
  const footer = findShape(slide, (shape) => textValue(shape).trim() === 'AVIATION CONTROLS ENGINEERING ONBOARDING', 'footer', false);
  const page = findShape(slide, (shape) => /^\d{2}$/.test(textValue(shape).trim()) && (shape.position?.top ?? 0) > 640, 'page number', false) ||
    findShape(slide, (shape) => /page-\d+/.test(String(shape.name || '')), 'page number', false);
  return { section, title, divider, footer, page };
}

function styleTitle(shape, text, dark) {
  const size = text.length > 72 ? 34 : text.length > 62 ? 36.5 : 40;
  shape.position = { left: 72, top: 66, width: 1136, height: 56 };
  setText(shape, text, { fontSize: size, color: dark ? COLORS.white : COLORS.ink, bold: true,
    alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
}

function updatePageNumber(slide, slideNumber) {
  const { page } = findChrome(slide);
  if (!page) throw new Error(`Missing page number on slide ${slideNumber}`);
  const dark = darkSourceSlides.has(sourceByOutput[slideNumber - 1]);
  page.position = { left: 1156, top: 676, width: 52, height: 22 };
  setText(page, String(slideNumber).padStart(2, '0'), { fontSize: 14, color: dark ? '#70DCE5' : COLORS.teal,
    bold: true, alignment: 'right', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 }, wrap: 'none' });
}

function setInsertedChrome(slide, slideNumber) {
  const [titleText, sectionText] = insertedMeta.get(slideNumber);
  const dark = darkSourceSlides.has(sourceByOutput[slideNumber - 1]);
  const chrome = findChrome(slide);
  if (!chrome.section || !chrome.title || !chrome.footer || !chrome.page) throw new Error(`Missing chrome on inserted slide ${slideNumber}`);
  chrome.section.position = { left: 72, top: 30, width: 760, height: 26 };
  setText(chrome.section, sectionText, { fontSize: 14.5, color: COLORS.teal, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  styleTitle(chrome.title, titleText, dark);
  if (chrome.divider) chrome.divider.position = { left: 72, top: 127, width: 1136, height: 0 };
  chrome.footer.position = { left: 72, top: 678, width: 550, height: 20 };
  setText(chrome.footer, 'AVIATION CONTROLS ENGINEERING ONBOARDING', { fontSize: 11.5, color: dark ? COLORS.slate : COLORS.slate, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 } });
  updatePageNumber(slide, slideNumber);
}

async function imageBytes(filePath) { return new Uint8Array(await fs.readFile(filePath)); }
async function writeBlob(filePath, blob) { await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer())); }
function contentType(filePath) { return /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png'; }

async function addImage(slide, filePath, position, alt) {
  return slide.images.add({ blob: await imageBytes(filePath), contentType: contentType(filePath), alt, fit: 'contain', position });
}

function noteText({ timing, talkTrack, caveats, sources }) {
  return `Timing: ${timing}\n\n${talkTrack}\n\nCaveats\n${caveats.map((item) => `- ${item}`).join('\n')}\n\n[Sources]\n${sources.map((item) => `- ${item}`).join('\n')}`;
}

const newNotes = new Map([
  [8, noteText({
    timing: '4 minutes plus live demo',
    talkTrack: 'Select a signal line in AircraftFeedbackControlLoop, open the contextual Signal tab, choose Log Signals, run the model, and open View in Data Inspector. Use signal logging when the time history itself is evidence or must be compared across runs. Use a test point only when an internal signal must remain observable despite model optimizations—for example, a planned debug, test, or generated-code observability need. A signal may be both logged and a test point, but the settings are independent. The saved package currently has signal logging enabled for all eight models, 52 ports marked for logging, and zero ports marked as test points.',
    caveats: [
      'Marking a test point does not enable Dataset signal logging.',
      'Test points can inhibit optimizations such as signal-storage reuse and block reduction, so use them selectively and review them as controlled design settings.',
      'The green numbered ovals in the supplied screenshot are model Outport blocks; the blue line indicators show logged signals.',
    ],
    sources: [
      'scripts/create_training_models.m',
      'scripts/training_callback_postload.m',
      'https://www.mathworks.com/help/simulink/gui/signallogging.html',
      'https://www.mathworks.com/help/simulink/ug/working-with-test-points.html',
    ],
  })],
  [9, noteText({
    timing: '4 minutes plus live demo',
    talkTrack: 'Open the active Configuration Parameters dialog with Ctrl+E or Modeling > Model Settings. Confirm that you are editing the intended top model or referenced model, then inspect the panes that control the task: Solver, Data Import/Export and logging, Diagnostics, Hardware Implementation, Model Referencing, and Code Generation when build output is planned. In the supplied capture, AircraftFeedbackControlLoop is the active configuration, the stop time is 12 seconds, and the solver is fixed-step and discrete. After an intentional change, record the rationale, apply the setting, press Ctrl+D, rerun the affected simulation or assessments, and retain the resulting evidence.',
    caveats: [
      'Opening the dialog is not itself a verification result.',
      'The screenshot does not expose the fixed-step-size field because Solver details is collapsed; results/SimulationConfiguration.csv records the fixed step as Sample_time.',
      'For a referenced model, use the Model Settings arrow and select the referenced-model settings or open that model as the top model.',
    ],
    sources: [
      'results/SimulationConfiguration.csv',
      'scripts/create_training_models.m',
      'https://www.mathworks.com/help/simulink/ug/configuration-parameters-dialog-box-overview.html',
      'https://www.mathworks.com/help/simulink/gui/solver-pane.html',
    ],
  })],
  [10, noteText({
    timing: '4 minutes',
    talkTrack: 'Demonstrate the Model Advisor workflow on the exact component in scope: Modeling > Model Advisor, choose the model or subsystem, select a named check set by product or task, run the checks, review every result status, address findings and exclusions, rerun, then save the report with the model baseline and check identifiers. For a model-reference hierarchy, analyze referenced models explicitly before the top model when the selected checks require it.',
    caveats: [
      'This slide illustrates the workflow; no Model Advisor configuration, report, or result artifact was found in the training package.',
      'Unless a check documents otherwise, Model Advisor does not analyze inside Model blocks; referenced models must be selected explicitly.',
      'A successful run call means the analysis ran, not that every check passed. Model Advisor does not certify the component or replace requirements, tests, independent review, or approved plans.',
    ],
    sources: [
      'results/MATLAB_ProductInventory.csv',
      'https://www.mathworks.com/help/simulink/ug/select-and-run-model-advisor-checks.html',
      'https://www.mathworks.com/help/simulink/slref/simulink.modeladvisor.runcheck.html',
    ],
  })],
  [11, noteText({
    timing: '3 minutes',
    talkTrack: 'Treat these as future code-analysis gates after code exists and the target, compiler, options, assumptions, and reporting process are controlled. Bug Finder performs a faster static scan for reported coding defects, security issues, rule violations, and metrics. Code Prover performs deeper formal static analysis and attempts to prove the absence of selected run-time errors over the analyzed code and paths. Retain the configuration, findings, dispositions, report, code baseline, and trace links.',
    caveats: [
      'These are placeholders only: neither Polyspace product nor any Polyspace result or report appears in the package inventory.',
      'Bug Finder does not prove the absence of all defects. Code Prover conclusions are limited to the analyzed code, configuration, assumptions, and checks.',
      'Neither tool directly proves model requirements compliance, test adequacy, certification approval, SIL, PIL, or HIL execution.',
    ],
    sources: [
      'results/MATLAB_ProductInventory.csv',
      'https://www.mathworks.com/help/bugfinder/',
      'https://www.mathworks.com/help/bugfinder/gs/use-bug-finder-and-code-prover.html',
      'https://www.mathworks.com/help/codeprover/getting-started-with-polyspace-code-prover.html',
    ],
  })],
  [28, noteText({
    timing: '4 minutes plus harness demonstration',
    talkTrack: 'Open PitchRateLimiter_Harness and press Ctrl+D before executing the assessment driver. Update Model evaluates parameters, propagates signal attributes and sample times, resolves referenced interfaces, and exposes update-time errors without advancing simulation time. The package validator used the equivalent SimulationCommand update and retained an 8/8 result. Ctrl+B is a separate code-generation build action: use it only after update succeeds and code generation is part of the approved task with the active target and toolchain configured. The repository contains GRT model-reference build intermediates for four child models, but no retained build report or evidence that a particular Ctrl+B action produced them.',
    caveats: [
      '8/8 means all delivered models accepted update/compile; it does not mean eight files were edited.',
      'A build result depends on the active code-generation configuration and toolchain. Generated artifacts are not production-code approval.',
      'Simulink Coder is installed; Embedded Coder is unavailable. The retained GRT model-reference files are regeneration by-products, not production airborne software or certification evidence.',
    ],
    sources: [
      'scripts/validate_training_project.m',
      'results/validation_summary.txt',
      'results/model_reference_build/slprj/grt/',
      'results/environment_inventory.txt',
      'https://www.mathworks.com/help/simulink/ug/using-the-sim-command.html',
      'https://www.mathworks.com/help/simulink/ug/summary-of-mouse-and-keyboard-actions.html',
      'https://www.mathworks.com/help/rtw/ug/generating-code-using-simulink-coder.html',
    ],
  })],
  [47, noteText({
    timing: '3 minutes',
    talkTrack: 'Use the project-approved RCF artifact only after the model baseline, allocated system requirements, traceability, executed evidence, findings, and dispositions are complete. The record should identify the baseline and scope, list the requirement and evidence identifiers, identify the independent reviewer and approving authority, document open conditions, and capture the required signatures and dates. Where independence is required, the author should not be the sole independent verifier of their own work.',
    caveats: [
      'RCF is a project-defined term here. Do not expand the acronym or invent its authority unless the approved program plan or form defines it.',
      'No RCF, independent-review signature, or approval record was supplied in this training package; this slide is an explicit placeholder.',
      'Passing MIL assessments, Model Advisor checks, or Polyspace findings are evidence inputs; none is a substitute for the required independent review and authorized acceptance.',
    ],
    sources: [
      'results/validation_summary.txt',
      'docs/PitchRateLimiter_Requirements_Traceability.csv',
      'https://www.faa.gov/documentLibrary/media/Order/FAA_Order_8110.49A.pdf',
      'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1032046',
      'https://www.nasa.gov/reference/systems-engineering-handbook/',
    ],
  })],
]);

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPptxPath));
if (presentation.slides.items.length !== 48) throw new Error(`Expected 48 slides, found ${presentation.slides.items.length}`);

for (let index = 0; index < presentation.slides.items.length; index += 1) updatePageNumber(presentation.slides.items[index], index + 1);
for (const slideNumber of insertedMeta.keys()) setInsertedChrome(presentation.slides.items[slideNumber - 1], slideNumber);

// Slide 8 — authentic Signal-tab screenshot plus a practical instrumentation decision.
{
  const slide = presentation.slides.items[7];
  clearContent(slide);
  addBox(slide, { name: 's8-image-frame', position: { left: 64, top: 150, width: 808, height: 456 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.3, geometry: 'rect' });
  await addImage(slide, SIGNAL_IMAGE, { left: 72, top: 158, width: 792, height: 440 }, 'Simulink Signal tab showing Log Signals, Test Point, and View in Data Inspector on AircraftFeedbackControlLoop');
  addBox(slide, { name: 's8-demo-tag', position: { left: 894, top: 151, width: 314, height: 30 }, text: 'DO THIS LIVE', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 14, textColor: COLORS.white });
  addBox(slide, { name: 's8-demo-steps', position: { left: 894, top: 190, width: 314, height: 138 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.4 });
  addTextBox(slide, { name: 's8-demo-steps-title', position: { left: 910, top: 200, width: 282, height: 24 }, text: 'LOG A SIGNAL', fontSize: 16, color: COLORS.teal, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's8-demo-steps-body', position: { left: 910, top: 229, width: 282, height: 88 }, text: '1  Select the signal line\n2  Signal tab > Log Signals\n3  Run the model\n4  View in Data Inspector', fontSize: 15.2, color: COLORS.body, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's8-log-card', position: { left: 894, top: 340, width: 314, height: 126 }, fill: COLORS.blueTint, lineColor: COLORS.blue, lineWidth: 1.4 });
  addTextBox(slide, { name: 's8-log-title', position: { left: 908, top: 350, width: 286, height: 24 }, text: 'LOGGED SIGNAL', fontSize: 16, color: COLORS.blue, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's8-log-body', position: { left: 908, top: 379, width: 286, height: 76 }, text: 'Use for time history, SDI comparisons, regression plots, and retained simulation evidence. Dataset data commonly appears in logsout.', fontSize: 14.2, color: COLORS.body, bold: true, alignment: 'left', verticalAlignment: 'top' });
  addBox(slide, { name: 's8-test-card', position: { left: 894, top: 478, width: 314, height: 128 }, fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.4 });
  addTextBox(slide, { name: 's8-test-title', position: { left: 908, top: 488, width: 286, height: 24 }, text: 'TEST POINT', fontSize: 16, color: COLORS.amber, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's8-test-body', position: { left: 908, top: 517, width: 286, height: 78 }, text: 'Use when an internal signal must remain observable despite optimization. It does not enable signal logging; control and review it separately.', fontSize: 14.2, color: COLORS.body, bold: true, alignment: 'left', verticalAlignment: 'top' });
  addBox(slide, { name: 's8-status', position: { left: 72, top: 618, width: 1136, height: 30 }, text: 'SAVED PACKAGE  •  signal logging ON in 8/8 models  •  52 logged ports  •  0 test points', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.2, fontSize: 14.5, textColor: COLORS.white });
}

// Slide 9 — authentic Configuration Parameters screenshot and controlled-change loop.
{
  const slide = presentation.slides.items[8];
  clearContent(slide);
  addBox(slide, { name: 's9-image-frame', position: { left: 64, top: 150, width: 708, height: 460 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.3, geometry: 'rect' });
  await addImage(slide, SETTINGS_IMAGE, { left: 72, top: 158, width: 692, height: 444 }, 'Configuration Parameters for the active AircraftFeedbackControlLoop configuration showing fixed-step discrete solver');
  addBox(slide, { name: 's9-open-tag', position: { left: 794, top: 151, width: 414, height: 32 }, text: 'CTRL+E  •  MODELING > MODEL SETTINGS', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 14, textColor: COLORS.white });
  const cards = [
    ['1  CHECK THE ACTIVE SET','Confirm the intended top model or referenced model. The dialog title should identify the active configuration.'],
    ['2  REVIEW TASK-CRITICAL PANES','Solver • logging • diagnostics • hardware • model referencing • simulation target • code generation, when applicable.'],
    ['3  CHANGE UNDER CONTROL','Record rationale → Apply/OK → Ctrl+D → rerun affected simulations and assessments → retain evidence.'],
  ];
  cards.forEach((card, i) => {
    const y = 198 + i * 136;
    const colors = i === 2 ? [COLORS.greenTint, COLORS.green] : [i === 1 ? COLORS.blueTint : COLORS.tealTint, i === 1 ? COLORS.blue : COLORS.teal];
    addBox(slide, { name: `s9-card-${i}`, position: { left: 794, top: y, width: 414, height: 122 }, fill: colors[0], lineColor: colors[1], lineWidth: 1.4 });
    addTextBox(slide, { name: `s9-card-title-${i}`, position: { left: 810, top: y + 10, width: 382, height: 24 }, text: card[0], fontSize: 15.4, color: colors[1], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s9-card-body-${i}`, position: { left: 812, top: y + 40, width: 378, height: 70 }, text: card[1], fontSize: 14.3, color: COLORS.body, bold: true, alignment: 'left', verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's9-evidence', position: { left: 72, top: 620, width: 1136, height: 28 }, text: 'CAPTURED HERE  •  active Configuration  •  stop time 12 s  •  Fixed-step  •  discrete (no continuous states)', fill: COLORS.pale, lineColor: COLORS.blue, lineWidth: 1.2, fontSize: 14.2, textColor: COLORS.ink });
}

// Slide 10 — Model Advisor workflow, explicitly scoped as an unexecuted demonstration.
{
  const slide = presentation.slides.items[9];
  clearContent(slide);
  addBox(slide, { name: 's10-banner', position: { left: 72, top: 150, width: 1136, height: 42 }, text: 'WORKFLOW ILLUSTRATED  •  NO RETAINED MODEL ADVISOR RESULT IN THIS PACKAGE', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.5, fontSize: 16, textColor: COLORS.dark });
  const steps = [
    ['01','SCOPE','Modeling > Model Advisor\nSelect the exact model or subsystem'],
    ['02','SELECT','Choose a named check set\nBy Product or By Task'],
    ['03','RUN','Run Checks\nHonor license and update requirements'],
    ['04','REVIEW','Read every status\nAddress findings and exclusions'],
    ['05','RETAIN','Rerun and save report\nBaseline + check IDs + results'],
  ];
  steps.forEach((step, i) => {
    const x = 72 + i * 234;
    addBox(slide, { name: `s10-step-${i}`, position: { left: x, top: 210, width: 200, height: 156 }, fill: COLORS.panelDark, lineColor: i === 4 ? COLORS.green : COLORS.teal, lineWidth: 1.7 });
    addTextBox(slide, { name: `s10-step-num-${i}`, position: { left: x + 12, top: 222, width: 38, height: 26 }, text: step[0], fontSize: 14, color: COLORS.slate, bold: true });
    addTextBox(slide, { name: `s10-step-title-${i}`, position: { left: x + 20, top: 254, width: 160, height: 28 }, text: step[1], fontSize: 17.5, color: i === 4 ? COLORS.green : '#70DCE5', bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s10-step-body-${i}`, position: { left: x + 16, top: 292, width: 168, height: 60 }, text: step[2], fontSize: 13.6, color: '#E7F2F7', bold: true, alignment: 'center', verticalAlignment: 'top' });
    if (i < steps.length - 1) addLine(slide, { name: `s10-link-${i}`, left: x + 200, top: 288, width: 34, color: COLORS.teal, lineWidth: 2.5 });
  });
  addBox(slide, { name: 's10-retain', position: { left: 72, top: 390, width: 548, height: 188 }, fill: '#0C2133', lineColor: COLORS.green, lineWidth: 1.5 });
  addTextBox(slide, { name: 's10-retain-title', position: { left: 92, top: 406, width: 508, height: 28 }, text: 'RETAIN AS CONTROLLED EVIDENCE', fontSize: 17, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's10-retain-body', position: { left: 98, top: 446, width: 496, height: 112 }, text: '• model / subsystem and version\n• selected check configuration and IDs\n• Passed / Failed / Warning / Incomplete results\n• exclusions, fixes, dispositions, and rerun\n• saved report tied to the reviewed baseline', fontSize: 15.2, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's10-limit', position: { left: 660, top: 390, width: 548, height: 188 }, fill: '#0C2133', lineColor: COLORS.red, lineWidth: 1.5 });
  addTextBox(slide, { name: 's10-limit-title', position: { left: 680, top: 406, width: 508, height: 28 }, text: 'DOES NOT, BY ITSELF, PROVE', fontSize: 17, color: COLORS.red, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's10-limit-body', position: { left: 686, top: 446, width: 496, height: 112 }, text: '• requirements are correct and complete\n• all referenced models were analyzed\n• tests and coverage are adequate\n• findings received independent disposition\n• certification or final design approval', fontSize: 15.2, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  addBox(slide, { name: 's10-hierarchy', position: { left: 72, top: 594, width: 1136, height: 48 }, text: 'MODEL REFERENCE NOTE  •  run the intended checks on referenced models explicitly; do not assume the top-model scan enters every Model block.', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 15, textColor: COLORS.dark });
}

// Slide 11 — future Polyspace gates without fabricated execution evidence.
{
  const slide = presentation.slides.items[10];
  clearContent(slide);
  addBox(slide, { name: 's11-banner', position: { left: 72, top: 150, width: 1136, height: 42 }, text: 'FUTURE PLACEHOLDERS  •  NOT EXECUTED  •  NO POLYSPACE PRODUCT OR REPORT IN THIS PACKAGE', fill: COLORS.redTint, lineColor: COLORS.red, lineWidth: 1.5, fontSize: 16, textColor: COLORS.dark });
  const panels = [
    { x: 72, title: 'POLYSPACE BUG FINDER', color: COLORS.blue, tint: COLORS.blueTint, subtitle: 'Fast static scan for reported defects and rule deviations', body: '• probable coding defects and security issues\n• MISRA / CERT / CWE and project-rule findings\n• code metrics and early developer triage\n• review, fix, justify, and retain dispositions\n\nBoundary: finding-oriented; it does not prove that all defects are absent.' },
    { x: 660, title: 'POLYSPACE CODE PROVER', color: COLORS.green, tint: COLORS.greenTint, subtitle: 'Deeper formal analysis for selected run-time error checks', body: '• analyzes control and data flow without executing code\n• attempts proof over the analyzed code and paths\n• green = proven for that check and scope\n• orange = possible / unproven; red = definite\n\nBoundary: conclusions depend on controlled code, configuration, and assumptions.' },
  ];
  panels.forEach((panel, i) => {
    addBox(slide, { name: `s11-panel-${i}`, position: { left: panel.x, top: 210, width: 548, height: 330 }, fill: panel.tint, lineColor: panel.color, lineWidth: 1.8 });
    addTextBox(slide, { name: `s11-title-${i}`, position: { left: panel.x + 24, top: 228, width: 500, height: 32 }, text: panel.title, fontSize: 20, color: panel.color, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s11-sub-${i}`, position: { left: panel.x + 30, top: 269, width: 488, height: 48 }, text: panel.subtitle, fontSize: 16, color: COLORS.ink, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s11-body-${i}`, position: { left: panel.x + 32, top: 326, width: 484, height: 142 }, text: panel.body, fontSize: 15.1, color: COLORS.body, bold: true, verticalAlignment: 'top' });
    addBox(slide, { name: `s11-placeholder-${i}`, position: { left: panel.x + 32, top: 480, width: 484, height: 40 },
      text: `INSERT ${i === 0 ? 'BUG FINDER' : 'CODE PROVER'} RESULT / REPORT HERE`, fill: COLORS.white, lineColor: panel.color, lineWidth: 1.2,
      fontSize: 13.4, textColor: panel.color, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's11-gate', position: { left: 72, top: 558, width: 1136, height: 84 }, fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4 });
  addTextBox(slide, { name: 's11-gate-title', position: { left: 94, top: 568, width: 1092, height: 24 }, text: 'GATE PREREQUISITES', fontSize: 15, color: '#70DCE5', bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's11-gate-body', position: { left: 94, top: 598, width: 1092, height: 34 }, text: 'controlled C/C++ baseline • target/compiler/options • assumptions/stubs • licensed tool/configuration • reviewed findings/report • traceability', fontSize: 14.4, color: COLORS.white, bold: true, alignment: 'center' });
}

// Slide 28 — harness-specific distinction between Update Diagram and Build.
{
  const slide = presentation.slides.items[27];
  clearContent(slide);
  addBox(slide, { name: 's28-banner', position: { left: 72, top: 150, width: 1136, height: 42 }, text: 'HARNESS DECISION POINT  •  UPDATE BEFORE EXECUTION; BUILD ONLY WHEN CODE ARTIFACTS ARE IN SCOPE', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 15.8, textColor: COLORS.dark });
  const cards = [
    { x: 72, key: 'Ctrl+D', title: 'UPDATE MODEL / DIAGRAM', color: COLORS.teal, when: 'After opening the harness and UUT; after parameter, interface, data, or configuration changes; before simulation or assessments.', result: 'Evaluates parameters; propagates types, dimensions, and sample times; resolves references; catches update-time errors. It does not advance simulation time.', retained: 'PASS — package validator retained 8/8 delivered models updated / compiled.' },
    { x: 660, key: 'Ctrl+B', title: 'BUILD MODEL', color: COLORS.amber, when: 'Only after Ctrl+D passes and code generation is part of the planned task with the active target and toolchain configured.', result: 'Starts target-dependent code generation and build. Outputs can include generated source, objects, libraries, executables, and reports depending on settings.', retained: 'GRT model-reference intermediates exist for four child models; no retained build report or production / embedded-code approval claim.' },
  ];
  cards.forEach((card, i) => {
    addBox(slide, { name: `s28-card-${i}`, position: { left: card.x, top: 210, width: 548, height: 342 }, fill: COLORS.panelDark, lineColor: card.color, lineWidth: 2 });
    addTextBox(slide, { name: `s28-key-${i}`, position: { left: card.x + 28, top: 228, width: 492, height: 48 }, text: card.key, fontSize: 34, color: card.color, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s28-title-${i}`, position: { left: card.x + 28, top: 279, width: 492, height: 28 }, text: card.title, fontSize: 16.5, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s28-when-label-${i}`, position: { left: card.x + 28, top: 320, width: 90, height: 22 }, text: 'WHEN', fontSize: 13, color: card.color, bold: true });
    addTextBox(slide, { name: `s28-when-${i}`, position: { left: card.x + 118, top: 316, width: 398, height: 62 }, text: card.when, fontSize: 14.2, color: '#E7F2F7', bold: true, verticalAlignment: 'top' });
    addTextBox(slide, { name: `s28-result-label-${i}`, position: { left: card.x + 28, top: 392, width: 90, height: 22 }, text: 'RESULT', fontSize: 13, color: card.color, bold: true });
    addTextBox(slide, { name: `s28-result-${i}`, position: { left: card.x + 118, top: 388, width: 398, height: 76 }, text: card.result, fontSize: 14.2, color: '#E7F2F7', bold: true, verticalAlignment: 'top' });
    addBox(slide, { name: `s28-retained-${i}`, position: { left: card.x + 28, top: 478, width: 492, height: 58 }, text: card.retained, fill: i === 0 ? COLORS.greenTint : COLORS.amberTint, lineColor: i === 0 ? COLORS.green : COLORS.amber, lineWidth: 1.2, fontSize: 13.4, textColor: COLORS.dark });
  });
  addBox(slide, { name: 's28-sequence', position: { left: 72, top: 572, width: 1136, height: 70 }, text: 'RECOMMENDED HARNESS SEQUENCE  •  Ctrl+D  →  run_pitch_rate_limiter_tests  →  inspect 19/19 retained results\nCtrl+B is a separate optional code-generation gate—not a prerequisite for the desktop MIL assessment.', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 15.2, textColor: COLORS.white });
}

// Slide 47 — project-defined RCF placeholder and independent signature record.
{
  const slide = presentation.slides.items[46];
  clearContent(slide);
  addBox(slide, { name: 's47-banner', position: { left: 72, top: 150, width: 1136, height: 42 }, text: 'PROJECT PLACEHOLDER  •  RCF NOT SUPPLIED OR COMPLETED IN THIS TRAINING PACKAGE', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.5, fontSize: 16, textColor: COLORS.dark });
  addBox(slide, { name: 's47-record', position: { left: 72, top: 208, width: 548, height: 336 }, fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.8 });
  addTextBox(slide, { name: 's47-record-title', position: { left: 94, top: 224, width: 504, height: 28 }, text: 'VERIFICATION RECORD', fontSize: 19, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's47-record-body', position: { left: 100, top: 264, width: 492, height: 260 }, text: 'Model / component:  __________________________\nBaseline / version / checksum:  ________________\nAllocated system requirement IDs:  _____________\nVerification method and acceptance criteria:  ______\nExecuted evidence IDs and results:  ______________\nModel settings / test / build configuration:  _______\nFindings, anomalies, and dispositions:  ____________\nIndependent review scope completed:  ☐ Yes  ☐ No', fontSize: 15.1, color: COLORS.ink, bold: true, verticalAlignment: 'top', insets: { top: 4, right: 7, bottom: 4, left: 7 } });
  addBox(slide, { name: 's47-signoff', position: { left: 660, top: 208, width: 548, height: 336 }, fill: COLORS.blueTint, lineColor: COLORS.blue, lineWidth: 1.8 });
  addTextBox(slide, { name: 's47-signoff-title', position: { left: 682, top: 224, width: 504, height: 28 }, text: 'INDEPENDENT SIGN-OFF', fontSize: 19, color: COLORS.blue, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's47-signoff-body', position: { left: 688, top: 264, width: 492, height: 260 }, text: 'Model owner / author:  ________________________\nSignature / date:  _____________________________\n\nIndependent verifier / organization:  ____________\nSignature / date:  _____________________________\n\nApprover / designated authority:  _________________\nSignature / date:  _____________________________\n\nCompletion status:  ☐ Accepted  ☐ Conditional  ☐ Open\nConditions / open items:  _______________________', fontSize: 15.1, color: COLORS.ink, bold: true, verticalAlignment: 'top', insets: { top: 4, right: 7, bottom: 4, left: 7 } });
  addBox(slide, { name: 's47-exit', position: { left: 72, top: 562, width: 1136, height: 60 }, text: 'EXIT CONDITION  •  controlled model baseline + traceability + executed evidence + resolved findings + required independent signature(s)', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 16, textColor: COLORS.white });
  addTextBox(slide, { name: 's47-caveat', position: { left: 72, top: 628, width: 1136, height: 24 }, text: 'RCF is project-defined: use the approved form and authority; do not invent an acronym expansion or treat this slide as a completed approval record.', fontSize: 12.5, color: COLORS.muted, bold: true, alignment: 'center', verticalAlignment: 'top' });
}

for (const [slideNumber, notes] of newNotes.entries()) {
  const slide = presentation.slides.items[slideNumber - 1];
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(true);
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPptxPath);

await fs.mkdir(renderDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const padded = String(index + 1).padStart(2, '0');
  const png = await presentation.export({ slide, format: 'png', scale: 2 });
  await writeBlob(path.join(renderDir, `final-slide-${padded}.png`), png);
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `final-slide-${padded}.layout.json`), await layout.text(), 'utf8');
}
const montage = await presentation.export({ format: 'webp', montage: true, scale: 0.5 });
await writeBlob(path.join(buildDir, 'final-deck-montage.webp'), montage);

await fs.writeFile(path.join(buildDir, 'authoring-summary.json'), `${JSON.stringify({
  outputPptxPath,
  slideCount: presentation.slides.items.length,
  preservedV5Slides: 42,
  insertedSlides: [8, 9, 10, 11, 28, 47],
  renderedSlides: presentation.slides.items.length,
  visibleNotes: presentation.slides.items.filter((slide) => slide.speakerNotes.isVisible()).length,
  userImages: [SIGNAL_IMAGE, SETTINGS_IMAGE],
}, null, 2)}\n`, 'utf8');

await fs.writeFile(path.join(buildDir, 'source-notes.txt'), [
  'Authentic user captures: Signal-tab logging/test-point screenshot; active Configuration Parameters screenshot.',
  'Authentic local evidence: scripts/validate_training_project.m; results/validation_summary.txt; results/SimulationConfiguration.csv; results/model_reference_build/slprj/grt/.',
  'Model Advisor, Polyspace, and RCF slides are explicitly marked as workflow/placeholders because no retained execution or approval artifacts exist.',
  'Official sources in speaker notes are limited to MathWorks, FAA, and NASA.',
  '',
].join('\n'), 'utf8');

console.log(`OUTPUT_PPTX=${outputPptxPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`RENDER_COUNT=${presentation.slides.items.length}`);
