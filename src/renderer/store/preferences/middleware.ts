import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { debounce } from '@shared/utils/debounce';
import { startAppListening } from '../listenerMiddleware';
import { incrementLogoVersion, setMainState } from '../main/slice';
import { createViews } from '../search/slice';
import store from '../store';
import { newAppPathOverride, newTagFilterGroup, removeAppPathOverride, removeTagFilterGroup, setExtState, setHomePageBoxOpen, setLogoSet, setUseCustomViews, setUseStoredViews, toggleExcludedLibrary, toggleNativePlatform, updateAppPathOverride, updatePreferences, updateTagFilterGroup } from './slice';

export function addPreferencesMiddleware() {
  startAppListening({
    matcher: isAnyOf(updatePreferences, setHomePageBoxOpen, setUseStoredViews, setUseCustomViews, newAppPathOverride, removeAppPathOverride, updateAppPathOverride, newTagFilterGroup, removeTagFilterGroup, updateTagFilterGroup, toggleNativePlatform, toggleExcludedLibrary),
    effect: async (action: PayloadAction<any>, listenerApi) => {
      sendPrefs();
    }
  });

  startAppListening({
    matcher: isAnyOf(setExtState),
    effect: async () => {
      // Refetch extension contributions
      window.Shared.back.request(BackIn.GET_RENDERER_EXTENSION_INFO)
      .then((data) => {
        store.dispatch(setMainState(data));
      });
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

  startAppListening({
    matcher: isAnyOf(setLogoSet),
    effect: async (action: PayloadAction<string | undefined>, listenerApi) => {
      await syncPrefs();
      listenerApi.dispatch(incrementLogoVersion());
    }
  });
}

const syncPrefs = async () => {
  return window.Shared.back.request(
    BackIn.UPDATE_PREFERENCES,
    store.getState().preferences,
  );
};


const sendPrefs = debounce(() => {
  window.Shared.back.send(
    BackIn.UPDATE_PREFERENCES,
    store.getState().preferences,
  );
}, 500);
