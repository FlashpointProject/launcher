import { createAction } from 'typesafe-actions';
import { IAppPreferencesData } from '../../../shared/preferences/IAppPreferencesData';
import { PreferencesActionTypes } from './types';

export const updatePreferences = createAction(PreferencesActionTypes.UPDATE_PREFERENCE, resolve => {
  return (data: Partial<IAppPreferencesData>) => resolve(data);
});
