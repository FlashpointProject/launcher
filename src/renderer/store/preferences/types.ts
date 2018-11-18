import { IAppPreferencesData } from '../../../shared/preferences/IAppPreferencesData';

export const enum PreferencesActionTypes {
  UPDATE_PREFERENCE = '@@search/UPDATE_PREFERENCE',
}

export interface IPreferencesState {
  readonly data: IAppPreferencesData;
}
