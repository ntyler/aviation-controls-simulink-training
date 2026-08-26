import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(buildDir);
const starterPptxPath = path.join(buildDir, 'template-starter.pptx');
const outputPptxPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');

const COLORS = {
  bg: '#F4F8FB', ink: '#0B1F33', body: '#17324A', muted: '#5D7487', rule: '#C9D8E3',
  navy: '#0B2438', dark: '#071521', blue: '#2D6CDF', blueTint: '#E2ECFF',
  teal: '#20B7C5', tealTint: '#DFF6F8', amber: '#E9A23B', amberTint: '#FFF0D7',
  green: '#2CA56F', greenTint: '#E2F4EA', red: '#D75A64', redTint: '#FBE7E9', white: '#FFFFFF',
};

const MATHWORKS_EDITOR = 'https://www.mathworks.com/help/simulink/slref/simulinkeditor.html';
const MATHWORKS_SHORTCUTS = 'https://www.mathworks.com/help/simulink/ug/summary-of-mouse-and-keyboard-actions.html';
const MATHWORKS_UNITS = 'https://www.mathworks.com/help/simulink/ug/displaying-units.html';
const MATHWORKS_LOGGING = 'https://www.mathworks.com/help/simulink/gui/signallogging.html';
const MATHWORKS_SDI = 'https://www.mathworks.com/help/simulink/slref/simulationdatainspector.html';
const MATHWORKS_MARKERS = 'https://www.mathworks.com/help/simulink/slref/simulink.sdi.setmarkerson.html';
const MATHWORKS_COMPARE = 'https://www.mathworks.com/help/simulink/ug/compare-simulation-data.html';
const MATHWORKS_CODEGEN = 'https://www.mathworks.com/help/rtw/ug/generating-code-using-simulink-coder.html';
const FAA_AC = 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1032046';
const FAA_ORDER = 'https://www.faa.gov/documentLibrary/media/Order/FAA_Order_8110.49A.pdf';
const NASA_SE = 'https://www.nasa.gov/reference/systems-engineering-handbook/';

function textValue(shape) {
  try { return shape.text?.value ?? String(shape.text ?? ''); } catch { return ''; }
}

function findShape(slide, predicate, description) {
  const shape = slide.shapes.items.find(predicate);
  if (!shape) throw new Error(`Unable to find ${description}`);
  return shape;
}

function findByName(slide, name) {
  return findShape(slide, (shape) => shape.name === name, `shape ${name}`);
}

function setText(shape, text, style = null) {
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

function styleTitle(shape, text, fontSize = 44, color = COLORS.ink) {
  return setText(shape, text, {
    fontSize, color, bold: true, alignment: 'left', verticalAlignment: 'top',
    insets: { top: 4, right: 4, bottom: 4, left: 4 }, wrap: 'none', autoFit: 'none', lineSpacing: 0.94,
  });
}

function addTextBox(slide, { name, position, text, fontSize = 18, color = COLORS.ink, bold = false,
  alignment = 'left', verticalAlignment = 'middle', insets = { top: 3, right: 5, bottom: 3, left: 5 },
  wrap = 'square', autoFit = 'none' }) {
  const shape = slide.shapes.add({ geometry: 'textbox', name, position, fill: 'none', line: { style: 'solid', fill: 'none', width: 0 } });
  setText(shape, text, { fontSize, color, bold, alignment, verticalAlignment, insets, wrap, autoFit });
  return shape;
}

function addBox(slide, { name, position, text = '', fill = COLORS.white, lineColor = COLORS.rule, lineWidth = 1.5,
  fontSize = 18, textColor = COLORS.ink, bold = true, alignment = 'center', insets = { top: 5, right: 9, bottom: 5, left: 9 },
  geometry = 'roundRect', borderRadius = 'rounded-xl' }) {
  const shapeConfig = { geometry, name, position, fill, line: { style: 'solid', fill: lineColor, width: lineWidth } };
  if (geometry === 'rect' || geometry === 'textbox' || geometry === 'roundRect') shapeConfig.borderRadius = borderRadius;
  const shape = slide.shapes.add(shapeConfig);
  if (text) setText(shape, text, { fontSize, color: textColor, bold, alignment, verticalAlignment: 'middle', insets, wrap: 'square' });
  return shape;
}

function addLine(slide, { name, left, top, width, height = 0, color = COLORS.rule, lineWidth = 1.5, style = 'solid' }) {
  return slide.shapes.add({ geometry: 'line', name, position: { left, top, width, height }, fill: 'none', line: { style, fill: color, width: lineWidth } });
}

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text.trim());
  slide.speakerNotes.setVisible(true);
}

function appendNotes(slide, text) {
  slide.speakerNotes.append(`\n\n${text.trim()}`);
  slide.speakerNotes.setVisible(true);
}

async function imageBytes(filePath) { return new Uint8Array(await fs.readFile(filePath)); }
async function writeBlob(filePath, blob) { await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer())); }

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPptxPath));
if (presentation.slides.items.length !== 33) throw new Error(`Expected 33 slides, found ${presentation.slides.items.length}`);

// Slide 3 — preview the hands-on sequence.
{
  const slide = presentation.slides.items[2];
  styleTitle(findByName(slide, 'title-20'), 'Your first session: orient, execute, inspect, trace', 44, COLORS.white);
  setText(findByName(slide, 'text-24'),
    'Operate a model — initialize paths; open, update, run, stop, and inspect results\nNavigate the editor — Simulation, Debug, Modeling, and Apps\nRead semantics — units, data types, dimensions, timing, and logging\nTrace behavior — top level → component → harness → executed evidence',
    { fontSize: 20, color: '#D8E8F1', alignment: 'left', verticalAlignment: 'top', insets: { top: 4, right: 6, bottom: 4, left: 4 } });
  const labels = ['1  START + RUN', '2  MODEL HIERARCHY', '3  OVERLAYS', '4  DATA INSPECTOR', '5  TRACEABILITY'];
  ['box-25','box-26','box-27','box-28','box-29'].forEach((name, index) => setText(findByName(slide, name), labels[index]));
  setText(findByName(slide, 'text-30'), 'Keep asking: Which model am I in, what state is visible, and what evidence proves the requirement?',
    { fontSize: 25, color: '#70DCE5', bold: true, alignment: 'left', verticalAlignment: 'middle', insets: { top: 2, right: 3, bottom: 2, left: 3 } });
  setNotes(slide, `
Timing: 2 minutes

This orientation now previews the first-session actions that follow. The key distinction is between operating the tool, understanding the model hierarchy, reviewing displayed semantics, inspecting logged data, and tracing behavior to evidence. Keep “top level” tied to the current job: simulation, integration, development, or unit verification.

[Sources]
- ${MATHWORKS_EDITOR}
- ${NASA_SE}`);
}

// Slide 5 — exact first-session actions.
{
  const slide = presentation.slides.items[4];
  styleTitle(findByName(slide, 'title-39'), 'Five actions start every first Simulink session', 43);
  setText(findByName(slide, 'text-43'), 'ACTION');
  setText(findByName(slide, 'text-44'), 'WHERE');
  setText(findByName(slide, 'text-45'), 'PURPOSE');
  const rows = [
    ['text-47','INITIALIZE','text-48','MATLAB Command Window','text-49','Run initialize_training_data(projectRoot); add scripts, models, and data to the path.'],
    ['text-51','OPEN','text-52','open_system(...) or Ctrl+O','text-53','Open AircraftFeedbackControlLoop.slx — the runnable closed-loop simulation entry point.'],
    ['text-55','UPDATE','text-56','Modeling → Update Model • Ctrl+D','text-57','Compile and propagate types, dimensions, units, and rates; update does not simulate.'],
    ['text-59','RUN / STOP','text-60','Simulation → Run • Ctrl+T / F5','text-61','Execute the desktop simulation; stop with Ctrl+Shift+T.'],
    ['text-63','BUILD','text-64','Apps → Simulink Coder • Ctrl+B','text-65','Generate and compile code only when the configured coder and toolchain are in scope.'],
  ];
  for (const row of rows) {
    setText(findByName(slide,row[0]),row[1],{fontSize:22,color:COLORS.blue,bold:true,alignment:'left'});
    setText(findByName(slide,row[2]),row[3],{fontSize:18.5,color:COLORS.body,bold:true,alignment:'left'});
    setText(findByName(slide,row[4]),row[5],{fontSize:17.2,color:COLORS.body,alignment:'left'});
  }
  setText(findByName(slide, 'text-66'), 'Update ≠ run ≠ code-generation build. Record which action produced each result.',
    { fontSize: 21.5, color: COLORS.teal, bold: true, alignment: 'center' });
  setNotes(slide, `
Timing: 4 minutes

First-session command path:
1. projectRoot = pwd;
2. addpath(fullfile(projectRoot,'scripts'), fullfile(projectRoot,'models'), fullfile(projectRoot,'data'));
3. initialize_training_data(projectRoot);
4. open_system(fullfile(projectRoot,'models','AircraftFeedbackControlLoop.slx'));
5. Update Model with Ctrl+D before the first run; run with Ctrl+T or F5; stop with Ctrl+Shift+T.

Update/compile resolves and propagates model semantics; it is not a simulation. Run executes the desktop model. Ctrl+B is a configured code-generation build, which is a separate action. This training package does not claim generated-code, PIL, or HIL evidence.

The displaced file-type lesson remains useful: .slx is a model, .m is MATLAB code, .mlx is live code, .sldd is controlled design data, and .mldatx is a Simulink Test artifact. This package does not supply a .mldatx file.

[Sources]
- ${MATHWORKS_SHORTCUTS}
- ${MATHWORKS_CODEGEN}`);
}

// Slide 6 — authentic editor and toolstrip.
{
  const slide = presentation.slides.items[5];
  styleTitle(findByName(slide, 'title-66'), 'The toolstrip tells you where each action lives', 43.5);
  findByName(slide, 'section-66').delete();
  addTextBox(slide,{name:'section-66-v4',position:{left:72,top:34,width:760,height:24},text:'01 • INTRODUCTION TO SIMULINK',fontSize:15,color:COLORS.teal,bold:true,verticalAlignment:'top',insets:{top:4,right:4,bottom:4,left:4}});
  findByName(slide, 'text-68').delete();
  addTextBox(slide,{name:'text-68-v4',position:{left:72,top:678,width:520,height:20},text:'AVIATION CONTROLS ENGINEERING ONBOARDING',fontSize:12,color:'#7D91A0',bold:true,verticalAlignment:'top',insets:{top:0,right:0,bottom:0,left:0}});
  const editorPng = path.join(buildDir,'assets','Simulink_Editor_AircraftFeedbackControlLoop.png');
  const image = slide.images.items[0];
  image.replace({ blob: await imageBytes(editorPng), contentType: 'image/png', alt: 'Authentic MATLAB R2023b Simulink Editor showing AircraftFeedbackControlLoop and the Simulation, Debug, Modeling, Format, and Apps tabs' });
  image.frame = { left: 72, top: 149, width: 790, height: 446 };
  image.fit = 'cover';
  image.crop = { left: 0, top: 0, right: 0, bottom: 0.25 };
  const cards = [
    { y:149, fill:COLORS.tealTint, line:COLORS.teal, title:'SIMULATION', body:'Run • Stop • Data Inspector' },
    { y:252, fill:COLORS.blueTint, line:COLORS.blue, title:'DEBUG', body:'Diagnostics • overlays • signal review' },
    { y:355, fill:COLORS.greenTint, line:COLORS.green, title:'MODELING', body:'Update Model • settings • interfaces' },
    { y:458, fill:COLORS.amberTint, line:COLORS.amber, title:'APPS', body:'Testing tools • code generation' },
  ];
  for (const [i,card] of cards.entries()) {
    addBox(slide,{name:`s6-card-${i+1}`,position:{left:885,top:card.y,width:323,height:87},fill:card.fill,lineColor:card.line,lineWidth:2});
    addTextBox(slide,{name:`s6-card-title-${i+1}`,position:{left:900,top:card.y+10,width:293,height:24},text:card.title,fontSize:18,color:card.line,bold:true});
    addTextBox(slide,{name:`s6-card-body-${i+1}`,position:{left:900,top:card.y+36,width:293,height:39},text:card.body,fontSize:16.5,color:COLORS.body,bold:true,verticalAlignment:'top'});
  }
  setText(findByName(slide, 'V2 Artifact Caption'), 'Authentic R2023b editor • select a tab first, then the action • update, run, inspect, and build are different operations',
    { fontSize: 16.5, color: COLORS.body, bold: true, alignment: 'center', verticalAlignment: 'middle', insets: {top:0,right:3,bottom:0,left:3} });
  findByName(slide, 'V2 Artifact Caption').position = { left: 72, top: 613, width: 1136, height: 27 };
  setNotes(slide, `
Timing: 4 minutes

Use this authentic local R2023b editor capture to orient the learner. Start at the toolstrip:
- Simulation: Run, Stop, and Data Inspector.
- Debug: diagnostics and Information Overlays.
- Modeling: Update Model and model configuration/settings.
- Apps: optional products such as testing and code generation.

The visible model is models/AircraftFeedbackControlLoop.slx, the runnable closed-loop training simulation. The title-bar asterisk reflects temporary display settings used for the capture; the source model was not saved or modified.

[Sources]
- ${MATHWORKS_EDITOR}
- ${MATHWORKS_SHORTCUTS}`);
}

// Slide 7 — overlays and review states.
{
  const slide = presentation.slides.items[6];
  const keep = new Set(['section-88','title-88','line-89','text-90','text-91']);
  for (const shape of [...slide.shapes.items]) if (!keep.has(shape.name)) shape.delete();
  styleTitle(findByName(slide, 'title-88'), 'Turn review overlays on—and off—for focus', 43.5);
  addBox(slide,{name:'s7-path',position:{left:72,top:148,width:1136,height:34},text:'DEBUG → INFORMATION OVERLAYS',fill:COLORS.navy,lineColor:COLORS.teal,fontSize:16,textColor:COLORS.white,bold:true});
  const pills = [
    {x:72,text:'UNITS',fill:COLORS.blueTint,line:COLORS.blue},
    {x:356,text:'BASE DATA TYPES',fill:COLORS.tealTint,line:COLORS.teal},
    {x:640,text:'SIGNAL DIMENSIONS',fill:COLORS.greenTint,line:COLORS.green},
    {x:924,text:'LOG & TESTPOINT',fill:COLORS.amberTint,line:COLORS.amber},
  ];
  for (const [i,pill] of pills.entries()) addBox(slide,{name:`s7-pill-${i+1}`,position:{left:pill.x,top:191,width:260,height:37},text:pill.text,fill:pill.fill,lineColor:pill.line,fontSize:15.5,textColor:COLORS.body});
  addTextBox(slide,{name:'s7-focus-label',position:{left:72,top:235,width:520,height:24},text:'FOCUSED CANVAS — overlays reduced',fontSize:16.5,color:COLORS.blue,bold:true,alignment:'center'});
  addTextBox(slide,{name:'s7-review-label',position:{left:616,top:235,width:592,height:24},text:'REVIEW CANVAS — semantics visible',fontSize:16.5,color:COLORS.teal,bold:true,alignment:'center'});
  slide.images.add({ blob: await imageBytes(path.join(projectRoot,'screenshots','AircraftFeedbackControlLoop_Model.png')), contentType:'image/png', alt:'Authentic model-only AircraftFeedbackControlLoop view', fit:'contain', position:{left:72,top:263,width:520,height:258} });
  slide.images.add({ blob: await imageBytes(path.join(buildDir,'assets','Simulink_Editor_AircraftFeedbackControlLoop.png')), contentType:'image/png', alt:'Authentic AircraftFeedbackControlLoop editor view with visible types, units, dimensions, and logging/test-point badges', fit:'cover', crop:{left:0.03,top:0.24,right:0.03,bottom:0.10}, position:{left:616,top:263,width:592,height:258} });
  addBox(slide,{name:'s7-takeaway',position:{left:72,top:546,width:1136,height:90},text:'Model overlays annotate the diagram. SDI markers annotate plotted samples. Turning either display on or off does not change model behavior or logged values.',fill:'#E8F7F9',lineColor:COLORS.teal,lineWidth:1.5,fontSize:20,textColor:COLORS.ink,bold:true});
  setNotes(slide, `
Timing: 4 minutes

From Debug > Information Overlays, show or hide Units, Base Data Types, Signal Dimensions, and Log & Testpoint indicators. Use overlays while reviewing interfaces, then reduce them when the diagram becomes visually crowded. The displayed unit is metadata associated with the port or signal; turning the overlay off does not remove the underlying unit.

Distinguish three ideas:
- A signal can be configured for logging.
- A model overlay can show the logging/test-point badge and other metadata on the diagram.
- An SDI marker shows an exact logged sample on a plotted trace.

[Sources]
- ${MATHWORKS_EDITOR}
- ${MATHWORKS_UNITS}
- ${MATHWORKS_LOGGING}
- ${MATHWORKS_MARKERS}`);
}

// Slide 8 — explicit model hierarchy and entry points.
{
  const slide = presentation.slides.items[7];
  styleTitle(findByName(slide, 'title-102'), 'Know which top-level model you opened', 45, COLORS.white);
  const modelImage = slide.images.items[0];
  modelImage.frame = { left:72, top:165, width:720, height:397 };
  modelImage.fit = 'contain';
  const hierarchy = [
    {y:165,fill:COLORS.blueTint,line:COLORS.blue,title:'SIMULATE',file:'AircraftFeedbackControlLoop.slx',detail:'runnable closed-loop training model'},
    {y:263,fill:COLORS.tealTint,line:COLORS.teal,title:'INTEGRATE',file:'ReferencedFlightControl\nArchitecture.slx',detail:'parent model-reference architecture'},
    {y:361,fill:COLORS.greenTint,line:COLORS.green,title:'DEVELOP',file:'PitchRateLimiter.slx + referenced components',detail:'component implementation'},
    {y:459,fill:COLORS.amberTint,line:COLORS.amber,title:'VERIFY',file:'PitchRateLimiter_Harness.slx',detail:'unit-level stimulus and capture'},
  ];
  for (const [i,item] of hierarchy.entries()) {
    addBox(slide,{name:`s8-role-${i+1}`,position:{left:820,top:item.y,width:388,height:85},fill:item.fill,lineColor:item.line,lineWidth:2,alignment:'left'});
    addTextBox(slide,{name:`s8-role-title-${i+1}`,position:{left:837,top:item.y+8,width:92,height:22},text:item.title,fontSize:14.8,color:item.line,bold:true});
    addTextBox(slide,{name:`s8-role-file-${i+1}`,position:{left:934,top:item.y+7,width:255,height:38},text:item.file,fontSize:16.2,color:COLORS.ink,bold:true,verticalAlignment:'top'});
    addTextBox(slide,{name:`s8-role-detail-${i+1}`,position:{left:837,top:item.y+48,width:352,height:27},text:item.detail,fontSize:14.8,color:COLORS.body,bold:true});
  }
  setText(findByName(slide, 'V2 Artifact Caption'), '“Top level” means the entry point for the current job—not one universal model.',
    { fontSize: 18.5, color: COLORS.teal, bold: true, alignment:'center' });
  findByName(slide, 'V2 Artifact Caption').position = { left:72, top:602, width:1136, height:30 };
  setNotes(slide, `
Timing: 3 minutes

Four entry points are visible because they answer different questions:
- AircraftFeedbackControlLoop.slx: runnable closed-loop system-level training simulation.
- ReferencedFlightControlArchitecture.slx: integration parent containing SensorProcessingRef, PitchRateLimiter, PitchControllerRef, and ActuatorCommandRef model references.
- PitchRateLimiter.slx: software component implementation.
- PitchRateLimiter_Harness.slx: separate unit harness that points to PitchRateLimiter.

Do not imply that AircraftFeedbackControlLoop is the parent of ReferencedFlightControlArchitecture; they are separate top-level models for different jobs.`);
}

// Slide 10 — actual project data plus a non-fabricated SDI workflow explanation.
{
  const slide = presentation.slides.items[9];
  styleTitle(findByName(slide, 'title-143'), 'The Data Inspector makes runs inspectable and comparable', 41.5);
  const plotImage = slide.images.items[0];
  plotImage.frame = { left:72, top:180, width:690, height:375 };
  plotImage.fit = 'contain';
  addBox(slide,{name:'s10-path',position:{left:790,top:151,width:418,height:54},text:'SIMULATION TAB → DATA INSPECTOR',fill:COLORS.navy,lineColor:COLORS.teal,fontSize:17,textColor:COLORS.white});
  const items = [
    {y:222,n:'1',title:'LOG',body:'Select only the signals needed for the question.',fill:COLORS.blueTint,line:COLORS.blue},
    {y:307,n:'2',title:'INSPECT',body:'Markers show samples; cursors read time, value, and delta.',fill:COLORS.tealTint,line:COLORS.teal},
    {y:392,n:'3',title:'COMPARE',body:'Baseline vs candidate using time, absolute, and relative tolerances.',fill:COLORS.greenTint,line:COLORS.green},
    {y:477,n:'4',title:'RETAIN',body:'Run, units, configuration, and result become evidence input.',fill:COLORS.amberTint,line:COLORS.amber},
  ];
  for (const [i,item] of items.entries()) {
    addBox(slide,{name:`s10-step-${i+1}`,position:{left:790,top:item.y,width:418,height:70},fill:item.fill,lineColor:item.line,lineWidth:1.8,alignment:'left'});
    addBox(slide,{name:`s10-step-num-${i+1}`,position:{left:805,top:item.y+17,width:42,height:36},text:item.n,fill:item.line,lineColor:item.line,fontSize:16,textColor:COLORS.white,geometry:'ellipse'});
    addTextBox(slide,{name:`s10-step-title-${i+1}`,position:{left:860,top:item.y+7,width:105,height:23},text:item.title,fontSize:17,color:item.line,bold:true});
    addTextBox(slide,{name:`s10-step-body-${i+1}`,position:{left:860,top:item.y+29,width:330,height:36},text:item.body,fontSize:15.2,color:COLORS.body,bold:true,verticalAlignment:'top'});
  }
  setText(findByName(slide, 'V2 Artifact Caption'), 'Retained 50 Hz command-tracking data • SDI is the interactive workspace for samples, cursors, comparisons, and run metadata',
    { fontSize:16.2,color:COLORS.body,bold:true,alignment:'center' });
  findByName(slide, 'V2 Artifact Caption').position = { left:72, top:600, width:1136, height:32 };
  setNotes(slide, `
Timing: 5 minutes

The visible plot is the authentic retained desktop result from results/AircraftFeedback_CommandTracking.mat. In a live R2023b demonstration:
1. Configure the relevant signals for logging.
2. Run the model, then open Simulation > Data Inspector.
3. Select a run and plot command, response, tracking error, and actuator command.
4. Turn markers on to expose exact logged samples; use cursors to read values and time differences.
5. Use Compare for baseline-versus-candidate results with planned time, absolute, and relative tolerances.
6. Retain run/session metadata with the controlled model and configuration.

Data points are the logged samples. Markers merely make those samples visible; hiding markers does not discard them. A passing comparison remains evidence input, not certification approval by itself.

[Sources]
- ${MATHWORKS_LOGGING}
- ${MATHWORKS_SDI}
- ${MATHWORKS_MARKERS}
- ${MATHWORKS_COMPARE}
- ${FAA_ORDER}`);
}

// Slide 18 — visible pseudo requirements grounded in the actual limiter.
{
  const slide = presentation.slides.items[17];
  styleTitle(findByName(slide, 'title-263'), 'Pseudo requirements make the training chain explicit', 43);
  findByName(slide, 'text-265').delete();
  addTextBox(slide,{name:'text-265-v4',position:{left:72,top:678,width:520,height:20},text:'AVIATION CONTROLS ENGINEERING ONBOARDING',fontSize:12,color:'#7D91A0',bold:true,verticalAlignment:'top',insets:{top:0,right:0,bottom:0,left:0}});
  findByName(slide, 'text-266').delete();
  const s18Page = slide.shapes.add({geometry:'rect',name:'page-18-v4',position:{left:1156,top:676,width:52,height:22},fill:'none',line:{style:'solid',fill:'none',width:0}});
  setText(s18Page,'18',{fontSize:14,color:COLORS.teal,bold:true,alignment:'right',verticalAlignment:'top',insets:{top:0,right:0,bottom:0,left:0},wrap:'none'});
  const rows = [
    ['box-267','SYSTEM\nPSYS-001','text-268','Before the pitch controller, constrain a valid Normal-mode pitch-rate command to |q_cmd| ≤ 12 deg/s; otherwise substitute 0 deg/s.'],
    ['box-270','SOFTWARE HLR\nSWHLR-001 / 002','text-271','When normal_mode and input_valid are true, q_cmd_out = min(max(q_cmd_in, −12), +12); otherwise q_cmd_out = 0 deg/s.'],
    ['box-273','DESIGN / LLR\nSWLLR-001 / 002','text-274','Magnitude Clamp applies ±q_limit_normal; Normal AND Valid drives Select Valid Command; Training Fallback Command is 0 deg/s.'],
    ['box-276','STATUS + TIMING\nSWHLR-003 / 004','text-277','limiter_active is true only outside ±12 during valid Normal mode; the component updates at 50 Hz with no added state dynamics.'],
  ];
  for (const row of rows) {
    setText(findByName(slide,row[0]),row[1],{fontSize:15.8,color:COLORS.white,bold:true,alignment:'center'});
    setText(findByName(slide,row[2]),row[3],{fontSize:18,color:COLORS.body,bold:true,alignment:'left',insets:{top:5,right:8,bottom:5,left:8}});
  }
  setText(findByName(slide, 'box-278'), 'ILLUSTRATIVE CLASSROOM REQUIREMENTS • not production aircraft data or an approved certification baseline',
    { fontSize:18,color:COLORS.white,bold:true,alignment:'center',insets:{top:4,right:10,bottom:4,left:10} });
  setNotes(slide, `
Timing: 5 minutes

These are illustrative classroom requirements, not production aircraft data and not an approved certification baseline. Whether a Simulink model represents HLR, LLR, design, or verification data is established by approved project plans; a Simulink model is not automatically compliant. This package has no live Simulink Requirements links, so the demonstration uses CSV/script/result associations.

Complete training set:
- PSYS-001: command-path protection allocated to ReferencedFlightControlArchitecture/Pitch Rate Limiter and PitchRateLimiter.
- SWHLR-001 / PRL-001: inclusive clamp to ±12 deg/s while valid and Normal.
- SWHLR-002 / PRL-002: zero fallback when mode or validity is false.
- SWHLR-003 / PRL-003: limiter_active only for strictly out-of-limit valid Normal inputs; false at exactly ±12 and during fallback.
- SWHLR-004 / PRL-004/005: 50 Hz, same-sample output, no added slew/state dynamics.
- SWLLR-001..004: exact blocks, strict comparisons, types, units, Boolean status, and fixed-step 0.02 s contract.

[Sources]
- docs/PitchRateLimiter_Requirements_Traceability.csv
- models/PitchRateLimiter.slx
- ${FAA_AC}
- ${FAA_ORDER}`);
}

// Slide 19 — visible bidirectional chain to one retained result.
{
  const slide = presentation.slides.items[18];
  styleTitle(findByName(slide, 'title-278'), 'One limiter requirement, one traceable evidence chain', 43, COLORS.white);
  const chain = [
    {x:72,fill:COLORS.blueTint,line:COLORS.blue,text:'PSYS-001\ncommand-path protection'},
    {x:301,fill:COLORS.blueTint,line:COLORS.blue,text:'SWHLR-001 / PRL-001\ninclusive ±12 allocation'},
    {x:530,fill:COLORS.tealTint,line:COLORS.teal,text:'MAGNITUDE CLAMP\nmodel block'},
    {x:759,fill:COLORS.amberTint,line:COLORS.amber,text:'BOUNDARY ABOVE UPPER\nq_cmd = 12.1 deg/s'},
    {x:988,fill:COLORS.greenTint,line:COLORS.green,text:'ITERATION 8\nactual 12.0 • PASS'},
  ];
  const cards = chain.map((item,i)=>addBox(slide,{name:`s19-chain-${i+1}`,position:{left:item.x,top:155,width:190,height:110},text:item.text,fill:item.fill,lineColor:item.line,lineWidth:2,fontSize:i===2?15.2:15.5,textColor:COLORS.ink,bold:true}));
  for (let i=0;i<cards.length-1;i+=1) {
    const connector = slide.shapes.connect(cards[i],cards[i+1],{kind:'straight',fromSide:'right',toSide:'left',line:{style:'dashed',fill:COLORS.muted,width:1.6},head:{type:'arrow',width:'sm',length:'sm'},tail:{type:'arrow',width:'sm',length:'sm'},cap:'round'});
    connector.sendToBack();
  }
  addBox(slide,{name:'s19-evidence-panel',position:{left:72,top:305,width:500,height:255},fill:COLORS.navy,lineColor:COLORS.teal,lineWidth:2});
  addTextBox(slide,{name:'s19-env',position:{left:92,top:321,width:460,height:26},text:'EXECUTED ENVIRONMENT',fontSize:15.5,color:'#70DCE5',bold:true});
  addTextBox(slide,{name:'s19-env-body',position:{left:92,top:350,width:460,height:39},text:'Desktop Simulink model execution (MIL)\nnot SIL, PIL, or HIL',fontSize:18,color:COLORS.white,bold:true,verticalAlignment:'top'});
  addLine(slide,{name:'s19-divider',left:92,top:402,width:460,color:'#28506B',lineWidth:1.2});
  addTextBox(slide,{name:'s19-result',position:{left:92,top:417,width:460,height:126},text:'t = 0.14 s   •   expected = 12.0\nactual = 12.0   •   error = 0\ntolerance = 1e−9   •   timing PASS\nAssociatedRequirement →\nPRL-001 • PRL-003 • PRL-004',fontSize:17.2,color:COLORS.white,bold:true,verticalAlignment:'top'});
  const resultImage = slide.images.items[0];
  resultImage.frame = { left:610, top:305, width:598, height:255 };
  resultImage.fit = 'contain';
  setText(findByName(slide, 'V2 Artifact Caption'), 'Trace both directions • retain model, dictionary, test script, result, and tool/configuration metadata in one controlled baseline',
    { fontSize:16.4,color:'#BFD8E5',bold:true,alignment:'center' });
  findByName(slide, 'V2 Artifact Caption').position = { left:72, top:597, width:1136, height:35 };
  setNotes(slide, `
Timing: 5 minutes

Walk left to right, then return right to left:
PSYS-001 → SWHLR-001 / PRL-001 → SWLLR-001 → PitchRateLimiter/Pitch Rate Limiter Logic/Magnitude Clamp → PitchRateLimiter_Harness/Unit Under Test - PitchRateLimiter → scripts/run_pitch_rate_limiter_tests.m, case “Boundary above upper limit” → retained result Iteration 8.

Result detail: t=0.14 s; input=12.1 deg/s; expected=12; actual=12; error=0; tolerance=1e−9; timestamp/timing PASS; overall PASS. The retained CSV result field AssociatedRequirement lists PRL-001, PRL-003, and PRL-004; this slide focuses the chain on the PRL-001 clamp allocation while preserving the complete association. Environment: desktop Simulink model execution (MIL), not SIL, PIL, or HIL.

Use the corrected live-model names: Magnitude Clamp, Select Valid Command, and Valid Clamp Active. The package uses CSV/script/result associations, not live Simulink Requirements links. A passing result is evidence input, not certification approval.

[Sources]
- docs/PitchRateLimiter_Requirements_Traceability.csv
- scripts/run_pitch_rate_limiter_tests.m
- results/PitchRateLimiter_TestResults.csv
- ${FAA_ORDER}`);
}

// Slide 27 — label the integration entry point.
{
  const slide = presentation.slides.items[26];
  styleTitle(findByName(slide, 'title-412'), 'ReferencedFlightControlArchitecture is the integration top level', 39.5);
  setText(findByName(slide, 'V2 Artifact Caption'), 'Integration entry point • referenced sensor, limiter, controller, and actuator models • update validates interface consistency',
    {fontSize:16.2,color:COLORS.body,bold:true,alignment:'center'});
  setNotes(slide, `
Timing: 3 minutes

Open models/ReferencedFlightControlArchitecture.slx when the job is integration. Its referenced children are SensorProcessingRef, PitchRateLimiter, PitchControllerRef, and ActuatorCommandRef. Update Model before simulation to validate model-reference availability and interface consistency. This is separate from AircraftFeedbackControlLoop.slx, the runnable closed-loop training simulation.

Architecture update/compile evidence is useful input, not approval by itself. This package does not claim HIL execution.

[Sources]
- ${MATHWORKS_EDITOR}
- ${FAA_ORDER}`);
}

// Slide 28 — label optional/generic CI capability.
{
  const slide = presentation.slides.items[27];
  setText(findByName(slide, 'text-439'), 'opens the project, updates models, runs checks and scripted tests; .mldatx suites are an optional generic capability, not supplied here',
    {fontSize:17.5,color:'#D8E8F1',alignment:'left',verticalAlignment:'middle'});
  appendNotes(slide, `
V4 first-user clarification:
- The supplied package uses MATLAB scripts and retained CSV/MAT/PNG/HTML-style artifacts; it does not contain a .mldatx suite.
- A green CI stage is evidence input from the controlled agent/configuration. It is not certification approval and does not replace traceability, review, configuration control, problem reporting, or designated independence.

[Sources]
- ${FAA_ORDER}`);
}

// Slide 33 — close with executable first-user actions.
{
  const slide = presentation.slides.items[32];
  styleTitle(findByName(slide, 'title-503'), 'Your first week should produce one repeatable chain', 44, COLORS.white);
  findByName(slide, 'text-505').delete();
  addTextBox(slide,{name:'text-505-v4',position:{left:72,top:678,width:520,height:20},text:'AVIATION CONTROLS ENGINEERING ONBOARDING',fontSize:12,color:'#7D91A0',bold:true,verticalAlignment:'top',insets:{top:0,right:0,bottom:0,left:0}});
  findByName(slide, 'text-506').delete();
  addTextBox(slide,{name:'text-506-v4',position:{left:1156,top:676,width:52,height:22},text:'33',fontSize:14,color:'#70DCE5',bold:true,alignment:'right',verticalAlignment:'top',insets:{top:0,right:0,bottom:0,left:0},wrap:'none'});
  setText(findByName(slide, 'text-510'), 'FIRST WEEK');
  const actions = [
    '01  initialize paths + open the simulation top level',
    '02  update (Ctrl+D), then run (Ctrl+T)',
    '03  toggle units, types, dimensions + logging',
    '04  inspect samples + compare runs in SDI',
    '05  trace PSYS-001 to one executed result',
    '06  modify one component; rerun affected evidence',
  ];
  ['box-511','box-512','box-513','box-514','box-515','box-516'].forEach((name,i)=>setText(findByName(slide,name),actions[i],{fontSize:17.5,color:COLORS.white,bold:true,alignment:'left',insets:{top:3,right:10,bottom:3,left:14}}));
  setText(findByName(slide, 'box-517'), 'A repeatable chain makes review possible: requirement → model → test → result → controlled baseline.',
    {fontSize:21,color:COLORS.white,bold:true,alignment:'center'});
  setNotes(slide, `
Timing: 2 minutes

The learner’s first week should end with one reproducible chain, not only passive familiarity with screenshots. Use the illustrative PSYS/SWHLR/PRL requirements in this training package; transition to approved program requirements only under the project’s actual plans and data controls.

This package stops at desktop model execution and architecture update. It did not perform HIL. DO-178C is an accepted means of compliance, not a standalone software certificate; DO-331 supplements it for model-based development and verification. A passing test or pipeline is evidence input, not approval by itself.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}
- ${NASA_SE}`);
}

// Targeted note clarifications on related lifecycle/certification slides.
appendNotes(presentation.slides.items[13], `
V4 first-user connection:
- Update, simulation, scripted tests, and CI are different evidence-producing actions. A pass from any one action is input to review, not automatic approval.
- This training package did not perform HIL.

[Sources]
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[14], `
V4 first-user connection:
- The visible pseudo requirements on slide 18 and trace chain on slide 19 are classroom artifacts. A Simulink model is not automatically compliant; its planned lifecycle role, reviews, traceability, configuration control, and verification data determine what credit may be requested.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[31], `
V4 first-user clarification:
- The requirement remains visible through each executed environment. This package stops at desktop model execution and architecture update; it does not extend to HIL.
- Use the exact execution-environment name in retained evidence. PIL is not automatically unit testing, and HIL requires actual controller/target hardware, a real-time plant environment, and physical I/O.

[Sources]
- ${FAA_ORDER}
- ${NASA_SE}`);

for (const slide of presentation.slides.items) slide.speakerNotes.setVisible(true);

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPptxPath);

await fs.mkdir(renderDir,{recursive:true});
await fs.mkdir(layoutDir,{recursive:true});
for (const [index,slide] of presentation.slides.items.entries()) {
  const padded = String(index+1).padStart(2,'0');
  const png = await presentation.export({slide,format:'png',scale:1});
  await writeBlob(path.join(renderDir,`final-slide-${padded}.png`),png);
  const layout = await slide.export({format:'layout'});
  await fs.writeFile(path.join(layoutDir,`final-slide-${padded}.layout.json`),await layout.text(),'utf8');
}
const montage = await presentation.export({format:'webp',montage:true,scale:0.5});
await writeBlob(path.join(buildDir,'final-deck-montage.webp'),montage);

await fs.writeFile(path.join(buildDir,'authoring-summary.json'),JSON.stringify({
  outputPptxPath, slideCount:presentation.slides.items.length,
  changedSlides:[3,5,6,7,8,10,18,19,27,28,33],
  notesVisible:presentation.slides.items.map((slide,index)=>({slide:index+1,visible:slide.speakerNotes.isVisible()})),
},null,2),'utf8');

console.log(`OUTPUT_PPTX=${outputPptxPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`RENDER_COUNT=${presentation.slides.items.length}`);
