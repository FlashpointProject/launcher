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
            game: {},
            addApps: [],
            tagText: '',
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
        game: {
          ...oldCuration.game,
          [action.property]: action.value,
        },
      };

      return {
        ...state,
        curations: newCurations,
      };
    }

    case CurateActionType.SET_ALL_CURATIONS:
      return {
        ...state,
        curations: [ ...action.curations ],
      };

    case CurateActionType.APPLY_DELTA: {
      const newCurations = [ ...state.curations ];

      if (action.removed) {
        for (let i = newCurations.length - 1; i >= 0; i--) {
          if (action.removed.indexOf(newCurations[i].folder) !== -1) {
            newCurations.splice(i, 1);
          }
        }
      }

      if (action.added) { newCurations.push(...action.added); }

      return {
        ...state,
        curations: newCurations,
      };
    }

    case CurateActionType.ADD_TAG: {
      if (!state.curations[state.current]) { return { ...state }; }

      const oldCuration = state.curations[state.current];

      const newTag = {
        tag: action.tag,
        category: action.category,
      };

      // No duplicate tags allowed
      if (oldCuration.game.tags) {
        for (const tag of oldCuration.game.tags) {
          if (tag.tag === newTag.tag && tag.category === newTag.category) {
            return { ...state };
          }
        }
        oldCuration.game.tags
      }

      const newCurations = [ ...state.curations ];
      newCurations[state.current] = {
        ...oldCuration,
        game: {
          ...oldCuration.game,
          tags: oldCuration.game.tags
            ? [...oldCuration.game.tags, newTag]
            : [newTag],
        },
      };

      return {
        ...state,
        curations: newCurations,
      };
    }

    case CurateActionType.REMOVE_TAG: {
      const oldCuration = state.curations[state.current];

      if (!oldCuration
        || !oldCuration.game.tags
        || oldCuration.game.tags.length < action.index) {
        return { ...state };
      }

      const newCurations = [ ...state.curations ];

      const newTags = [ ...oldCuration.game.tags ];
      newTags.splice(action.index, 1);

      newCurations[state.current] = {
        ...oldCuration,
        game: {
          ...oldCuration.game,
          tags: newTags,
        }
      };

      return {
        ...state,
        curations: newCurations,
      };
    }
    
    case CurateActionType.EDIT_CURATION_TAG_TEXT: {
      const oldCuration = state.curations[state.current];

      if (!oldCuration) { return { ...state }; }

      const newCurations = [ ...state.curations ];
      newCurations[state.current] = {
        ...oldCuration,
        tagText: action.text,
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
