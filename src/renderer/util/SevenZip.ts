import { remote } from 'electron';
import * as path from 'path';

function get7zExec(): string {
  const basePath = window.Shared.isDev ? process.cwd() : path.dirname(remote.app.getPath('exe'));
  switch (process.platform) {
    case 'darwin':
      return path.join(basePath, 'extern/7zip-bin/mac', '7za');
    case 'win32':
      return path.join(basePath, 'extern/7zip-bin/win', process.arch, '7za');
    case 'linux':
      return path.join(basePath, 'extern/7zip-bin/linux', process.arch, '7za');
  }
  return '7za';
}

export const pathTo7z = get7zExec();