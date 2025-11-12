import * as path from 'node:path';

function get7zExec(isDev: boolean, isElectron: boolean, exePath: string): string {
  const basePath = (!isDev && isElectron) ? path.dirname(exePath) : process.cwd();
  switch (process.platform) {
    case 'darwin':
      return path.join(basePath, '../extern/7zip-bin/mac', '7za');
    case 'win32':
      return path.join(basePath, 'extern/7zip-bin/win', process.arch, '7za');
    case 'linux':
      return path.join(basePath, 'extern/7zip-bin/linux', process.arch, '7za');
  }
  return '7za';
}

export const pathTo7zBack = get7zExec;
