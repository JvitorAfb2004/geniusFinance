import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pkgPath = join(process.cwd(), 'node_modules', 'react-router', 'package.json');
const original = readFileSync(pkgPath, 'utf8');
const patched = original.replaceAll('dist/development/', 'dist/production/');

if (original !== patched) {
  writeFileSync(pkgPath, patched);
  console.log('[patch] react-router package.json: dist/development/ → dist/production/');
} else {
  console.log('[patch] react-router package.json already patched');
}
