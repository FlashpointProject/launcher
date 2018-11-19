import { createAction } from 'typesafe-actions';
import { PreferencesActionTypes } from './types';
import { IAppPreferencesData } from '../../../shared/preferences/IAppPreferencesData';

export const updatePreferences = createAction(PreferencesActionTypes.UPDATE_PREFERENCE, resolve => {
  return (data: Partial<IAppPreferencesData>) => resolve(data);
});
