import { bindActionCreators, Dispatch } from '@reduxjs/toolkit';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { preferencesActions } from '@renderer/store/preferences/slice';
import { Subtract } from '@shared/interfaces';
import { AppPreferencesData, DeepPartial } from 'flashpoint-launcher';
import * as React from 'react';
import { useDispatch } from 'react-redux';

type PreferencesStateProps = {
  /** Current preference data. */
  preferencesData: Readonly<AppPreferencesData>;
};

export type WithPreferencesProps = PreferencesStateProps & ReturnType<typeof mapDispatchToProps>;

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    dispatch,
    setPreferences: (state: AppPreferencesData) => dispatch(preferencesActions.setPreferences(state)),
    updatePreferences: (state: DeepPartial<AppPreferencesData>) => dispatch(preferencesActions.updatePreferences(state)),
    preferencesActions: bindActionCreators(preferencesActions, dispatch),
  };
}

export function withPreferences<P>(Component: React.ComponentType<P>) {
  return function WithPreferences(props: Subtract<P, WithPreferencesProps>) {
    const stateProps: PreferencesStateProps = {
      preferencesData: useAppSelector(state => state.preferences),
    };
    const dispatch = useDispatch();
    const dispatchProps = mapDispatchToProps(dispatch);
    return (
      <Component
        {...props as P} // @HACK This is annoying to make typesafe
        {...stateProps}
        {...dispatchProps} />
    );
  };
}
