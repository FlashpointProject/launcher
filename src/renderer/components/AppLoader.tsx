import { useAppDispatch } from '@renderer/hooks/useAppSelector';
import { setMainState } from '@renderer/store/main/slice';
import { setPreferences, updatePreferences } from '@renderer/store/preferences/slice';
import store, { AppDispatch } from '@renderer/store/store';
import { logFactory } from '@renderer/util/logging';
import { SocketClient } from '@shared/back/SocketClient';
import { BackIn, BackOut } from '@shared/back/types';
import { InitRendererData } from '@shared/IPC';
import { LogLevel } from '@shared/Log/interface';
import { createErrorProxy } from '@shared/Util';
import EventEmitter from 'node:events';
import * as path from 'node:path';
import { ReactNode, useState } from 'react';
import { Spinner } from './Spinner';
import { ThemeProvider } from './ThemeProvider';

type AppLoaderProps = {
  children: ReactNode,
  data: InitRendererData,
};

async function waitForConnection(host: string): Promise<WebSocket> {
  while (true) {
    try {
      const socket = await SocketClient.connect(WebSocket, host, 'flashpoint-launcher');
      console.log('Initial connection established to backend');
      return socket;
    } catch (error) {
      console.log('Initial connection failed to backend, waiting 5 seconds...');
      await new Promise<void>(resolve => setTimeout(resolve, 5000));
    }
  }
}

const onInit = async (data: InitRendererData, dispatch: AppDispatch) => {
  // Store value(s)
  window.Shared.isBackRemote = data.isBackRemote;
  window.Shared.backUrl = new URL(data.host);
  window.Shared.url = data.url;
  window.Shared.isDev = data.isDev;

  // Register connection listener
  let startTime: number = 0;

  window.Shared.back.on('connected', async () => {
    const backStartTime = await window.Shared.back.request(BackIn.GET_START_TIME);
    if (startTime === 0) {
      startTime = backStartTime;
    } else if (startTime !== backStartTime) {
      // New backend proc, reload
      window.location.reload();
    }
  });

  // Connect to the back
  const socket = await waitForConnection(data.host);
  window.Shared.back.url = data.host;
  window.Shared.back.secret = 'flashpoint-launcher';
  window.Shared.back.setSocket(socket);
  registerHandlers();

  // Fetch the config and preferences
  const initData = await window.Shared.back.request(BackIn.GET_RENDERER_INIT_DATA);
  if (initData) {
    window.Shared.initialPreferences = initData.preferences;
    window.Shared.initialThemes = initData.themes;
    // Set some things early so Theme provider works
    dispatch(setMainState({ themeList: initData.themes }));
    dispatch(setPreferences(initData.preferences));
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
    window.Shared.initialLocaleCode = initData.localeCode;
  } else {
    throw 'No data given by host?';
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
    // Restart application
    window.addEventListener('keypress', (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyR') {
        window.electronAPI?.relaunch();
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

  isDev: false,

  isBackRemote: createErrorProxy('isBackRemote'),

  back: new SocketClient(WebSocket),

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
  const [initError, setInitError] = useState<string>();
  const [showSpinner, setShowSpinner] = useState(false);
  const dispatch = useAppDispatch();

  if (!loaderInit) {
    setLoaderInit(true);
    // Delay spinner for 800ms to prevent flashing during fast connections
    setTimeout(() => {
      setShowSpinner(true);
    }, 800);
    // Run initialization script
    onInit(props.data, dispatch)
    .then(() => {
      setIsInitDone(true);
    })
    .catch((error) => {
      setInitError(`Error during init: ${error}`);
    });
  }

  if (initError) {
    return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div>{initError}</div>
    </div>;
  }

  if (loaderInit && !isInitDone) {
    return (
      <ThemeProvider>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          { showSpinner && (
            <div className='splash-screen'>
              <div className='splash-screen__logo'>
                <Spinner/>
              </div>
              <div className='splash-screen__status-block'>
                <div className='splash-screen__status-header'>
                  Connecting...
                </div>
              </div>
            </div>
          )}
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {props.children}
      </div>
    </ThemeProvider>
  );
}
