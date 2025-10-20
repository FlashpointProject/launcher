import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { debounce } from '@shared/utils/debounce';
import { startAppListening } from '../listenerMiddleware';
import store from '../store';
import { newAppPathOverride, newTagFilterGroup, removeAppPathOverride, removeTagFilterGroup, setHomePageBoxOpen, setUseCustomViews, setUseStoredViews, toggleExcludedLibrary, toggleNativePlatform, updateAppPathOverride, updatePreferences, updateTagFilterGroup } from './slice';
import { createViews } from '../search/slice';

export function addPreferencesMiddleware() {
  startAppListening({
    matcher: isAnyOf(updatePreferences, setHomePageBoxOpen, setUseStoredViews, setUseCustomViews, newAppPathOverride, removeAppPathOverride, updateAppPathOverride, newTagFilterGroup, removeTagFilterGroup, updateTagFilterGroup, toggleNativePlatform, toggleExcludedLibrary),
    effect: async (action: PayloadAction<any>, listenerApi) => {
      sendPrefs();
    }
  });

  startAppListening({
    matcher: isAnyOf(setUseCustomViews),
    effect: async (action: PayloadAction<boolean>, listenerApi) => {
      const { preferences, main } = listenerApi.getState();
      const views = preferences.useCustomViews ? preferences.customViews : main.libraries;

      // Recreate the views as needed
      listenerApi.dispatch(createViews({
        views: views,
        storedViews: preferences.useStoredViews ? preferences.storedViews : undefined,
        areLibraries: !preferences.useCustomViews,
        loadViewsText: preferences.loadViewsText,
        playlists: main.playlists,
      }));
    }
  });
}

const sendPrefs = debounce(() => {
  window.Shared.back.send(
    BackIn.UPDATE_PREFERENCES,
    store.getState().preferences,
  );
}, 500);
