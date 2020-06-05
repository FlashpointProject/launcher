import { remote } from 'electron';
import * as path from 'path';

export function getElevatePath() {
  const basePath = window.Shared.isDev ? process.cwd() : path.dirname(remote.app.getPath('exe'));
  return path.join(basePath, 'extern/elevate/Elevate.exe');
}