import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './app';
import { MemoryRouter } from 'react-router-dom';

(async () => {
  // Wait for the preferences to initialize
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
