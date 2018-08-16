import * as fs from 'fs';

/**
 * Call a function once the electron app is ready, or immediately if it is already ready
 */
export function callIfOrOnceReady(func: () => void): void {
  if (Electron.app.isReady()) {
    func();
  } else {
    Electron.app.once('ready', func);
  }
}

export function getLauncBoxImageNames(imageFolderPath: string, callback: (imageNames: string[]) => void) {
  fs.readdir(imageFolderPath, (err, files) => {
    if (err) { throw new Error('wat'); }
    callback(files);
  });
}
