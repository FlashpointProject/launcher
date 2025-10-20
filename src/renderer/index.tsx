import { MDXProvider } from '@mdx-js/react';
import { MergeComponents } from '@mdx-js/react/lib';
import { init } from '@module-federation/enhanced/runtime';
import store from '@renderer/store/store';
import { InitRendererData } from '@shared/IPC';
import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ShortcutProvider } from 'react-keybind';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { App } from './components/app';
import { AppLoader } from './components/AppLoader';
import { ContextReducerProvider } from './context-reducer/ContextReducerProvider';
import { MenuProvider } from './context/MenuContext';
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
      isBackRemote: false,
      installed: false,
      host: 'ws://localhost:12001/'
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
                <MenuProvider>
                  <App />
                </MenuProvider>
              </ContextReducerProvider>
            </ShortcutProvider>
          </AppLoader>
        </MDXProvider>
      </HashRouter>
    </Provider>
  );
})();
