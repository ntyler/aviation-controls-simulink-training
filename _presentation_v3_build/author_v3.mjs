import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(buildDir);
const starterPptxPath = path.join(buildDir, 'template-starter.pptx');
const outputPptxPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v3.pptx');
const renderDir = path.join(buildDir, 'final-render-artifact');
const layoutDir = path.join(buildDir, 'final-layout');

const COLORS = {
  bg: '#F4F8FB',
  ink: '#0B1F33',
  body: '#17324A',
  muted: '#5D7487',
  rule: '#C9D8E3',
  navy: '#0B2438',
  blue: '#2D6CDF',
  blueTint: '#E2ECFF',
  teal: '#20B7C5',
  tealTint: '#DFF6F8',
  amber: '#E9A23B',
  amberTint: '#FFF0D7',
  green: '#2CA56F',
  greenTint: '#E2F4EA',
  white: '#FFFFFF',
};

function textValue(shape) {
  try {
    return shape.text?.value ?? String(shape.text ?? '');
  } catch {
    return '';
  }
}

function findShape(slide, predicate, description) {
  const shape = slide.shapes.items.find(predicate);
  if (!shape) throw new Error(`Unable to find ${description}`);
  return shape;
}

function findByName(slide, name) {
  return findShape(slide, (shape) => shape.name === name, `shape ${name}`);
}

function findPageMarker(slide) {
  return findShape(
    slide,
    (shape) => shape.position?.left >= 1140 && shape.position?.top >= 665 && /^\d{2}$/.test(textValue(shape).trim()),
    'page marker',
  );
}

function addTextBox(slide, {
  name,
  position,
  text,
  fontSize = 18,
  color = COLORS.ink,
  bold = false,
  alignment = 'left',
  verticalAlignment = 'middle',
  insets = { top: 2, right: 4, bottom: 2, left: 4 },
  wrap = 'square',
  autoFit = 'none',
}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    name,
    position,
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: 'Aptos',
    fontSize,
    color,
    bold,
    alignment,
    verticalAlignment,
    insets,
    wrap,
    autoFit,
  };
  return shape;
}

function addBox(slide, {
  name,
  position,
  text = '',
  fill = COLORS.white,
  lineColor = COLORS.rule,
  lineWidth = 1.5,
  fontSize = 18,
  textColor = COLORS.ink,
  bold = true,
  alignment = 'center',
  borderRadius = 'rounded-xl',
  insets = { top: 4, right: 10, bottom: 4, left: 10 },
}) {
  const shape = slide.shapes.add({
    geometry: 'roundRect',
    name,
    position,
    fill,
    line: { style: 'solid', fill: lineColor, width: lineWidth },
    borderRadius,
  });
  if (text) {
    shape.text = text;
    shape.text.style = {
      typeface: 'Aptos',
      fontSize,
      color: textColor,
      bold,
      alignment,
      verticalAlignment: 'middle',
      insets,
      wrap: 'square',
      autoFit: 'none',
    };
  }
  return shape;
}

function addLine(slide, {
  name,
  left,
  top,
  width,
  height,
  color,
  lineWidth,
  horizontalFlip = false,
  style = 'solid',
}) {
  return slide.shapes.add({
    geometry: 'line',
    name,
    position: { left, top, width, height, horizontalFlip },
    fill: 'none',
    line: { style, fill: color, width: lineWidth },
  });
}

function appendNotes(slide, text) {
  slide.speakerNotes.append(`\n\n${text.trim()}`);
  slide.speakerNotes.setVisible(true);
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPptxPath));
if (presentation.slides.items.length !== 33) {
  throw new Error(`Starter deck has ${presentation.slides.items.length} slides; expected 33.`);
}

// Keep the existing slide 14 claim precise and environment-neutral.
const evidenceSlide = presentation.slides.items[13];
const evidenceTakeaway = findShape(
  evidenceSlide,
  (shape) => textValue(shape).includes('Pipeline and HIL passes'),
  'slide 14 evidence takeaway',
);
evidenceTakeaway.text = 'Pipeline and test results are evidence inputs—not automatic approval.';

// The starter contains slide 14 twice. On the first duplicate, the imported section
// eyebrow and footer remain in layout metadata but are suppressed by the renderer.
// Replace only those two chrome text boxes at their inherited geometry and style.
findByName(evidenceSlide, 'section-221').delete();
addTextBox(evidenceSlide, {
  name: 'section-221-v3',
  position: { left: 72, top: 34, width: 760, height: 24 },
  text: '03 • DO-178C OVERVIEW',
  fontSize: 15,
  color: COLORS.teal,
  bold: true,
  alignment: 'left',
  verticalAlignment: 'top',
  insets: { top: 4, right: 4, bottom: 4, left: 4 },
});
findByName(evidenceSlide, 'text-223').delete();
addTextBox(evidenceSlide, {
  name: 'text-223-v3',
  position: { left: 72, top: 678, width: 520, height: 20 },
  text: 'AVIATION CONTROLS ENGINEERING ONBOARDING',
  fontSize: 12,
  color: '#7D91A0',
  bold: true,
  alignment: 'left',
  verticalAlignment: 'top',
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
});

// Replace the inherited source-slide-14 body with an original, editable V-model.
const lifecycleSlide = presentation.slides.items[14];
const keepNames = new Set(['section-221', 'title-221', 'line-222', 'text-223', 'text-224']);
for (const shape of [...lifecycleSlide.shapes.items]) {
  if (!keepNames.has(shape.name)) shape.delete();
}

const lifecycleTitle = findByName(lifecycleSlide, 'title-221');
lifecycleTitle.text = 'The V-model links every definition to its verification';
lifecycleTitle.text.style = {
  typeface: 'Aptos',
  fontSize: 40.5,
  color: COLORS.ink,
  bold: true,
  alignment: 'left',
  verticalAlignment: 'top',
  insets: { top: 4, right: 4, bottom: 4, left: 4 },
  wrap: 'none',
  autoFit: 'none',
  lineSpacing: 0.94,
};

findByName(lifecycleSlide, 'text-224').delete();
addTextBox(lifecycleSlide, {
  name: 'text-224-v3',
  position: { left: 1156, top: 676, width: 52, height: 22 },
  text: '15',
  fontSize: 14,
  color: COLORS.teal,
  bold: true,
  alignment: 'right',
  verticalAlignment: 'top',
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  wrap: 'none',
});

const callouts = [
  { x: 72, width: 270, fill: COLORS.blueTint, line: COLORS.blue, text: 'REQUIREMENTS ↔ BIDIRECTIONAL TRACEABILITY' },
  { x: 352, width: 270, fill: COLORS.tealTint, line: COLORS.teal, text: 'MODEL-BASED · MATLAB / SIMULINK' },
  { x: 632, width: 270, fill: COLORS.greenTint, line: COLORS.green, text: 'INDEPENDENT VERIFICATION ACTIVITIES' },
  { x: 912, width: 296, fill: COLORS.amberTint, line: COLORS.amber, text: 'INTEGRATION + EXECUTION ENVIRONMENTS' },
];

for (const [index, callout] of callouts.entries()) {
  addBox(lifecycleSlide, {
    name: `vmodel-callout-${index + 1}`,
    position: { left: callout.x, top: 143, width: callout.width, height: 40 },
    text: callout.text,
    fill: callout.fill,
    lineColor: callout.line,
    lineWidth: 1.5,
    fontSize: index === 3 ? 14 : 14.5,
    textColor: COLORS.body,
    bold: true,
    borderRadius: 'rounded-lg',
    insets: { top: 2, right: 7, bottom: 2, left: 7 },
  });
}

addTextBox(lifecycleSlide, {
  name: 'vmodel-left-heading',
  position: { left: 72, top: 185, width: 490, height: 20 },
  text: 'DEFINE + DECOMPOSE  ·  REVIEW GATES G1–G5',
  fontSize: 14.5,
  color: COLORS.muted,
  bold: true,
});
addTextBox(lifecycleSlide, {
  name: 'vmodel-pair-heading',
  position: { left: 530, top: 185, width: 220, height: 20 },
  text: 'PAIR EACH LEVEL',
  fontSize: 14.5,
  color: COLORS.teal,
  bold: true,
  alignment: 'center',
});
addTextBox(lifecycleSlide, {
  name: 'vmodel-right-heading',
  position: { left: 788, top: 185, width: 420, height: 20 },
  text: 'INTEGRATE + VERIFY + VALIDATE',
  fontSize: 14.5,
  color: COLORS.muted,
  bold: true,
  alignment: 'right',
});

// Draw V rails first so lifecycle cards and gates stay visually dominant.
addLine(lifecycleSlide, {
  name: 'vmodel-left-rail-underlay', left: 410, top: 234, width: 160, height: 320,
  color: COLORS.white, lineWidth: 8,
});
addLine(lifecycleSlide, {
  name: 'vmodel-left-rail', left: 410, top: 234, width: 160, height: 320,
  color: COLORS.blue, lineWidth: 4,
});
addLine(lifecycleSlide, {
  name: 'vmodel-right-rail-underlay', left: 710, top: 234, width: 160, height: 320,
  color: COLORS.white, lineWidth: 8, horizontalFlip: true,
});
addLine(lifecycleSlide, {
  name: 'vmodel-right-rail', left: 710, top: 234, width: 160, height: 320,
  color: COLORS.green, lineWidth: 4, horizontalFlip: true,
});

const rowTops = [208, 269, 330, 391, 452];
const leftXs = [72, 103, 134, 165, 196];
const rightXs = [888, 857, 826, 795, 764];
const gateCenters = [410, 441, 472, 503, 534];
const cardHeight = 52;
const cardWidth = 320;

const leftStages = [
  { text: 'System / engine\nrequirements', fill: COLORS.blueTint, line: COLORS.blue, fontSize: 18 },
  { text: 'Software high-level\nrequirements (HLR)', fill: COLORS.blueTint, line: COLORS.blue, fontSize: 17.5 },
  { text: 'Software architecture / design\n+ low-level requirements', fill: COLORS.tealTint, line: COLORS.teal, fontSize: 16.2 },
  { text: 'Simulink models\n+ C/H source code', fill: COLORS.tealTint, line: COLORS.teal, fontSize: 17.5 },
  { text: 'Executable\nobject code', fill: COLORS.amberTint, line: COLORS.amber, fontSize: 18 },
];

const rightStages = [
  { text: 'System verification\n+ validation', fill: COLORS.greenTint, line: COLORS.green, fontSize: 18 },
  { text: 'Software integration\nverification', fill: COLORS.greenTint, line: COLORS.green, fontSize: 17.5 },
  { text: 'Component / unit\nverification', fill: COLORS.greenTint, line: COLORS.green, fontSize: 17.5 },
  { text: 'MIL / SIL · analysis\n+ coverage', fill: COLORS.tealTint, line: COLORS.teal, fontSize: 17.5 },
  { text: 'PIL / target · HIL / bench\n+ system integration', fill: COLORS.amberTint, line: COLORS.amber, fontSize: 15.5 },
];

const leftCards = [];
const rightCards = [];
for (let index = 0; index < 5; index += 1) {
  const leftCard = addBox(lifecycleSlide, {
    name: `vmodel-definition-${index + 1}`,
    position: { left: leftXs[index], top: rowTops[index], width: cardWidth, height: cardHeight },
    text: leftStages[index].text,
    fill: leftStages[index].fill,
    lineColor: leftStages[index].line,
    lineWidth: 2,
    fontSize: leftStages[index].fontSize,
    textColor: COLORS.ink,
    bold: true,
    alignment: 'left',
    borderRadius: 'rounded-xl',
    insets: { top: 4, right: 12, bottom: 4, left: 14 },
  });
  const rightCard = addBox(lifecycleSlide, {
    name: `vmodel-verification-${index + 1}`,
    position: { left: rightXs[index], top: rowTops[index], width: cardWidth, height: cardHeight },
    text: rightStages[index].text,
    fill: rightStages[index].fill,
    lineColor: rightStages[index].line,
    lineWidth: 2,
    fontSize: rightStages[index].fontSize,
    textColor: COLORS.ink,
    bold: true,
    alignment: 'right',
    borderRadius: 'rounded-xl',
    insets: { top: 4, right: 14, bottom: 4, left: 12 },
  });
  leftCards.push(leftCard);
  rightCards.push(rightCard);
}

for (let index = 0; index < 5; index += 1) {
  const connector = lifecycleSlide.shapes.connect(leftCards[index], rightCards[index], {
    kind: 'straight',
    fromSide: 'right',
    toSide: 'left',
    line: { style: 'dashed', fill: COLORS.muted, width: 1.6 },
    head: { type: 'arrow', width: 'sm', length: 'sm' },
    tail: { type: 'arrow', width: 'sm', length: 'sm' },
    cap: 'round',
  });
  connector.sendToBack();
}

for (let index = 0; index < 5; index += 1) {
  const gate = lifecycleSlide.shapes.add({
    geometry: 'ellipse',
    name: `vmodel-gate-${index + 1}`,
    position: { left: gateCenters[index] - 17, top: rowTops[index] + 9, width: 34, height: 34 },
    fill: COLORS.navy,
    line: { style: 'solid', fill: COLORS.white, width: 2 },
  });
  gate.text = `G${index + 1}`;
  gate.text.style = {
    typeface: 'Aptos',
    fontSize: 13.5,
    color: COLORS.white,
    bold: true,
    alignment: 'center',
    verticalAlignment: 'middle',
    insets: { top: 1, right: 1, bottom: 1, left: 1 },
    wrap: 'none',
    autoFit: 'none',
  };
}

addBox(lifecycleSlide, {
  name: 'vmodel-baseline',
  position: { left: 475, top: 526, width: 330, height: 58 },
  fill: COLORS.navy,
  lineColor: COLORS.teal,
  lineWidth: 2,
  borderRadius: 'rounded-xl',
});
addTextBox(lifecycleSlide, {
  name: 'vmodel-baseline-title',
  position: { left: 487, top: 536, width: 306, height: 22 },
  text: 'CONTROLLED SOFTWARE BASELINE',
  fontSize: 16.8,
  color: COLORS.white,
  bold: true,
  alignment: 'center',
  verticalAlignment: 'middle',
  insets: { top: 0, right: 2, bottom: 0, left: 2 },
  wrap: 'none',
});
addTextBox(lifecycleSlide, {
  name: 'vmodel-baseline-subtitle',
  position: { left: 487, top: 559, width: 306, height: 15 },
  text: 'configuration · trace links · review records',
  fontSize: 13,
  color: '#BFEAF0',
  bold: true,
  alignment: 'center',
  verticalAlignment: 'middle',
  insets: { top: 0, right: 1, bottom: 0, left: 1 },
});

addBox(lifecycleSlide, {
  name: 'vmodel-takeaway',
  position: { left: 72, top: 602, width: 1136, height: 51 },
  text: 'Agile changes the cadence; it does not remove ordered reviews, traceability, controlled baselines, or planned independence.',
  fill: '#E8F7F9',
  lineColor: COLORS.teal,
  lineWidth: 1.5,
  fontSize: 16.5,
  textColor: COLORS.ink,
  bold: true,
  alignment: 'center',
  borderRadius: 'rounded-xl',
  insets: { top: 4, right: 14, bottom: 4, left: 14 },
});

// Keep the conceptual lifecycle flow from implying that this project ran HIL.
const integrationFlowSlide = presentation.slides.items[16];
const hilCampaignBox = findShape(
  integrationFlowSlide,
  (shape) => textValue(shape).includes('Execute HIL'),
  'slide 17 HIL campaign box',
);
hilCampaignBox.text = '17  Execute planned\nintegration tests';

// Renumber the inserted slide and every following slide.
for (let index = 14; index < presentation.slides.items.length; index += 1) {
  findPageMarker(presentation.slides.items[index]).text = String(index + 1).padStart(2, '0');
}

const FAA_AC = 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1032046';
const FAA_ORDER = 'https://www.faa.gov/documentLibrary/media/Order/FAA_Order_8110.49A.pdf';
const NASA_SE = 'https://www.nasa.gov/reference/systems-engineering-handbook/';

appendNotes(presentation.slides.items[11], `
V3 terminology clarification:
- Prefer the training-example title “Gas Turbine Controls: Model-Based Development with Independent Verification,” not “independent compliance.”
- DO-178C is an accepted means of compliance, not a standalone software certificate. DO-331 supplements DO-178C for model-based development and verification.
- A Simulink model is not automatically compliant; its planned role, traceability, reviews, verification, configuration control, and lifecycle data determine what credit may be requested.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[12], `
V3 software-level and independence clarification:
- Say “DO-178C Software Level A” when discussing software objectives. Use a broader system Development Assurance Level only when discussing the system-level allocation that informed the software level.
- Independence applies to designated verification objectives under approved plans. Avoid the blanket claim that an author can never participate in review; where independence is required, the author should not be the sole independent verifier of their own work.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[13], `
V3 evidence clarification:
- A passing pipeline or test result is an evidence input. It is not certification approval by itself.
- MIL, SIL, PIL, HIL, bench, and system-integration testing are different verification environments. This training project did not perform HIL testing.

[Sources]
- ${FAA_ORDER}`);

const lifecycleNotes = `
Timing: 3 minutes

Walk the V down the left from system/engine requirements through HLR, architecture/design and low-level requirements, model/source implementation, and executable object code. The controlled software baseline is the configuration-controlled vertex. Then walk up the right through target and integration environments, MIL/SIL analysis and coverage, component or unit verification, software integration verification, and system verification and validation. The dashed two-headed links emphasize bidirectional traceability: each definition has planned verification, and every result identifies the definition and controlled configuration it covers.

Use the four callouts to separate responsibilities:
- Model-based software development uses MATLAB/Simulink as planned lifecycle tools and artifacts; a Simulink model is not automatically compliant.
- Requirements need bidirectional traceability into implementation, verification procedures, results, reviews, and problem dispositions.
- Independence applies to designated verification objectives under approved plans. An author is not categorically prohibited from participating in review, but should not be the sole independent verifier of their own work where independence is required.
- MIL, SIL, PIL, HIL, bench, and system-integration testing are distinct verification environments. PIL is an execution environment and is not automatically synonymous with unit testing. Call a test HIL only when actual controller or target hardware, a real-time plant environment, and physical I/O are used. This training project performed no HIL testing.

Certification and lifecycle language:
- Prefer the example title “Gas Turbine Controls: Model-Based Development with Independent Verification,” not “independent compliance.”
- DO-178C is an accepted means of compliance, not a standalone software certificate. DO-331 supplements DO-178C for model-based development and verification.
- Use “DO-178C Software Level A” unless the discussion is explicitly about a broader system Development Assurance Level allocation.
- Agile and waterfall can both be used. Agile changes cadence, not the need for lifecycle data, ordered reviews, traceability, configuration control, controlled baselines, planned verification, or designated independence.
- A passing pipeline or test result is evidence input, not certification approval by itself.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}
- ${NASA_SE}`;
lifecycleSlide.speakerNotes.textFrame.setText(lifecycleNotes.trim());
lifecycleSlide.speakerNotes.setVisible(true);

appendNotes(presentation.slides.items[15], `
V3 lifecycle clarification:
- Agile and waterfall are both usable lifecycle organizations. Whichever cadence is selected, approved plans still have to account for lifecycle data, traceability, reviews, configuration control, controlled baselines, verification objectives, and planned independence.
- Review gates should be ordered around stable inputs and exit criteria even when development iterates in short increments.

[Sources]
- ${FAA_ORDER}
- ${NASA_SE}`);

appendNotes(presentation.slides.items[16], `
V3 environment clarification:
- The visible sequence is conceptual; this project did not execute Jenkins or HIL. “Execute planned integration tests” means use the environments required by the approved verification strategy.
- MIL, SIL, PIL, HIL, bench, and system-integration testing are different environments. PIL is target-code execution and is not automatically unit testing.
- Use “HIL” only when actual controller or target hardware, a real-time plant environment, and physical I/O are present.
- A green pipeline or passing test is evidence input, not approval.

[Sources]
- ${FAA_ORDER}
- ${NASA_SE}`);

appendNotes(presentation.slides.items[27], `
V3 pipeline clarification:
- A passing pipeline shows that configured steps passed on a controlled agent and baseline. It is evidence input, not certification approval by itself, and does not remove review, traceability, configuration, problem-report, or independence objectives.

[Sources]
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[29], `
V3 HIL clarification:
- This slide describes a possible program verification environment; this training project did not perform HIL.
- Only call testing HIL when actual controller or target hardware, a real-time plant environment, and physical I/O are used. PIL/target execution, bench testing, and system integration are distinct environments and should be named precisely.

[Sources]
- ${FAA_ORDER}
- ${NASA_SE}`);

appendNotes(presentation.slides.items[30], `
V3 execution-environment clarification:
- HIL criteria are meaningful only for a setup with actual controller or target hardware, real-time plant execution, and physical I/O. No such setup was used by this project.
- MIL, SIL, PIL, HIL, bench, and system-integration results answer different questions. PIL is an execution environment and is not automatically synonymous with unit testing.
- Passing results remain evidence inputs and do not constitute certification approval.

[Sources]
- ${FAA_ORDER}
- ${NASA_SE}`);

appendNotes(presentation.slides.items[31], `
V3 evidence-chain clarification:
- For this training project, the demonstrated chain ends with controlled desktop models, harnesses, assessments, retained results, and architecture update/compile evidence. It does not extend to HIL.
- Any future PIL, target, bench, HIL, or system-integration evidence must identify its specific execution environment and controlled baseline.

[Sources]
- ${FAA_ORDER}`);

appendNotes(presentation.slides.items[32], `
V3 closing clarification:
- DO-178C is an accepted means of compliance, not a standalone software certificate; DO-331 supplements it for model-based development and verification.
- Agile or waterfall cadence does not remove lifecycle data, traceability, reviews, configuration control, controlled baselines, or designated independence.
- This project did not perform HIL. A passing pipeline or test is evidence input, not approval by itself.

[Sources]
- ${FAA_AC}
- ${FAA_ORDER}
- ${NASA_SE}`);

for (const slide of presentation.slides.items) {
  slide.speakerNotes.setVisible(true);
}

await fs.mkdir(renderDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const padded = String(index + 1).padStart(2, '0');
  const png = await presentation.export({ slide, format: 'png', scale: 1 });
  await writeBlob(path.join(renderDir, `final-slide-${padded}.png`), png);
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `final-slide-${padded}.layout.json`), await layout.text(), 'utf8');
}

const montage = await presentation.export({ format: 'webp', montage: true, scale: 0.5 });
await writeBlob(path.join(buildDir, 'final-deck-montage.webp'), montage);

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPptxPath);

const notesAudit = presentation.slides.items.map((slide, index) => ({
  slide: index + 1,
  visible: slide.speakerNotes.isVisible(),
}));
await fs.writeFile(
  path.join(buildDir, 'authoring-summary.json'),
  JSON.stringify({ outputPptxPath, slideCount: presentation.slides.items.length, notesAudit }, null, 2),
  'utf8',
);

console.log(`OUTPUT_PPTX=${outputPptxPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
console.log(`RENDER_COUNT=${presentation.slides.items.length}`);
