import * as path from 'path';

function get7zExec(isDev: boolean, exePath: string): string {
  const basePath = isDev ? process.cwd() : path.dirname(exePath);
  switch (process.platform) {
    case 'darwin':
      return path.join(basePath, '../extern/7zip-bin/mac', process.arch, '7zz');
    case 'win32':
      return path.join(basePath, 'extern/7zip-bin/win', process.arch, '7z');
    case 'linux':
      return path.join(basePath, 'extern/7zip-bin/linux', process.arch, '7zz');
  }
  return '7zz';
}

export const pathTo7zBack = get7zExec;
