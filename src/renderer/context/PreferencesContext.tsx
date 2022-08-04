import { deepCopy } from '@shared/Util';
import { AppPreferencesData } from 'flashpoint-launcher';
import * as React from 'react';

export const PreferencesContext = React.createContext<AppPreferencesData>({} as any);

type PreferencesContextProviderProps = {
  children?: React.ReactNode;
}

export function PreferencesContextProvider(props: PreferencesContextProviderProps) {
  // Note: This assumes that the preferences has been loaded before this is created.
  const [state, setState] = React.useState(() => deepCopy(window.Shared.preferences.data));

  // Update when preferences change
  React.useEffect(() => {
    const listener = () => { setState(window.Shared.preferences.data); };
    window.Shared.preferences.onUpdate = listener;
    return () => { window.Shared.preferences.onUpdate = undefined; };
  });

  return (
    <PreferencesContext.Provider value={state}>
      {props.children}
    </PreferencesContext.Provider>
  );
}
