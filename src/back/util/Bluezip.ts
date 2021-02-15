import * as path from 'path';

function getBluezipExec(isDev: boolean, exePath: string): string {
  const basePath = isDev ? process.cwd() : path.dirname(exePath);
  switch (process.platform) {
    default:
      return path.join(basePath, 'extern/bluezip', 'bluezip.exe');
  }
}

export const pathToBluezip = getBluezipExec;
