import {BackIn} from '@shared/back/types';
import {AddAppCuration} from '@shared/curate/types';
import {CurateActionType} from './enums';
import {CurateAction, CurateState} from './types';
import uuid = require('uuid');
import { CurationState } from 'flashpoint-launcher';

export function curateStateReducer(state: CurateState = createInitialState(), action: CurateAction): CurateState {
  switch (action.type) {
    case CurateActionType.CREATE_CURATION:
    {
      window.Shared.back.send(BackIn.CURATE_CREATE_CURATION, action.folder, action.meta);
      return {
        ...state
      };
    }

    case CurateActionType.SET_SELECTED_CURATIONS:
    {
      const newSelected = action.folders;
      const newCurrent = action.folders.length < 0 ? action.folders[0] : '';
      return {
        ...state,
        selected: newSelected,
        current: newCurrent,
        lastSelected: newCurrent,
      };
    }

    case CurateActionType.SET_CURRENT_CURATION_GROUP: {
      const { group } = action;
      const groupContents = state.curations.filter(c => c.group === group);

      if (groupContents.length > 0) {
        return {
          ...state,
          current: groupContents[0].folder,
          selected: groupContents.map(g => g.folder),
          lastSelected: groupContents[0].folder
        };
      } else {
        return state;
      }
    }

    case CurateActionType.SET_CURRENT_CURATION: {
      const { ctrl, shift, folder } = action;
      let newSelected = [ ...state.selected ];
      let newCurrent = state.current;
      let nextSelected = action.folder;

      if (!ctrl && !shift) {
        // Multi select not used, reset selection
        newSelected = [folder];
        newCurrent = folder;
      }

      // Ctrl Key - Toggle selection of the clicked curation
      if (ctrl) {
        const idx = newSelected.findIndex(f => f === folder);
        if (idx !== -1) {
          newSelected.splice(idx, 1);
        } else {
          newSelected.push(folder);
        }
      // Shift Key - Select everything between next and last selected
      } else if (shift) {
        // Next selected doesn't change with shift
        nextSelected = state.lastSelected;
        if (state.lastSelected === '') {
          // No last selected, treat as first non-multi select click
          newSelected = [folder];
          newCurrent = folder;
        } else {
          const lastSelectedIdx = state.curations.findIndex(c => c.folder === state.lastSelected);
          const nextSelectedIdx = state.curations.findIndex(c => c.folder === folder);
          if (lastSelectedIdx !== -1 && nextSelectedIdx !== -1) {
            const startIdx = Math.min(lastSelectedIdx, nextSelectedIdx);
            const endIdx = Math.max(lastSelectedIdx, nextSelectedIdx);
            newSelected = state.curations.slice(startIdx, endIdx + 1).reduce<string[]>((prev, next) => prev.concat(next.folder), []);
          } else {
            // Something is out of sync?
            log.debug('Curate', 'Tried multi-selection but something is out of sync? Ignoring action.');
          }
        }
      }

      // If the current curation is no longer selected, select a new one if possible
      if (!newSelected.includes(newCurrent)) {
        if (newSelected.length > 0) {
          newCurrent = newSelected[0];
        } else {
          newCurrent = '';
        }
      }

      return {
        ...state,
        current: newCurrent,
        selected: newSelected,
        lastSelected: nextSelected
      };
    }

    case CurateActionType.NEW_ADDAPP: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      const newAddApp: AddAppCuration = {
        key: uuid(),
        launchCommand: ''
      };

      switch (action.addAppType) {
        case 'extras':
          newAddApp.heading = 'Extras';
          newAddApp.applicationPath = ':extras:';
          break;
        case 'message':
          newAddApp.heading = 'Message';
          newAddApp.applicationPath = ':message:';
          break;
        case 'normal':
          newAddApp.heading = '';
          newAddApp.applicationPath = '';
          break;
      }

      newCurations[index].addApps.push(newAddApp);

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.REMOVE_ADDAPP: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      const oldCuration = state.curations[index];
      const addAppIdx = oldCuration.addApps.findIndex(a => a.key === action.key);

      if (addAppIdx === -1) { return { ...state }; }

      newCurations[index].addApps.splice(addAppIdx, 1);

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.EDIT_ADDAPP: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      const oldCuration = state.curations[index];
      const addAppIdx = oldCuration.addApps.findIndex(a => a.key === action.key);

      if (addAppIdx === -1) { return { ...state }; }

      const newAddApp = { ...oldCuration.addApps[addAppIdx] };
      newAddApp[action.property] = action.value;
      newCurations[index].addApps[addAppIdx] = newAddApp;
      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.REGEN_UUID: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      newCurations[index].uuid = uuid();

      return {
        ...state,
        curations: newCurations
      };
    }

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

    case CurateActionType.ADD_TAG: {
      const { index, newCurations } = genCurationState(action.folder, state);
      const newTags = [...(newCurations[index].game.tags || [])];
      if (!newTags.find(t => t.id === action.tag.id)) {
        newTags.push(action.tag);
      }
      newCurations[index].game.tags = newTags;

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.REMOVE_TAG: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      // @TODO Apply disabling to onMouse instead?
      if (!newCurations[index].locked) {
        const newTags = [...(newCurations[index].game.tags || [])];
        const tagIdx = newTags.findIndex(t => t.id === action.tagId);
        if (tagIdx > -1) {
          newTags.splice(tagIdx, 1);
        }
        newCurations[index].game.tags = newTags;
      }
      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.SET_LOCK: {
      const newCurations = [ ...state.curations ];

      for (const folder of action.folders) {
        const idx = newCurations.findIndex(c => c.folder === folder);
        if (idx !== -1) {
          newCurations[idx].locked = action.locked;
        }
      }

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.TOGGLE_CONTENT_NODE_VIEW: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      const tree = action.tree;
      const contents = newCurations[index].contents;
      if (contents) {
        const newContents = { ...contents };

        if (tree.length >= 1) {
          // Recursively follow tree and toggle expanded value
          let curNode = newContents.root.children.find(n => n.name === tree[0]);
          if (curNode) {
            for (let pos = 1; pos < tree.length; pos++) {
              if (curNode) {
                curNode = curNode.children.find(n => n.name === tree[pos]);
              }
            }
            if (curNode) {
              curNode.expanded = !curNode.expanded;
            }
          }
        }

        newCurations[index].contents = newContents;
      }


      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.SET_CONTENTS: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      newCurations[index].contents = action.contents;

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.SET_WARNINGS: {
      const { index, newCurations } = genCurationState(action.folder, state);

      if (index === -1) { return { ...state }; }

      newCurations[index].warnings = action.warnings;

      return {
        ...state,
        curations: newCurations
      };
    }

    case CurateActionType.SET_ALL_CURATIONS:
      return {
        ...state,
        curations: [ ...action.curations ],
      };

    case CurateActionType.APPLY_DELTA: {
      const newState = genMultiCurationState(state);

      if (action.removed) {
        for (const removed of action.removed) {
          const curationIdx = newState.curations.findIndex(c => c.folder === removed);
          if (curationIdx !== -1) {
            newState.curations.splice(curationIdx, 1);
          }
          const selectedIdx = newState.selected.findIndex(s => s === removed);
          newState.selected.splice(selectedIdx, 1);
        }
      }

      if (action.added) {
        for (const curation of action.added) {
          const existingIdx = newState.curations.findIndex(c => c.folder === curation.folder);
          if (existingIdx > -1) {
            newState.curations[existingIdx] = curation;
          } else {
            newState.curations.push(...action.added);
          }
        }
      }

      if (action.removed && action.removed.includes(state.current)) {
        // Current view removed, choose new one
        if (newState.selected.length > 0) {
          newState.current = newState.selected[0];
        } else {
          newState.current = '';
        }
      }

      return newState;
    }

    case CurateActionType.NEW_PERSISTANT_GROUP: {
      const newGroups = [...state.groups];
      if (newGroups.findIndex(g => g.name === action.name) === -1) {
        newGroups.push({
          name: action.name,
          icon: action.icon,
        });
      }
      return {
        ...state,
        groups: newGroups,
      };
    }

    case CurateActionType.TOGGLE_GROUP_COLLAPSE: {
      const newState = genMultiCurationState(state);
      const idx = newState.collapsedGroups.findIndex(group => group === action.group);
      if (idx !== -1) {
        newState.collapsedGroups.splice(idx, 1);
      } else {
        newState.collapsedGroups.push(action.group);
        // Deselect all games inside group
        for (const c of state.curations) {
          if (c.group === action.group) {
            const selectedIdx = newState.selected.findIndex(s => s === c.folder);
            if (selectedIdx !== -1) {
              // Remove from selection
              newState.selected.splice(selectedIdx, 1);
            }
          }
        }
        if (!newState.selected.includes(newState.current)) {
          newState.current = '';
        }
        if (!newState.selected.includes(newState.lastSelected)) {
          newState.lastSelected = '';
        }
      }
      return newState;
    }

    case CurateActionType.TOGGLE_GROUP_PIN: {
      const newGroups = [...state.groups];
      const idx = newGroups.findIndex(g => g.name === action.group.name);
      if (idx !== -1) {
        newGroups.splice(idx, 1);
      } else {
        newGroups.push(action.group);
      }
      return {
        ...state,
        groups: newGroups
      };
    }

    case CurateActionType.CHANGE_GROUP: {
      // eslint-disable-next-line prefer-const
      let { index, newCurations } = genCurationState(action.folder, state);

      if (index !== -1) {
        newCurations[index].group = action.group;
      }

      const isSelected = state.selected.includes(action.folder);

      if (isSelected) {
        newCurations = newCurations.map<CurationState>(c => {
          if (state.selected.includes(c.folder)) {
            return {
              ...c,
              group: action.group
            };
          } else {
            return c;
          }
        });
      }

      return {
        ...state,
        curations: newCurations,
      };
    }

    default:
      return state;
  }
}

type NewCurationStateInfo = {
  index: number;
  newCurations: CurationState[];
}

function genMultiCurationState(state: CurateState): CurateState {
  return {
    groups: [ ...state.groups ],
    collapsedGroups: [ ...state.collapsedGroups ],
    lastSelected: state.lastSelected,
    curations: [ ...state.curations ],
    selected: [ ...state.selected ],
    current: state.current
  };
}

function genCurationState(folder: string, state: CurateState): NewCurationStateInfo {
  const index = state.curations.findIndex(curation => curation.folder === folder);
  const oldCuration = state.curations[index];
  const newCurations = [ ...state.curations ];
  newCurations[index] = {
    ...oldCuration
  };
  return {
    index,
    newCurations
  };
}

function createInitialState(): CurateState {
  return {
    groups: [],
    collapsedGroups: [],
    curations: [],
    current: '',
    selected: [],
    lastSelected: ''
  };
}
