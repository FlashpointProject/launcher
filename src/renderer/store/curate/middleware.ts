import { BackIn } from '@shared/back/types';
import { startAppListening } from '@renderer/store/listenerMiddleware';
import {
  addPlatform,
  addTag, BaseCurateAction, changeGroup, createAddApp,
  editAddApp,
  editCurationMeta, regenUuid,
  removeAddApp,
  removePlatform,
  removeTag, setPrimaryPlatform, setWarnings
} from '@renderer/store/curate/slice';
import { isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import store from '@renderer/store/store';

export function addCurationMiddleware() {
  // Update warnings when curation changes
  startAppListening({
    matcher: isAnyOf(editAddApp, createAddApp, removeAddApp, editCurationMeta, addTag,
      removeTag, addPlatform, removePlatform, setPrimaryPlatform, regenUuid, changeGroup),
    effect: async(action: PayloadAction<BaseCurateAction>, listenerApi)=> {
      const { curate } = listenerApi.getState();
      const curation = curate.curations.find(c => c.folder === action.payload.folder);
      if (curation) {
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
}
