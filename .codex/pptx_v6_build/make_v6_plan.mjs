import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const inspectPath = path.join(buildDir, 'template-inspect', 'template-inspect.ndjson');
const fullInspectPath = path.join(path.dirname(path.dirname(buildDir)), 'Aviation_Controls_Engineer_Simulink_DO178C_Training_v5.pptx.inspect.ndjson');

const insertions = new Map([
  [8,  { sourceSlide: 24, title: 'Log signals for evidence; reserve test points for required observability', section: '01 • HANDS-ON DEMO', role: 'signal logging and test point comparison' }],
  [9,  { sourceSlide: 24, title: 'Check the active model settings before update, simulation, or build', section: '01 • HANDS-ON DEMO', role: 'model settings configuration workflow' }],
  [10, { sourceSlide: 37, title: 'Model Advisor checks the selected component against chosen rules', section: '01 • HANDS-ON DEMO', role: 'Model Advisor component check workflow' }],
  [11, { sourceSlide: 4, title: 'Placeholders: Bug Finder screens code; Code Prover deepens proof', section: '01 • HANDS-ON DEMO', role: 'Polyspace Bug Finder and Code Prover placeholders' }],
  [28, { sourceSlide: 25, title: 'In the harness, Ctrl+D validates the diagram; Ctrl+B crosses into build', section: '02 • HARNESS DEMO', role: 'update diagram and build comparison' }],
  [47, { sourceSlide: 41, title: 'RCF closes the model with independent verification and sign-off', section: '08 • COMPLETION & SIGN-OFF', role: 'RCF independent verification and sign-off placeholder' }],
]);

const sourceByOutput = [];
for (let output = 1; output <= 48; output += 1) {
  if (insertions.has(output)) {
    sourceByOutput.push(insertions.get(output).sourceSlide);
  } else if (output <= 7) {
    sourceByOutput.push(output);
  } else if (output <= 27) {
    sourceByOutput.push(output - 4);
  } else if (output <= 46) {
    sourceByOutput.push(output - 5);
  } else {
    sourceByOutput.push(output - 6);
  }
}

const fullLines = (await fs.readFile(fullInspectPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const idsBySlide = new Map();
const titleBySlide = new Map();
const pageIdBySlide = new Map();
for (const record of fullLines) {
  if (record.kind === 'slide') titleBySlide.set(record.slide, record.title || `Slide ${record.slide}`);
  if (Number.isInteger(record.slide) && record.id && record.kind !== 'slide' && record.kind !== 'notes' && record.kind !== 'notice') {
    if (!idsBySlide.has(record.slide)) idsBySlide.set(record.slide, []);
    idsBySlide.get(record.slide).push(record.id);
  }
  if (record.kind === 'textbox' && /^\d{2}$/.test(String(record.text || '').trim()) && Array.isArray(record.bbox) && record.bbox[1] > 640) {
    pageIdBySlide.set(record.slide, record.id);
  }
}

const outputSlides = sourceByOutput.map((sourceSlide, index) => {
  const outputSlide = index + 1;
  const insertion = insertions.get(outputSlide);
  if (insertion) {
    return {
      outputSlide,
      sourceSlide,
      narrativeRole: insertion.role,
      reuseMode: 'duplicate-slide',
      editTargets: [
        {
          action: 'replace',
          sourceElementIds: idsBySlide.get(sourceSlide) || [],
          reason: 'Preserve the inherited slide frame while rebuilding the content area for the requested teaching material.',
        },
        {
          action: 'add',
          newPrimitiveAllowed: true,
          mustNotOverlapInherited: true,
          zone: { left: 72, top: 130, width: 1136, height: 525 },
          reason: 'Add bounded native PowerPoint teaching content and authentic user-supplied imagery inside the inherited content frame.',
        },
      ],
    };
  }
  const pageId = pageIdBySlide.get(sourceSlide);
  return {
    outputSlide,
    sourceSlide,
    narrativeRole: `preserved v5 slide ${sourceSlide} with renumbered footer`,
    reuseMode: 'duplicate-slide',
    editTargets: pageId ? [{ action: 'rewrite', sourceElementIds: [pageId], reason: 'Renumber the copied slide after the requested insertions.' }] : [],
  };
});

const outline = sourceByOutput.map((sourceSlide, index) => {
  const outputSlide = index + 1;
  const insertion = insertions.get(outputSlide);
  return {
    slide: outputSlide,
    sourceSlide,
    title: insertion?.title || titleBySlide.get(sourceSlide) || `Slide ${outputSlide}`,
    section: insertion?.section || null,
    disposition: insertion ? 'new requested slide' : 'preserve v5 content and notes; renumber only',
  };
});

await fs.writeFile(path.join(buildDir, 'template-frame-map.json'), `${JSON.stringify({ outputSlides }, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(buildDir, 'content-outline.json'), `${JSON.stringify(outline, null, 2)}\n`, 'utf8');

console.log(`MAP=${path.join(buildDir, 'template-frame-map.json')}`);
console.log(`OUTLINE=${path.join(buildDir, 'content-outline.json')}`);
console.log(`SLIDES=${outputSlides.length}`);
