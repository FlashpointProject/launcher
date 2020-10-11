import { CurateActionType } from './enums';
import { CurateAction, CurateState } from './types';

export function curateStateReducer(state: CurateState = createInitialState(), action: CurateAction): CurateState {
  switch (action.type) {
    default:
      return state;

    case CurateActionType.CREATE_CURATION:
      return {
        ...state,
        curations: [
          ...state.curations,
          {
            folder: action.folder,
            meta: {
              title: '',
              alternateTitles: '',
              series: '',
              developer: '',
              publisher: '',
              playMode: '',
              status: '',
              version: '',
              releaseDate: '',
              language: '',
              source: '',
              launchCommand: '',
              notes: '',
              originalDescription: '',
              curationNotes: '',
              extreme: false,
            }
          },
        ],
      };

    case CurateActionType.SET_CURRENT_CURATION:
      return {
        ...state,
        current: action.index,
      };

    case CurateActionType.NEW_ADDAPP:
      return {
        ...state,
      };

    case CurateActionType.EDIT_CURATION_META: {
      const index = state.curations.findIndex(curation => curation.folder === action.folder);

      if (index === -1) { return { ...state }; }

      const oldCuration = state.curations[index];

      const newCurations = [ ...state.curations ];
      newCurations[index] = {
        ...oldCuration,
        meta: {
          ...oldCuration.meta,
          [action.property]: action.value,
        },
      };

      return {
        ...state,
        curations: newCurations,
      };
    }
  }
}

function createInitialState(): CurateState {
  return {
    curations: [],
    current: -1,
  };
}
