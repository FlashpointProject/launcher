
/** IPC channels used to relay window events from main to renderer. */
export enum WindowIPC {
  WINDOW_MINIMIZE = 'window-minimize',
  WINDOW_MAXIMIZE = 'window-maximize',
  WINDOW_MOVE     = 'window-move',
  WINDOW_RESIZE   = 'window-resize',
  WINDOW_CLOSE    = 'window-close',
  /** Sent whenever a flashpoint:// protocol is run */
  PROTOCOL        = 'protocol',
}

/** IPC channels for everything else */

export enum CustomIPC {
  SHOW_MESSAGE_BOX = 'show-message-box',
  SHOW_SAVE_DIALOG = 'show-save-dialog',
  SHOW_OPEN_DIALOG = 'show-open-dialog',
  REGISTER_PROTOCOL = 'register-protocol',
  RELOAD_FULL = 'reload-full',
  RELOAD_WINDOW = 'reload-window',
  OPEN_EXTERNAL = 'open-external',
  SHOW_FILE_IN_FOLDER = 'show-file-in-folder',
  TOGGLE_DEVTOOLS = 'toggle-devtools',
  SELECT_FOLDER = 'select-folder',
  FILE_EXISTS = 'file-exists',
  WRITE_CLIPBOARD = 'write-clipboard',
}
