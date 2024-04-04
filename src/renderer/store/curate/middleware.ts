import { BackIn } from '@shared/back/types';
import { updatePreferencesData } from '@shared/preferences/util';
import { CurationState } from 'flashpoint-launcher';
import { Middleware } from 'redux';
import { ApplicationState } from '..';
import { CurateActionType } from './enums';
import { CurateAction, CurateState } from './types';

export const curationSyncMiddleware: Middleware<{}, ApplicationState> = (store) => (next) => (action: CurateAction) => {
  switch (action.type) {
    case CurateActionType.DELETE: {
      // Lock curation from further edits
      store.dispatch({
        type: CurateActionType.SET_LOCK,
        folders: action.folders,
        locked: true
      });
      window.Shared.back.send(BackIn.CURATE_DELETE, action.folders, action.taskId);
      next(action);
      break;
    }
    case CurateActionType.IMPORT: {
      // Lock curation from further edits
      store.dispatch({
        type: CurateActionType.SET_LOCK,
        folders: action.folders,
        locked: true
      });
      const state = store.getState();
      const folders: string[] = action.folders;
      const curations = folders.map(f => state.curate.curations.find(c => c.folder === f)).filter(c => c !== undefined) as CurationState[];

      // Send curation import request to back
      if (curations.length > 0) {
        window.Shared.back.send(BackIn.IMPORT_CURATION, {
          curations: curations,
          saveCuration: action.saveCuration,
          taskId: action.taskId
        });
      }
      next(action);
      break;
    }
    case CurateActionType.EXPORT_DATA_PACK: {
      const state = store.getState();
      const folders: string[] = action.folders;
      const curations = folders.map(f => state.curate.curations.find(c => c.folder === f)).filter(c => c !== undefined) as CurationState[];
      if (curations.length > 0) {
        window.Shared.back.send(BackIn.CURATE_EXPORT_DATA_PACK, curations, action.taskId);
      }
      next(action);
      break;
    }
    case CurateActionType.EXPORT: {
      store.dispatch({
        type: CurateActionType.SET_LOCK,
        folders: action.folders,
        locked: true
      });
      const state = store.getState();
      const folders: string[] = action.folders;
      const curations = folders.map(f => state.curate.curations.find(c => c.folder === f)).filter(c => c !== undefined) as CurationState[];
      // Send curation export request to back
      if (curations.length > 0) {
        window.Shared.back.send(BackIn.CURATE_EXPORT, curations, action.taskId);
      }
      next(action);
      break;
    }
    case CurateActionType.CREATE_CURATION: {
      next(action);
      // Set new curation as current
      store.dispatch({
        type: CurateActionType.SET_CURRENT_CURATION,
        folder: action.folder
      });
      break;
    }
    // eslint-disable-next-line no-fallthrough
    case CurateActionType.EDIT_ADDAPP:
    case CurateActionType.NEW_ADDAPP:
    case CurateActionType.REMOVE_ADDAPP:
    case CurateActionType.EDIT_CURATION_META:
    case CurateActionType.ADD_TAG:
    case CurateActionType.ADD_PLATFORM:
    case CurateActionType.REGEN_UUID:
    case CurateActionType.CHANGE_GROUP:
    case CurateActionType.REMOVE_PLATFORM:
    case CurateActionType.SET_PRIMARY_PLATFORM:
    case CurateActionType.REMOVE_TAG: {
      next(action);
      const state = store.getState();
      const curationsState = state.curate;
      const modifiedCuration = curationsState.curations.find(c => c.folder === action.folder);
      if (modifiedCuration) {
        const shortend = {
          ...modifiedCuration
        };
        if (shortend.contents) {
          shortend.contents = undefined;
        }
        window.Shared.back.request(BackIn.CURATE_GEN_WARNINGS, shortend)
        .then((warnings) => {
          // Set new warnings
          store.dispatch({
            type: CurateActionType.SET_WARNINGS,
            folder: modifiedCuration.folder,
            warnings: warnings
          });
        });

      } else {
        log.error('Curate', `Action performed but no curation found to generate warnings for? ${JSON.stringify(action)}`);
      }
      break;
    }
    case CurateActionType.NEW_PERSISTANT_GROUP:
    case CurateActionType.TOGGLE_GROUP_PIN: {
      next(action);
      const state = store.getState();
      updatePreferencesData({
        groups: state.curate.groups
      });
      break;
    }
    case CurateActionType.SET_WARNINGS: {
      next(action);
      const state: CurateState = store.getState().curate;
      const modifiedCuration = state.curations.find(c => c.folder === action.folder);
      if (modifiedCuration) {
        // @TODO Queue system, delays, etc to lower number of calls?
        // Send update to backend
        // Don't send back the content tree
        const strippedCuration: CurationState = {
          ...modifiedCuration
        };
        delete strippedCuration.contents;
        window.Shared.back.request(BackIn.CURATE_SYNC_CURATIONS, [strippedCuration]);
      } else {
        log.error('Curate', `Action performed but no curation found to save warnings for? ${JSON.stringify(action)}`);
      }
      break;
    }
    default:
      next(action);
      break;
  }
};
