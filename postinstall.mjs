/* eslint-disable @typescript-eslint/no-var-requires */
// Installs all dependecies with npm for Extensions that require it
import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

console.log(' • Extensions Install');

const extFolders = readdirSync('./extensions', { withFileTypes: true }).filter(f => f.isDirectory());

if (extFolders.length === 0) {
  console.log(' - None found');
} else {
  for (const extFolder of extFolders) {
    const extPath = join('./extensions', extFolder.name);
    const exists = existsSync(join(extPath, 'package.json'));
    if (exists) {
      console.log(`${' - Installing '.padEnd(29) + ' >'} ${extFolder.name}`);
      execSync(`cd ${extPath} && npm install`);
    } else {
      console.log(` - Skipping (no package.json) > ${extFolder.name}`);
    }
  }
}

