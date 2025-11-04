import * as electron from 'electron';
import { OpenDialogOptions } from 'electron';
import { ipcRenderer } from 'electron/renderer';

console.log('preloading');

// Register Electron API functions we might need later
electron.contextBridge.exposeInMainWorld('electronAPI', {
  getInitData: () => {
    return ipcRenderer.sendSync('renderer-init');
  },
  fileExists: (path: string) => {
    path = fixPath(path);
    return ipcRenderer.invoke(CustomIPC.FILE_EXISTS, path);
  },
  openExternal: (url: string, opts?: Electron.OpenExternalOptions) => {
    ipcRenderer.send(CustomIPC.OPEN_EXTERNAL, url, opts);
  },
  showItemInFolder: (path: string) => {
    path = fixPath(path);
    ipcRenderer.send(CustomIPC.SHOW_FILE_IN_FOLDER, path);
  },
  showOpenDialog: (opts: OpenDialogOptions) => {
    return ipcRenderer.invoke(CustomIPC.SELECT_FOLDER, opts) as Promise<string[] | undefined>;
  },
  writeClipboardText: (text: string) => {
    ipcRenderer.send(CustomIPC.WRITE_CLIPBOARD, text);
  },
  restart: () => {
    ipcRenderer.send(CustomIPC.RELOAD_WINDOW);
  },
  protocolReady: () => {
    ipcRenderer.send(WindowIPC.PROTOCOL);
  },
  registerProtocol: async (enabled: boolean) => {
    const success = await ipcRenderer.invoke(CustomIPC.REGISTER_PROTOCOL, enabled);
    if (!success) {
      const regVerb = enabled ? 'add' : 'remove';
      alert('Failed to ' + regVerb + ' protocol registration');
    }
  },
  toggleDevTools: () => {
    ipcRenderer.send(CustomIPC.TOGGLE_DEVTOOLS);
  },
  enableMainOutput: () => {
    ipcRenderer.send(WindowIPC.MAIN_OUTPUT);
  },
  minimize() {
    ipcRenderer.send(WindowIPC.WINDOW_MINIMIZE);
  },
  maximize() {
    ipcRenderer.send(WindowIPC.WINDOW_MAXIMIZE);
  },
  close() {
    ipcRenderer.send(WindowIPC.WINDOW_CLOSE);
  },
  ipcRenderer,
} satisfies typeof window.electronAPI);


/** IPC channels used to relay window events from main to renderer. */
enum WindowIPC {
  WINDOW_MINIMIZE = 'window-minimize',
  WINDOW_MAXIMIZE = 'window-maximize',
  WINDOW_MOVE     = 'window-move',
  WINDOW_RESIZE   = 'window-resize',
  WINDOW_CLOSE    = 'window-close',
  /** Sent whenever a flashpoint:// protocol is run */
  PROTOCOL        = 'protocol',
  /** Sends Main Process output to renderer */
  MAIN_OUTPUT     = 'main-output'
}

/** IPC channels for everything else */

enum CustomIPC {
  SHOW_MESSAGE_BOX = 'show-message-box',
  SHOW_SAVE_DIALOG = 'show-save-dialog',
  SHOW_OPEN_DIALOG = 'show-open-dialog',
  REGISTER_PROTOCOL = 'register-protocol',
  RELOAD_WINDOW = 'reload-window',
  OPEN_EXTERNAL = 'open-external',
  SHOW_FILE_IN_FOLDER = 'show-file-in-folder',
  TOGGLE_DEVTOOLS = 'toggle-devtools',
  SELECT_FOLDER = 'select-folder',
  FILE_EXISTS = 'file-exists',
  WRITE_CLIPBOARD = 'write-clipboard',
}

function fixPath(path: string) {
  if (path.length >= 3) {
    if (path[0] === '/' && path[2] === ':') {
      path = path.substring(1);
    }
  }

  return path;
}
