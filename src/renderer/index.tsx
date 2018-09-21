import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './app';
import { MemoryRouter } from 'react-router-dom';

(async () => {
  // Wait for the preferences and config to initialize
  await window.External.config.waitUtilInitialized();
  await window.External.preferences.waitUtilInitialized();
  // Render the application
  ReactDOM.render((
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ),
    document.getElementById('root')
  );
})();
