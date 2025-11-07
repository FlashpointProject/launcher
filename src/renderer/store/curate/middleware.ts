import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import {
  addPlatform,
  addTag, BaseCurateAction, changeGroup, createAddApp,
  createGroup,
  CreateGroupAction,
  editAddApp,
  editCurationMeta, regenUuid,
  removeAddApp,
  removePlatform,
  removeTag, setPrimaryPlatform, setWarnings,
  toggleGroupPin
} from '@renderer/store/curate/slice';
import { startAppListening } from '@renderer/store/listenerMiddleware';
import store from '@renderer/store/store';
import { BackIn } from '@shared/back/types';
import { updatePreferences } from '../preferences/slice';
import { CurateGroup } from 'flashpoint-launcher';

export function addCurationMiddleware() {
  // Update warnings when curation changes
  startAppListening({
    matcher: isAnyOf(editAddApp, createAddApp, removeAddApp, editCurationMeta, addTag,
      removeTag, addPlatform, removePlatform, setPrimaryPlatform, regenUuid, changeGroup),
    effect: async (action: PayloadAction<BaseCurateAction>, listenerApi) => {
      const { curate } = listenerApi.getState();
      const curation = curate.curations.find(c => c.folder === action.payload.folder);
      if (curation) {
        console.log(curation.folder);
        window.Shared.back.request(BackIn.CURATE_GEN_WARNINGS, {
          ...curation,
          contents: undefined, // Strip content tree since it's unused and huge
        })
        .then((warnings) => {
          // Set new warnings
          store.dispatch(setWarnings({
            folder: curation.folder,
            warnings,
          }));
        });
      }
    }
  });

  startAppListening({
    matcher: isAnyOf(createGroup),
    effect: async (action: PayloadAction<CreateGroupAction>, listenerApi) => {
      const { curate } = listenerApi.getState();

      store.dispatch(updatePreferences({
        curateGroups: curate.groups
      }));
    }
  });

  startAppListening({
    matcher: isAnyOf(toggleGroupPin),
    effect: async (action: PayloadAction<CurateGroup>, listenerApi) => {
      const { curate } = listenerApi.getState();

      store.dispatch(updatePreferences({
        curateGroups: curate.groups
      }));
    }
  });
}
