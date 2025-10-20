import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DeepPartial } from '@shared/interfaces';
import { Paths } from '@shared/Paths';
import { defaultPreferencesData, overwritePreferenceData } from '@shared/preferences/util';
import { deepCopy } from '@shared/Util';
import { AppPathOverride, AppPreferencesData, TagFilterGroup } from 'flashpoint-launcher';

const initialState: AppPreferencesData = deepCopy(defaultPreferencesData);

export type PreferencesHomePageBoxAction = {
  box: string;
  open: boolean;
}

export type AppPathUpdateAction = {
  index: number;
  data: Partial<AppPathOverride>;
}

export type TagFilterUpdateAction = {
  index: number;
  data: Partial<TagFilterGroup>;
}

export type TagFilterEnabledAction = {
  index: number;
  enabled: boolean;
}

const prefsSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences(state: AppPreferencesData, { payload }: PayloadAction<AppPreferencesData>) {
      return payload;
    },
    updatePreferences(state: AppPreferencesData, { payload }: PayloadAction<DeepPartial<AppPreferencesData>>) {
      overwritePreferenceData(state, payload);
    },
    setHomePageBoxOpen(state: AppPreferencesData, { payload }: PayloadAction<PreferencesHomePageBoxAction>) {
      const minimizedIdx = state.minimizedHomePageBoxes.findIndex(b => b === payload.box);
      if (minimizedIdx > -1) {
        if (payload.open) {
          state.minimizedHomePageBoxes.splice(minimizedIdx, 1);
        }
      } else {
        if (!payload.open) {
          state.minimizedHomePageBoxes.push(payload.box);
        }
      }
    },
    setUseStoredViews(state: AppPreferencesData, { payload }: PayloadAction<boolean>) {
      state.useStoredViews = payload;
      // Clear existing stored views when toggled off
      if (!payload) {
        state.storedViews = [];
      }
    },
    setUseCustomViews(state: AppPreferencesData, { payload }: PayloadAction<boolean>) {
      state.useCustomViews = payload;
      state.defaultOpeningPage = Paths.HOME;

      if (payload) {
        if (state.customViews.length === 0) {
          // Enabling custom views, make sure at least one exists
          state.customViews.push('Browse');
        }
      }
    },
    newAppPathOverride(state: AppPreferencesData, { payload }: PayloadAction<void>) {
      state.appPathOverrides.push({ path: '', override: '', enabled: true });
    },
    removeAppPathOverride(state: AppPreferencesData, { payload }: PayloadAction<number>) {
      if (state.appPathOverrides.length > payload) {
        state.appPathOverrides.splice(payload, 1);
      }
    },
    updateAppPathOverride(state: AppPreferencesData, { payload }: PayloadAction<AppPathUpdateAction>) {
      if (state.appPathOverrides.length > payload.index) {
        state.appPathOverrides[payload.index] = {
          ...state.appPathOverrides[payload.index],
          ...payload.data
        };
      }
    },
    newTagFilterGroup(state: AppPreferencesData, { payload }: PayloadAction<TagFilterGroup | undefined>) {
      if (payload !== undefined) {
        state.tagFilters.push(payload);
      } else {
        state.tagFilters.push({
          name: 'New Group',
          description: '',
          enabled: true,
          tags: [],
          categories: [],
          childFilters: [],
          extreme: false,
          iconBase64: ''
        });
      }
    },
    removeTagFilterGroup(state: AppPreferencesData, { payload }: PayloadAction<number>) {
      if (state.tagFilters.length > payload) {
        state.tagFilters.splice(payload, 1);
      }
    },
    updateTagFilterGroup(state: AppPreferencesData, { payload }: PayloadAction<TagFilterUpdateAction>) {
      if (state.tagFilters.length > payload.index) {
        state.tagFilters[payload.index] = {
          ...state.tagFilters[payload.index],
          ...payload.data
        };
      }
    },
    toggleNativePlatform(state: AppPreferencesData, { payload }: PayloadAction<string>) {
      const index = state.nativePlatforms.findIndex(n => n === payload);
      if (index !== 1) {
        state.nativePlatforms.splice(index, 1);
      } else {
        state.nativePlatforms.push(payload);
      }
    },
    toggleExcludedLibrary(state: AppPreferencesData, { payload }: PayloadAction<string>) {
      const index = state.excludedRandomLibraries.findIndex(n => n === payload);
      if (index !== 1) {
        state.excludedRandomLibraries.splice(index, 1);
      } else {
        state.excludedRandomLibraries.push(payload);
      }
    },
  }
});

export const { actions: preferencesActions } = prefsSlice;
export const {
  setPreferences,
  updatePreferences,
  setHomePageBoxOpen,
  setUseStoredViews,
  setUseCustomViews,
  newAppPathOverride,
  removeAppPathOverride,
  updateAppPathOverride,
  newTagFilterGroup,
  removeTagFilterGroup,
  updateTagFilterGroup,
  toggleNativePlatform,
  toggleExcludedLibrary,
} = prefsSlice.actions;
export default prefsSlice.reducer;
