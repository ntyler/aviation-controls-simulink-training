import { FileBlob, PresentationFile } from '@oai/artifact-tool';
import { fileURLToPath } from 'node:url';

const presentation = await PresentationFile.importPptx(
  await FileBlob.load(fileURLToPath(new URL('./template-starter.pptx', import.meta.url))),
);

for (const slideNumber of [14, 15, 16, 17, 33]) {
  const slide = presentation.slides.items[slideNumber - 1];
  console.log(`SLIDE ${slideNumber}`);
  for (const shape of slide.shapes.items) {
    let value = '';
    try { value = shape.text?.value ?? String(shape.text ?? ''); } catch {}
    console.log(JSON.stringify({
      id: shape.id,
      name: shape.name,
      position: shape.position,
      text: value,
      keys: Object.keys(shape).slice(0, 20),
    }));
  }
}
