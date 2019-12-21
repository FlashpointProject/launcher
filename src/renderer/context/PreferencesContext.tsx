import * as React from 'react';
import { IAppPreferencesData } from '../../shared/preferences/interfaces';
import { deepCopy } from '../../shared/Util';

export const PreferencesContext = React.createContext<IAppPreferencesData>({} as any);

type PreferencesContextProviderProps = {
  children?: React.ReactNode;
}

export function PreferencesContextProvider(props: PreferencesContextProviderProps) {
  // Note: This assumes that the preferences has been loaded before this is created.
  const [state, setState] = React.useState(() => deepCopy(window.External.preferences.data));

  // Update when preferences change
  React.useEffect(() => {
    const listener = () => { setState(window.External.preferences.data); };
    window.External.preferences.onUpdate = listener;
    return () => { window.External.preferences.onUpdate = undefined; };
  });

  return (
    <PreferencesContext.Provider
      value={state}
      children={props.children} />
  );
}
