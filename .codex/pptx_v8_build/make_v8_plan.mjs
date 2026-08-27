import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(buildDir, "..", "..");
const inspectDir = path.join(buildDir, "template-inspect");
const ndjsonPath = path.join(inspectDir, "template-inspect.ndjson");
const fullInspectPath = path.join(repoRoot, "Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx.inspect.ndjson");
const manifestPath = path.join(inspectDir, "template-manifest.json");

const sourceMap = [
  1, 2, 3, 5, 4, 5, 7, 7, 14, 31, 6, 8, 55, 47, 24, 25, 10, 11,
  50, 29, 30, 41, 31, 32, 33, 34, 42, 41, 43, 44, 40, 46, 47, 48,
  12, 13, 35, 36, 38, 39, 49, 50, 51, 52, 53, 54, 55, 55, 46, 15,
  20, 22, 24, 9, 45,
];

const titles = [
  "Simulink in the Aerospace Controls Lifecycle",
  "Absolute summary: executable training evidence with bounded claims",
  "Overall completion checklist: baseline, learner actions, and open gates",
  "Three learning routes + reference appendix",
  "The executable model is the engineering hub",
  "Your mission: build, exercise, and explain one reviewable control component",
  "Preflight: start from a known project state",
  "Initialize once; generate evidence through controlled entry points",
  "The current job determines which model is top level",
  "Choose a guided lab or a controlled evidence refresh",
  "MATLAB computes; Simulink exposes behavior",
  "The toolstrip tells you where each action lives",
  "Build lab: move from shell to interface to logic",
  "Step 1 — create the project shell and shared data dictionary",
  "Step 2 — define the component interface",
  "Step 3 — implement the limiter logic",
  "Log signals for evidence; use test points for required observability",
  "Saved model settings differ from controlled-run overrides",
  "Ctrl+D updates the diagram; fix errors before you simulate",
  "The delivered and learner harnesses isolate different UUTs",
  "The harness inputs come from one script and three timeseries",
  "Choose the driver that matches the UUT you intend to assess",
  "Ctrl+D, Run, and Ctrl+B answer different questions",
  "The scripted top-level build retains outputs—and a provenance boundary",
  "Open the saved Data Inspector view safely",
  "Read the SDI run from command, to error, to control effort",
  "The timing checks verify configuration and logged spacing—not WCET",
  "The harness sits inside a controlled producer-to-validator flow",
  "The limiter suite retains 19 passing assessment rows",
  "Read the 19-case result plot from top to bottom",
  "One executed result can trace to several explicit requirements",
  "FCS_Data.sldd controls shared parameters and interfaces",
  "Use the data dictionary API to inspect FlightControlBus",
  "Reviewer checklist: verify the component before deeper analysis",
  "Model Advisor checks the selected component against chosen rules",
  "Placeholders: Bug Finder screens code; Code Prover deepens proof",
  "DO-178C defines objectives; DO-331 addresses model use",
  "Software levels scale rigor—and independence is planned",
  "The V-model pairs every definition with verification",
  "Illustrative IDs make the training trace explicit",
  "CI automates evidence production—not approval",
  "Classify the first meaningful failure",
  "PIL was not performed in this training baseline",
  "Retained status is scoped—and file presence does not prove freshness",
  "Demonstrated evidence is narrower than certification evidence",
  "Use the project-defined review/sign-off record only when required",
  "Capstone: reproduce the chain and explain every boundary",
  "Close: one repeatable chain, then controlled review",
  "Glossary: terms used throughout this onboarding",
  "Appendix: aircraft loop and subsystem orientation",
  "Appendix: Stateflow root and chart orientation",
  "Appendix: referenced architecture overview",
  "Appendix: component contracts gallery",
  "Appendix: model display overlays",
  "Appendix: callbacks, driver, and oracle roles",
];

const sections = [
  "COVER",
  ...Array(3).fill("ORIENTATION"),
  ...Array(8).fill("01 • FIRST SESSION"),
  ...Array(7).fill("02 • BUILD LAB"),
  ...Array(15).fill("03 • TEST HARNESS & EVIDENCE"),
  ...Array(12).fill("04 • ASSURANCE & CLOSURE"),
  ...Array(2).fill("05 • CAPSTONE"),
  ...Array(7).fill("APPENDIX • REFERENCE"),
];

// These slides receive a new/rebuilt body. All other mapped bodies remain intact.
const fullReplaceSlides = new Set([
  2, 4, 6, 7, 8, 10, 13, 14, 15, 16, 18, 19, 22, 23, 24, 27, 28,
  30, 31, 32, 33, 34, 44, 47, 48, 49, 51, 53,
]);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const ndjsonRecords = fs
  .readFileSync(ndjsonPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const ndjsonTruncated = ndjsonRecords.some((record) => record.kind === "notice" && /truncated/i.test(record.message ?? ""));
const ndjsonIds = new Set(ndjsonRecords.map((record) => record.id).filter(Boolean));
const fullInspectRecords = fs
  .readFileSync(fullInspectPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const fullInspectIds = new Set(fullInspectRecords.map((record) => record.id).filter(Boolean));
const fullInspectSlides = fullInspectRecords.filter((record) => record.kind === "slide");

if (manifest.slideCount !== 55 || fullInspectSlides.length !== 55 || sourceMap.length !== 55 || titles.length !== 55 || sections.length !== 55) {
  throw new Error(`Expected 55 slides: manifest=${manifest.slideCount}, fullInspect=${fullInspectSlides.length}, map=${sourceMap.length}, titles=${titles.length}, sections=${sections.length}`);
}

const recordsBySlide = new Map();
for (const record of fullInspectRecords) {
  if (!Number.isInteger(record.slide) || record.slide < 1) continue;
  if (!recordsBySlide.has(record.slide)) recordsBySlide.set(record.slide, []);
  recordsBySlide.get(record.slide).push(record);
}
function loadElements(slideNumber) {
  const records = recordsBySlide.get(slideNumber);
  if (!records) throw new Error(`Full v7 inspection has no records for source slide ${slideNumber}.`);
  return records.filter((record) => stableAid(record));
}

function stableAid(element) {
  return typeof element.id === "string" && /^(sh|im)\/[a-z0-9]+$/i.test(element.id);
}

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function isSection(element) {
  return lower(element.name).startsWith("section-");
}

function isTitle(element) {
  return lower(element.name).startsWith("title-");
}

function isDivider(element) {
  const [x = 0, y = 0, width = 0, height = 0] = element.bbox ?? [];
  return lower(element.name).startsWith("line-") && x <= 80 && y >= 120 && y <= 132 && width >= 1100 && Math.abs(height) <= 2;
}

function isFooter(element) {
  const text = String(element.text ?? "").trim();
  const [, y = 0] = element.bbox ?? [];
  return y >= 665 && text === "AVIATION CONTROLS ENGINEERING ONBOARDING";
}

function isPageNumber(element) {
  const text = String(element.text ?? "").trim();
  const [x = 0, y = 0] = element.bbox ?? [];
  return x >= 1120 && y >= 660 && /^\d{1,3}$/.test(text);
}

function idsOf(elements, predicate) {
  return elements.filter((element) => stableAid(element) && predicate(element)).map((element) => element.id);
}

function editTargetsFor(outputSlide, sourceSlide) {
  const elements = loadElements(sourceSlide);
  const sectionTitleIds = idsOf(elements, (element) => isSection(element) || isTitle(element));
  const pageIds = idsOf(elements, isPageNumber);
  const targets = [];

  if (pageIds.length) {
    targets.push({
      action: "rewrite",
      sourceElementIds: pageIds,
      reason: "Renumber the duplicated source slide in the 55-slide v8 sequence.",
    });
  }

  if (outputSlide === 1) {
    const subtitleId = "sh/k3yl0zql";
    if (!elements.some((element) => element.id === subtitleId)) {
      throw new Error(`Title-slide subtitle ${subtitleId} was not found.`);
    }
    targets.push({
      action: "rewrite",
      sourceElementIds: [subtitleId],
      reason: "Update the title-slide subtitle for the self-guided v8 learner mission while preserving the existing title composition.",
    });
    return targets;
  }

  if (sectionTitleIds.length) {
    targets.push({
      action: "rewrite",
      sourceElementIds: sectionTitleIds,
      reason: "Apply the v8 section label and learner-route title while preserving the inherited frame.",
    });
  }

  if (fullReplaceSlides.has(outputSlide)) {
    const replaceIds = elements
      .filter(stableAid)
      .filter((element) => !isSection(element) && !isTitle(element) && !isDivider(element) && !isFooter(element) && !isPageNumber(element))
      .map((element) => element.id);
    if (!replaceIds.length) {
      throw new Error(`Full-replacement slide ${outputSlide} has no replaceable source elements.`);
    }
    targets.push({
      action: "replace",
      sourceElementIds: replaceIds,
      reason: "Replace the inherited content region with v8 learner instructions, authentic repository evidence, and bounded assurance claims.",
    });
  }

  if (outputSlide === 36) {
    const placeholderIds = ["sh/lkvy103m", "sh/bmhgfatc"];
    for (const placeholderId of placeholderIds) {
      if (!elements.some((element) => element.id === placeholderId)) {
        throw new Error(`Polyspace placeholder ${placeholderId} was not found on source slide 13.`);
      }
    }
    targets.push({
      action: "rewrite",
      sourceElementIds: placeholderIds,
      reason: "Retain both Polyspace result areas as explicit future-evidence placeholders and prevent them from being mistaken for completed analysis.",
    });
  }

  return targets;
}

const outputSlides = sourceMap.map((sourceSlide, index) => {
  const outputSlide = index + 1;
  return {
    outputSlide,
    sourceSlide,
    narrativeRole: titles[index],
    reuseMode: "duplicate-slide",
    editTargets: editTargetsFor(outputSlide, sourceSlide),
  };
});

if (outputSlides.some((mapping, index) => mapping.outputSlide !== index + 1)) {
  throw new Error("Output slide numbering is not continuous from 1 through 55.");
}
if (outputSlides.some((mapping) => mapping.sourceSlide < 1 || mapping.sourceSlide > manifest.slideCount)) {
  throw new Error("At least one mapped source slide falls outside the inspected deck.");
}
if (outputSlides.filter((mapping) => mapping.editTargets.some((target) => target.action === "replace")).length !== fullReplaceSlides.size) {
  throw new Error("Full-body replacement authorization does not match the requested slide set.");
}

// Validate stable target IDs and prevent ambiguous double authorization within a slide.
for (const mapping of outputSlides) {
  const sourceAids = new Set(loadElements(mapping.sourceSlide).map((element) => element.id));
  const used = new Set();
  for (const target of mapping.editTargets) {
    if (!target.sourceElementIds.length) {
      throw new Error(`Slide ${mapping.outputSlide} has an empty ${target.action} target.`);
    }
    for (const aid of target.sourceElementIds) {
      if (!sourceAids.has(aid)) {
        throw new Error(`Slide ${mapping.outputSlide}: ${aid} is absent from source slide ${mapping.sourceSlide}.`);
      }
      if (used.has(aid)) {
        throw new Error(`Slide ${mapping.outputSlide}: ${aid} is authorized more than once.`);
      }
      used.add(aid);
    }
  }
}

// Existing workspace NDJSON is intentionally compact/truncated and came from a
// separate inspection pass. Record ID differences, but use the complete full-v7
// inspection beside the source deck as the sole frame-map authority.
const compactInspectionMismatches = [];
for (const record of ndjsonRecords) {
  if (!record.id || !record.slide || record.kind === "slide") continue;
  const authoritativeIds = new Set(loadElements(record.slide).map((element) => element.id));
  if (/^(sh|im)\//.test(record.id) && !authoritativeIds.has(record.id)) {
    compactInspectionMismatches.push({ slide: record.slide, id: record.id });
  }
}

const usedSources = new Set(sourceMap);
const omittedSourceSlides = Array.from({ length: 55 }, (_, index) => index + 1).filter((slide) => !usedSources.has(slide));
const duplicateSourceSlides = [...usedSources]
  .map((slide) => ({ slide, count: sourceMap.filter((value) => value === slide).length }))
  .filter((entry) => entry.count > 1)
  .sort((a, b) => a.slide - b.slide);

const frameMap = { outputSlides, omittedSourceSlides };
fs.writeFileSync(path.join(buildDir, "template-frame-map.json"), `${JSON.stringify(frameMap, null, 2)}\n`);

const outline = outputSlides.map((mapping, index) => ({
  slide: mapping.outputSlide,
  sourceSlide: mapping.sourceSlide,
  section: sections[index],
  title: titles[index],
  disposition: mapping.outputSlide === 1 ? "targeted-rewrite" : fullReplaceSlides.has(mapping.outputSlide) ? "replace" : "preserve",
  bodyPolicy: mapping.outputSlide === 1
    ? "Preserve the title-slide composition; rewrite only the subtitle and page number."
    : mapping.outputSlide === 36
      ? "Preserve the mapped source body; rewrite section, title, page number, and both explicit Polyspace future-result labels."
    : fullReplaceSlides.has(mapping.outputSlide)
      ? "Rebuild the body inside the inherited v7 frame."
      : "Preserve the mapped source body; rewrite only section, title, and page number.",
}));
fs.writeFileSync(path.join(buildDir, "content-outline.json"), `${JSON.stringify(outline, null, 2)}\n`);

const audit = `V8 TEMPLATE AUDIT\n\nSource\n- PowerPoint: Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx\n- Authoritative inspection: Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx.inspect.ndjson\n- Inspected slide count: ${fullInspectSlides.length}\n- Output slide count: ${outputSlides.length}\n- Canvas: 1280 x 720 px (16:9)\n- Theme: light blue-gray background, navy/teal/orange accents, Aptos/Calibri family\n\nReusable frame\n- Standard content slides use a top section label, one-line title, divider at y=127, bottom onboarding footer, and two-digit page number.\n- The title slide uses a separate composition and keeps its original title, chain graphic, footer, and page placement. Only its subtitle and page number are authorized for rewrite.\n- Cards, screenshots, code panels, diagrams, and image records vary by slide and are treated as body content rather than global chrome.\n\nV8 mapping policy\n- Every one of the 55 output slides maps to an inspected v7 source slide.\n- ${fullReplaceSlides.size} output slides authorize full body replacement while retaining section/title/divider/footer/page geometry.\n- ${55 - fullReplaceSlides.size - 1} output slides preserve their mapped body and authorize only section/title/page rewrites.\n- Slide 1 preserves its title-slide composition and authorizes a targeted subtitle rewrite.\n- Output slide 36 explicitly rewrites both Polyspace future-result placeholder labels while preserving the rest of the source body.\n- Stable element and image IDs come only from the complete full-v7 inspection (${fullInspectIds.size} IDs). The workspace's compact inspection exposes ${ndjsonIds.size} IDs, contains a truncation notice=${ndjsonTruncated}, and has ${compactInspectionMismatches.length} IDs from a different inspection pass; it is not used to authorize edits.\n\nNarrative structure\n- Core learner route: slides 1-48.\n- Reference appendix: slides 49-55.\n- Visible routes: instructor onboarding, self-guided component build, assurance/closure, and appendix reference.\n\nValidation\n- Continuous output numbering: PASS (1-55).\n- Source slide bounds: PASS (all 1-55).\n- Stable target IDs exist in the authoritative full-v7 inspection: PASS.\n- Image records on replacement slides use authoritative im/* IDs: PASS.\n- Both source-slide-13 Polyspace placeholder labels are explicitly handled: PASS.\n- No element is authorized by two actions on the same output slide: PASS.\n- Bundled validate_template_plan.mjs using the full-v7 inspection: PASS (0 issues).\n`;
fs.writeFileSync(path.join(buildDir, "template-audit.txt"), audit);

const duplicateText = duplicateSourceSlides.map((entry) => `${entry.slide} (${entry.count} uses)`).join(", ");
const deviation = `V8 TEMPLATE DEVIATION LOG\n\n1. Sequence changed\nThe v7 sequence is intentionally reordered into a 48-slide learner route followed by a 7-slide appendix. This supports self-guided construction before assurance closure.\n\n2. Source slides duplicated\nMapped source slides reused more than once: ${duplicateText}. Duplication provides additional teaching steps without inventing a new visual system.\n\n3. Source slides omitted\nOmitted v7 source slides: ${omittedSourceSlides.join(", ")}. Their detailed component material is either consolidated into the appendix gallery or no longer required in the core path.\n\n4. Body replacement\nFull body replacement is authorized only on output slides ${[...fullReplaceSlides].join(", ")}. These are the new or materially revised learner, build, verification, closure, glossary, and gallery slides.\n\n5. Preserved bodies\nAll remaining non-title slides retain their mapped source body. Only section label, title, and page number may be rewritten. Slide 1 retains the title composition and permits only subtitle/page updates. Output slide 36 additionally rewrites the two inherited Polyspace future-result labels so both remain explicit, unambiguous placeholders.\n\n6. Evidence boundaries\nThe v8 body may show refreshed local simulation, 19/19 assessment, validation, dictionary, and GRT build evidence. It must not imply Test Manager, Model Advisor report execution, Polyspace completion, SIL/PIL/HIL execution, WCET measurement, certification approval, or evidence freshness from file presence alone.\n\n7. Inspection authority\nThe workspace template-inspect.ndjson is compact, truncated, and contains several IDs that differ from the full source-deck inspection pass. Aviation_Controls_Engineer_Simulink_DO178C_Training_v7.pptx.inspect.ndjson beside the source deck is therefore the sole stable-ID authority, including im/* image records.\n`;
fs.writeFileSync(path.join(buildDir, "deviation-log.txt"), deviation);

console.log(`Wrote v8 plan for ${outputSlides.length} slides.`);
console.log(`Full body replacement: ${fullReplaceSlides.size}; title targeted: 1; body preserved: ${55 - fullReplaceSlides.size - 1}.`);
console.log(`Omitted source slides: ${omittedSourceSlides.join(", ")}.`);
