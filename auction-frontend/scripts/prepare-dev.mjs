import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const targets = [
  path.join(appRoot, '.next', 'dev'),
  path.join(appRoot, '.next', 'types'),
  path.join(appRoot, 'tsconfig.tsbuildinfo'),
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`[prepare-dev] cleared ${path.relative(appRoot, target)}`);
}
