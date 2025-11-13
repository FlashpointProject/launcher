import { BackState } from '@back/types';
import { pathTo7zBack } from '@back/util/SevenZip';
import { BackOut } from '@shared/back/types';
import { IExtension } from '@shared/extensions/interfaces';
import { fixSlashes } from '@shared/Util';
import { parseVariableString } from '@shared/utils/VariableString';
import { ZipExtractOptions } from 'flashpoint-launcher';
import * as fs from 'fs-extra';
import { extractFull } from 'node-7z';
import * as path from 'node:path';

export async function parseAppVar(extId: string, appPath: string, launchCommand: string, state: BackState) {
  const ext = await state.extensionsService.getExtension(extId);
  return parseVariableString(appPath, (name) => {
    switch (name) {
      case 'extPath': return path.resolve(ext ? ext.extensionPath : '');
      case 'extDataURL': return `http://localhost:${state.fileServerPort}/extdata/${extId}/`;
      case 'os': return process.platform;
      case 'arch': return process.arch;
      case 'launchCommand': return launchCommand;
      case 'cwd': return fixSlashes(process.cwd());
      case 'fpPath': return state.config ? path.resolve(fixSlashes(state.config.flashpointPath)) : '';
      case 'proxy': return state.preferences.browserModeProxy || '';
      default: {
        if (name.startsWith('extConf:')) {
          const key = name.substring(8);
          return state.extConfig[key];
        }
        return '';
      }
    }
  });
}

export async function uninstallExtension(state: BackState, extId: string) {
  console.log('finding ' + extId);
  const ext = await state.extensionsService.getExtension(extId);
  if (ext) {
    await state.extensionsService.removeExtension(extId);
    await fs.remove(ext.extensionPath);
  }
  state.socketServer.broadcast(BackOut.REMOVED_EXTENSION, extId);
}

export async function installExtension(state: BackState, filePath: string) {
  const extensionsPath = path.join(state.config.flashpointPath, state.preferences.extensionsPath);

  // Unzip extension
  await unzipFile(state, filePath, extensionsPath);

  // Scan for new extensions
  const exts = await state.extensionsService.scanForNewExtensions();
  for (const ext of exts) {
    await loadExtension(state, ext)
    .catch((error: any) => {
      log.error('Extensions', `[${ext.manifest.displayName || ext.manifest.name}] Error loading extension\n${error}`);
    });
  }

  for (const ext of exts) {
    state.socketServer.broadcast(BackOut.ADDED_EXTENSION, {
      ...ext.manifest,
      id: ext.id
    });
  }
}

export async function unzipFile(state: BackState, filePath: string, outDir: string, opts?: ZipExtractOptions) {
  return new Promise<void>((resolve, reject) => {
    const { onProgress, onData } = opts || {};
    const readable = extractFull(filePath, outDir, { $bin: pathTo7zBack(state.isDev, state.isElectron, state.exePath), $progress: onProgress !== undefined });
    readable.on('end', () => {
      resolve();
    });
    if (onProgress) { readable.on('progress', onProgress); }
    if (onData) { readable.on('data', onData); }
    readable.on('error', (err) => {
      reject(err);
    });
  });
}

export async function loadExtension(state: BackState, ext: IExtension) {
  const disabled = state.preferences.disabledExtensions.includes(ext.id);
  if (!disabled) {
    state.extensionsService.loadExtension(ext.id);
  }
}
