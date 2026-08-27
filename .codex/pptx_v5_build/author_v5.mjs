import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(buildDir));
const starterPptxPath = path.join(buildDir, 'template-starter-frame.pptx');
const outputPptxPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v5.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');

const COLORS = {
  bg: '#F4F8FB', ink: '#0B1F33', body: '#17324A', muted: '#5D7487', rule: '#C9D8E3',
  navy: '#0B2438', dark: '#071521', blue: '#2D6CDF', blueTint: '#E2ECFF',
  teal: '#20B7C5', tealTint: '#DFF6F8', amber: '#E9A23B', amberTint: '#FFF0D7',
  green: '#2CA56F', greenTint: '#E2F4EA', red: '#D75A64', redTint: '#FBE7E9',
  white: '#FFFFFF', slate: '#7D91A0', pale: '#EEF4F8',
};

const sourceByOutput = [1,2,3,4,5,6,7,8,9,9,9,9,9,9,11,27,27,20,20,27,9,27,23,10,12,13,14,15,18,19,16,24,25,26,21,22,28,29,30,32,31,33];
const darkSourceSlides = new Set([1,3,8,12,16,17,19,22,25,28,30,32,33]);

const meta = [
  ['Simulink in the Aerospace Controls Lifecycle','NEW AVIATION CONTROLS ENGINEER ONBOARDING'],
  ['The executable model is the engineering hub','ORIENTATION'],
  ['Your first session: orient, execute, inspect, trace','ORIENTATION'],
  ['MATLAB computes; Simulink exposes behavior','01 • FIRST SESSION'],
  ['Start in the repository, then distinguish every action','01 • FIRST SESSION'],
  ['The toolstrip tells you where each action lives','01 • FIRST SESSION'],
  ['Turn model displays on—and off—for focus','01 • FIRST SESSION'],
  ['The current job determines which model is top level','02 • MODEL HIERARCHY & GALLERY'],
  ['AircraftFeedbackControlLoop closes the training loop','02 • MODEL HIERARCHY & GALLERY'],
  ['Pitch Controller PI turns tracking error into demand','02 • MODEL HIERARCHY & GALLERY'],
  ['Actuator Dynamics converts demand into position','02 • MODEL HIERARCHY & GALLERY'],
  ['Longitudinal dynamics turn actuator motion into response','02 • MODEL HIERARCHY & GALLERY'],
  ['Sensor Processing Lag exposes measurement dynamics','02 • MODEL HIERARCHY & GALLERY'],
  ['AutopilotModeLogic wraps mode behavior in explicit interfaces','02 • MODEL HIERARCHY & GALLERY'],
  ['Stateflow guards OFF, ARMED, ENGAGED, and DEGRADED','02 • MODEL HIERARCHY & GALLERY'],
  ['ReferencedFlightControlArchitecture is the integration top level','02 • MODEL HIERARCHY & GALLERY'],
  ['SensorProcessingRef owns the referenced sensor contract','02 • MODEL HIERARCHY & GALLERY'],
  ['PitchRateLimiter is a separately managed component','02 • MODEL HIERARCHY & GALLERY'],
  ['Pitch Rate Limiter Logic clamps magnitude and controls fallback','02 • MODEL HIERARCHY & GALLERY'],
  ['PitchControllerRef defines the referenced controller boundary','02 • MODEL HIERARCHY & GALLERY'],
  ['Pitch Rate PI implements the referenced control law','02 • MODEL HIERARCHY & GALLERY'],
  ['ActuatorCommandRef owns command limiting and status','02 • MODEL HIERARCHY & GALLERY'],
  ['PitchRateLimiter_Harness isolates the unit under test','02 • MODEL HIERARCHY & GALLERY'],
  ['Data Inspector reveals one saved run','03 • SIMULATION DATA INSPECTOR'],
  ['DO-178C defines objectives; DO-331 addresses model use','04 • ASSURANCE CONTEXT'],
  ['Software levels scale rigor—and independence is planned','04 • ASSURANCE CONTEXT'],
  ['Traceability turns artifacts into evidence','04 • ASSURANCE CONTEXT'],
  ['The V-model pairs every definition with verification','04 • ASSURANCE CONTEXT'],
  ['Illustrative requirements make the training chain explicit','05 • REQUIREMENTS & TRACEABILITY'],
  ['One limiter requirement traces to one executed result','05 • REQUIREMENTS & TRACEABILITY'],
  ['The harness sits inside a controlled relative-file flow','05 • REQUIREMENTS & TRACEABILITY'],
  ['Strong tests target boundaries, modes, failures, and timing','06 • VERIFICATION WORKFLOW'],
  ['The limiter suite retains 19 passing assessments','06 • VERIFICATION WORKFLOW'],
  ['Callbacks create context; the test driver owns the oracle','06 • VERIFICATION WORKFLOW'],
  ['FCS_Data.sldd controls shared parameters and interfaces','06 • VERIFICATION WORKFLOW'],
  ['Reviewable models make intent obvious','06 • VERIFICATION WORKFLOW'],
  ['CI automates evidence production—not approval','07 • AUTOMATION & ENVIRONMENTS'],
  ['Classify the first meaningful failure','07 • AUTOMATION & ENVIRONMENTS'],
  ['MIL, SIL, PIL, HIL, bench, and system integration are distinct','07 • AUTOMATION & ENVIRONMENTS'],
  ['The current training package is internally consistent','07 • AUTOMATION & ENVIRONMENTS'],
  ['Demonstrated evidence is narrower than certification evidence','07 • AUTOMATION & ENVIRONMENTS'],
  ['Your first week should produce one repeatable chain','08 • FIRST-WEEK TAKEAWAYS'],
];

function textValue(shape) {
  try { return shape.text?.value ?? String(shape.text ?? ''); } catch { return ''; }
}

function findShape(slide, predicate, description, required = true) {
  const shape = slide.shapes.items.find(predicate);
  if (!shape && required) throw new Error(`Unable to find ${description}`);
  return shape;
}

function findByName(slide, name, required = true) {
  return findShape(slide, (shape) => shape.name === name, `shape ${name}`, required);
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
      ...(style.lineSpacing ? { lineSpacing: style.lineSpacing } : {}),
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

function addLine(slide, { name, left, top, width, height = 0, color = COLORS.rule, lineWidth = 2, style = 'solid' }) {
  return slide.shapes.add({ geometry: 'line', name, position: { left, top, width, height }, fill: 'none', line: { style, fill: color, width: lineWidth } });
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
  for (const shape of [...slide.shapes.items]) {
    if (!isChrome(shape)) shape.delete();
  }
  for (const image of [...slide.images.items]) {
    if (typeof image.delete === 'function') image.delete();
  }
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

function styleTitle(shape, text, dark = false) {
  const size = text.length > 70 ? 35.5 : text.length > 58 ? 38 : 42;
  shape.position = { left: 72, top: 66, width: 1136, height: 56 };
  setText(shape, text, { fontSize: size, color: dark ? COLORS.white : COLORS.ink, bold: true,
    alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 }, wrap: 'square', autoFit: 'none' });
}

function applyChrome(slide, slideNumber) {
  if (slideNumber === 1) return;
  const [titleText, sectionText] = meta[slideNumber - 1];
  const dark = darkSourceSlides.has(sourceByOutput[slideNumber - 1]);
  const chrome = findChrome(slide);
  if (!chrome.section || !chrome.title || !chrome.footer || !chrome.page) throw new Error(`Missing chrome on slide ${slideNumber}`);
  chrome.section.position = { left: 72, top: 30, width: 760, height: 26 };
  setText(chrome.section, sectionText, { fontSize: 14.5, color: COLORS.teal, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  styleTitle(chrome.title, titleText, dark);
  if (chrome.divider) chrome.divider.position = { left: 72, top: 127, width: 1136, height: 0 };
  chrome.footer.position = { left: 72, top: 678, width: 550, height: 20 };
  setText(chrome.footer, 'AVIATION CONTROLS ENGINEERING ONBOARDING', { fontSize: 11.5, color: dark ? '#7D91A0' : COLORS.slate, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 } });
  chrome.page.position = { left: 1156, top: 676, width: 52, height: 22 };
  setText(chrome.page, String(slideNumber).padStart(2, '0'), { fontSize: 14, color: dark ? '#70DCE5' : COLORS.teal, bold: true, alignment: 'right', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 }, wrap: 'none' });
}

async function imageBytes(filePath) { return new Uint8Array(await fs.readFile(filePath)); }
async function writeBlob(filePath, blob) { await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer())); }
function contentType(filePath) { return /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png'; }

async function addImage(slide, filePath, position, alt) {
  return slide.images.add({ blob: await imageBytes(filePath), contentType: contentType(filePath), alt, fit: 'contain', position });
}

async function buildImageSlide(slide, slideNumber, relativePath, caption, role) {
  clearContent(slide);
  const dark = darkSourceSlides.has(sourceByOutput[slideNumber - 1]);
  addBox(slide, { name: `s${slideNumber}-image-frame`, position: { left: 64, top: 142, width: 1152, height: 495 },
    fill: dark ? '#0C2133' : COLORS.white, lineColor: dark ? '#21465E' : COLORS.rule, lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, path.join(projectRoot, relativePath), { left: 74, top: 151, width: 1132, height: 468 }, caption);
  addTextBox(slide, { name: `s${slideNumber}-role`, position: { left: 80, top: 618, width: 230, height: 24 }, text: role,
    fontSize: 13.5, color: COLORS.teal, bold: true, alignment: 'left', verticalAlignment: 'middle', insets: { top: 0, right: 2, bottom: 0, left: 2 } });
  addTextBox(slide, { name: `s${slideNumber}-caption`, position: { left: 302, top: 618, width: 898, height: 24 }, text: caption,
    fontSize: 14.5, color: dark ? '#D8E8F1' : COLORS.body, bold: true, alignment: 'right', verticalAlignment: 'middle', insets: { top: 0, right: 2, bottom: 0, left: 2 }, wrap: 'none' });
}

function formatNotes(entry) {
  const caveats = (entry.caveats || []).map((item) => `- ${item}`).join('\n');
  const sources = (entry.sources || []).map((item) => `- ${item}`).join('\n');
  return `Timing: ${entry.timing}\n\n${entry.talkTrack}\n\nCaveats\n${caveats}\n\n[Sources]\n${sources}`;
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPptxPath));
if (presentation.slides.items.length !== 42) throw new Error(`Expected 42 slides, found ${presentation.slides.items.length}`);
const notes = JSON.parse(await fs.readFile(path.join(buildDir, 'notes-draft.json'), 'utf8'));
if (notes.length !== 42) throw new Error(`Expected 42 notes entries, found ${notes.length}`);

for (let index = 0; index < 42; index += 1) applyChrome(presentation.slides.items[index], index + 1);

// Slide 1 — accurate training scope.
{
  const slide = presentation.slides.items[0];
  const title = findByName(slide, 'text-2');
  const subtitle = findByName(slide, 'text-3');
  const page = findShape(slide, (shape) => /^\d{2}$/.test(textValue(shape).trim()) && (shape.position?.top ?? 0) > 640, 'slide 1 page');
  setText(title, meta[0][0], { fontSize: 66, color: COLORS.white, bold: true, alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 }, wrap: 'square' });
  setText(subtitle, 'First-session workflow • model hierarchy • desktop MIL evidence • assurance context', { fontSize: 24, color: '#D8E8F1', bold: false, alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  setText(page, '01', { fontSize: 14, color: '#70DCE5', bold: true, alignment: 'right', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 } });
}

// Slide 5 — seven distinct actions and first-session success indicators.
{
  const slide = presentation.slides.items[4];
  clearContent(slide);
  const actions = [
    ['01','INITIALIZE','Command Window','Prepare paths + FCS_Data.sldd'],
    ['02','OPEN','Ctrl+O / open_system','Choose the correct top level'],
    ['03','UPDATE','Modeling • Ctrl+D','Compile and propagate semantics'],
    ['04','RUN','Simulation • Ctrl+T','Execute desktop model behavior'],
    ['05','STOP','Simulation • Stop','Interrupt the current execution'],
    ['06','BUILD','Apps • Ctrl+B','Configured code generation only'],
    ['07','TEST','MATLAB driver','Run harness assessments'],
  ];
  const cardW = 148;
  const gap = 12;
  const startX = 72;
  for (let i = 0; i < actions.length - 1; i += 1) addLine(slide, { name: `s5-flow-${i}`, left: startX + cardW + i * (cardW + gap), top: 245, width: gap, color: COLORS.rule, lineWidth: 2 });
  actions.forEach((item, i) => {
    const x = startX + i * (cardW + gap);
    addBox(slide, { name: `s5-card-${i}`, position: { left: x, top: 158, width: cardW, height: 176 }, fill: i === 6 ? COLORS.greenTint : COLORS.white,
      lineColor: i === 6 ? COLORS.green : (i < 3 ? COLORS.blue : COLORS.teal), lineWidth: 1.6 });
    addTextBox(slide, { name: `s5-num-${i}`, position: { left: x + 12, top: 168, width: 36, height: 24 }, text: item[0], fontSize: 13, color: COLORS.muted, bold: true });
    addTextBox(slide, { name: `s5-title-${i}`, position: { left: x + 12, top: 195, width: cardW - 24, height: 28 }, text: item[1], fontSize: 17, color: i === 6 ? COLORS.green : COLORS.blue, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s5-ui-${i}`, position: { left: x + 10, top: 228, width: cardW - 20, height: 35 }, text: item[2], fontSize: 13.5, color: COLORS.body, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s5-purpose-${i}`, position: { left: x + 10, top: 268, width: cardW - 20, height: 55 }, text: item[3], fontSize: 12.8, color: COLORS.muted, alignment: 'center', verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's5-commands', position: { left: 72, top: 360, width: 742, height: 256 }, fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, geometry: 'rect' });
  addTextBox(slide, { name: 's5-command-title', position: { left: 92, top: 376, width: 700, height: 25 }, text: 'FIRST CLOSED-LOOP SESSION — MATLAB EQUIVALENTS', fontSize: 15, color: '#70DCE5', bold: true });
  addTextBox(slide, { name: 's5-command-body', position: { left: 92, top: 407, width: 700, height: 190 },
    text: "projectRoot = 'D:\\GitHub\\aviation-controls-simulink-training';\naddpath(fullfile(projectRoot,'scripts'), fullfile(projectRoot,'models'), fullfile(projectRoot,'data'));\ninitialize_training_data(projectRoot);\nopen_system(fullfile(projectRoot,'models','AircraftFeedbackControlLoop.slx'));\nset_param('AircraftFeedbackControlLoop','SimulationCommand','update');\nsim('AircraftFeedbackControlLoop');\nrun_pitch_rate_limiter_tests(projectRoot);",
    fontSize: 14.2, color: '#E7F2F7', alignment: 'left', verticalAlignment: 'top', insets: { top: 3, right: 5, bottom: 3, left: 5 } });
  addBox(slide, { name: 's5-success', position: { left: 838, top: 360, width: 370, height: 256 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.5 });
  addTextBox(slide, { name: 's5-success-title', position: { left: 858, top: 376, width: 330, height: 25 }, text: 'SUCCESS LOOKS LIKE', fontSize: 15, color: COLORS.teal, bold: true });
  addTextBox(slide, { name: 's5-success-body', position: { left: 858, top: 408, width: 330, height: 180 },
    text: '• Training data dictionary ready\n• Update completes without an error\n• Simulation outputs appear under results/\n• Limiter driver writes CSV + MAT\n• Human-readable HTML + PNG appear under reports/\n\nBuild remains optional and scope-dependent; no production-code claim is made.',
    fontSize: 16, color: COLORS.body, bold: false, alignment: 'left', verticalAlignment: 'top', insets: { top: 3, right: 5, bottom: 3, left: 5 } });
}

// Slide 6 — current editor plus all five requested tabs.
{
  const slide = presentation.slides.items[5];
  clearContent(slide);
  addBox(slide, { name: 's6-image-frame', position: { left: 64, top: 145, width: 808, height: 474 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.3, geometry: 'rect' });
  await addImage(slide, path.join(projectRoot, 'screenshots', 'AircraftFeedbackControlLoop_Editor.jpg'), { left: 72, top: 153, width: 792, height: 458 }, 'Current MATLAB R2023b Simulink Editor showing AircraftFeedbackControlLoop');
  const tabs = [
    ['SIMULATION','Open • Run • Stop • Data Inspector',COLORS.teal,COLORS.tealTint],
    ['DEBUG','Diagnostics • Information Overlays',COLORS.blue,COLORS.blueTint],
    ['MODELING','Update Model • configuration',COLORS.green,COLORS.greenTint],
    ['FORMAT','Layout • labels • visual review',COLORS.amber,COLORS.amberTint],
    ['APPS','Testing tools • code generation',COLORS.red,COLORS.redTint],
  ];
  tabs.forEach((tab, i) => {
    const y = 151 + i * 91;
    addBox(slide, { name: `s6-tab-${i}`, position: { left: 894, top: y, width: 314, height: 76 }, fill: tab[3], lineColor: tab[2], lineWidth: 1.7 });
    addTextBox(slide, { name: `s6-tab-title-${i}`, position: { left: 910, top: y + 8, width: 282, height: 23 }, text: tab[0], fontSize: 16.5, color: tab[2], bold: true });
    addTextBox(slide, { name: `s6-tab-body-${i}`, position: { left: 910, top: y + 32, width: 282, height: 34 }, text: tab[1], fontSize: 14.2, color: COLORS.body, bold: true, verticalAlignment: 'top' });
  });
  addTextBox(slide, { name: 's6-caption', position: { left: 72, top: 625, width: 1136, height: 25 }, text: 'Select the tab, then the action. Open, update, run, stop, build, and test create different engineering states and evidence.', fontSize: 16, color: COLORS.body, bold: true, alignment: 'center' });
}

// Slide 7 — overlays are model annotations; SDI markers are plot annotations.
{
  const slide = presentation.slides.items[6];
  clearContent(slide);
  addBox(slide, { name: 's7-path', position: { left: 72, top: 145, width: 392, height: 37 }, text: 'DEBUG → INFORMATION OVERLAYS', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 15.5, textColor: COLORS.white });
  const rows = [
    ['PORT UNITS','ShowPortUnits'],
    ['DATA TYPES','ShowPortDataTypes'],
    ['DIMENSIONS','ShowLineDimensions'],
    ['SIGNAL NAMES','line labels + propagated names'],
    ['LOGGING BADGES','DataLogging + model SignalLogging'],
    ['TEST POINTS','ShowTestPointIcons, when supported'],
  ];
  rows.forEach((row, i) => {
    const y = 193 + i * 58;
    addBox(slide, { name: `s7-row-${i}`, position: { left: 72, top: y, width: 392, height: 48 }, fill: i % 2 ? COLORS.blueTint : COLORS.tealTint, lineColor: i % 2 ? COLORS.blue : COLORS.teal, lineWidth: 1.2 });
    addTextBox(slide, { name: `s7-row-title-${i}`, position: { left: 86, top: y + 5, width: 150, height: 20 }, text: row[0], fontSize: 14, color: i % 2 ? COLORS.blue : COLORS.teal, bold: true });
    addTextBox(slide, { name: `s7-row-body-${i}`, position: { left: 231, top: y + 5, width: 219, height: 36 }, text: row[1], fontSize: 13.2, color: COLORS.body, bold: true, alignment: 'right' });
  });
  addBox(slide, { name: 's7-image-frame', position: { left: 488, top: 145, width: 720, height: 396 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Model.png'), { left: 500, top: 157, width: 696, height: 372 }, 'Current PitchRateLimiter model view with signal names, data types, and logging indicators');
  addBox(slide, { name: 's7-distinction', position: { left: 488, top: 556, width: 720, height: 82 },
    text: 'MODEL OVERLAYS — units, types, dimensions, names, and log/test-point badges annotate the diagram.\nSDI MARKERS — cursors and data points annotate logged traces. Neither display changes behavior.',
    fill: COLORS.pale, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 14.2, textColor: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 9, right: 14, bottom: 7, left: 14 } });
}

// Slide 8 — complete role-based hierarchy for all roots and requested internals.
{
  const slide = presentation.slides.items[7];
  clearContent(slide);
  const colX = [72, 452, 832];
  const colW = 352;
  // Connectors first so they remain behind nodes.
  addLine(slide, { name: 's8-left-v', left: colX[0] + 176, top: 245, width: 0, height: 300, color: '#35647A', lineWidth: 2 });
  addLine(slide, { name: 's8-mid-v', left: colX[1] + 176, top: 225, width: 0, height: 320, color: '#35647A', lineWidth: 2 });
  addLine(slide, { name: 's8-right-v1', left: colX[2] + 176, top: 250, width: 0, height: 65, color: '#35647A', lineWidth: 2 });
  addLine(slide, { name: 's8-right-v2', left: colX[2] + 176, top: 420, width: 0, height: 65, color: '#35647A', lineWidth: 2 });
  ['STANDALONE CLOSED LOOP','REFERENCED INTEGRATION','SEPARATE TRAINING MODELS'].forEach((title, i) => {
    addBox(slide, { name: `s8-panel-${i}`, position: { left: colX[i], top: 145, width: colW, height: 486 }, fill: '#0C2133', lineColor: '#21465E', lineWidth: 1.4, geometry: 'rect' });
    addTextBox(slide, { name: `s8-heading-${i}`, position: { left: colX[i] + 15, top: 157, width: colW - 30, height: 25 }, text: title, fontSize: 14.2, color: '#70DCE5', bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's8-afcl', position: { left: 92, top: 195, width: 312, height: 58 }, text: 'AircraftFeedbackControlLoop.slx\nstandalone simulation top level', fill: COLORS.blue, lineColor: '#7FA4F3', fontSize: 16.5, textColor: COLORS.white });
  const internals = ['Pitch Controller PI','Actuator Dynamics','Simplified Longitudinal\nAircraft Dynamics','Sensor Processing Lag'];
  internals.forEach((text, i) => addBox(slide, { name: `s8-afcl-sub-${i}`, position: { left: 112, top: 278 + i * 70, width: 272, height: 50 }, text, fill: '#173A54', lineColor: '#35647A', fontSize: 15, textColor: '#E7F2F7' }));

  addBox(slide, { name: 's8-parent', position: { left: 472, top: 195, width: 312, height: 58 }, text: 'ReferencedFlightControl\nArchitecture.slx • integration parent', fill: COLORS.teal, lineColor: '#70DCE5', fontSize: 14.7, textColor: COLORS.dark });
  const children = [
    ['SensorProcessingRef.slx','referenced child'],
    ['PitchRateLimiter.slx','→ Pitch Rate Limiter Logic'],
    ['PitchControllerRef.slx','→ Pitch Rate PI'],
    ['ActuatorCommandRef.slx','referenced child'],
  ];
  children.forEach((entry, i) => addBox(slide, { name: `s8-child-${i}`, position: { left: 492, top: 278 + i * 70, width: 272, height: 50 }, text: `${entry[0]}\n${entry[1]}`, fill: '#173A54', lineColor: '#35647A', fontSize: 14.5, textColor: '#E7F2F7' }));

  addBox(slide, { name: 's8-ap-root', position: { left: 852, top: 195, width: 312, height: 58 }, text: 'AutopilotModeLogic.slx • separate root', fill: COLORS.amber, lineColor: '#FFD38A', fontSize: 15.2, textColor: COLORS.dark });
  addBox(slide, { name: 's8-ap-sub', position: { left: 872, top: 285, width: 272, height: 62 }, text: 'Autopilot Mode Logic\nStateflow chart • internal', fill: '#173A54', lineColor: '#35647A', fontSize: 14.6, textColor: '#E7F2F7' });
  addBox(slide, { name: 's8-harness-root', position: { left: 852, top: 365, width: 312, height: 58 }, text: 'PitchRateLimiter_Harness.slx\nindependent harness', fill: COLORS.green, lineColor: '#7DDBAF', fontSize: 15, textColor: COLORS.dark });
  addBox(slide, { name: 's8-harness-sub', position: { left: 872, top: 455, width: 272, height: 62 }, text: 'Unit Under Test - PitchRateLimiter\nmodel reference', fill: '#173A54', lineColor: '#35647A', fontSize: 14.4, textColor: '#E7F2F7' });
  addTextBox(slide, { name: 's8-legend', position: { left: 856, top: 545, width: 304, height: 58 },
    text: 'Root model • referenced child • internal subsystem/chart • independent harness',
    fontSize: 13.8, color: '#D8E8F1', bold: true, alignment: 'center', verticalAlignment: 'middle', insets: { top: 4, right: 8, bottom: 4, left: 8 } });
}

const imageSlides = [
  [9,'screenshots/AircraftFeedbackControlLoop_Editor.jpg','models/AircraftFeedbackControlLoop.slx • standalone closed-loop training model','ROOT MODEL'],
  [10,'screenshots/AircraftFeedback_PitchController.png','AircraftFeedbackControlLoop/Pitch Controller PI','INTERNAL SUBSYSTEM'],
  [11,'screenshots/AircraftFeedback_ActuatorDynamics.png','AircraftFeedbackControlLoop/Actuator Dynamics','INTERNAL SUBSYSTEM'],
  [12,'screenshots/AircraftFeedback_LongitudinalPlant.png','AircraftFeedbackControlLoop/Simplified Longitudinal Aircraft Dynamics','INTERNAL SUBSYSTEM'],
  [13,'screenshots/AircraftFeedback_SensorProcessingLag.png','AircraftFeedbackControlLoop/Sensor Processing Lag','INTERNAL SUBSYSTEM'],
  [14,'screenshots/AutopilotModeLogic_Model.png','models/AutopilotModeLogic.slx • separate Stateflow training model','ROOT MODEL'],
  [15,'screenshots/AutopilotModeLogic_Stateflow_Editor.jpg','AutopilotModeLogic/Autopilot Mode Logic • Stateflow chart','INTERNAL STATEFLOW VIEW'],
  [16,'screenshots/ReferencedFlightControlArchitecture_Editor.jpg','models/ReferencedFlightControlArchitecture.slx • model-reference integration parent','INTEGRATION PARENT'],
  [17,'screenshots/SensorProcessingRef_Model.png','models/SensorProcessingRef.slx','REFERENCED CHILD'],
  [18,'screenshots/PitchRateLimiter_Model.png','models/PitchRateLimiter.slx • standalone component and referenced child','REFERENCED CHILD / COMPONENT'],
  [19,'screenshots/PitchRateLimiter_Implementation.png','PitchRateLimiter/Pitch Rate Limiter Logic','INTERNAL SUBSYSTEM'],
  [20,'screenshots/PitchControllerRef_Model.png','models/PitchControllerRef.slx','REFERENCED CHILD'],
  [21,'screenshots/PitchControllerRef_PitchRatePI.png','PitchControllerRef/Pitch Rate PI','INTERNAL SUBSYSTEM'],
  [22,'screenshots/ActuatorCommandRef_Model.png','models/ActuatorCommandRef.slx','REFERENCED CHILD'],
  [23,'screenshots/PitchRateLimiter_Harness.png','models/PitchRateLimiter_Harness.slx • references PitchRateLimiter','INDEPENDENT TEST HARNESS'],
];
for (const [number, relativePath, caption, role] of imageSlides) {
  await buildImageSlide(presentation.slides.items[number - 1], number, relativePath, caption, role);
}

// Slide 24 — the saved clean SDI onboarding session.
{
  const slide = presentation.slides.items[23];
  clearContent(slide);
  addBox(slide, { name: 's24-image-frame', position: { left: 64, top: 145, width: 900, height: 486 }, fill: COLORS.white, lineColor: COLORS.rule, lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, path.join(projectRoot, 'screenshots', 'SimulationDataInspector_Onboarding.jpg'), { left: 72, top: 153, width: 884, height: 470 }, 'Saved Simulation Data Inspector onboarding setup with one run, five signals, and three vertically arranged plots');
  const cards = [
    ['ONE RUN','AircraftFeedbackControlLoop — onboarding reference'],
    ['FIVE SIGNALS','command • response • error • actuator • disturbance'],
    ['THREE PLOTS','tracking • error • actuator + disturbance'],
    ['WHY USE SDI','inspect without model edits • compare • zoom • cursors • units • export'],
  ];
  cards.forEach((card, i) => {
    const y = 151 + i * 115;
    addBox(slide, { name: `s24-card-${i}`, position: { left: 986, top: y, width: 222, height: 98 }, fill: i === 3 ? COLORS.greenTint : COLORS.tealTint, lineColor: i === 3 ? COLORS.green : COLORS.teal, lineWidth: 1.5 });
    addTextBox(slide, { name: `s24-card-title-${i}`, position: { left: 1000, top: y + 9, width: 194, height: 22 }, text: card[0], fontSize: 14.2, color: i === 3 ? COLORS.green : COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s24-card-body-${i}`, position: { left: 1000, top: y + 35, width: 194, height: 52 }, text: card[1], fontSize: 13.2, color: COLORS.body, bold: true, alignment: 'center', verticalAlignment: 'top' });
  });
  addTextBox(slide, { name: 's24-caption', position: { left: 72, top: 632, width: 1136, height: 23 }, text: 'Markers show logged samples; model overlays show model metadata. Opening a saved session can replace the current SDI repository.', fontSize: 15.2, color: COLORS.body, bold: true, alignment: 'center' });
}

// Slide 26 — software levels plus the planned meaning of independence.
{
  const slide = presentation.slides.items[25];
  clearContent(slide);
  addTextBox(slide, { name: 's26-level-heading', position: { left: 72, top: 145, width: 614, height: 28 }, text: 'DO-178C SOFTWARE LEVEL', fontSize: 15, color: COLORS.blue, bold: true });
  addTextBox(slide, { name: 's26-ind-heading', position: { left: 724, top: 145, width: 484, height: 28 }, text: 'INDEPENDENCE IS OBJECTIVE-SPECIFIC', fontSize: 15, color: COLORS.teal, bold: true });
  const levelRows = [
    ['A','Catastrophic','highest applicable rigor + independence',COLORS.red,COLORS.redTint],
    ['B','Hazardous / Severe-Major','very high rigor',COLORS.amber,COLORS.amberTint],
    ['C','Major','substantial verification rigor',COLORS.blue,COLORS.blueTint],
    ['D','Minor','reduced objective set',COLORS.green,COLORS.greenTint],
    ['E','No Effect','no DO-178C objectives apply',COLORS.muted,COLORS.pale],
  ];
  levelRows.forEach((row, i) => {
    const y = 181 + i * 76;
    addBox(slide, { name: `s26-level-${i}`, position: { left: 72, top: y, width: 614, height: 62 }, fill: row[4], lineColor: row[3], lineWidth: 1.3 });
    addBox(slide, { name: `s26-letter-${i}`, position: { left: 86, top: y + 10, width: 47, height: 42 }, text: row[0], fill: row[3], lineColor: row[3], fontSize: 21, textColor: COLORS.white });
    addTextBox(slide, { name: `s26-cond-${i}`, position: { left: 151, top: y + 8, width: 216, height: 46 }, text: row[1], fontSize: 17, color: COLORS.ink, bold: true });
    addTextBox(slide, { name: `s26-impl-${i}`, position: { left: 372, top: y + 8, width: 296, height: 46 }, text: row[2], fontSize: 15.2, color: COLORS.body, bold: true, alignment: 'right' });
  });
  const independence = [
    ['PLANNED','Approved plans designate which verification objectives require independence.'],
    ['ROLE-BASED','Where required, the author is not the sole independent verifier of their own work.'],
    ['EVIDENCED','Review records identify the verifier, activity, baseline, findings, and disposition.'],
  ];
  independence.forEach((item, i) => {
    const y = 181 + i * 126;
    addBox(slide, { name: `s26-ind-${i}`, position: { left: 724, top: y, width: 484, height: 104 }, fill: i === 0 ? COLORS.tealTint : COLORS.white, lineColor: COLORS.teal, lineWidth: 1.5 });
    addTextBox(slide, { name: `s26-ind-title-${i}`, position: { left: 744, top: y + 12, width: 120, height: 24 }, text: item[0], fontSize: 15.5, color: COLORS.teal, bold: true });
    addTextBox(slide, { name: `s26-ind-body-${i}`, position: { left: 744, top: y + 38, width: 444, height: 54 }, text: item[1], fontSize: 16, color: COLORS.body, bold: true, verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's26-takeaway', position: { left: 724, top: 574, width: 484, height: 62 }, text: 'Use “DO-178C Software Level A” unless discussing a broader system DAL allocation.', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 16.5, textColor: COLORS.white });
}

// Slide 29 — exact classroom scope label and repository-grounded mappings.
{
  const slide = presentation.slides.items[28];
  const scope = findByName(slide, 'box-278', false);
  if (scope) setText(scope, 'Illustrative classroom requirements — not production aircraft data or an approved certification baseline.', { fontSize: 16.2, color: COLORS.white, bold: true, alignment: 'center' });
  const hlr = findByName(slide, 'box-270', false);
  const llr = findByName(slide, 'box-273', false);
  const timing = findByName(slide, 'box-276', false);
  if (hlr) setText(hlr, 'SOFTWARE HLR  SWHLR-001 / PRL-001', { fontSize: 18, color: COLORS.white, bold: true, alignment: 'left' });
  if (llr) setText(llr, 'SOFTWARE LLR / DESIGN  SWLLR-001', { fontSize: 18, color: COLORS.white, bold: true, alignment: 'left' });
  if (timing) setText(timing, 'STATUS + TIMING  PRL-003 / PRL-004', { fontSize: 18, color: COLORS.white, bold: true, alignment: 'left' });
}

// Slide 30 — visible bidirectional requirement-to-result chain.
{
  const slide = presentation.slides.items[29];
  clearContent(slide);
  const topX = [72, 356, 640, 924];
  const bottomX = [924, 640, 356, 72];
  const positions = [
    ...topX.map((x) => ({ left: x, top: 158, width: 244, height: 105 })),
    ...bottomX.map((x) => ({ left: x, top: 300, width: 244, height: 105 })),
  ];
  for (let i = 0; i < 3; i += 1) addLine(slide, { name: `s30-top-link-${i}`, left: topX[i] + 244, top: 210, width: 40, color: '#35647A', lineWidth: 2.4 });
  addLine(slide, { name: 's30-turn-link', left: 1168, top: 210, width: 0, height: 142, color: '#35647A', lineWidth: 2.4 });
  for (let i = 0; i < 3; i += 1) addLine(slide, { name: `s30-bottom-link-${i}`, left: bottomX[i + 1] + 244, top: 352, width: 40, color: '#35647A', lineWidth: 2.4 });
  const chain = [
    ['1 • SYSTEM','PSYS-001\ncommand-path protection'],
    ['2 • SOFTWARE HLR','SWHLR-001 / PRL-001\ninclusive ±12 deg/s allocation'],
    ['3 • SOFTWARE LLR','SWLLR-001\napply the magnitude clamp'],
    ['4 • MODEL ELEMENT','PitchRateLimiter/Pitch Rate Limiter Logic/Magnitude Clamp'],
    ['5 • HARNESS','PitchRateLimiter_Harness/Unit Under Test - PitchRateLimiter'],
    ['6 • EXECUTED CASE','run_pitch_rate_limiter_tests.m\n“Boundary above upper limit”'],
    ['7 • ITERATION 8','input 12.1 • expected 12 • actual 12\nerror 0 • tolerance 1e-9 • PASS'],
    ['8 • ASSOCIATION','PRL-001, PRL-003, PRL-004\ntrace backward to intent'],
  ];
  chain.forEach((node, i) => {
    const p = positions[i];
    const accent = i < 3 ? COLORS.blue : i < 6 ? COLORS.teal : COLORS.green;
    addBox(slide, { name: `s30-node-${i}`, position: p, fill: '#0C2133', lineColor: accent, lineWidth: 1.8 });
    addTextBox(slide, { name: `s30-node-title-${i}`, position: { left: p.left + 12, top: p.top + 8, width: p.width - 24, height: 23 }, text: node[0], fontSize: 13.4, color: accent, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s30-node-body-${i}`, position: { left: p.left + 12, top: p.top + 34, width: p.width - 24, height: p.height - 42 }, text: node[1], fontSize: i === 3 || i === 4 ? 12.9 : 14.1, color: '#E7F2F7', bold: true, alignment: 'center', verticalAlignment: 'middle' });
  });
  ['→','→','→','↓','←','←','←'].forEach((arrow, i) => {
    const pos = i < 3 ? { left: topX[i] + 246, top: 191, width: 36, height: 36 } : i === 3 ? { left: 1148, top: 265, width: 40, height: 34 } : { left: bottomX[i - 3] - 38, top: 333, width: 36, height: 36 };
    addTextBox(slide, { name: `s30-arrow-${i}`, position: pos, text: arrow, fontSize: 24, color: COLORS.teal, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's30-evidence', position: { left: 72, top: 438, width: 1136, height: 90 },
    text: 'VISIBLE RESULT  •  t = 0.14 s  •  normal_mode = true  •  input_valid = true  •  limiter_active expected/actual = true  •  every recorded check passed',
    fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.5, fontSize: 17.2, textColor: COLORS.ink });
  addBox(slide, { name: 's30-env', position: { left: 72, top: 548, width: 1136, height: 66 },
    text: 'Desktop Simulink model execution (MIL); not SIL, PIL, or HIL.\nTraceability is demonstrated through CSV, script, model-path, and result associations—not live Simulink Requirements links.',
    fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 16.2, textColor: COLORS.white });
}

// Slide 31 — actual harness companion-file flow.
{
  const slide = presentation.slides.items[30];
  clearContent(slide);
  const ys = [155, 247, 339, 431, 523];
  for (let i = 0; i < ys.length - 1; i += 1) addLine(slide, { name: `s31-down-${i}`, left: 361, top: ys[i] + 66, width: 0, height: 26, color: COLORS.teal, lineWidth: 2.4 });
  addLine(slide, { name: 's31-ref-link', left: 610, top: 280, width: 78, height: 0, color: COLORS.green, lineWidth: 2.4 });
  addLine(slide, { name: 's31-trace-link', left: 610, top: 372, width: 78, height: 0, color: COLORS.blue, lineWidth: 2.4 });
  const flow = [
    ['data/FCS_Data.sldd','controlled parameters, buses, units, ranges'],
    ['models/PitchRateLimiter_Harness.slx','stimulus + capture around the UUT'],
    ['scripts/run_pitch_rate_limiter_tests.m','test driver + visible pass/fail oracle'],
    ['results/PitchRateLimiter_TestResults.csv + .mat','retained machine-readable results'],
    ['reports/PitchRateLimiter_TestReport.html + .png','human-readable evidence report'],
  ];
  flow.forEach((row, i) => {
    addBox(slide, { name: `s31-flow-${i}`, position: { left: 72, top: ys[i], width: 578, height: 66 }, fill: i === 2 ? COLORS.tealTint : COLORS.white, lineColor: i === 2 ? COLORS.teal : COLORS.rule, lineWidth: 1.5 });
    addTextBox(slide, { name: `s31-flow-path-${i}`, position: { left: 90, top: ys[i] + 7, width: 542, height: 24 }, text: row[0], fontSize: 16.1, color: COLORS.blue, bold: true });
    addTextBox(slide, { name: `s31-flow-role-${i}`, position: { left: 90, top: ys[i] + 33, width: 542, height: 24 }, text: row[1], fontSize: 14.5, color: COLORS.body, bold: true });
  });
  addBox(slide, { name: 's31-component', position: { left: 688, top: 245, width: 520, height: 70 }, text: '└ references  models/PitchRateLimiter.slx\ncomponent implementation under test', fill: COLORS.greenTint, lineColor: COLORS.green, fontSize: 16.5, textColor: COLORS.ink, alignment: 'left' });
  addBox(slide, { name: 's31-trace', position: { left: 688, top: 337, width: 520, height: 70 }, text: '↔  docs/PitchRateLimiter_Requirements_Traceability.csv\nrequirement-to-model/test association', fill: COLORS.blueTint, lineColor: COLORS.blue, fontSize: 16, textColor: COLORS.ink, alignment: 'left' });
  addBox(slide, { name: 's31-roles', position: { left: 688, top: 431, width: 520, height: 158 },
    text: 'HARNESS ≠ COMPONENT ≠ DRIVER ≠ REQUIREMENTS ≠ RESULTS ≠ REPORT\n\nThe two retained .mldatx files are SDI view/session artifacts. No Simulink Test or Test Manager test-suite .mldatx file is claimed.',
    fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 16.4, textColor: COLORS.white, alignment: 'left', verticalAlignment: 'middle' });
  addTextBox(slide, { name: 's31-env', position: { left: 72, top: 612, width: 1136, height: 30 }, text: 'Desktop Simulink model execution (MIL); not SIL, PIL, or HIL.', fontSize: 17, color: COLORS.teal, bold: true, alignment: 'center' });
}

// Slide 33 — current raw report plus assessment summary.
{
  const slide = presentation.slides.items[32];
  clearContent(slide);
  addBox(slide, { name: 's33-report-frame', position: { left: 64, top: 145, width: 846, height: 487 }, fill: '#0C2133', lineColor: '#21465E', lineWidth: 1.2, geometry: 'rect' });
  await addImage(slide, path.join(projectRoot, 'reports', 'PitchRateLimiter_TestReport.png'), { left: 72, top: 153, width: 830, height: 471 }, 'Current retained PitchRateLimiter test report showing all 19 assessments passed');
  const metrics = [
    ['19 / 19','ASSESSMENTS PASSED',COLORS.green],
    ['0','FAILED',COLORS.teal],
    ['50 Hz','0.02 s SAMPLE TIME',COLORS.blue],
  ];
  metrics.forEach((metric, i) => {
    const y = 151 + i * 120;
    addBox(slide, { name: `s33-metric-${i}`, position: { left: 932, top: y, width: 276, height: 102 }, fill: '#0C2133', lineColor: metric[2], lineWidth: 1.8 });
    addTextBox(slide, { name: `s33-metric-value-${i}`, position: { left: 950, top: y + 12, width: 240, height: 42 }, text: metric[0], fontSize: 29, color: metric[2], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s33-metric-label-${i}`, position: { left: 950, top: y + 56, width: 240, height: 27 }, text: metric[1], fontSize: 13.6, color: '#D8E8F1', bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's33-method', position: { left: 932, top: 516, width: 276, height: 112 }, text: 'Executed MATLAB assessments\nusing the standalone Simulink harness\n\nSimulinkTestUsed = false\nTestManagerFileCreated = false', fill: '#0C2133', lineColor: COLORS.amber, lineWidth: 1.6, fontSize: 14.4, textColor: COLORS.white });
}

// Slide 34 — deterministic callbacks around a visible test oracle.
{
  const slide = presentation.slides.items[33];
  clearContent(slide);
  const xs = [72, 304, 536, 768, 1000];
  for (let i = 0; i < xs.length - 1; i += 1) addLine(slide, { name: `s34-link-${i}`, left: xs[i] + 192, top: 252, width: 40, color: COLORS.teal, lineWidth: 2.3 });
  const stages = [
    ['SETUP','training_callback_\nsetup.m','paths • dictionary • initial state'],
    ['PRELOAD','training_callback_\npreload.m','deterministic stimulus'],
    ['POSTLOAD','training_callback_\npostload.m','solver • logging configuration'],
    ['EXECUTE','run_pitch_rate_\nlimiter_tests.m','harness run + visible oracle'],
    ['CLEANUP','training_callback_\ncleanup.m','release only owned state'],
  ];
  stages.forEach((stage, i) => {
    addBox(slide, { name: `s34-stage-${i}`, position: { left: xs[i], top: 180, width: 192, height: 145 }, fill: i === 3 ? COLORS.greenTint : COLORS.white, lineColor: i === 3 ? COLORS.green : COLORS.teal, lineWidth: 1.5 });
    addTextBox(slide, { name: `s34-stage-title-${i}`, position: { left: xs[i] + 12, top: 192, width: 168, height: 24 }, text: stage[0], fontSize: 15.2, color: i === 3 ? COLORS.green : COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s34-stage-file-${i}`, position: { left: xs[i] + 10, top: 221, width: 172, height: 42 }, text: stage[1], fontSize: 12.8, color: COLORS.blue, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s34-stage-body-${i}`, position: { left: xs[i] + 12, top: 270, width: 168, height: 43 }, text: stage[2], fontSize: 13.2, color: COLORS.body, bold: true, alignment: 'center' });
  });
  const principles = [
    ['CONTEXT','Callbacks establish reproducible state.'],
    ['ORACLE','Expected values and pass/fail logic stay in the test driver.'],
    ['EVIDENCE','CSV, MAT, HTML, and PNG retain the controlled outcome.'],
  ];
  principles.forEach((p, i) => addBox(slide, { name: `s34-principle-${i}`, position: { left: 72 + i * 380, top: 378, width: 356, height: 126 }, text: `${p[0]}\n${p[1]}`, fill: i === 1 ? COLORS.navy : COLORS.pale, lineColor: i === 1 ? COLORS.teal : COLORS.rule, fontSize: 18, textColor: i === 1 ? COLORS.white : COLORS.ink }));
  addBox(slide, { name: 's34-repeat', position: { left: 72, top: 532, width: 1136, height: 82 }, text: 'Repeatability rule: prepare → execute → assess → retain → clean up. Dirty learner models are preserved so cleanup does not discard unsaved work.', fill: COLORS.tealTint, lineColor: COLORS.teal, fontSize: 18, textColor: COLORS.ink });
}

// Slide 35 — native, readable data-dictionary and bus inventory.
{
  const slide = presentation.slides.items[34];
  clearContent(slide);
  addBox(slide, { name: 's35-path', position: { left: 72, top: 145, width: 1136, height: 40 }, text: 'data/FCS_Data.sldd  •  shared by all eight delivered models  •  controlled fixed-step Sample_time = 0.02 s (50 Hz)', fill: COLORS.navy, lineColor: COLORS.teal, fontSize: 16.5, textColor: COLORS.white });
  addTextBox(slide, { name: 's35-param-heading', position: { left: 72, top: 201, width: 552, height: 26 }, text: 'ILLUSTRATIVE CONTROLLED PARAMETERS', fontSize: 15, color: COLORS.blue, bold: true });
  addTextBox(slide, { name: 's35-bus-heading', position: { left: 656, top: 201, width: 552, height: 26 }, text: 'FlightControlBus — EXPLICIT INTERFACE CONTRACT', fontSize: 15, color: COLORS.teal, bold: true });
  const params = [
    ['Sample_time','0.02 s','double'],
    ['q_limit_normal','12 deg/s','double'],
    ['pitch_Kp','0.60','double'],
    ['pitch_Ki','0.025 1/s','double'],
    ['pitch_rate_Kp','0.30 s','double'],
    ['pitch_rate_Ki','0.20','double'],
  ];
  params.forEach((row, i) => {
    const y = 238 + i * 54;
    addBox(slide, { name: `s35-param-${i}`, position: { left: 72, top: y, width: 552, height: 44 }, fill: i % 2 ? COLORS.pale : COLORS.white, lineColor: COLORS.rule, lineWidth: 1, geometry: 'rect' });
    addTextBox(slide, { name: `s35-param-name-${i}`, position: { left: 86, top: y + 4, width: 228, height: 34 }, text: row[0], fontSize: 16, color: COLORS.blue, bold: true });
    addTextBox(slide, { name: `s35-param-value-${i}`, position: { left: 320, top: y + 4, width: 172, height: 34 }, text: row[1], fontSize: 16, color: COLORS.ink, bold: true, alignment: 'right' });
    addTextBox(slide, { name: `s35-param-type-${i}`, position: { left: 500, top: y + 4, width: 108, height: 34 }, text: row[2], fontSize: 14, color: COLORS.muted, bold: true, alignment: 'right' });
  });
  const bus = [
    ['q_rate','double • deg/s','Measured pitch rate'],
    ['pitch_angle','double • deg','Measured pitch attitude'],
    ['mach','double • 1','Illustrative Mach number'],
    ['air_data_valid','boolean • 1','Validity flag'],
    ['mode','uint8 • 1','0 OFF • 1 ARMED • 2 ENGAGED • 3 DEGRADED'],
  ];
  bus.forEach((row, i) => {
    const y = 238 + i * 65;
    addBox(slide, { name: `s35-bus-${i}`, position: { left: 656, top: y, width: 552, height: 55 }, fill: i % 2 ? COLORS.tealTint : COLORS.white, lineColor: COLORS.rule, lineWidth: 1, geometry: 'rect' });
    addTextBox(slide, { name: `s35-bus-name-${i}`, position: { left: 670, top: y + 4, width: 155, height: 22 }, text: row[0], fontSize: 15.2, color: COLORS.teal, bold: true });
    addTextBox(slide, { name: `s35-bus-meta-${i}`, position: { left: 829, top: y + 4, width: 170, height: 22 }, text: row[1], fontSize: 14.2, color: COLORS.ink, bold: true, alignment: 'right' });
    addTextBox(slide, { name: `s35-bus-desc-${i}`, position: { left: 670, top: y + 28, width: 520, height: 22 }, text: row[2], fontSize: 13.8, color: COLORS.body, bold: true });
  });
  addBox(slide, { name: 's35-takeaway', position: { left: 72, top: 582, width: 1136, height: 56 }, text: 'Explicit units, types, dimensions, ranges, validity, and ownership make integration predictable—and reviewable.', fill: COLORS.blueTint, lineColor: COLORS.blue, fontSize: 18, textColor: COLORS.ink });
}

// Slide 37 — repository initialization and accurate artifact wording.
{
  const slide = presentation.slides.items[36];
  const matlab = findByName(slide, 'text-439', false);
  if (matlab) setText(matlab, 'initializes the repository, updates models, runs checks and the MATLAB harness driver; the two retained .mldatx files are SDI artifacts—not Test Manager suites', { fontSize: 16.6, color: '#D8E8F1', alignment: 'left', verticalAlignment: 'middle' });
  const takeaway = findByName(slide, 'text-444', false);
  if (takeaway) setText(takeaway, 'A green pipeline is controlled evidence input—not certification approval.', { fontSize: 20, color: '#70DCE5', bold: true, alignment: 'center' });
}

// Slide 39 — distinguish execution environments and mark only MIL as executed.
{
  const slide = presentation.slides.items[38];
  clearContent(slide);
  const cards = [
    ['MIL','Model/control logic executes with model plant or model environment.','EXECUTED HERE',COLORS.green,COLORS.greenTint],
    ['SIL','Generated software executes on the host using a software build.','NOT PERFORMED',COLORS.blue,COLORS.blueTint],
    ['PIL','Generated code executes on a target processor or representative processor.','NOT AUTOMATICALLY UNIT TESTING',COLORS.amber,COLORS.amberTint],
    ['HIL','Real controller/target hardware + real-time plant + physical I/O.','NOT PERFORMED',COLORS.red,COLORS.redTint],
    ['BENCH','Hardware subsystem with instrumentation, loads, and controlled stimuli.','CONCEPT ONLY',COLORS.teal,COLORS.tealTint],
    ['SYSTEM INTEGRATION','Integrated aircraft/system environment with representative interfaces.','CONCEPT ONLY',COLORS.muted,COLORS.pale],
  ];
  cards.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 72 + col * 380;
    const y = 157 + row * 215;
    addBox(slide, { name: `s39-card-${i}`, position: { left: x, top: y, width: 352, height: 183 }, fill: '#0C2133', lineColor: card[3], lineWidth: 1.8 });
    addTextBox(slide, { name: `s39-title-${i}`, position: { left: x + 18, top: y + 14, width: 316, height: 30 }, text: card[0], fontSize: 21, color: card[3], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s39-body-${i}`, position: { left: x + 18, top: y + 52, width: 316, height: 73 }, text: card[1], fontSize: 15.2, color: '#E7F2F7', bold: true, alignment: 'center', verticalAlignment: 'top' });
    addBox(slide, { name: `s39-status-${i}`, position: { left: x + 30, top: y + 137, width: 292, height: 32 }, text: card[2], fill: card[4], lineColor: card[3], lineWidth: 1, fontSize: 13.2, textColor: COLORS.dark });
  });
  addBox(slide, { name: 's39-label', position: { left: 72, top: 591, width: 1136, height: 50 }, text: 'Desktop Simulink model execution (MIL); not SIL, PIL, or HIL.', fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.5, fontSize: 18.5, textColor: COLORS.ink });
}

// Slide 40 — authoritative package status, with the three metrics kept distinct.
{
  const slide = presentation.slides.items[39];
  clearContent(slide);
  const metrics = [
    ['8 / 8','DELIVERED MODELS','updated / compiled',COLORS.teal,'Simulink diagram update succeeded for all eight model files.'],
    ['19 / 19','LIMITER ASSESSMENTS','passed • 0 failed',COLORS.green,'Executable MATLAB assessments using the standalone Simulink harness.'],
    ['24 / 24','REQUIRED EXPORTS','present',COLORS.blue,'1 HTML report • 21 visual exports • 2 SDI .mldatx artifacts.'],
  ];
  metrics.forEach((metric, i) => {
    const x = 72 + i * 380;
    addBox(slide, { name: `s40-card-${i}`, position: { left: x, top: 165, width: 356, height: 282 }, fill: '#0C2133', lineColor: metric[3], lineWidth: 2.1 });
    addTextBox(slide, { name: `s40-value-${i}`, position: { left: x + 20, top: 193, width: 316, height: 80 }, text: metric[0], fontSize: 48, color: metric[3], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s40-label-${i}`, position: { left: x + 20, top: 282, width: 316, height: 34 }, text: metric[1], fontSize: 16, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s40-sub-${i}`, position: { left: x + 20, top: 319, width: 316, height: 30 }, text: metric[2], fontSize: 17, color: metric[3], bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s40-def-${i}`, position: { left: x + 24, top: 363, width: 308, height: 65 }, text: metric[4], fontSize: 14.2, color: '#D8E8F1', bold: true, alignment: 'center', verticalAlignment: 'top' });
  });
  addBox(slide, { name: 's40-models', position: { left: 72, top: 476, width: 1136, height: 104 },
    text: 'MODEL SET\nAircraftFeedbackControlLoop • AutopilotModeLogic • ReferencedFlightControlArchitecture • SensorProcessingRef\nPitchRateLimiter • PitchControllerRef • ActuatorCommandRef • PitchRateLimiter_Harness',
    fill: '#0C2133', lineColor: '#21465E', lineWidth: 1.3, fontSize: 15.5, textColor: COLORS.white });
  addTextBox(slide, { name: 's40-warning', position: { left: 72, top: 599, width: 1136, height: 32 }, text: '“Updated” means validation compile/update succeeded; it does not mean eight files were edited.', fontSize: 16, color: '#70DCE5', bold: true, alignment: 'center' });
}

// Slide 41 — the evidence boundary is explicit.
{
  const slide = presentation.slides.items[40];
  clearContent(slide);
  addBox(slide, { name: 's41-does', position: { left: 72, top: 155, width: 542, height: 421 }, fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.8 });
  addBox(slide, { name: 's41-does-not', position: { left: 666, top: 155, width: 542, height: 421 }, fill: COLORS.redTint, lineColor: COLORS.red, lineWidth: 1.8 });
  addTextBox(slide, { name: 's41-does-title', position: { left: 96, top: 174, width: 494, height: 32 }, text: 'THIS PACKAGE DEMONSTRATES', fontSize: 18, color: COLORS.green, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's41-does-body', position: { left: 102, top: 218, width: 482, height: 329 },
    text: '✓ Current saved models update / compile\n✓ Standalone desktop MIL behavior\n✓ Model-reference integration structure\n✓ MATLAB-driven limiter harness assessments\n✓ CSV + script + path + result associations\n✓ One saved SDI run, view, and session\n✓ Retained CSV, MAT, HTML, PNG, and visual exports',
    fontSize: 18, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 4, right: 8, bottom: 4, left: 8 } });
  addTextBox(slide, { name: 's41-does-not-title', position: { left: 690, top: 174, width: 494, height: 32 }, text: 'THIS PACKAGE DOES NOT CLAIM', fontSize: 18, color: COLORS.red, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's41-does-not-body', position: { left: 696, top: 218, width: 482, height: 329 },
    text: '× Production aircraft data or approved baseline\n× Live Simulink Requirements links\n× Simulink Test / Test Manager suite\n× Production-code generation or code verification\n× SIL, PIL, HIL, bench, or system-integration execution\n× Certification approval\n× Automatic compliance from a model or pipeline',
    fontSize: 18, color: COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 4, right: 8, bottom: 4, left: 8 } });
  addBox(slide, { name: 's41-mldatx', position: { left: 72, top: 596, width: 1136, height: 45 }, text: 'Exactly two .mldatx files are retained, and both are Simulation Data Inspector artifacts.', fill: COLORS.navy, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 17, textColor: COLORS.white });
}

// Slide 42 — executable first-week close plus verified baseline.
{
  const slide = presentation.slides.items[41];
  const actions = [
    '01  initialize folders + open the correct top level',
    '02  update, run, stop, build, and test distinctly',
    '03  toggle units, types, dimensions, names + badges',
    '04  inspect one run and five signals in Data Inspector',
    '05  trace PSYS-001 to the executed Iteration 8 PASS',
    '06  make one controlled change; rerun affected evidence',
  ];
  ['box-511','box-512','box-513','box-514','box-515','box-516'].forEach((name, i) => {
    const shape = findByName(slide, name, false);
    if (shape) setText(shape, actions[i], { fontSize: 16.8, color: COLORS.white, bold: true, alignment: 'left', insets: { top: 3, right: 10, bottom: 3, left: 14 } });
  });
  const takeaway = findByName(slide, 'box-517', false);
  if (takeaway) setText(takeaway, 'VERIFIED STARTING POINT  •  8/8 models updated  •  19/19 assessments passed  •  24/24 required exports present', { fontSize: 19.5, color: COLORS.white, bold: true, alignment: 'center' });
}

// Replace every speaker-note page; never append legacy V2/V3/V4 update paragraphs.
for (let index = 0; index < presentation.slides.items.length; index += 1) {
  const entry = notes.find((item) => item.slide === index + 1);
  if (!entry) throw new Error(`Missing notes for slide ${index + 1}`);
  const slide = presentation.slides.items[index];
  slide.speakerNotes.textFrame.setText(formatNotes(entry));
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

await fs.writeFile(path.join(buildDir, 'authoring-summary.json'), JSON.stringify({
  outputPptxPath,
  slideCount: presentation.slides.items.length,
  inheritedSlidesRevised: 33,
  gallerySlidesAdded: 9,
  renderedSlides: presentation.slides.items.length,
  notesVisible: presentation.slides.items.map((slide, index) => ({ slide: index + 1, visible: slide.speakerNotes.isVisible() })),
}, null, 2), 'utf8');

console.log(`OUTPUT_PPTX=${outputPptxPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`RENDER_COUNT=${presentation.slides.items.length}`);
