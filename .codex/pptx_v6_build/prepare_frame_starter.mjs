import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const buildDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(buildDir, 'template-starter.pptx');
const outputPath = path.join(buildDir, 'template-starter-frame.pptx');
const layoutDir = path.join(buildDir, 'template-starter-frame-layout');
const replacementSlides = new Set([8, 9, 10, 11, 28, 47]);

function textValue(shape) {
  try { return shape.text?.value ?? String(shape.text ?? ''); } catch { return ''; }
}

function isInheritedChrome(shape) {
  const name = String(shape.name || '');
  const value = textValue(shape).trim();
  const position = shape.position || {};
  return name.startsWith('section-') || name.startsWith('title-') ||
    (name.startsWith('line-') && (position.top ?? 999) < 145) ||
    value === 'AVIATION CONTROLS ENGINEERING ONBOARDING' ||
    (/^\d{2}$/.test(value) && (position.top ?? 0) > 640) ||
    /page-\d+/.test(name);
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
for (const [index, slide] of presentation.slides.items.entries()) {
  const slideNumber = index + 1;
  if (!replacementSlides.has(slideNumber)) continue;
  for (const shape of [...slide.shapes.items]) {
    if (!isInheritedChrome(shape)) shape.delete();
  }
  for (const image of [...slide.images.items]) {
    if (typeof image.delete === 'function') image.delete();
  }
}

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outputPath);

await fs.mkdir(layoutDir, { recursive: true });
for (const [index, slide] of presentation.slides.items.entries()) {
  const padded = String(index + 1).padStart(2, '0');
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(layoutDir, `starter-frame-slide-${padded}.layout.json`), await layout.text(), 'utf8');
}

const montage = await presentation.export({ format: 'webp', montage: true, scale: 0.35 });
await writeBlob(path.join(buildDir, 'template-starter-frame-montage.webp'), montage);

console.log(`FRAME_STARTER=${outputPath}`);
console.log(`SLIDE_COUNT=${presentation.slides.items.length}`);
