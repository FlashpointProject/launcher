import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { deepCopy } from '@shared/Util';
import * as React from 'react';

export const PreferencesContext = React.createContext<IAppPreferencesData>({} as any);

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
    <PreferencesContext.Provider
      value={state}
      children={props.children} />
  );
}
