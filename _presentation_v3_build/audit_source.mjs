import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const source = process.argv[2];
if (!source) throw new Error('Usage: audit_source.mjs <source.pptx>');

const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const notes = await presentation.inspect({
  kind: 'slide,notes',
  include: 'id,slide,title,text,textPreview,textChars',
  maxChars: 100000,
});

const masters = presentation.masters.items.map((master) => ({
  id: master.id,
  name: master.name,
  elementCount: master.elements?.items?.length ?? master.elements?.length ?? 0,
  placeholderSummary: master.placeholders?.summary?.() ?? null,
  childLayouts: presentation.layouts.items
    .filter((layout) => layout.parentLayoutId === master.id)
    .map((layout) => ({
      id: layout.id,
      name: layout.name,
      placeholderSummary: layout.placeholders?.summary?.() ?? null,
    })),
}));

console.log(JSON.stringify({
  slideCount: presentation.slides.items.length,
  masters,
  layouts: presentation.layouts.items.map((layout) => ({
    id: layout.id,
    name: layout.name,
    parentLayoutId: layout.parentLayoutId,
    placeholderSummary: layout.placeholders?.summary?.() ?? null,
  })),
}, null, 2));
console.log('---NOTES---');
console.log(notes.ndjson);
