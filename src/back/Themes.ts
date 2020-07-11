import { BackOut, ThemeChangeData, ThemeListChangeData } from '@shared/back/types';
import { parseThemeMetaData, themeEntryFilename, ThemeMeta, Theme } from '@shared/ThemeFile';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SocketServer } from './SocketServer';
import { ThemeState } from './types';
import { FolderWatcher } from './util/FolderWatcher';
import { Registry } from './extensions/types';

/**
 * Add a new watcher for a Theme path to the Theme State
 * @param themePath Path to the Theme
 * @param themeState Theme State to use
 * @param socketServer Socket Server to broadcast on
 * @returns Index of the new watcher on themeState.watchers
 */
export async function newThemeWatcher(id: string, basePath: string, themePath: string, themeState: ThemeState, registry: Registry, socketServer: SocketServer): Promise<void> {
  // Throw if going to override other theme
  if (registry.themes.has(id)) {
    throw new Error(`Theme already registered, skipping! (${id})`);
  }

  // Check theme path exists
  await fs.promises.stat(path.join(themePath, themeEntryFilename))
  .catch((error) => {
    let errStr = '';
    if (error.code === 'ENOENT') {
      errStr += `Failed to watch theme folder. Entry path does not exist (Path: "${path.join(themePath, themeEntryFilename)}")\n`;
    }
    errStr += (typeof error.toString === 'function') ? error.toString() : (error + '');
    throw new Error(errStr);
  });

  // Set up watcher
  const watcher = new FolderWatcher();

  // Set up theme
  const theme: Theme = {
    id: id,
    basePath: basePath,
    themePath: path.relative(basePath, themePath),
    entryPath: themeEntryFilename,
    files: [],
    meta: {}
  };

  watcher.on('ready', () => {
    // Add event listeners
    watcher.on('add', onFileAdd);
    watcher.on('change', (filename: string, offsetPath: string) => {
      themeState.queue.push(() => {
        const relativePath = path.join(offsetPath, filename);
        if (!theme.files.includes(relativePath)) {
          log.warn('Launcher', 'A file has been changed in a theme but the file is not registered '+
          `(File Path: "${filename}", Theme: "${theme.themePath}")`);
        } else {
          socketServer.broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: theme,
          });
        }
      });
    });
    watcher.on('remove', (filename: string, offsetPath: string) => {
      themeState.queue.push(() => {
        const relativePath = path.join(offsetPath, filename);
        if (!theme.files.includes(relativePath)) {
          log.warn('Launcher', 'A file has been removed in a theme but the file is not registered '+
            `(File Path: "${filename}", Theme: "${theme.themePath}")`);
        } else {
          theme.files.splice(theme.files.indexOf(relativePath), 1);
          // A file in a theme has been removed
          socketServer.broadcast<ThemeChangeData>({
            id: '',
            type: BackOut.THEME_CHANGE,
            data: theme,
          });
        }
      });
    });
    async function onFileAdd(filename: string, offsetPath: string, broadcast = true) {
      const relativePath = path.join(offsetPath, filename);
      const fullPath = path.join(basePath, theme.themePath, relativePath);
      if (!theme.files.includes(relativePath)) {
        // Register new file
        theme.files.push(relativePath);
      }
      // Check if theme.css
      const folders = offsetPath.split(path.sep);
      const folderName = folders[0] || offsetPath;
      const file = watcher.getFile(folderName ? [...folders, filename] : [filename]);
      if ((file && file.isFile()) && relativePath === theme.entryPath) {
        let meta: Partial<ThemeMeta> | undefined;
        try {
          const data = await fs.readFile(fullPath, 'utf8');
          meta = parseThemeMetaData(data) || {};
        } catch (error) { console.warn(`Failed to load theme entry file (File: "${theme.entryPath}")`, error); }
        if (meta) {
          theme.meta = meta;
          if (broadcast) {
            socketServer.broadcast<ThemeListChangeData>({
              id: '',
              type: BackOut.THEME_LIST_CHANGE,
              data: Array.from(registry.themes.values()),
            });
          }
        }
      }
    }
    // Add initial files
    for (const filename of watcher.filenames) {
      onFileAdd(filename, '', false);
    }
  });
  watcher.on('error', (err) => log.error('Launcher', err.message));

  log.debug('Launcher', `Added Theme ${theme.id}`);
  registry.themes.set(theme.id, theme);
  watcher.watch(themePath, { recursionDepth: -1 });
}
