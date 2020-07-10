import { BackOut, ThemeChangeData, ThemeListChangeData } from '@shared/back/types';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta } from '@shared/ThemeFile';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SocketServer } from './SocketServer';
import { ThemeState } from './types';
import { FolderWatcher } from './util/FolderWatcher';

/**
 * Add a new watcher for a Theme path to the Theme State
 * @param themePath Path to the Theme
 * @param themeState Theme State to use
 * @param socketServer Socket Server to broadcast on
 * @returns Index of the new watcher on themeState.watchers
 */
export function newThemeWatcher(themePath: string, themeState: ThemeState, socketServer: SocketServer): number {
  // Check theme path exists
  fs.stat(themePath, (error) => {
    if (error) {
      let errStr = '';
      if (error.code === 'ENOENT') {
        errStr += `Failed to watch theme folder. Folder does not exist (Path: "${themePath}")\n`;
      }
      errStr += (typeof error.toString === 'function') ? error.toString() : (error + '');
      throw new Error(errStr);
    }
  });

  // Set up watcher
  const watcher = new FolderWatcher();

  watcher.on('ready', () => {
    // Add event listeners
    watcher.on('add', onThemeAdd);
    watcher.on('change', (filename: string, offsetPath: string) => {
      themeState.queue.push(() => {
        const item = findOwner(filename, offsetPath);
        if (item) {
          // A file in a theme has been changed
          socketServer.broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: item.entryPath,
          });
        } else {
          console.warn('A file has been changed in a theme that is not registered '+
                        `(Filename: "${filename}", OffsetPath: "${offsetPath}")`);
        }
      });
    });
    watcher.on('remove', (filename: string, offsetPath: string) => {
      themeState.queue.push(() => {
        const item = findOwner(filename, offsetPath);
        if (item) {
          if (item.entryPath === path.join(offsetPath, filename)) { // (Entry file was removed)
            themeState.files.splice(themeState.files.indexOf(item), 1);
            // A theme has been removed
            socketServer.broadcast<ThemeListChangeData>({
              id: '',
              type: BackOut.THEME_LIST_CHANGE,
              data: themeState.files,
            });
          } else { // (Non-entry file was removed)
            // A file in a theme has been removed
            socketServer.broadcast<ThemeChangeData>({
              id: '',
              type: BackOut.THEME_CHANGE,
              data: item.entryPath,
            });
          }
        } else {
          console.warn('A file has been removed from a theme that is not registered '+
                        `(Filename: "${filename}", OffsetPath: "${offsetPath}")`);
        }
      });
    });
    // Add initial files
    for (const filename of watcher.filenames) {
      onThemeAdd(filename, '', false);
    }
    // Functions
    function onThemeAdd(filename: string, offsetPath: string, doBroadcast = true) {
      themeState.queue.push(async () => {
        const item = findOwner(filename, offsetPath);
        if (item) {
          // A file has been added to this theme
          socketServer.broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: item.entryPath,
          });
        } else {
          // Check if it is a potential entry file
          // (Entry files are either directly inside the "Theme Folder", or one folder below that and named "theme.css")
          const folders = offsetPath.split(path.sep);
          const folderName = folders[0] || offsetPath;
          const file = watcher.getFile(folderName ? [...folders, filename] : [filename]);
          if ((file && file.isFile()) && (offsetPath === '' || (offsetPath === folderName && filename === themeEntryFilename))) {
            const themeFolder = watcher.getFolder() || '';
            const entryPath = path.join(themeFolder, folderName, filename);
            let meta: Partial<ThemeMeta> | undefined;
            try {
              const data = await fs.readFile(entryPath, 'utf8');
              meta = parseThemeMetaData(data) || {};
            } catch (error) { console.warn(`Failed to load theme entry file (File: "${entryPath}")`, error); }
            if (meta) {
              themeState.files.push({
                parentPath: themePath,
                basename: folderName || filename,
                meta: meta,
                entryPath: path.relative(themeFolder, entryPath),
              });
              if (doBroadcast) {
                socketServer.broadcast<ThemeListChangeData>({
                  id: '',
                  type: BackOut.THEME_LIST_CHANGE,
                  data: themeState.files,
                });
              }
            }
          }
        }
      });
    }
    function findOwner(filename: string, offsetPath: string) {
      if (offsetPath) { // (Sub-folder)
        const index = offsetPath.indexOf(path.sep);
        const folderName = (index >= 0) ? offsetPath.substr(0, index) : offsetPath;
        return themeState.files.find(item => item.basename === folderName);
      } else { // (Theme folder)
        return themeState.files.find(item => item.entryPath === filename || item.basename === filename);
      }
    }
  });
  watcher.on('error', (err) => log.error('Launcher', err.message));

  watcher.watch(themePath, { recursionDepth: -1 });
  return themeState.watchers.push(watcher);
}
