import { MDXProvider } from '@mdx-js/react';
import { MergeComponents } from '@mdx-js/react/lib';
import { init } from '@module-federation/enhanced/runtime';
import store from '@renderer/store/store';
import { InitRendererData } from '@shared/IPC';
import { BROWSER_ISDEV, getBrowserBackendHost, IS_BROWSER_BACKEND_REMOTE } from '@shared/version';
import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ShortcutProvider } from 'react-keybind';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { App } from './components/app';
import { AppLoader } from './components/AppLoader';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { ProgressContext } from './context/ProgressContext';

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

  const data: InitRendererData = window.electronAPI ?
    window.electronAPI.getInitData() :
    {
      isDev: BROWSER_ISDEV,
      host: getBrowserBackendHost(),
      isBackRemote: IS_BROWSER_BACKEND_REMOTE,
    };

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
          <AppLoader data={data}>
            <ShortcutProvider>
              <ContextReducerProvider context={ProgressContext}>
                <App />
              </ContextReducerProvider>
            </ShortcutProvider>
          </AppLoader>
        </MDXProvider>
      </HashRouter>
    </Provider>
  );
})();
