import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(buildDir));
const starterPath = path.join(buildDir, 'template-starter-frame.pptx');
const outputPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v8.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');
const map = JSON.parse(await fs.readFile(path.join(buildDir, 'template-frame-map.json'), 'utf8'));
const plan = JSON.parse(await fs.readFile(path.join(buildDir, 'v7-to-v8-slide-plan.json'), 'utf8'));
const notes = JSON.parse(await fs.readFile(path.join(buildDir, 'notes-v8.json'), 'utf8'));
const sourceByOutput = map.outputSlides.map((entry) => entry.sourceSlide);

const ASSETS = {
  dictionary: path.join(projectRoot, 'screenshots', 'FCS_Data_ModelExplorer_FlightControlBus.jpg'),
  limiterRoot: path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Model.png'),
  limiterLogic: path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Implementation.png'),
  harness: path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Harness.png'),
  sdi: path.join(projectRoot, 'screenshots', 'SimulationDataInspector_Onboarding.jpg'),
  limiterReport: path.join(projectRoot, 'reports', 'PitchRateLimiter_TestReport.png'),
  stateflowRoot: path.join(projectRoot, 'screenshots', 'AutopilotModeLogic_Model.png'),
  stateflowChart: path.join(projectRoot, 'screenshots', 'AutopilotModeLogic_Stateflow_Editor.jpg'),
  sensor: path.join(projectRoot, 'screenshots', 'SensorProcessingRef_Model.png'),
  limiter: path.join(projectRoot, 'screenshots', 'PitchRateLimiter_Model.png'),
  controller: path.join(projectRoot, 'screenshots', 'PitchControllerRef_Model.png'),
  actuator: path.join(projectRoot, 'screenshots', 'ActuatorCommandRef_Model.png'),
  settings: 'C:/Users/Tyler/AppData/Local/Temp/codex-clipboard-d9e899b5-6682-46cb-a779-dad318695522.png',
};
const BUILD_ROOT = path.join(projectRoot, 'results', 'top_level_codegen_v8_evidence');
const BUILD_LOG = path.join(BUILD_ROOT, 'ReferencedFlightControlArchitecture_slbuild.log');
const BUILD_MANIFEST = path.join(BUILD_ROOT, 'Build_Evidence_Manifest.txt');
const GENERATED_C = path.join(BUILD_ROOT, 'codegen', 'ReferencedFlightControlArchitecture_grt_rtw', 'ReferencedFlightControlArchitecture.c');

for (const p of [starterPath, ...Object.values(ASSETS), BUILD_LOG, BUILD_MANIFEST, GENERATED_C]) await fs.access(p);

const COLORS = {
  bg: '#F4F8FB', ink: '#0B1F33', body: '#17324A', muted: '#5D7487', rule: '#C9D8E3',
  navy: '#0B2438', dark: '#071521', panelDark: '#0C2133', panelDarker: '#091A29',
  blue: '#2D6CDF', blueTint: '#E2ECFF', teal: '#20B7C5', tealTint: '#DFF6F8',
  amber: '#E9A23B', amberTint: '#FFF0D7', green: '#2CA56F', greenTint: '#E2F4EA',
  red: '#D75A64', redTint: '#FBE7E9', white: '#FFFFFF', slate: '#7D91A0', pale: '#EEF4F8',
};

const darkSourceSlides = new Set([1, 3, 5, 12, 14, 28, 30, 31, 35, 40, 41, 43, 44, 48, 49, 51, 52, 55]);
const replacementSlides = new Set(map.outputSlides.filter((entry) => entry.editTargets?.some((t) => t.action === 'replace')).map((entry) => entry.outputSlide));
const planSlides = Array.isArray(plan) ? plan : plan.slides;
const planBySlide = new Map(planSlides.map((entry) => [entry.v8Slide ?? entry.slide, entry]));

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
      typeface: style.typeface ?? 'Aptos', fontSize: style.fontSize ?? 18,
      color: style.color ?? COLORS.ink, bold: style.bold ?? false,
      alignment: style.alignment ?? 'left', verticalAlignment: style.verticalAlignment ?? 'middle',
      insets: style.insets ?? { top: 3, right: 5, bottom: 3, left: 5 },
      wrap: style.wrap ?? 'square', autoFit: style.autoFit ?? 'none',
    };
  }
  return shape;
}

function addTextBox(slide, { name, position, text, fontSize = 18, color = COLORS.ink, bold = false,
  alignment = 'left', verticalAlignment = 'middle', insets = { top: 3, right: 5, bottom: 3, left: 5 },
  wrap = 'square', autoFit = 'none', typeface = 'Aptos' }) {
  const shape = slide.shapes.add({ geometry: 'textbox', name, position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  setText(shape, text, { fontSize, color, bold, alignment, verticalAlignment, insets, wrap, autoFit, typeface });
  return shape;
}

function addBox(slide, { name, position, text = '', fill = COLORS.white, lineColor = COLORS.rule,
  lineWidth = 1.3, fontSize = 18, textColor = COLORS.ink, bold = true, alignment = 'center',
  verticalAlignment = 'middle', insets = { top: 5, right: 9, bottom: 5, left: 9 }, geometry = 'roundRect', typeface = 'Aptos' }) {
  const shapeSpec = { geometry, name, position, fill, line: { style: 'solid', fill: lineColor, width: lineWidth } };
  if (['rect', 'textbox', 'roundRect'].includes(geometry)) shapeSpec.borderRadius = 'rounded-xl';
  const shape = slide.shapes.add(shapeSpec);
  if (text) setText(shape, text, { fontSize, color: textColor, bold, alignment, verticalAlignment, insets, typeface });
  return shape;
}

function addLine(slide, { name, left, top, width, height = 0, color = COLORS.rule, lineWidth = 2 }) {
  return slide.shapes.add({ geometry: 'line', name, position: { left, top, width, height }, fill: 'none', line: { style: 'solid', fill: color, width: lineWidth } });
}

async function addImage(slide, filePath, position, alt) {
  const contentType = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : 'image/png';
  return slide.images.add({ blob: new Uint8Array(await fs.readFile(filePath)), contentType, alt, fit: 'contain', position });
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

function isDark(slideNumber) { return darkSourceSlides.has(sourceByOutput[slideNumber - 1]); }

function styleTitle(shape, text, dark) {
  const size = text.length > 83 ? 31.5 : text.length > 70 ? 34 : text.length > 58 ? 36.5 : 40;
  shape.position = { left: 72, top: 66, width: 1136, height: 56 };
  setText(shape, text, { fontSize: size, color: dark ? COLORS.white : COLORS.ink, bold: true, alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
}

function setChrome(slide, slideNumber) {
  const chrome = findChrome(slide);
  const entry = planBySlide.get(slideNumber);
  if (!entry || !chrome.page) throw new Error(`Missing plan or page chrome for slide ${slideNumber}`);
  const dark = isDark(slideNumber);
  chrome.page.position = { left: 1156, top: 676, width: 52, height: 22 };
  setText(chrome.page, String(slideNumber).padStart(2, '0'), { fontSize: 14, color: dark ? '#70DCE5' : COLORS.teal, bold: true, alignment: 'right', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 }, wrap: 'none' });
  if (chrome.section) {
    chrome.section.position = { left: 72, top: 30, width: 760, height: 26 };
    setText(chrome.section, entry.section ?? 'ONBOARDING', { fontSize: 14.5, color: COLORS.teal, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 2, right: 2, bottom: 2, left: 2 } });
  }
  if (chrome.title) styleTitle(chrome.title, entry.title, dark);
  if (chrome.divider) chrome.divider.position = { left: 72, top: 127, width: 1136, height: 0 };
  if (chrome.footer) {
    chrome.footer.position = { left: 72, top: 678, width: 550, height: 20 };
    setText(chrome.footer, slideNumber >= 49 ? 'AVIATION CONTROLS ENGINEERING ONBOARDING  •  APPENDIX' : 'AVIATION CONTROLS ENGINEERING ONBOARDING', { fontSize: 11.5, color: COLORS.slate, bold: true, alignment: 'left', verticalAlignment: 'top', insets: { top: 0, right: 0, bottom: 0, left: 0 } });
  }
}

function addBadge(slide, { name, left, top, width, text, fill, color = COLORS.white }) {
  return addBox(slide, { name, position: { left, top, width, height: 30 }, text, fill, lineColor: fill, lineWidth: 0, fontSize: 12.8, textColor: color, bold: true });
}

function addBulletList(slide, { name, left, top, width, height, items, color = COLORS.body, fontSize = 16, leading = 31, bulletColor = COLORS.teal }) {
  items.forEach((item, i) => {
    const y = top + i * leading;
    addBox(slide, { name: `${name}-dot-${i}`, position: { left, top: y + 9, width: 9, height: 9 }, fill: bulletColor, lineColor: bulletColor, lineWidth: 0, geometry: 'ellipse' });
    addTextBox(slide, { name: `${name}-text-${i}`, position: { left: left + 20, top: y, width: width - 20, height: Math.min(leading, height - i * leading) }, text: item, fontSize, color, bold: false, verticalAlignment: 'top', insets: { top: 2, right: 1, bottom: 1, left: 1 } });
  });
}

function addSectionStrip(slide, { name, top = 586, text, dark = false, kind = 'teal' }) {
  const palette = kind === 'amber' ? [COLORS.amberTint, COLORS.amber, COLORS.dark] : kind === 'green' ? [COLORS.greenTint, COLORS.green, COLORS.dark] : dark ? [COLORS.panelDark, COLORS.teal, COLORS.white] : [COLORS.tealTint, COLORS.teal, COLORS.ink];
  return addBox(slide, { name, position: { left: 72, top, width: 1136, height: 54 }, text, fill: palette[0], lineColor: palette[1], lineWidth: 1.3, fontSize: 14.5, textColor: palette[2], bold: true });
}

function noteText(entry) {
  const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];
  const blocks = [
    `Timing: ${entry.timing ?? '2 minutes'}`,
    `Mode: ${entry.mode ?? 'Instructor-led or self-guided'}`,
    entry.prerequisite ? `Prerequisite: ${entry.prerequisite}` : '',
    entry.talkTrack ?? '',
    entry.do ? `Do\n${arr(entry.do).map((x) => `- ${x}`).join('\n')}` : '',
    entry.expected ? `Expected\n${arr(entry.expected).map((x) => `- ${x}`).join('\n')}` : '',
    entry.recovery ? `Recovery\n${arr(entry.recovery).map((x) => `- ${x}`).join('\n')}` : '',
    `Caveats\n${arr(entry.caveats).map((x) => `- ${x}`).join('\n')}`,
    `[Sources]\n${arr(entry.sources).map((x) => `- ${x}`).join('\n')}`,
  ];
  return blocks.filter(Boolean).join('\n\n');
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPath));
if (presentation.slides.items.length !== 55) throw new Error(`Expected 55 slides, found ${presentation.slides.items.length}`);
for (let i = 0; i < 55; i += 1) setChrome(presentation.slides.items[i], i + 1);

// Slide 1 — preserve the title composition but promise a reproducible learner outcome.
{
  const slide = presentation.slides.items[0];
  const subtitle = findShape(slide, (shape) => textValue(shape).includes('First-session workflow'), 'title-slide subtitle');
  setText(subtitle, 'First-session orientation • self-guided limiter creation lab • desktop MIL evidence • bounded assurance context', {
    fontSize: 20, color: COLORS.slate, bold: false, alignment: 'left', verticalAlignment: 'middle',
    insets: { top: 2, right: 2, bottom: 2, left: 2 },
  });
  addBox(slide, { name: 's1-self-guided', position: { left: 72, top: 462, width: 760, height: 44 }, text: 'SELF-GUIDED  •  keep PowerPoint Notes view and README.md open side-by-side', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.2, fontSize: 14.5, textColor: COLORS.white, alignment: 'left' });
}

// Slide 2 — absolute summary and learner outcome.
{
  const slide = presentation.slides.items[1];
  const cards = [
    ['8 / 8', 'MODEL UPDATE / COMPILE\nACCEPTED', COLORS.teal],
    ['19 / 19', 'ASSESSMENT POINTS\nPASS', COLORS.green],
    ['24 / 24', 'VALIDATOR-DEFINED\nEXPORTS PRESENT', COLORS.blue],
    ['5 / 5', 'GRT MODELS\nBUILT', COLORS.amber],
  ];
  cards.forEach(([value, label, accent], i) => {
    const x = 72 + i * 288;
    addBox(slide, { name: `s2-card-${i}`, position: { left: x, top: 152, width: 264, height: 108 }, fill: COLORS.white, lineColor: accent, lineWidth: 2 });
    addTextBox(slide, { name: `s2-value-${i}`, position: { left: x + 12, top: 167, width: 240, height: 42 }, text: value, fontSize: 29, color: accent, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s2-label-${i}`, position: { left: x + 12, top: 210, width: 240, height: 38 }, text: label, fontSize: 12.8, color: COLORS.body, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's2-baseline', position: { left: 72, top: 286, width: 548, height: 245 }, fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.4 });
  addTextBox(slide, { name: 's2-baseline-title', position: { left: 94, top: 302, width: 500, height: 30 }, text: 'RETAINED BASELINE', fontSize: 16, color: COLORS.green, bold: true });
  addBulletList(slide, { name: 's2-baseline-list', left: 100, top: 344, width: 488, height: 165, fontSize: 15.2, leading: 36, bulletColor: COLORS.green, items: [
    'Eight saved models; all referenced Model blocks saved in Normal mode',
    'FCS_Data.sldd: 31 Design Data entries and a five-element bus',
    'One saved SDI run, one harness driver, and traceable result files',
    'Portable top-level GRT build helper plus retained v8 build evidence',
  ] });
  addBox(slide, { name: 's2-outcome', position: { left: 660, top: 286, width: 548, height: 245 }, fill: COLORS.blueTint, lineColor: COLORS.blue, lineWidth: 1.4 });
  addTextBox(slide, { name: 's2-outcome-title', position: { left: 682, top: 302, width: 500, height: 30 }, text: 'LEARNER OUTCOME', fontSize: 16, color: COLORS.blue, bold: true });
  addBulletList(slide, { name: 's2-outcome-list', left: 688, top: 344, width: 488, height: 165, fontSize: 15.2, leading: 36, bulletColor: COLORS.blue, items: [
    'Create an authorized limiter practice model from controlled data',
    'Explain saved settings versus run-time overrides',
    'Use Ctrl+D, Run, and build for their distinct purposes',
    'Read the SDI and limiter plots and name every unsupported claim',
  ] });
  addSectionStrip(slide, { name: 's2-boundary', top: 558, text: 'BOUNDARY  •  desktop training evidence only  •  executable built, not run  •  no SIL/PIL/HIL, Model Advisor result, Polyspace result, RCF, or certification approval', kind: 'amber' });
}

// Slide 3 — distinguish retained/present artifacts from freshness claims.
{
  const slide = presentation.slides.items[2];
  const retainedTitle = findShape(slide, (shape) => String(shape.name || '') === 's3-col-title-0', 'retained status title');
  const retainedBody = findShape(slide, (shape) => String(shape.name || '') === 's3-col-body-0', 'retained status body');
  setText(retainedTitle, 'RETAINED / PRESENT', { fontSize: 16, color: COLORS.teal, bold: true, alignment: 'center' });
  setText(retainedBody, '✓ 8/8 model updates\n\n✓ 19/19 assessment rows\n\n✓ 24/24 named exports present\n   (presence-only check)\n\n✓ SDI view + session present\n   (freshness not established)\n\n✓ 5/5 GRT models built', { fontSize: 13.6, color: COLORS.white, bold: false, verticalAlignment: 'top' });
}

// Slide 4 — route map.
{
  const slide = presentation.slides.items[3];
  const routes = [
    ['01', 'INSTRUCTOR ONBOARDING', 'Slides 1–12, 20–34, 47–48', 'Orient, operate, interpret, and close'],
    ['02', 'SELF-GUIDED CREATION LAB', 'Slides 13–19', 'Build the practice limiter safely'],
    ['03', 'ASSURANCE WORKFLOW', 'Slides 35–46', 'Advisor, traceability, CI, environments, sign-off'],
    ['04', 'REFERENCE APPENDIX', 'Slides 49–55', 'Glossary, model gallery, overlays, callbacks'],
  ];
  routes.forEach(([n, title, range, desc], i) => {
    const x = 72 + i * 288;
    addBox(slide, { name: `s4-route-${i}`, position: { left: x, top: 170, width: 264, height: 286 }, fill: COLORS.panelDark, lineColor: i === 1 ? COLORS.amber : COLORS.teal, lineWidth: 1.7 });
    addBadge(slide, { name: `s4-num-${i}`, left: x + 18, top: 188, width: 52, text: n, fill: i === 1 ? COLORS.amber : COLORS.teal, color: COLORS.dark });
    addTextBox(slide, { name: `s4-title-${i}`, position: { left: x + 18, top: 232, width: 228, height: 70 }, text: title, fontSize: 18, color: COLORS.white, bold: true, verticalAlignment: 'top' });
    addTextBox(slide, { name: `s4-range-${i}`, position: { left: x + 18, top: 312, width: 228, height: 42 }, text: range, fontSize: 14.2, color: i === 1 ? COLORS.amber : '#70DCE5', bold: true });
    addTextBox(slide, { name: `s4-desc-${i}`, position: { left: x + 18, top: 365, width: 228, height: 70 }, text: desc, fontSize: 14.5, color: COLORS.white, bold: false, verticalAlignment: 'top' });
  });
  addSectionStrip(slide, { name: 's4-start', top: 510, dark: true, text: 'RECOMMENDED NEW-HIRE ROUTE  •  1–12 → 13–19 → 20–34 → 35–48  •  use 49–55 when a reference view is needed' });
}

// Slide 6 — capstone mission.
{
  const slide = presentation.slides.items[5];
  addBox(slide, { name: 's6-mission', position: { left: 72, top: 156, width: 1136, height: 72 }, text: 'MISSION  •  create a uniquely named limiter + matching practice harness, execute its learner-local evidence, and defend every claim', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 20, textColor: COLORS.white });
  const stages = [
    ['1', 'CREATE', 'ports • parameters • logic'],
    ['2', 'CONFIGURE', 'dictionary • 50 Hz • logging'],
    ['3', 'UPDATE', 'Ctrl+D • resolve semantics'],
    ['4', 'EXECUTE', 'practice driver • one 0.36 s MIL run'],
    ['5', 'EXPLAIN', 'SDI • plots • traceability'],
    ['6', 'HAND OFF', 'checklist • open gates'],
  ];
  stages.forEach(([n, title, body], i) => {
    const x = 72 + (i % 3) * 384;
    const y = 260 + Math.floor(i / 3) * 142;
    addBox(slide, { name: `s6-stage-${i}`, position: { left: x, top: y, width: 352, height: 112 }, fill: COLORS.panelDarker, lineColor: i === 5 ? COLORS.amber : COLORS.teal, lineWidth: 1.2 });
    addBadge(slide, { name: `s6-stage-num-${i}`, left: x + 16, top: y + 18, width: 42, text: n, fill: i === 5 ? COLORS.amber : COLORS.teal, color: COLORS.dark });
    addTextBox(slide, { name: `s6-stage-title-${i}`, position: { left: x + 72, top: y + 15, width: 250, height: 32 }, text: title, fontSize: 17.2, color: COLORS.white, bold: true });
    addTextBox(slide, { name: `s6-stage-body-${i}`, position: { left: x + 72, top: y + 50, width: 250, height: 42 }, text: body, fontSize: 14.2, color: COLORS.slate, bold: false });
  });
  addSectionStrip(slide, { name: 's6-rule', top: 564, dark: true, text: 'PASS CONDITION  •  another new hire can repeat the chain from the repository root without relying on the author’s memory' });
}

// Slide 7 — preflight.
{
  const slide = presentation.slides.items[6];
  const columns = [
    ['READY', COLORS.green, COLORS.greenTint, ['Current Folder is the repository root', 'MATLAB + Simulink available', 'Stateflow available for the full baseline', 'Authorized working copy; Notes + README open']],
    ['BASELINE / BUILD', COLORS.blue, COLORS.blueTint, ['FCS_Data.sldd, models, and scripts exist', '8/8, 19/19, and 24/24 retained', 'GRT build: Windows + Simulink Coder', 'Supported C/C++ compiler is selected']],
    ['STOP & RECOVER', COLORS.red, COLORS.redTint, ['Root/dictionary/product check fails', 'Compiler is missing or not selected', 'Unexpected dirty/shared-data change appears', 'Do not run a writer during orientation-only review']],
  ];
  columns.forEach(([title, accent, fill, items], i) => {
    const x = 72 + i * 384;
    addBox(slide, { name: `s7-col-${i}`, position: { left: x, top: 164, width: 352, height: 356 }, fill, lineColor: accent, lineWidth: 1.4 });
    addTextBox(slide, { name: `s7-title-${i}`, position: { left: x + 20, top: 184, width: 312, height: 38 }, text: title, fontSize: 17, color: accent, bold: true, alignment: 'center' });
    addBulletList(slide, { name: `s7-list-${i}`, left: x + 28, top: 236, width: 296, height: 254, items, fontSize: 14.2, leading: 58, bulletColor: accent });
  });
  addSectionStrip(slide, { name: 's7-copy', top: 556, text: 'WRITE BOUNDARY  •  initialization saves FCS_Data.sldd; baseline drivers replace fixed evidence files. Orientation-only open/inspect steps do neither.', kind: 'amber' });
}

// Slide 8 — portable initialization and controlled evidence commands.
{
  const slide = presentation.slides.items[7];
  addBox(slide, { name: 's8-write-warning', position: { left: 72, top: 146, width: 1136, height: 48 }, text: 'WRITE-PRODUCING REFRESH  •  authorize dictionary and retained-evidence replacement before running this sequence', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 14.2, textColor: COLORS.dark });
  addBox(slide, { name: 's8-code-panel', position: { left: 72, top: 210, width: 716, height: 370 }, fill: '#091A29', lineColor: COLORS.teal, lineWidth: 1.3 });
  const code = `projectRoot = pwd;\nassert(isfile(fullfile(projectRoot,'README.md')), ...\n    'Start MATLAB in the repository root.');\naddpath(fullfile(projectRoot,'scripts'), ...\n        fullfile(projectRoot,'models'), ...\n        fullfile(projectRoot,'data'));\ninitialize_training_data(projectRoot);\nopen_system(fullfile(projectRoot,'models', ...\n    'AircraftFeedbackControlLoop.slx'));\nset_param('AircraftFeedbackControlLoop', ...\n    'SimulationCommand','update');\nrun_training_simulations(projectRoot);\nrun_pitch_rate_limiter_tests(projectRoot);`;
  addTextBox(slide, { name: 's8-code', position: { left: 96, top: 224, width: 668, height: 342 }, text: code, fontSize: 13.8, color: COLORS.white, bold: false, verticalAlignment: 'top', insets: { top: 8, right: 8, bottom: 8, left: 8 }, typeface: 'Consolas' });
  addTextBox(slide, { name: 's8-right-title', position: { left: 830, top: 216, width: 348, height: 34 }, text: 'EXPECTED', fontSize: 17, color: COLORS.teal, bold: true });
  addBulletList(slide, { name: 's8-expected', left: 838, top: 260, width: 340, height: 150, items: ['Managed dictionary entries refresh', 'AircraftFeedbackControlLoop updates', 'Baseline evidence files are replaced'], fontSize: 14.8, leading: 48 });
  addTextBox(slide, { name: 's8-recovery-title', position: { left: 830, top: 430, width: 348, height: 34 }, text: 'RECOVERY', fontSize: 17, color: COLORS.amber, bold: true });
  addBulletList(slide, { name: 's8-recovery', left: 838, top: 470, width: 340, height: 96, items: ['If the assertion fails, change Current Folder', 'Use README orientation-only steps when writes are not authorized'], fontSize: 13.8, leading: 48, bulletColor: COLORS.amber });
  addSectionStrip(slide, { name: 's8-scope', top: 596, text: 'The drivers create the retained evidence. A raw Run button press does not recreate the scripted command, disturbance, oracle, or reports.', kind: 'amber' });
}

// Slide 10 — choose the workflow before touching the baseline.
{
  const slide = presentation.slides.items[9];
  const choices = [
    ['A', 'OPERATE DELIVERED BASELINE', 'initialize → open → Ctrl+D → run controlled drivers', 'Default onboarding route', COLORS.teal],
    ['B', 'CREATE A PRACTICE COMPONENT', 'new authorized copy → attach dictionary → build ports/logic → update', 'Slides 13–19', COLORS.amber],
    ['C', 'REGENERATE TRAINING PACKAGE', 'create_training_models / refresh scripts', 'Maintainer-only: replaces saved models and visuals', COLORS.red],
  ];
  choices.forEach(([letter, title, flow, use, accent], i) => {
    const x = 72 + i * 384;
    addBox(slide, { name: `s10-choice-${i}`, position: { left: x, top: 174, width: 352, height: 314 }, fill: COLORS.panelDark, lineColor: accent, lineWidth: 1.6 });
    addBadge(slide, { name: `s10-letter-${i}`, left: x + 20, top: 192, width: 46, text: letter, fill: accent, color: COLORS.dark });
    addTextBox(slide, { name: `s10-title-${i}`, position: { left: x + 78, top: 190, width: 248, height: 58 }, text: title, fontSize: 16.5, color: COLORS.white, bold: true, verticalAlignment: 'top' });
    addTextBox(slide, { name: `s10-flow-${i}`, position: { left: x + 22, top: 274, width: 308, height: 94 }, text: flow, fontSize: 15, color: '#D9E6EE', bold: false, alignment: 'center' });
    addBox(slide, { name: `s10-use-${i}`, position: { left: x + 22, top: 392, width: 308, height: 70 }, text: use, fill: COLORS.panelDarker, lineColor: accent, lineWidth: 1, fontSize: 13.6, textColor: accent });
  });
  addSectionStrip(slide, { name: 's10-warning', top: 536, dark: true, kind: 'amber', text: 'STOP BEFORE OPTION C  •  regeneration is intentionally broad and can replace layouts, baselines, and evidence; use only when that is the authorized task' });
}

// Slide 13 — build-lab overview.
{
  const slide = presentation.slides.items[12];
  addBox(slide, { name: 's13-rule', position: { left: 72, top: 146, width: 1136, height: 64 }, text: "SAFE SANDBOX  •  create_pitch_rate_limiter_practice(projectRoot,'TLEE')\n→ learner_workspace/TLEE/models/PitchRateLimiter_Practice_TLEE.slx + matching Harness.slx", fill: COLORS.panelDark, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 14.5, textColor: COLORS.white, typeface: 'Consolas' });
  const stages = [
    ['01', 'SAFE CREATE', 'unique tag • no baseline overwrite'],
    ['02', 'MODEL SHELL', 'five exact ports + dictionary'],
    ['03', 'CONFIGURATION', 'fixed-step discrete • Sample_time'],
    ['04', 'LIMITER LOGIC', 'AND • clamp • switch • active'],
    ['05', 'OBSERVABILITY', 'logging • test-point rationale'],
    ['06', 'PRACTICE TEST', 'matching harness • learner evidence'],
  ];
  stages.forEach(([n, title, body], i) => {
    const x = 72 + (i % 3) * 384;
    const y = 232 + Math.floor(i / 3) * 144;
    addBox(slide, { name: `s13-stage-${i}`, position: { left: x, top: y, width: 352, height: 116 }, fill: COLORS.panelDarker, lineColor: i === 5 ? COLORS.amber : COLORS.teal, lineWidth: 1.2 });
    addBadge(slide, { name: `s13-num-${i}`, left: x + 16, top: y + 18, width: 50, text: n, fill: i === 5 ? COLORS.amber : COLORS.teal, color: COLORS.dark });
    addTextBox(slide, { name: `s13-title-${i}`, position: { left: x + 80, top: y + 16, width: 246, height: 34 }, text: title, fontSize: 16, color: COLORS.white, bold: true });
    addTextBox(slide, { name: `s13-body-${i}`, position: { left: x + 80, top: y + 54, width: 246, height: 42 }, text: body, fontSize: 13.6, color: COLORS.slate, bold: false, verticalAlignment: 'top' });
  });
  addSectionStrip(slide, { name: 's13-deliverable', top: 548, dark: true, text: 'SHADOWING GUARD  •  which -all PitchRateLimiter must resolve first to models/PitchRateLimiter.slx; never add learner_workspace/.../models to the permanent path' });
}

// Slide 14 — lab step 1: model shell, controlled data, and configuration.
{
  const slide = presentation.slides.items[13];
  await addImage(slide, ASSETS.dictionary, { left: 576, top: 160, width: 612, height: 370 }, 'Model Explorer showing FCS_Data.sldd and FlightControlBus');
  addBadge(slide, { name: 's14-step', left: 72, top: 158, width: 118, text: 'STEP 1 OF 6', fill: COLORS.teal, color: COLORS.dark });
  addTextBox(slide, { name: 's14-left-title', position: { left: 72, top: 206, width: 458, height: 58 }, text: 'Start from controlled data, then create the model shell', fontSize: 21, color: COLORS.ink, bold: true, verticalAlignment: 'top' });
  addBulletList(slide, { name: 's14-actions', left: 82, top: 286, width: 450, height: 220, items: [
    "Run create_pitch_rate_limiter_practice(projectRoot,'TLEE')",
    'Open practiceSummary.ModelFile—not the delivered baseline',
    'Inspect its FCS_Data.sldd attachment and five-port shell',
    'Confirm Fixed-step / discrete and FixedStep = Sample_time',
  ], fontSize: 15.6, leading: 52 });
  addBox(slide, { name: 's14-expected', position: { left: 72, top: 526, width: 500, height: 74 }, text: 'EXPECTED  •  Sample_time, q_limit_normal, and q_fallback_command resolve from the dictionary', fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.2, fontSize: 14.5, textColor: COLORS.dark });
  addBox(slide, { name: 's14-recovery', position: { left: 596, top: 546, width: 592, height: 54 }, text: 'RECOVERY  •  verify the repository root, dictionary attachment, and path—do not hard-code a user path', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.2, fontSize: 14.2, textColor: COLORS.dark });
}

// Slide 16 — exact limiter block settings and connections for manual review/recreation.
{
  const slide = presentation.slides.items[15];
  addBox(slide, { name: 's16-rule', position: { left: 72, top: 146, width: 1136, height: 48 }, text: 'MANUAL EQUIVALENT  •  these settings are the executable contract created by the safe helper; inspect every value before Ctrl+D', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 14.4, textColor: COLORS.white });
  const rows = [
    ['Normal AND Valid', 'Logical Operator', 'AND • 2 inputs', 'normal_mode + input_valid'],
    ['Magnitude Clamp', 'Saturation', 'Upper q_limit_normal • Lower -q_limit_normal', 'q_cmd_in → clamped command'],
    ['Training Fallback Command', 'Constant', 'Value q_fallback_command • Ts Sample_time', 'fallback data input'],
    ['Select Valid Command', 'Switch', 'Criteria u2 ~= 0 • Threshold 0.5', 'clamp / valid / fallback'],
    ['Above / Below Limit', 'Relational Operator', '> positive • < negative', 'strictly outside ± limit'],
    ['Outside Range / Valid Active', 'Logical Operator', 'OR • then AND with normal_and_valid', 'limiter_active status'],
  ];
  const widths = [250, 194, 410, 282];
  const headers = ['BLOCK', 'TYPE', 'EXACT PARAMETERS', 'CONNECTION / PURPOSE'];
  let x = 72;
  headers.forEach((header, i) => {
    addBox(slide, { name: `s16-head-${i}`, position: { left: x, top: 216, width: widths[i], height: 42 }, text: header, fill: COLORS.navy, lineColor: COLORS.rule, lineWidth: 0.8, fontSize: 12.2, textColor: COLORS.white, geometry: 'rect' });
    x += widths[i];
  });
  rows.forEach((row, r) => {
    let cellX = 72;
    row.forEach((cell, c) => {
      addBox(slide, { name: `s16-cell-${r}-${c}`, position: { left: cellX, top: 258 + r * 50, width: widths[c], height: 46 }, text: cell, fill: r % 2 ? COLORS.pale : COLORS.white, lineColor: COLORS.rule, lineWidth: 0.7, fontSize: c === 2 ? 11.7 : 12.2, textColor: COLORS.body, bold: c === 0, alignment: 'left', geometry: 'rect', insets: { top: 3, right: 5, bottom: 3, left: 6 } });
      cellX += widths[c];
    });
  });
  addBox(slide, { name: 's16-boundary', position: { left: 72, top: 580, width: 1136, height: 54 }, text: 'BOUNDARY SEMANTICS  •  exactly ±q_limit_normal passes unchanged and limiter_active = false; invalid or non-normal input selects q_fallback_command', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1.2, fontSize: 14, textColor: COLORS.dark });
}

// Slide 15 — lab step 2: interface contract.
{
  const slide = presentation.slides.items[14];
  await addImage(slide, ASSETS.limiterRoot, { left: 72, top: 190, width: 760, height: 386 }, 'PitchRateLimiter model root showing input and output ports');
  addBadge(slide, { name: 's15-step', left: 72, top: 150, width: 118, text: 'STEP 2 OF 6', fill: COLORS.teal, color: COLORS.dark });
  addBox(slide, { name: 's15-contract', position: { left: 858, top: 160, width: 330, height: 416 }, fill: COLORS.white, lineColor: COLORS.blue, lineWidth: 1.5 });
  addTextBox(slide, { name: 's15-contract-title', position: { left: 878, top: 178, width: 290, height: 34 }, text: 'PORT CONTRACT', fontSize: 17, color: COLORS.blue, bold: true, alignment: 'center' });
  const ports = [
    ['q_cmd_in', 'double • deg/s', 'command'],
    ['normal_mode', 'boolean • 1', 'enable'],
    ['input_valid', 'boolean • 1', 'validity'],
    ['q_cmd_out', 'double • deg/s', 'limited output'],
    ['limiter_active', 'boolean • 1', 'status'],
  ];
  ports.forEach(([name, type, role], i) => {
    const y = 226 + i * 64;
    addTextBox(slide, { name: `s15-port-${i}`, position: { left: 882, top: y, width: 278, height: 24 }, text: name, fontSize: 15.2, color: COLORS.ink, bold: true });
    addTextBox(slide, { name: `s15-port-meta-${i}`, position: { left: 882, top: y + 23, width: 278, height: 28 }, text: `${type}  •  ${role}`, fontSize: 12.8, color: COLORS.muted, bold: false });
  });
  addSectionStrip(slide, { name: 's15-rule', top: 596, text: 'CHECK BEFORE LOGIC  •  names, direction, types, dimensions, units, and status semantics are part of the interface—not decoration' });
}

// Slide 18 — saved settings versus effective execution settings.
{
  const slide = presentation.slides.items[17];
  await addImage(slide, ASSETS.settings, { left: 72, top: 160, width: 650, height: 424 }, 'Configuration Parameters Solver page for AircraftFeedbackControlLoop');
  addBox(slide, { name: 's18-matrix', position: { left: 754, top: 160, width: 434, height: 316 }, fill: COLORS.white, lineColor: COLORS.blue, lineWidth: 1.4 });
  addTextBox(slide, { name: 's18-matrix-title', position: { left: 772, top: 178, width: 398, height: 34 }, text: 'SAVED ≠ EFFECTIVE', fontSize: 18, color: COLORS.blue, bold: true, alignment: 'center' });
  const rows = [
    ['MODEL', 'SAVED STOP', 'DRIVER STOP'],
    ['AircraftFeedbackControlLoop', '12 s', '20 s'],
    ['PitchRateLimiter_Harness', '2 s', '0.36 s'],
    ['Fixed step', 'Sample_time', '0.02 s'],
  ];
  rows.forEach((row, i) => {
    const y = 228 + i * 54;
    const fill = i === 0 ? COLORS.navy : i % 2 ? COLORS.pale : COLORS.white;
    const color = i === 0 ? COLORS.white : COLORS.body;
    const widths = [198, 100, 90];
    let x = 774;
    row.forEach((cell, j) => {
      addBox(slide, { name: `s18-cell-${i}-${j}`, position: { left: x, top: y, width: widths[j], height: 46 }, text: cell, fill, lineColor: COLORS.rule, lineWidth: 0.8, fontSize: i === 0 ? 11.5 : 12.8, textColor: color, bold: i === 0 || j === 0, alignment: j === 0 ? 'left' : 'center', insets: { top: 3, right: 5, bottom: 3, left: 6 }, geometry: 'rect' });
      x += widths[j];
    });
  });
  addBox(slide, { name: 's18-review', position: { left: 754, top: 498, width: 434, height: 86 }, text: 'REVIEW  •  Solver • Data Import/Export • Diagnostics • Hardware Implementation • Model Referencing • Code Generation', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.2, fontSize: 13.8, textColor: COLORS.dark });
  addSectionStrip(slide, { name: 's18-boundary', top: 604, text: 'Opening Model Settings is inspection—not a verification result. Record the exact saved configuration and any SimulationInput override.', kind: 'amber' });
}

// Slide 19 — Ctrl+D acceptance gate and recovery.
{
  const slide = presentation.slides.items[18];
  addBox(slide, { name: 's19-command', position: { left: 72, top: 150, width: 1136, height: 54 }, text: "Ctrl+D  ≡  set_param(model,'SimulationCommand','update')", fill: COLORS.white, lineColor: COLORS.blue, lineWidth: 1.5, fontSize: 20, textColor: COLORS.blue, typeface: 'Consolas' });
  const checks = [
    ['PARAMETERS', 'dictionary entries resolve'],
    ['INTERFACES', 'types, dimensions, and units propagate'],
    ['TIMING', 'sample times compile at 0.02 s'],
    ['REFERENCES', 'Model blocks resolve in saved Normal mode'],
    ['DIAGNOSTICS', 'no unexpected warning or error remains'],
  ];
  checks.forEach(([title, body], i) => {
    const x = 72 + i * 230;
    addBox(slide, { name: `s19-check-${i}`, position: { left: x, top: 240, width: 210, height: 148 }, fill: COLORS.white, lineColor: COLORS.teal, lineWidth: 1.2 });
    addTextBox(slide, { name: `s19-check-title-${i}`, position: { left: x + 10, top: 256, width: 190, height: 32 }, text: title, fontSize: 14.2, color: COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s19-check-body-${i}`, position: { left: x + 14, top: 300, width: 182, height: 68 }, text: body, fontSize: 13.5, color: COLORS.body, bold: false, alignment: 'center' });
  });
  addTextBox(slide, { name: 's19-recovery-title', position: { left: 72, top: 426, width: 220, height: 32 }, text: 'IF UPDATE FAILS', fontSize: 17, color: COLORS.red, bold: true });
  addBox(slide, { name: 's19-recovery', position: { left: 72, top: 468, width: 1136, height: 110 }, text: '1  read the first diagnostic  →  2  classify path/data/interface/timing/reference  →  3  correct the root cause  →  4  Ctrl+D again  →  5  only then simulate or build', fill: COLORS.redTint, lineColor: COLORS.red, lineWidth: 1.3, fontSize: 17, textColor: COLORS.dark });
  addSectionStrip(slide, { name: 's19-boundary', top: 602, text: 'Update evaluates and compiles the diagram without advancing simulation time and without generating code.', kind: 'amber' });
}

// Slide 20 — distinguish the delivered harness image from the learner harness.
{
  const slide = presentation.slides.items[19];
  const caption = findShape(slide, (shape) => String(shape.name || '') === 's29-caption', 'delivered harness caption');
  setText(caption, 'DELIVERED BASELINE SHOWN  •  run_pitch_rate_limiter_tests.m → PitchRateLimiter_Harness → delivered PitchRateLimiter\nLEARNER PATH  •  create_pitch_rate_limiter_practice generates a uniquely named matching harness beside the practice UUT', { fontSize: 13, color: COLORS.dark, bold: true, alignment: 'center', verticalAlignment: 'middle' });
}

// Slide 21 — the retained input definition is shared, but the selected UUT is explicit.
{
  const slide = presentation.slides.items[20];
  const boundary = findShape(slide, (shape) => String(shape.name || '') === 's30-boundary', 'harness input boundary');
  setText(boundary, 'ONE 0.36 s DESKTOP-MIL RUN  •  19 ASSESSMENT POINTS  •  BASELINE DRIVER TARGETS DELIVERED UUT  •  PRACTICE WRAPPER TARGETS LEARNER UUT', { fontSize: 13.3, color: COLORS.white, bold: true, alignment: 'center' });
}

// Slide 22 — choose baseline or learner driver explicitly.
{
  const slide = presentation.slides.items[21];
  addBox(slide, { name: 's22-baseline', position: { left: 72, top: 166, width: 548, height: 272 }, fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.5 });
  addTextBox(slide, { name: 's22-baseline-title', position: { left: 94, top: 184, width: 504, height: 34 }, text: 'DELIVERED BASELINE DRIVER', fontSize: 17, color: COLORS.teal, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's22-baseline-code', position: { left: 94, top: 232, width: 504, height: 48 }, text: 'run_pitch_rate_limiter_tests(projectRoot)', fontSize: 14.2, color: COLORS.white, bold: true, alignment: 'center', typeface: 'Consolas' });
  addBulletList(slide, { name: 's22-baseline-list', left: 102, top: 298, width: 484, height: 120, items: ['Targets delivered PitchRateLimiter_Harness', 'Replaces fixed results/ and reports/ files', 'Use to reproduce the retained baseline'], color: COLORS.white, fontSize: 14.2, leading: 40, bulletColor: COLORS.teal });
  addBox(slide, { name: 's22-practice', position: { left: 660, top: 166, width: 548, height: 272 }, fill: COLORS.panelDark, lineColor: COLORS.amber, lineWidth: 1.5 });
  addTextBox(slide, { name: 's22-practice-title', position: { left: 682, top: 184, width: 504, height: 34 }, text: 'LEARNER PRACTICE DRIVER', fontSize: 17, color: COLORS.amber, bold: true, alignment: 'center' });
  addTextBox(slide, { name: 's22-practice-code', position: { left: 682, top: 226, width: 504, height: 60 }, text: "run_pitch_rate_limiter_practice_tests( ...\n    projectRoot,'TLEE')", fontSize: 13.4, color: COLORS.white, bold: true, alignment: 'center', typeface: 'Consolas' });
  addBulletList(slide, { name: 's22-practice-list', left: 690, top: 298, width: 484, height: 120, items: ['Targets matching uniquely named practice harness', 'Writes learner_workspace/TLEE/evidence/', 'Does not replace controlled baseline results'], color: COLORS.white, fontSize: 14.2, leading: 40, bulletColor: COLORS.amber });
  addBox(slide, { name: 's22-shared', position: { left: 72, top: 466, width: 1136, height: 94 }, text: 'SHARED EXECUTABLE ASSESSMENT  •  three injected timeseries  •  one 0.36 s simulation  •  19 assessment rows  •  numeric / active / timestamp checks + suite-level 50 Hz spacing  •  CSV / MAT / HTML / PNG', fill: COLORS.panelDarker, lineColor: COLORS.green, lineWidth: 1.2, fontSize: 14.2, textColor: COLORS.white });
  addSectionStrip(slide, { name: 's22-scope', top: 584, dark: true, text: 'SAVED HARNESS RUN = BENIGN PLACEHOLDERS  •  execute the matching driver for assessed evidence  •  no Test Manager suite' });
}

// Slide 23 — update, run, and build are different actions.
{
  const slide = presentation.slides.items[22];
  const cols = [
    ['Ctrl+D', 'UPDATE MODEL', COLORS.teal, ['Evaluates parameters', 'Propagates interfaces/sample times', 'Checks diagram compatibility'], 'RESULT: compiled diagram; no time advances'],
    ['Run / sim', 'EXECUTE MODEL', COLORS.green, ['Uses current inputs/settings', 'Scripted sim may inject overrides', 'Advances time; captures signals'], 'RESULT: MIL outputs/logs; assessed only when driver + oracle run'],
    ['Ctrl+B / slbuild', 'GENERATE + COMPILE', COLORS.amber, ['Uses active target/configuration', 'Generates C/build files', 'Links a target-dependent product'], 'RESULT: build tree; not executed code evidence'],
  ];
  cols.forEach(([key, title, accent, items, result], i) => {
    const x = 72 + i * 384;
    addBox(slide, { name: `s23-col-${i}`, position: { left: x, top: 170, width: 352, height: 370 }, fill: COLORS.panelDark, lineColor: accent, lineWidth: 1.6 });
    addTextBox(slide, { name: `s23-key-${i}`, position: { left: x + 18, top: 190, width: 316, height: 42 }, text: key, fontSize: 25, color: accent, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s23-title-${i}`, position: { left: x + 18, top: 238, width: 316, height: 32 }, text: title, fontSize: 15, color: COLORS.white, bold: true, alignment: 'center' });
    addBulletList(slide, { name: `s23-list-${i}`, left: x + 28, top: 292, width: 296, height: 150, items, color: COLORS.white, fontSize: 14.3, leading: 46, bulletColor: accent });
    addBox(slide, { name: `s23-result-${i}`, position: { left: x + 20, top: 456, width: 312, height: 60 }, text: result, fill: COLORS.panelDarker, lineColor: accent, lineWidth: 1, fontSize: 13.4, textColor: COLORS.white });
  });
  addSectionStrip(slide, { name: 's23-order', top: 574, dark: true, kind: 'amber', text: 'SAFE ORDER  •  update first  →  run when behavior is the question  →  build when generated artifacts are the question' });
}

// Slide 24 — retained top-level GRT build evidence.
{
  const slide = presentation.slides.items[23];
  addBox(slide, { name: 's24-tree-panel', position: { left: 72, top: 154, width: 480, height: 398 }, fill: COLORS.white, lineColor: COLORS.blue, lineWidth: 1.3 });
  addTextBox(slide, { name: 's24-tree-title', position: { left: 92, top: 164, width: 440, height: 46 }, text: "SCRIPTED slbuild OUTPUT | build_top_level_grt_evidence(projectRoot,'RunLabel','v8_evidence')", fontSize: 11.6, color: COLORS.blue, bold: true, typeface: 'Consolas' });
  const tree = `top_level_codegen_v8_evidence/\n├─ Build_Evidence_Manifest.txt\n├─ ReferencedFlightControlArchitecture_slbuild.log\n├─ codegen/\n│  ├─ ReferencedFlightControlArchitecture.exe\n│  ├─ ReferencedFlightControlArchitecture_grt_rtw/\n│  │  ├─ ReferencedFlightControlArchitecture.c\n│  │  └─ html/index.html\n│  └─ slprj/grt/\n│     ├─ SensorProcessingRef/\n│     ├─ PitchRateLimiter/\n│     ├─ PitchControllerRef/\n│     └─ ActuatorCommandRef/\n└─ cache/ReferencedFlightControlArchitecture.slxc`;
  addTextBox(slide, { name: 's24-tree', position: { left: 92, top: 216, width: 438, height: 314 }, text: tree.replace('top_level_codegen_v8_evidence/', 'results/top_level_codegen_v8_evidence/'), fontSize: 12.1, color: COLORS.body, bold: false, verticalAlignment: 'top', insets: { top: 4, right: 4, bottom: 4, left: 4 }, typeface: 'Consolas' });
  addBox(slide, { name: 's24-code-panel', position: { left: 580, top: 154, width: 628, height: 398 }, fill: '#091A29', lineColor: COLORS.teal, lineWidth: 1.3 });
  addTextBox(slide, { name: 's24-code-title', position: { left: 602, top: 168, width: 584, height: 28 }, text: 'VERBATIM GENERATED C  •  LINES 8–19 + 25–28', fontSize: 15.5, color: COLORS.teal, bold: true });
  const cText = ` * Code generation for model "ReferencedFlightControlArchitecture".\n *\n * Model version              : 1.9\n * Simulink Coder version : 23.2 (R2023b) 01-Aug-2023\n * C source code generated on : Thu Aug 27 11:40:47 2026\n *\n * Target selection: grt.tlc\n * Note: GRT includes extra infrastructure and instrumentation for prototyping\n * Embedded hardware selection: Intel->x86-64 (Windows64)\n * Code generation objectives: Unspecified\n * Validation result: Not run\n */\n\n⋮  lines 20–24 omitted\n#include "ActuatorCommandRef.h"\n#include "PitchControllerRef.h"\n#include "PitchRateLimiter.h"\n#include "SensorProcessingRef.h"`;
  addTextBox(slide, { name: 's24-code', position: { left: 602, top: 206, width: 582, height: 326 }, text: cText, fontSize: 10.9, color: COLORS.white, bold: false, verticalAlignment: 'top', insets: { top: 4, right: 4, bottom: 4, left: 4 }, typeface: 'Consolas' });
  addBox(slide, { name: 's24-pass', position: { left: 72, top: 570, width: 1136, height: 42 }, text: 'BUILD_STATUS=PASS  •  5/5 models built  •  0 already up to date  •  1:27.572  •  executable 196,608 bytes', fill: COLORS.greenTint, lineColor: COLORS.green, lineWidth: 1.3, fontSize: 14.5, textColor: COLORS.dark });
  addBox(slide, { name: 's24-caveat', position: { left: 72, top: 619, width: 1136, height: 35 }, text: 'Git dirty=1; exact dirty-source snapshot was not retained. Ctrl+B may use other active settings/paths. Executable built—not run; no validation, SIL, or PIL.', fill: COLORS.amberTint, lineColor: COLORS.amber, lineWidth: 1, fontSize: 12.5, textColor: COLORS.dark });
}

// Slide 27 — what the 50 Hz result does and does not establish.
{
  const slide = presentation.slides.items[26];
  const fields = [
    ['ROW-SPECIFIC', COLORS.teal, ['NumericPass', 'LimiterActivePass', 'TimestampPass']],
    ['SUITE-LEVEL', COLORS.green, ['Required sample time = 0.02 s', 'Observed spacing = 0.02 s', 'Timing50HzPass repeated on 19 rows']],
    ['NOT MEASURED', COLORS.amber, ['Worst-case execution time', 'Scheduler latency or deadline margin', 'Target overrun / processor utilization']],
  ];
  fields.forEach(([title, accent, items], i) => {
    const x = 72 + i * 384;
    addBox(slide, { name: `s27-col-${i}`, position: { left: x, top: 170, width: 352, height: 336 }, fill: COLORS.panelDark, lineColor: accent, lineWidth: 1.5 });
    addTextBox(slide, { name: `s27-title-${i}`, position: { left: x + 20, top: 190, width: 312, height: 40 }, text: title, fontSize: 16.8, color: accent, bold: true, alignment: 'center' });
    addBulletList(slide, { name: `s27-list-${i}`, left: x + 30, top: 254, width: 292, height: 220, items, color: COLORS.white, fontSize: 15, leading: 64, bulletColor: accent });
  });
  addBox(slide, { name: 's27-tolerance', position: { left: 72, top: 536, width: 1136, height: 56 }, text: 'EXECUTABLE ACCEPTANCE  •  |dictionary Sample_time − 0.02| ≤ 2e−11 s  AND  every retained point spacing is 0.02 s within the same tolerance', fill: COLORS.panelDarker, lineColor: COLORS.teal, lineWidth: 1.2, fontSize: 15, textColor: COLORS.white });
  addSectionStrip(slide, { name: 's27-boundary', top: 604, dark: true, kind: 'amber', text: 'Say “50 Hz configuration and retained timestamp spacing passed”—not “the design meets a real-time deadline.”' });
}

// Slide 28 — producer, executor, oracle, evidence, and presence-only validator.
{
  const slide = presentation.slides.items[27];
  const stages = [
    ['1', 'INITIALIZE', 'restore managed\nclassroom data'],
    ['2', 'PRODUCE', '19 rows + three\ninput timeseries'],
    ['3', 'EXECUTE', 'one harness\nMIL simulation'],
    ['4', 'ASSESS', 'oracle + four\nstored pass fields'],
    ['5', 'RETAIN', 'CSV • MAT\nHTML • PNG'],
    ['6', 'VALIDATE', 'read CSV + check\nrequired file presence'],
  ];
  stages.forEach(([n, title, body], i) => {
    const x = 72 + i * 192;
    addBox(slide, { name: `s28-stage-${i}`, position: { left: x, top: 194, width: 168, height: 196 }, fill: COLORS.panelDark, lineColor: i === 5 ? COLORS.amber : COLORS.teal, lineWidth: 1.3 });
    addBadge(slide, { name: `s28-num-${i}`, left: x + 14, top: 210, width: 38, text: n, fill: i === 5 ? COLORS.amber : COLORS.teal, color: COLORS.dark });
    addTextBox(slide, { name: `s28-title-${i}`, position: { left: x + 56, top: 208, width: 96, height: 30 }, text: title, fontSize: 13.8, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s28-body-${i}`, position: { left: x + 14, top: 264, width: 140, height: 96 }, text: body, fontSize: 13.5, color: COLORS.white, bold: false, alignment: 'center' });
    if (i < 5) addTextBox(slide, { name: `s28-arrow-${i}`, position: { left: x + 168, top: 267, width: 24, height: 36 }, text: '→', fontSize: 24, color: COLORS.teal, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's28-freshness', position: { left: 72, top: 436, width: 1136, height: 116 }, text: 'FRESHNESS BOUNDARY\nvalidate_training_project.m updates the eight delivered models, reads the retained limiter-results CSV, and checks named artifact presence. It does not rerun the limiter suite, recompute the reports, or hash every artifact.', fill: COLORS.panelDarker, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 16, textColor: COLORS.white });
  addSectionStrip(slide, { name: 's28-rule', top: 584, dark: true, text: 'For a release decision, run the producer and executor first; then run the validator against the newly generated evidence.' });
}

// Slide 29 — assessment rows are not sample-time values or separate runs.
{
  const slide = presentation.slides.items[28];
  const label = findShape(slide, (shape) => String(shape.name || '') === 's43-label', 'assessment label');
  setText(label, 'ASSESSMENT ROWS\nPASSED', { fontSize: 14.5, color: COLORS.green, bold: true, alignment: 'center' });
}

// Slide 30 — interpret the retained limiter result plot.
{
  const slide = presentation.slides.items[29];
  await addImage(slide, ASSETS.limiterReport, { left: 72, top: 172, width: 770, height: 418 }, 'PitchRateLimiter 19-row assessment result plot');
  const callouts = [
    ['TOP', COLORS.blue, 'Input is clipped only for display; expected and actual output overlap. ±12 is inclusive and inactive.'],
    ['MIDDLE', COLORS.amber, 'Expected and actual limiter_active overlap; active only when enabled and strictly outside the limit.'],
    ['BOTTOM', COLORS.green, 'Absolute numeric error uses a log axis. No positive trace appears because every retained error is exactly zero.'],
  ];
  callouts.forEach(([label, accent, body], i) => {
    const y = 174 + i * 132;
    addBox(slide, { name: `s30-callout-${i}`, position: { left: 870, top: y, width: 318, height: 112 }, fill: COLORS.panelDark, lineColor: accent, lineWidth: 1.3 });
    addBadge(slide, { name: `s30-label-${i}`, left: 884, top: y + 14, width: 82, text: label, fill: accent, color: COLORS.dark });
    addTextBox(slide, { name: `s30-body-${i}`, position: { left: 884, top: y + 50, width: 288, height: 52 }, text: body, fontSize: 12.9, color: COLORS.white, bold: false, verticalAlignment: 'top' });
  });
  addSectionStrip(slide, { name: 's30-footer', top: 608, dark: true, text: 'ONE 0.36 s DESKTOP-MIL RUN  •  19 assessment rows  •  required 0.02 s configuration/spacing passed  •  all numeric errors exactly zero' });
}

// Slide 31 — corrected requirements-to-results mapping.
{
  const slide = presentation.slides.items[30];
  const reqs = [
    ['PRL-001', 'magnitude clamp', 'Magnitude Clamp block • associated rows 1–10 and 19'],
    ['PRL-002', 'mode + validity fallback', 'Normal AND Valid / Select Valid Command • rows 11–18'],
    ['PRL-003', 'limiter status', 'Valid Clamp Active • every assessed row'],
    ['PRL-004', '50 Hz execution', 'required .02 s + retained spacing; tolerance 2e−11 s'],
    ['PRL-005', 'same-frame magnitude response', 'row 10: +1000 → −1000; +12 → −12 next 50 Hz sample'],
  ];
  reqs.forEach(([id, intent, trace], i) => {
    const y = 164 + i * 76;
    addBox(slide, { name: `s31-id-${i}`, position: { left: 72, top: y, width: 132, height: 58 }, text: id, fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.1, fontSize: 16, textColor: COLORS.white });
    addBox(slide, { name: `s31-intent-${i}`, position: { left: 220, top: y, width: 340, height: 58 }, text: intent, fill: COLORS.panelDark, lineColor: COLORS.blue, lineWidth: 1.1, fontSize: 15, textColor: COLORS.white, alignment: 'left' });
    addBox(slide, { name: `s31-trace-${i}`, position: { left: 576, top: y, width: 632, height: 58 }, text: trace, fill: COLORS.panelDark, lineColor: i === 4 ? COLORS.amber : COLORS.green, lineWidth: 1.1, fontSize: 14.2, textColor: COLORS.white, alignment: 'left' });
  });
  addBox(slide, { name: 's31-correction', position: { left: 72, top: 562, width: 1136, height: 58 }, text: 'CORRECTED ASSOCIATION  •  initialization row 1 maps to PRL-001 / PRL-003 / PRL-004; PRL-005 is attached to the real reversal case at row 10', fill: COLORS.panelDarker, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 15, textColor: COLORS.white });
}

// Slide 32 — complete dictionary and bus overview.
{
  const slide = presentation.slides.items[31];
  const counts = [['26', 'Simulink.Parameter'], ['4', 'Simulink.Signal'], ['1', 'Simulink.Bus']];
  counts.forEach(([value, label], i) => {
    const x = 72 + i * 200;
    addBox(slide, { name: `s32-count-${i}`, position: { left: x, top: 158, width: 176, height: 88 }, fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1.2 });
    addTextBox(slide, { name: `s32-count-value-${i}`, position: { left: x + 10, top: 170, width: 156, height: 34 }, text: value, fontSize: 25, color: COLORS.teal, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s32-count-label-${i}`, position: { left: x + 10, top: 207, width: 156, height: 26 }, text: label, fontSize: 12.6, color: COLORS.body, bold: true, alignment: 'center' });
  });
  addBox(slide, { name: 's32-params', position: { left: 72, top: 278, width: 548, height: 262 }, fill: COLORS.white, lineColor: COLORS.blue, lineWidth: 1.3 });
  addTextBox(slide, { name: 's32-params-title', position: { left: 92, top: 294, width: 508, height: 30 }, text: 'REPRESENTATIVE MANAGED PARAMETERS', fontSize: 16.5, color: COLORS.blue, bold: true });
  addTextBox(slide, { name: 's32-params-body', position: { left: 92, top: 338, width: 508, height: 176 }, text: 'Sample_time = 0.02 s\nq_limit_normal = 12 deg/s\nq_fallback_command = 0 deg/s\npitch_Kp = 0.6 (1)\npitch_Ki = 0.025 (1/s)\nactuator_limit_deg = 20 deg', fontSize: 15.3, color: COLORS.body, bold: false, verticalAlignment: 'top', insets: { top: 2, right: 3, bottom: 2, left: 3 }, typeface: 'Consolas' });
  addBox(slide, { name: 's32-bus', position: { left: 660, top: 158, width: 548, height: 382 }, fill: COLORS.white, lineColor: COLORS.green, lineWidth: 1.3 });
  addTextBox(slide, { name: 's32-bus-title', position: { left: 680, top: 176, width: 508, height: 32 }, text: 'FlightControlBus  •  FIVE SCALAR ELEMENTS', fontSize: 16.5, color: COLORS.green, bold: true });
  const busRows = [
    ['q_rate', 'double', 'deg/s'], ['pitch_angle', 'double', 'deg'], ['mach', 'double', '1'], ['air_data_valid', 'boolean', '1'], ['mode', 'uint8', '1'],
  ];
  busRows.forEach(([name, type, unit], i) => {
    const y = 224 + i * 54;
    const fill = i % 2 ? COLORS.pale : COLORS.white;
    addBox(slide, { name: `s32-bus-name-${i}`, position: { left: 680, top: y, width: 244, height: 44 }, text: name, fill, lineColor: COLORS.rule, lineWidth: 0.7, fontSize: 14.3, textColor: COLORS.body, alignment: 'left', geometry: 'rect' });
    addBox(slide, { name: `s32-bus-type-${i}`, position: { left: 924, top: y, width: 146, height: 44 }, text: type, fill, lineColor: COLORS.rule, lineWidth: 0.7, fontSize: 13.4, textColor: COLORS.body, geometry: 'rect' });
    addBox(slide, { name: `s32-bus-unit-${i}`, position: { left: 1070, top: y, width: 98, height: 44 }, text: unit, fill, lineColor: COLORS.rule, lineWidth: 0.7, fontSize: 13.4, textColor: COLORS.body, geometry: 'rect' });
  });
  addSectionStrip(slide, { name: 's32-boundary', top: 574, text: 'Initialization writes/restores managed classroom entries. Inspect or experiment only in an authorized copy.', kind: 'amber' });
}

// Slide 33 — native dictionary access and API access.
{
  const slide = presentation.slides.items[32];
  await addImage(slide, ASSETS.dictionary, { left: 72, top: 164, width: 720, height: 388 }, 'Model Explorer open to FCS_Data.sldd and FlightControlBus');
  addBox(slide, { name: 's33-steps', position: { left: 820, top: 164, width: 368, height: 174 }, fill: COLORS.white, lineColor: COLORS.teal, lineWidth: 1.3 });
  addTextBox(slide, { name: 's33-steps-title', position: { left: 840, top: 180, width: 328, height: 28 }, text: 'MODEL EXPLORER', fontSize: 16, color: COLORS.teal, bold: true });
  addTextBox(slide, { name: 's33-steps-body', position: { left: 840, top: 218, width: 328, height: 104 }, text: '1  run initialization\n2  open data/FCS_Data.sldd\n3  select Design Data\n4  select FlightControlBus\n5  expand Elements', fontSize: 14.4, color: COLORS.body, bold: false, verticalAlignment: 'top', typeface: 'Consolas' });
  addBox(slide, { name: 's33-code-panel', position: { left: 820, top: 356, width: 368, height: 196 }, fill: '#091A29', lineColor: COLORS.blue, lineWidth: 1.3 });
  const api = `dd = Simulink.data.dictionary.open( ...\n fullfile(projectRoot,'data','FCS_Data.sldd'));\nsec = getSection(dd,'Design Data');\ne = getEntry(sec,'FlightControlBus');\nbus = getValue(e);\n{bus.Elements.Name}\nclose(dd);`;
  addTextBox(slide, { name: 's33-code', position: { left: 836, top: 372, width: 336, height: 164 }, text: api, fontSize: 11.8, color: COLORS.white, bold: false, verticalAlignment: 'top', typeface: 'Consolas' });
  addSectionStrip(slide, { name: 's33-caveat', top: 584, text: 'INSPECTION VIEW  •  initialize writes/restores managed entries; close the dictionary and follow change control before editing shared data', kind: 'amber' });
}

// Slide 34 — review gate for a learner-created component.
{
  const slide = presentation.slides.items[33];
  const items = [
    'Repository root and authorized working copy confirmed',
    'FCS_Data.sldd attached; managed names resolve',
    'Five-port interface names, directions, types, and units match',
    'Fixed-step discrete configuration uses required 0.02 s',
    'Model-reference SimulationMode is saved Normal',
    'Logged-signal choices and any test-point need are explained',
    'Ctrl+D completes with no unexpected diagnostic',
    'Matching practice driver—not saved placeholders—was executed',
    'Plots, row checks, trace links, and evidence files agree',
    'Unsupported claims and future assurance gates are named',
  ];
  items.forEach((item, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = col === 0 ? 72 : 660;
    const y = 164 + row * 78;
    addBox(slide, { name: `s34-check-${i}`, position: { left: x, top: y, width: 548, height: 62 }, text: `☐  ${String(i + 1).padStart(2, '0')}  ${item}`, fill: COLORS.panelDark, lineColor: i < 8 ? COLORS.teal : COLORS.amber, lineWidth: 1.1, fontSize: 14.2, textColor: COLORS.white, alignment: 'left', insets: { top: 5, right: 10, bottom: 5, left: 12 } });
  });
  addSectionStrip(slide, { name: 's34-exit', top: 576, dark: true, text: 'EXIT CONDITION  •  a reviewer can repeat the learner’s path from the repository root and reach the same bounded conclusion' });
}

// Slide 35 — make the unperformed Model Advisor gate operationally assignable.
{
  const slide = presentation.slides.items[34];
  const banner = findShape(slide, (shape) => String(shape.name || '') === 's10-banner', 'Model Advisor open-gate banner');
  setText(banner, 'OPEN GATE • NO RETAINED RESULT  •  PROFILE / CHECK IDs: TBD  •  OWNER: TBD  •  REPORT PATH: TBD', { fontSize: 13.2, color: COLORS.dark, bold: true, alignment: 'center' });
}

// Slide 40 — use dark label text on bright requirement tags for projection contrast.
{
  const slide = presentation.slides.items[39];
  const tags = [
    ['box-267', 'SYSTEM\nPSYS-001'],
    ['box-270', 'SOFTWARE HLR\nSWHLR-001 / PRL-001'],
    ['box-273', 'SOFTWARE LLR / DESIGN\nSWLLR-001'],
    ['box-276', 'STATUS + TIMING\nPRL-003 / PRL-004'],
  ];
  tags.forEach(([name, text]) => {
    const shape = findShape(slide, (candidate) => String(candidate.name || '') === name, `requirement tag ${name}`);
    setText(shape, text, { fontSize: 13.4, color: COLORS.dark, bold: true, alignment: 'center' });
  });
}

// Slide 43 — make PIL status explicit on the preserved execution-environment slide.
{
  const slide = presentation.slides.items[42];
  const pilStatus = findShape(slide, (shape) => textValue(shape).trim() === 'NOT AUTOMATICALLY UNIT TESTING', 'PIL status', false);
  if (pilStatus) setText(pilStatus, 'NOT PERFORMED', { fontSize: 13.2, color: COLORS.dark, bold: true, alignment: 'center' });
}

// Slide 44 — status counts with separate scopes and freshness.
{
  const slide = presentation.slides.items[43];
  const cards = [
    ['8 / 8', 'MODEL UPDATE', 'diagram update/compile accepted', COLORS.teal],
    ['19 / 19', 'LIMITER ROWS', 'retained sample assessments pass', COLORS.green],
    ['24 / 24', 'REQUIRED EXPORTS', 'presence-only validator count', COLORS.blue],
    ['5 / 5', 'GRT MODELS BUILT', 'top standalone + four references', COLORS.amber],
  ];
  cards.forEach(([value, title, body, accent], i) => {
    const x = 72 + i * 288;
    addBox(slide, { name: `s44-card-${i}`, position: { left: x, top: 164, width: 264, height: 174 }, fill: COLORS.panelDark, lineColor: accent, lineWidth: 1.5 });
    addTextBox(slide, { name: `s44-value-${i}`, position: { left: x + 14, top: 180, width: 236, height: 46 }, text: value, fontSize: 28, color: accent, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s44-title-${i}`, position: { left: x + 14, top: 230, width: 236, height: 28 }, text: title, fontSize: 13.8, color: COLORS.white, bold: true, alignment: 'center' });
    addTextBox(slide, { name: `s44-body-${i}`, position: { left: x + 20, top: 270, width: 224, height: 48 }, text: body, fontSize: 12.8, color: COLORS.slate, bold: false, alignment: 'center' });
  });
  addBox(slide, { name: 's44-validator', position: { left: 72, top: 374, width: 548, height: 162 }, text: 'WHAT THE VALIDATOR DOES\n• updates eight delivered models\n• reads the retained limiter CSV\n• checks the 24 named export paths', fill: COLORS.panelDarker, lineColor: COLORS.teal, lineWidth: 1.3, fontSize: 15.3, textColor: COLORS.white, alignment: 'left' });
  addBox(slide, { name: 's44-not', position: { left: 660, top: 374, width: 548, height: 162 }, text: 'WHAT IT DOES NOT DO\n• rerun the limiter suite\n• regenerate every report or SDI artifact\n• establish freshness with hashes/timestamps', fill: COLORS.panelDarker, lineColor: COLORS.amber, lineWidth: 1.3, fontSize: 15.3, textColor: COLORS.white, alignment: 'left' });
  addSectionStrip(slide, { name: 's44-rule', top: 568, dark: true, text: 'KEEP THE COUNTS SEPARATE  •  run producers first, then validate the evidence created for the controlled baseline' });
}

// Slide 46 — expose the project-owned form, owner, and trigger as open fields.
{
  const slide = presentation.slides.items[45];
  const banner = findShape(slide, (shape) => String(shape.name || '') === 's47-banner', 'project-defined review banner');
  setText(banner, 'PROJECT PLACEHOLDER • FORM / PATH: TBD • PROCESS OWNER: TBD • TRIGGER: TBD • NO RCF / SIGNATURE / APPROVAL RECORD SUPPLIED', { fontSize: 12.7, color: COLORS.dark, bold: true, alignment: 'center' });
}

// Slide 47 — observed capstone.
{
  const slide = presentation.slides.items[46];
  addBox(slide, { name: 's47-brief', position: { left: 72, top: 150, width: 1136, height: 56 }, text: 'CAPSTONE  •  create the uniquely named learner component + matching harness, execute learner-local evidence, and explain every boundary', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.5, fontSize: 17.2, textColor: COLORS.white });
  const tasks = [
    ['1', 'PREPARE', 'root • Notes + README • unique tag'],
    ['2', 'CREATE', 'safe helper • inspect exact block table'],
    ['3', 'INSTRUMENT', 'logging choice • test-point rationale'],
    ['4', 'UPDATE', 'Ctrl+D • explain compiled semantics'],
    ['5', 'EXECUTE', 'practice driver • learner-local evidence'],
    ['6', 'INTERPRET', 'practice report + SDI causal story'],
    ['7', 'TRACE', 'one requirement → model → evidence'],
    ['8', 'BOUND', 'name every future or unsigned gate'],
  ];
  tasks.forEach(([n, title, body], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 72 + col * 288;
    const y = 238 + row * 150;
    addBox(slide, { name: `s47-task-${i}`, position: { left: x, top: y, width: 264, height: 126 }, fill: COLORS.panelDarker, lineColor: i === 7 ? COLORS.amber : COLORS.teal, lineWidth: 1.2 });
    addBadge(slide, { name: `s47-num-${i}`, left: x + 14, top: y + 14, width: 40, text: n, fill: i === 7 ? COLORS.amber : COLORS.teal, color: COLORS.dark });
    addTextBox(slide, { name: `s47-title-${i}`, position: { left: x + 66, top: y + 12, width: 180, height: 30 }, text: title, fontSize: 15.5, color: COLORS.white, bold: true });
    addTextBox(slide, { name: `s47-body-${i}`, position: { left: x + 18, top: y + 55, width: 228, height: 52 }, text: body, fontSize: 13.4, color: COLORS.slate, bold: false, alignment: 'center' });
  });
  addSectionStrip(slide, { name: 's47-pass', top: 570, dark: true, text: 'PASS  •  reviewer repeats learner_workspace/<tag> creation + practice assessment; delivered-baseline and learner evidence remain clearly separate' });
}

// Slide 48 — close the core course and hand off to the appendix.
{
  const slide = presentation.slides.items[47];
  addTextBox(slide, { name: 's48-left-title', position: { left: 86, top: 166, width: 492, height: 34 }, text: 'THE REPEATABLE CHAIN', fontSize: 18, color: COLORS.teal, bold: true });
  addTextBox(slide, { name: 's48-left-body', position: { left: 82, top: 216, width: 510, height: 304 }, text: 'ROOT + INITIALIZATION\ncontrolled data and paths\n\nMODEL + SETTINGS\ninterface, logic, timing, observability\n\nUPDATE + EXECUTE + BUILD\nthree different actions and outputs\n\nEVIDENCE + TRACE\nplots, row checks, files, and boundaries', fontSize: 17, color: COLORS.white, bold: true, verticalAlignment: 'top' });
  addLine(slide, { name: 's48-divider', left: 630, top: 162, width: 0, height: 390, color: COLORS.slate, lineWidth: 1.4 });
  addTextBox(slide, { name: 's48-right-title', position: { left: 690, top: 166, width: 460, height: 34 }, text: 'BEFORE YOU SAY “DONE”', fontSize: 18, color: COLORS.amber, bold: true });
  addBulletList(slide, { name: 's48-right', left: 700, top: 220, width: 454, height: 300, items: [
    'A second person can reproduce the path',
    'Saved settings and execution overrides are recorded',
    'Evidence scopes and freshness are understood',
    'No MIL result is mislabeled as SIL, PIL, HIL, or approval',
    'Program-owned review/sign-off gates have named owners',
  ], color: COLORS.white, fontSize: 15.5, leading: 58, bulletColor: COLORS.amber });
  addBox(slide, { name: 's48-next', position: { left: 72, top: 584, width: 1136, height: 58 }, text: 'CORE COURSE COMPLETE  •  slides 49–55 are the model and workflow reference appendix', fill: COLORS.panelDark, lineColor: COLORS.teal, lineWidth: 1.4, fontSize: 17, textColor: COLORS.white });
}

// Slide 49 — glossary.
{
  const slide = presentation.slides.items[48];
  const terms = [
    ['MIL', 'Model logic executes with a model plant/environment.'],
    ['SDI', 'Simulation Data Inspector; saved run/session visualization.'],
    ['SLDD', 'Simulink Data Dictionary; controlled Design Data source.'],
    ['Model block', 'Reference to another Simulink model and simulation mode.'],
    ['Ctrl+D', 'Update/compile the diagram without advancing time.'],
    ['Ctrl+B', 'Interactive code-generation build for the active target.'],
    ['Harness', 'Independent model that supplies inputs and captures outputs.'],
    ['Oracle', 'Executable logic that computes expected results/pass status.'],
    ['Test point', 'Preserves signal observability; does not enable logging.'],
    ['RCF', 'Project-defined term here; use only the approved program definition/form.'],
  ];
  terms.forEach(([term, definition], i) => {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = col === 0 ? 72 : 660;
    const y = 154 + row * 88;
    addBox(slide, { name: `s49-term-${i}`, position: { left: x, top: y, width: 548, height: 72 }, fill: COLORS.white, lineColor: i === 9 ? COLORS.amber : COLORS.teal, lineWidth: 1.1 });
    addTextBox(slide, { name: `s49-name-${i}`, position: { left: x + 16, top: y + 10, width: 148, height: 46 }, text: term, fontSize: 16, color: i === 9 ? COLORS.amber : COLORS.teal, bold: true });
    addTextBox(slide, { name: `s49-def-${i}`, position: { left: x + 166, top: y + 8, width: 360, height: 52 }, text: definition, fontSize: 13.7, color: COLORS.body, bold: false, verticalAlignment: 'middle' });
  });
  addSectionStrip(slide, { name: 's49-rule', top: 606, text: 'Vocabulary is evidence hygiene: name the model role, action, environment, artifact, and approval status precisely.' });
}

// Slide 51 — Stateflow root and internal chart together.
{
  const slide = presentation.slides.items[50];
  await addImage(slide, ASSETS.stateflowRoot, { left: 72, top: 184, width: 520, height: 350 }, 'AutopilotModeLogic model wrapper');
  await addImage(slide, ASSETS.stateflowChart, { left: 636, top: 184, width: 572, height: 350 }, 'Autopilot Mode Logic Stateflow chart editor');
  addBadge(slide, { name: 's51-left-label', left: 88, top: 154, width: 228, text: 'MODEL WRAPPER', fill: COLORS.teal, color: COLORS.dark });
  addBadge(slide, { name: 's51-right-label', left: 652, top: 154, width: 258, text: 'Autopilot Mode Logic CHART', fill: COLORS.blue, color: COLORS.white });
  addBox(slide, { name: 's51-left-caption', position: { left: 72, top: 548, width: 520, height: 58 }, text: 'Root interfaces make mode inputs, status outputs, and ownership visible.', fill: COLORS.tealTint, lineColor: COLORS.teal, lineWidth: 1, fontSize: 14, textColor: COLORS.dark });
  addBox(slide, { name: 's51-right-caption', position: { left: 636, top: 548, width: 572, height: 58 }, text: 'Exact chart path: AutopilotModeLogic/Autopilot Mode Logic', fill: COLORS.blueTint, lineColor: COLORS.blue, lineWidth: 1, fontSize: 14, textColor: COLORS.dark });
}

// Slide 53 — four referenced component contracts.
{
  const slide = presentation.slides.items[52];
  const items = [
    [ASSETS.sensor, 'SensorProcessingRef', 'sensor contract'],
    [ASSETS.limiter, 'PitchRateLimiter', 'command protection'],
    [ASSETS.controller, 'PitchControllerRef', 'control-law boundary'],
    [ASSETS.actuator, 'ActuatorCommandRef', 'actuator command/status'],
  ];
  for (let i = 0; i < items.length; i += 1) {
    const [file, title, caption] = items[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 72 : 650;
    const y = 162 + row * 232;
    addBox(slide, { name: `s53-frame-${i}`, position: { left: x, top: y, width: 558, height: 206 }, fill: COLORS.white, lineColor: COLORS.teal, lineWidth: 1 });
    await addImage(slide, file, { left: x + 12, top: y + 36, width: 534, height: 128 }, `${title} model diagram`);
    addTextBox(slide, { name: `s53-title-${i}`, position: { left: x + 16, top: y + 8, width: 330, height: 26 }, text: title, fontSize: 14.8, color: COLORS.teal, bold: true });
    addTextBox(slide, { name: `s53-caption-${i}`, position: { left: x + 16, top: y + 170, width: 526, height: 26 }, text: caption, fontSize: 12.8, color: COLORS.muted, bold: false, alignment: 'center' });
  }
  addSectionStrip(slide, { name: 's53-rule', top: 604, text: 'The integration parent owns composition; each referenced child owns a focused contract and can be updated, reviewed, and built explicitly.' });
}

// Overwrite all speaker notes after reordering so every slide has v8-oriented guidance.
for (const entry of notes) {
  const slide = presentation.slides.items[entry.slide - 1];
  if (!slide) throw new Error(`No slide for notes entry ${entry.slide}`);
  slide.speakerNotes.textFrame.setText(noteText(entry));
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
  coreSlides: 48,
  appendixSlides: 7,
  replacementSlides: [...replacementSlides],
  visibleNotes: presentation.slides.items.filter((slide) => slide.speakerNotes.isVisible()).length,
  status: { modelsUpdated: '8/8; two exact Student-license Model-block messages accepted after saved-Normal assertions', limiterAssessments: '19/19', requiredExports: '24/24 presence-only', grtModelsBuilt: '5/5' },
  buildEvidence: path.relative(projectRoot, BUILD_ROOT),
}, null, 2)}\n`, 'utf8');

console.log(`OUTPUT_PPTX=${outputPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`VISIBLE_NOTES=${presentation.slides.items.filter((slide) => slide.speakerNotes.isVisible()).length}`);
