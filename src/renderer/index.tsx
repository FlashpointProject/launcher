import { MDXProvider } from '@mdx-js/react';
import { MergeComponents } from '@mdx-js/react/lib';
import { init } from '@module-federation/enhanced/runtime';
import store from '@renderer/store/store';
import { BackIn } from '@shared/back/types';
import { LogLevel } from '@shared/Log/interface';
import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ShortcutProvider } from 'react-keybind';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import ConnectedApp from './containers/ConnectedApp';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { MenuProvider } from './context/MenuContext';
import { ProgressContext } from './context/ProgressContext';
import { updatePreferences } from './store/preferences/slice';
import { logFactory } from './util/logging';

(async () => {
  init({
    name: 'host',
    remotes: [],
    shared: {
      react: {
        version: '19.1.0',
        scope: 'default',
        lib: () => React,
        shareConfig: {
          singleton: true,
          requiredVersion: '19.1.0'
        }
      },
      'react-dom': {
        version: '19.1.0',
        scope: 'default',
        lib: () => ReactDOM,
        shareConfig: {
          singleton: true,
          requiredVersion: '19.1.0'
        }
      }
    }
  });

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
  }

  // Wait for the preferences and config to initialize
  await window.Shared.waitUntilInitialized();

  store.dispatch(updatePreferences(window.Shared.initialPreferences));

  // Start keepalive routine
  setInterval(async () => {
    try {
      await window.Shared.back.request(BackIn.KEEP_ALIVE);
    } catch {
      /** Ignore any bad response */
    }
  }, 30000);

  const container = document.getElementById('root')!;
  const root = createRoot(container);

  const components: MergeComponents = (cur) => {
    return {
      ...cur,
      a({ href }) {
        return <a href={href} target='_blank'/>;
      }
    };
  };

  // Render the application
  root.render(
    <Provider store={store}>
      <HashRouter>
        <MDXProvider components={components}>
          <ShortcutProvider>
            <ContextReducerProvider context={ProgressContext}>
              <MenuProvider>
                <ConnectedApp />
              </MenuProvider>
            </ContextReducerProvider>
          </ShortcutProvider>
        </MDXProvider>
      </HashRouter>
    </Provider>
  );
})();
