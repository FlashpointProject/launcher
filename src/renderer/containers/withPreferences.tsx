import * as React from 'react';
import { useContext } from 'react';
import { Subtract } from '@shared/interfaces';
import { IAppPreferencesData } from '@shared/preferences/interfaces';
import { PreferencesContext } from '../context/PreferencesContext';

export type WithPreferencesProps = {
  /** Current preference data. */
  preferencesData: Readonly<IAppPreferencesData>;
};

export function withPreferences<P>(Component: React.ComponentType<P>) {
  return function WithPreferences(props: Subtract<P, WithPreferencesProps>) {
    const preferences = useContext(PreferencesContext);
    return (
      <Component
        {...props as P} // @HACK This is annoying to make typsafe
        preferencesData={preferences} />
    );
  };
}
