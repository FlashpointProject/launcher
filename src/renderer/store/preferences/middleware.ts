import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { startAppListening } from '../listenerMiddleware';
import { updatePreferences } from './slice';
import { DeepPartial } from '@shared/interfaces';
import { AppPreferencesData } from 'flashpoint-launcher';
import { debounce } from '@shared/utils/debounce';
import { BackIn } from '@shared/back/types';
import store from '../store';

export function addPreferencesMiddleware() {
  startAppListening({
    matcher: isAnyOf(updatePreferences),
    effect: async (action: PayloadAction<DeepPartial<AppPreferencesData>>, listenerApi) => {
      sendPrefs();
    }
  });
}

const sendPrefs = debounce(() => {
  window.Shared.back.send(
    BackIn.UPDATE_PREFERENCES,
    store.getState().preferences,
  );
}, 500);
