import { IAppPreferencesData } from '../../../shared/preferences/interfaces';

export const enum PreferencesActionTypes {
  UPDATE_PREFERENCE = '@@preferences/UPDATE_PREFERENCE',
}

export interface IPreferencesState {
  readonly data: IAppPreferencesData;
}
