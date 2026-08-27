import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = path.dirname(fileURLToPath(import.meta.url));
const layoutDir = path.join(workspace, 'template-inspect', 'layouts');

const planned = [
  [1, 1, 'title and scope', 'light'],
  [2, 2, 'executable model hub', 'light'],
  [3, 3, 'first-session learning path', 'light'],
  [4, 4, 'MATLAB and Simulink orientation', 'light'],
  [5, 5, 'first-session workflow', 'rebuild'],
  [6, 6, 'toolstrip orientation', 'rebuild'],
  [7, 7, 'model overlays and signal displays', 'rebuild'],
  [8, 8, 'complete model hierarchy', 'rebuild'],
  [9, 9, 'AircraftFeedbackControlLoop root model', 'image'],
  [10, 9, 'Pitch Controller PI internal view', 'image'],
  [11, 9, 'Actuator Dynamics internal view', 'image'],
  [12, 9, 'Longitudinal plant internal view', 'image'],
  [13, 9, 'Sensor Processing Lag internal view', 'image'],
  [14, 9, 'AutopilotModeLogic root model', 'image'],
  [15, 11, 'Stateflow Autopilot Mode Logic view', 'image'],
  [16, 27, 'referenced integration architecture', 'image'],
  [17, 27, 'SensorProcessingRef child model', 'image'],
  [18, 20, 'PitchRateLimiter child model', 'image'],
  [19, 20, 'Pitch Rate Limiter Logic internal view', 'image'],
  [20, 27, 'PitchControllerRef child model', 'image'],
  [21, 9, 'Pitch Rate PI internal view', 'image'],
  [22, 27, 'ActuatorCommandRef child model', 'image'],
  [23, 23, 'independent unit-test harness', 'image'],
  [24, 10, 'Simulation Data Inspector onboarding', 'rebuild'],
  [25, 12, 'DO-178C and DO-331 context', 'light'],
  [26, 13, 'software levels and independence', 'rebuild'],
  [27, 14, 'traceability and evidence', 'light'],
  [28, 15, 'lifecycle, V-model, agile, and waterfall', 'light'],
  [29, 18, 'illustrative classroom requirements', 'light'],
  [30, 19, 'bidirectional requirement-to-result chain', 'rebuild'],
  [31, 16, 'harness companion-file flow', 'rebuild'],
  [32, 24, 'boundary and failure test matrix', 'light'],
  [33, 25, 'executed limiter test report', 'rebuild'],
  [34, 26, 'callbacks, test driver, and repeatability', 'rebuild'],
  [35, 21, 'data dictionary and interfaces', 'rebuild'],
  [36, 22, 'model reviewability', 'light'],
  [37, 28, 'continuous integration evidence', 'light'],
  [38, 29, 'failure investigation', 'light'],
  [39, 30, 'distinct execution environments', 'rebuild'],
  [40, 32, 'current package status', 'rebuild'],
  [41, 31, 'demonstrated evidence and excluded claims', 'rebuild'],
  [42, 33, 'first-week repeatable chain', 'light'],
];

async function sourceElements(sourceSlide) {
  const file = path.join(layoutDir, `source-slide-${String(sourceSlide).padStart(2, '0')}.layout.json`);
  const layout = JSON.parse(await fs.readFile(file, 'utf8'));
  return layout.elements.map((element) => element.aid).filter(Boolean);
}

const outputSlides = [];
for (const [outputSlide, sourceSlide, narrativeRole, mode] of planned) {
  const sourceElementIds = await sourceElements(sourceSlide);
  const editTargets = [];
  if (mode === 'light') {
    editTargets.push({
      action: 'rewrite',
      sourceElementIds,
      reason: 'Update wording, numbering, and notes while preserving the inherited composition.',
    });
  } else {
    editTargets.push({
      action: 'replace',
      sourceElementIds,
      reason: mode === 'image'
        ? 'Retain the inherited full-image frame while replacing it with the mapped current repository view.'
        : 'Retain the inherited slide frame while rebuilding the content area for the requested onboarding material.',
    });
    editTargets.push({
      action: 'add',
      newPrimitiveAllowed: true,
      mustNotOverlapInherited: true,
      zone: { left: 72, top: 130, width: 1136, height: 525 },
      reason: 'Add bounded native PowerPoint labels, diagrams, callouts, or current repository imagery inside the inherited content frame.',
    });
  }
  outputSlides.push({ outputSlide, sourceSlide, narrativeRole, reuseMode: 'duplicate-slide', editTargets });
}

const map = { outputSlides, omittedSourceSlides: [17] };
await fs.writeFile(path.join(workspace, 'template-frame-map.json'), `${JSON.stringify(map, null, 2)}\n`, 'utf8');

const audit = `Template audit\n\nSource: Aviation_Controls_Engineer_Simulink_DO178C_Training_v4.pptx\nSlide size: 16:9 (1280 x 720 inspection frame)\nSource slides: 33\nOutput slides planned: 42\nTypography: preserve slide-level Aptos; do not rely on the Calibri theme defaults.\nPalette: #F4F8FB, #071521, #0B1F33, #20B7C5, #2D6CDF, #2CA56F, #E9A23B.\nRecurring frame: teal section rail, large title, divider, footer, two-digit page number.\nMedia: authentic repository model/screenshots only; contain-fit dense diagrams; one dense model per slide.\nNotes: replace all legacy notes and remove duplicated V2/V3/V4 update paragraphs.\n`;
await fs.writeFile(path.join(workspace, 'template-audit.txt'), audit, 'utf8');

const deviations = `Deviation log\n\n1. Output expands from 33 to 42 slides so every requested root model and internal view is audience-readable.\n2. Source slide 17 is omitted because its generic integration sequence is superseded by the model gallery, explicit companion-file flow, CI slide, and status slide.\n3. Dense legacy screenshots are replaced by current canonical repository captures or native PowerPoint diagrams.\n4. The deck remains folder-based; it does not claim that a MATLAB Project (.prj/.mlproj) exists.\n5. No slide claims Simulink Test, production code, PIL, SIL, HIL, bench, or certification approval as executed evidence.\n`;
await fs.writeFile(path.join(workspace, 'deviation-log.txt'), deviations, 'utf8');

const sourceNotes = `Source and evidence notes\n\nPrimary local sources: README.md; models/*.slx; screenshots/*; data/FCS_Data.sldd; docs/PitchRateLimiter_Requirements_Traceability.csv; scripts/*.m; results/*; reports/*.\nOfficial sources used in relevant speaker notes: FAA AC 20-115D; FAA Order 8110.49A; NASA Systems Engineering Handbook; official MathWorks Simulink Editor, update/shortcuts, units, signal logging, test points, dimensions, Data Inspector, and Simulink Coder documentation.\nEvidence labels: 8/8 delivered models updated/compiled; 19/19 limiter assessments passed; required exported artifacts 24/24 present.\nExecution label: Desktop Simulink model execution (MIL); not SIL, PIL, or HIL.\nClassroom requirement disclaimer: Illustrative classroom requirements — not production aircraft data or an approved certification baseline.\n`;
await fs.writeFile(path.join(workspace, 'source-notes.txt'), sourceNotes, 'utf8');

console.log(`Wrote template plan for ${outputSlides.length} output slides.`);
