import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DeepPartial } from '@shared/interfaces';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import { AppPreferencesData } from 'flashpoint-launcher';

const initialState: AppPreferencesData = deepCopy(defaultPreferencesData);


const prefsSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences(state: AppPreferencesData, { payload }: PayloadAction<AppPreferencesData>) {
      return payload;
    },
    updatePreferences(state: AppPreferencesData, { payload }: PayloadAction<DeepPartial<AppPreferencesData>>) {
      overwritePreferenceData(state, payload);
    }
  }
});

export const { actions: preferencesActions } = prefsSlice;
export const {
  setPreferences,
  updatePreferences } = prefsSlice.actions;
export default prefsSlice.reducer;
