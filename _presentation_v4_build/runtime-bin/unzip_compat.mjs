import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const runtimeModules = process.env.RUNTIME_NODE_MODULES;
if (!runtimeModules || !path.isAbsolute(runtimeModules)) {
  throw new Error('RUNTIME_NODE_MODULES must be an absolute path.');
}

const requireFromRuntime = createRequire(path.join(runtimeModules, '__runtime__.cjs'));
const JSZip = requireFromRuntime('jszip');
const args = process.argv.slice(2);

async function loadZip(pptxPath) {
  return JSZip.loadAsync(await fs.readFile(pptxPath));
}

if (args[0] === '-Z1' && args.length === 2) {
  const zip = await loadZip(args[1]);
  process.stdout.write(`${Object.keys(zip.files).join('\n')}\n`);
} else if (args[0] === '-p' && args.length === 3) {
  const zip = await loadZip(args[1]);
  const entry = zip.file(args[2]);
  if (!entry) {
    process.stderr.write(`entry not found: ${args[2]}\n`);
    process.exitCode = 11;
  } else {
    process.stdout.write(await entry.async('nodebuffer'));
  }
} else {
  process.stderr.write(`unsupported unzip arguments: ${args.join(' ')}\n`);
  process.exitCode = 2;
}

