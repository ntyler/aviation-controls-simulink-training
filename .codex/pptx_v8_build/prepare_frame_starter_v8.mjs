import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(buildDir, 'template-starter.pptx');
const outputPath = path.join(buildDir, 'template-starter-frame.pptx');
const layoutDir = path.join(buildDir, 'template-starter-frame-layout');
const map = JSON.parse(await fs.readFile(path.join(buildDir, 'template-frame-map.json'), 'utf8'));
const replacementSlides = new Set(map.outputSlides.filter((entry) => entry.editTargets?.some((target) => target.action === 'replace')).map((entry) => entry.outputSlide));

function textValue(shape) {
  try { return shape.text?.value ?? String(shape.text ?? ''); } catch { return ''; }
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

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
if (presentation.slides.items.length !== 55) throw new Error(`Expected 55 slides, found ${presentation.slides.items.length}`);

for (const [index, slide] of presentation.slides.items.entries()) {
  if (!replacementSlides.has(index + 1)) continue;
  for (const shape of [...slide.shapes.items]) if (!isChrome(shape)) shape.delete();
  for (const image of [...slide.images.items]) if (typeof image.delete === 'function') image.delete();
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPath);
await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const padded = String(index + 1).padStart(2, '0');
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `starter-frame-slide-${padded}.layout.json`), await layout.text(), 'utf8');
}

console.log(`FRAME_STARTER=${outputPath}`);
console.log(`REPLACEMENT_SLIDES=${[...replacementSlides].join(',')}`);
