import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(buildDir));
const inspectPath = path.join(projectRoot, 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v6.pptx.inspect.ndjson');
const planPath = path.join(buildDir, 'v6-to-v7-slide-plan.json');

const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
const records = (await fs.readFile(inspectPath, 'utf8'))
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const recordsBySlide = new Map();
for (const record of records) {
  if (!Number.isInteger(record.slide)) continue;
  if (!recordsBySlide.has(record.slide)) recordsBySlide.set(record.slide, []);
  recordsBySlide.get(record.slide).push(record);
}

function textOf(record) {
  return String(record.text || '').trim();
}

function isChrome(record) {
  const name = String(record.name || '');
  const text = textOf(record);
  const bbox = Array.isArray(record.bbox) ? record.bbox : [0, 0, 0, 0];
  return name.startsWith('section-') ||
    name.startsWith('title-') ||
    (record.kind === 'shape' && name.startsWith('line-') && bbox[1] < 145) ||
    text === 'AVIATION CONTROLS ENGINEERING ONBOARDING' ||
    (/^\d{2}$/.test(text) && bbox[1] > 640) ||
    /page-\d+/.test(name);
}

function idFor(sourceSlide, predicate, label) {
  const record = (recordsBySlide.get(sourceSlide) || []).find(predicate);
  if (!record?.id) throw new Error(`Missing ${label} on source slide ${sourceSlide}`);
  return record.id;
}

const replaceSlides = new Set([
  2, 3, 5, 29, 30, 31, 32, 33, 34, 41, 43, 44, 45, 46, 47, 52, 53, 55,
]);

const outputSlides = plan.slides.map((entry) => {
  const sourceSlide = entry.v6SourceSlide || entry.cloneV6Slide;
  const sourceRecords = recordsBySlide.get(sourceSlide) || [];
  const pageId = idFor(
    sourceSlide,
    (r) => /^\d{2}$/.test(textOf(r)) && Array.isArray(r.bbox) && r.bbox[1] > 640,
    'page number',
  );
  const editTargets = [{
    action: 'rewrite',
    sourceElementIds: [pageId],
    reason: 'Renumber the duplicated source slide in the 55-slide v7 sequence.',
  }];

  if (entry.v7Slide === 13) {
    const explicitPlaceholderIds = sourceRecords
      .filter((r) => /^INSERT (BUG FINDER|CODE PROVER) RESULT \/ REPORT HERE$/.test(textOf(r)))
      .map((r) => r.id);
    if (explicitPlaceholderIds.length !== 2) throw new Error('Expected the two explicit Polyspace placeholder labels on source slide 11');
    editTargets.push({
      action: 'rewrite',
      sourceElementIds: explicitPlaceholderIds,
      reason: 'Keep both future Polyspace evidence placeholders explicit without leaving inherited placeholder wording unhandled.',
    });
  }

  if (entry.v7Slide === 10) {
    const titleId = idFor(sourceSlide, (r) => String(r.name || '').startsWith('title-'), 'slide 10 title');
    editTargets.push({
      action: 'rewrite',
      sourceElementIds: [titleId],
      reason: 'Shorten the inherited logging/test-point title for one-line readability without changing the slide body.',
    });
  }

  if (entry.v7Slide === 54) {
    const rcfIds = sourceRecords
      .filter((r) => String(r.name || '').startsWith('title-') || ['s47-record-body', 's47-signoff-title', 's47-signoff-body', 's47-exit', 's47-caveat'].includes(String(r.name || '')))
      .map((r) => r.id);
    if (rcfIds.length !== 6) throw new Error(`Expected six scoped RCF text targets on source slide ${sourceSlide}`);
    editTargets.push({
      action: 'rewrite',
      sourceElementIds: rcfIds,
      reason: 'Keep the RCF placeholder project-defined and avoid assigning unsupported universal closure, authority, or independence requirements.',
    });
  }

  if (replaceSlides.has(entry.v7Slide)) {
    const sectionId = idFor(sourceSlide, (r) => String(r.name || '').startsWith('section-'), 'section label');
    const titleId = idFor(sourceSlide, (r) => String(r.name || '').startsWith('title-'), 'title');
    const contentIds = sourceRecords
      .filter((r) => r.id && !['slide', 'notes', 'notice'].includes(r.kind) && !isChrome(r))
      .map((r) => r.id);
    if (contentIds.length === 0) throw new Error(`No replaceable content elements on source slide ${sourceSlide}`);
    editTargets.push(
      {
        action: 'rewrite',
        sourceElementIds: [sectionId, titleId],
        reason: 'Apply the v7 section label and evidence-specific title while preserving the inherited frame.',
      },
      {
        action: 'replace',
        sourceElementIds: contentIds,
        reason: 'Replace the inherited content region with the mapped v7 teaching material and authentic evidence.',
      },
    );
  }

  return {
    outputSlide: entry.v7Slide,
    sourceSlide,
    narrativeRole: entry.title,
    reuseMode: 'duplicate-slide',
    editTargets,
  };
});

const sourceUse = new Set(outputSlides.map((entry) => entry.sourceSlide));
const omittedSourceSlides = [];
for (let sourceSlide = 1; sourceSlide <= plan.sourceSlideCount; sourceSlide += 1) {
  if (!sourceUse.has(sourceSlide)) omittedSourceSlides.push({ sourceSlide, reason: 'Not used in the v7 narrative.' });
}

const outline = plan.slides.map((entry) => ({
  slide: entry.v7Slide,
  sourceSlide: entry.v6SourceSlide || entry.cloneV6Slide,
  title: entry.title,
  disposition: entry.operation,
}));

await fs.writeFile(
  path.join(buildDir, 'template-frame-map.json'),
  `${JSON.stringify({ outputSlides, omittedSourceSlides }, null, 2)}\n`,
  'utf8',
);
await fs.writeFile(
  path.join(buildDir, 'content-outline.json'),
  `${JSON.stringify(outline, null, 2)}\n`,
  'utf8',
);

console.log(`MAP=${path.join(buildDir, 'template-frame-map.json')}`);
console.log(`OUTLINE=${path.join(buildDir, 'content-outline.json')}`);
console.log(`SLIDES=${outputSlides.length}`);
console.log(`REPLACED=${replaceSlides.size}`);
