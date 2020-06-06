import * as path from 'path';

export function getElevatePath(isDev: boolean, exePath: string) {
  const basePath = isDev ? process.cwd() : path.dirname(exePath);
  return path.join(basePath, 'extern/elevate/Elevate.exe');
}

export function getMklinkBatPath(isDev: boolean, exePath: string) {
  const basePath = isDev ? process.cwd() : path.dirname(exePath);
  return path.join(basePath, 'extern/elevate/mklink.bat');
}
