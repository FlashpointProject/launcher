import { updatePreferences } from '@renderer/store/preferences/slice';
import store from '@renderer/store/store';
import { logFactory } from '@renderer/util/logging';
import { SocketClient } from '@shared/back/SocketClient';
import { BackIn, BackOut } from '@shared/back/types';
import { InitRendererData } from '@shared/IPC';
import { LogLevel } from '@shared/Log/interface';
import { setTheme } from '@shared/Theme';
import { createErrorProxy } from '@shared/Util';
import EventEmitter from 'node:events';
import * as path from 'node:path';
import { ReactNode, useState } from 'react';

type AppLoaderProps = {
  children: ReactNode,
  data: InitRendererData,
};

const onInit = async (data: InitRendererData) => {
  // Store value(s)
  window.Shared.isBackRemote = data.isBackRemote;
  window.Shared.backUrl = new URL(data.host);
  window.Shared.url = data.url;
  // Connect to the back
  const socket = await SocketClient.connect(WebSocket, data.host, 'flashpoint-launcher');
  window.Shared.back.url = data.host;
  window.Shared.back.secret = 'flashpoint-launcher';
  window.Shared.back.setSocket(socket);
  registerHandlers();

  // Fetch the config and preferences
  const initData = await window.Shared.back.request(BackIn.GET_RENDERER_INIT_DATA);
  if (initData) {
    window.Shared.initialPreferences = initData.preferences;
    window.Shared.config = {
      data: initData.config,
      // @FIXTHIS This should take if this is installed into account
      fullFlashpointPath: initData.fullFlashpointPath,
      fullJsonFolderPath: path.resolve(initData.fullFlashpointPath, initData.preferences.jsonFolderPath),
    };
    window.Shared.fileServerPort = initData.fileServerPort;
    window.Shared.initialLogEntries = initData.log;
    window.Shared.customVersion = initData.customVersion;
    window.Shared.initialLang = initData.language;
    window.Shared.initialLangList = initData.languages;
    window.Shared.initialThemes = initData.themes;
    window.Shared.initialLocaleCode = initData.localeCode;
    if (window.Shared.initialPreferences.currentTheme) {
      const theme = window.Shared.initialThemes.find(t => t.id === window.Shared.initialPreferences.currentTheme);
      if (theme) { setTheme(theme); }
    }
  } else {
    alert('No data given by host?');
  }

  window.log = {
    trace: logFactory(LogLevel.TRACE, window.Shared.back),
    debug: logFactory(LogLevel.DEBUG, window.Shared.back),
    info: logFactory(LogLevel.INFO, window.Shared.back),
    warn: logFactory(LogLevel.WARN, window.Shared.back),
    error: logFactory(LogLevel.ERROR, window.Shared.back)
  };
  if (window.electronAPI !== undefined) {
    // Toggle DevTools when CTRL+SHIFT+I is pressed
    window.addEventListener('keypress', (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyI') {
        window.electronAPI?.toggleDevTools();
        event.preventDefault();
      }
    });
    // Reload window with CTRL+SHIFT+R
    window.addEventListener('keypress', (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyR') {
        window.electronAPI?.restart();
        event.preventDefault();
      }
    });
    navigator.clipboard.writeText = async (text: string) => {
      window.electronAPI?.writeClipboardText(text);
    };
  }

  store.dispatch(updatePreferences(window.Shared.initialPreferences));

  // Start keepalive routine
  setInterval(async () => {
    try {
      await window.Shared.back.request(BackIn.KEEP_ALIVE);
    } catch {
      /** Ignore any bad response */
    }
  }, 30000);
};

function registerHandlers(): void {
  window.Shared.back.register(BackOut.OPEN_MESSAGE_BOX, async (event, data) => {
    const result = await window.electronAPI!.ipcRenderer.invoke('show-message-box', data);
    return result.response;
  });

  window.Shared.back.register(BackOut.OPEN_SAVE_DIALOG, async (event, data) => {
    const result = await window.electronAPI!.ipcRenderer.invoke('show-save-dialog', data);
    return result.filePath;
  });

  window.Shared.back.register(BackOut.OPEN_OPEN_DIALOG, async (event, data) => {
    const result = await window.electronAPI!.ipcRenderer.invoke('show-open-dialog', data);
    return result.filePaths;
  });

  window.Shared.back.register(BackOut.OPEN_EXTERNAL, async (event, url, options) => {
    window.electronAPI?.openExternal(url, options);
  });
}

window.Shared = {
  initialPreferences: createErrorProxy('initialPreferences'),

  config: createErrorProxy('config'),

  log: {
    entries: [],
    offset: 0,
  },

  isDev: true, // TODO: fix

  isBackRemote: createErrorProxy('isBackRemote'),

  back: new SocketClient(WebSocket, () => {
    // Ask to send output to renderer if backend crashes
    if (window.electronAPI !== undefined) {
      window.electronAPI.enableMainOutput();
    }
  }),

  fileServerPort: -1,

  backUrl: createErrorProxy('backUrl'),

  customVersion: undefined,

  initialLogEntries: createErrorProxy('initialLogEntries'),
  initialLang: createErrorProxy('initialLang'),
  initialLangList: createErrorProxy('initialLangList'),
  initialThemes: createErrorProxy('initialThemes'),
  initialLocaleCode: createErrorProxy('initialLocaleCode'),

  dialogResEvent: new EventEmitter(),
};

export function AppLoader(props: AppLoaderProps) {
  const [loaderInit, setLoaderInit] = useState(false);
  const [isInitDone, setIsInitDone] = useState(false);

  if (!loaderInit) {
    setLoaderInit(true);
    // Run initialization script
    onInit(props.data)
    .then(() => {
      setIsInitDone(true);
    });
  }

  if (!isInitDone) {
    return (<div></div>);
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {props.children}
    </div>
  );
}
