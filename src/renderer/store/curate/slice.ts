import {
  AddAppCurationMeta,
  ContentTree,
  CurationMeta,
  CurationState, CurationWarnings,
  EditCurationMeta,
  Platform,
  Tag
} from 'flashpoint-launcher';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BackIn } from '@shared/back/types';
import { AddAppCuration, PlatformAppPathSuggestions } from '@shared/curate/types';
import uuid = require('uuid');
import { updatePreferencesData } from '@shared/preferences/util';

export type CurateGroup = {
  name: string;
  icon: string;
}

export type CurateState = {
  /** Persistant Group Names */
  groups: CurateGroup[];
  /** Collapsed curation groups */
  collapsedGroups: string[];
  /** Loaded curations. */
  curations: CurationState[];
  /** Folder of the currently selected curation (-1 if none). */
  current: string;
  /** List of curations that are selected */
  selected: string[];
  /** Last curation that was clicked */
  lastSelected: string;
}

export type AddAppType = 'normal' | 'extras' | 'message';

export type BaseCurateAction = {
  folder: string;
}

export type NewCurateAction = {
  meta?: EditCurationMeta;
} & BaseCurateAction;

export type SetCurrentCurationAction = {
  ctrl?: boolean;
  shift?: boolean;
} & BaseCurateAction;

export type CreateAddAppAction = {
  addAppType: AddAppType;
} & BaseCurateAction;

export type RemoveAddAppAction = {
  key: string;
} & BaseCurateAction;

export type EditCurationAction = {
  property: keyof CurationMeta;
  value: any;
} & BaseCurateAction;

export type EditAddAppAction = {
  key: string;
  property: keyof AddAppCurationMeta;
  value: string;
} & BaseCurateAction;

export type TagAction = {
  tag: Tag;
} & BaseCurateAction;

export type RemoveTagAction = {
  tagId: number;
} & BaseCurateAction;

export type SetPlatformAction = {
  platform: Platform;
  platformAppPaths?: PlatformAppPathSuggestions;
} & BaseCurateAction;

export type RemovePlatformAction = {
  platformId: number;
  platformAppPaths?: PlatformAppPathSuggestions;
} & BaseCurateAction;

export type SetPrimaryPlatformAction = {
  value: string;
  platformAppPaths?: PlatformAppPathSuggestions;
} & BaseCurateAction;

export type ToggleContentNodeAction = {
  tree: string[];
} & BaseCurateAction;

export type SetLockAction = {
  locked: boolean;
} & BaseCurateAction;

export type SetContentTreeAction = {
  contentTree: ContentTree;
} & BaseCurateAction;

export type SetWarningsAction = {
  warnings: CurationWarnings;
} & BaseCurateAction;

export type ModifyCurationsAction = {
  added?: CurationState[];
  removed?: string[];
};

export type CreateGroupAction = {
  name: string;
  icon: string;
}

export type ChangeGroupAction = {
  group: string;
} & BaseCurateAction;

export type CurateTaskAction = {
  taskId: string;
}

const initialState: CurateState = {
  groups: [],
  collapsedGroups: [],
  curations: [],
  current: '',
  selected: [],
  lastSelected: ''
};

const curateSlice = createSlice({
  name: 'curate',
  initialState,
  reducers: {
    createCuration(_: CurateState, { payload }: PayloadAction<NewCurateAction>) {
      window.Shared.back.send(BackIn.CURATE_CREATE_CURATION, payload.folder, payload.meta);
    },
    deleteCurations(state: CurateState, { payload }: PayloadAction<CurateTaskAction>) {
      const curations = state.curations.filter(c => !c.locked && state.selected.includes(c.folder));
      for (const cur of curations) {
        cur.locked = true;
      }
      window.Shared.back.send(BackIn.CURATE_DELETE, curations.map(c => c.folder), payload.taskId);
    },
    importCurations(state: CurateState, { payload }: PayloadAction<CurateTaskAction>) {
      const curations = state.curations.filter(c => !c.locked && state.selected.includes(c.folder));
      for (const cur of curations) {
        cur.locked = true;
      }
      window.Shared.back.send(BackIn.CURATE_IMPORT, {
        curations,
        saveCuration: window.Shared.preferences.data.saveImportedCurations,
        taskId: payload.taskId,
      });
    },
    exportCurationDataPacks(state: CurateState, { payload }: PayloadAction<CurateTaskAction>) {
      const curations = state.curations.filter(c => !c.locked && state.selected.includes(c.folder));
      for (const cur of curations) {
        cur.locked = true;
      }
      window.Shared.back.send(BackIn.CURATE_EXPORT_DATA_PACK, curations, payload.taskId);
    },
    exportCurations(state: CurateState, { payload }: PayloadAction<CurateTaskAction>) {
      const curations = state.curations.filter(c => !c.locked && state.selected.includes(c.folder));
      for (const cur of curations) {
        cur.locked = true;
      }
      window.Shared.back.send(BackIn.CURATE_EXPORT, curations, payload.taskId);
    },
    setSelectedCurations(state: CurateState, { payload }: PayloadAction<string[]>) {
      state.selected = payload;
      state.current = payload[0];
      state.lastSelected = payload[0];
    },
    setCurrentCurationGroup(state: CurateState, { payload }: PayloadAction<string>) {
      const curations = state.curations.filter(c => c.group === payload);
      if (curations.length > 0) {
        state.current = curations[0].folder;
        state.selected = curations.map(g => g.folder);
        state.lastSelected = curations[0].folder;
      }
    },
    setCurrentCuration(state: CurateState, { payload }: PayloadAction<SetCurrentCurationAction>) {
      const { ctrl, shift, folder } = payload;

      // Single select
      if (!ctrl && !shift) {
        state.selected = [folder];
        state.current = folder;
      }

      // Ctrl - Single toggle
      if (ctrl) {
        const idx = state.selected.findIndex(f => f === folder);
        if (idx > -1) {
          // Unselect
          state.selected.splice(idx, 1);
        } else {
          // Select
          state.selected.push(folder);
        }
      // Shift - Select range
      } else if (shift) {
        if (state.lastSelected === '') {
          // No last selected, treat as single select
          state.selected = [folder];
          state.current = folder;
        } else {
          // Select all from previous to current
          const lastSelectedIdx = state.curations.findIndex(c => c.folder === state.lastSelected);
          const nextSelectedIdx = state.curations.findIndex(c => c.folder === folder);

          // Make sure both exist
          if (lastSelectedIdx !== -1 && nextSelectedIdx !== -1) {
            const startIdx = Math.min(lastSelectedIdx, nextSelectedIdx);
            const endIdx = Math.min(lastSelectedIdx, nextSelectedIdx);
            state.selected = state.curations.slice(startIdx, endIdx + 1).reduce<string[]>((prev, next) => prev.concat(next.folder), []);
          }
        }
      }

      // Make sure current curation is within selected range
      if (!state.selected.includes(state.current)) {
        if (state.selected.length > 0) {
          state.current = state.selected[0];
        } else {
          state.current = '';
        }
      }
    },
    createAddApp: lockedFunc((state: CurateState, { payload }: PayloadAction<CreateAddAppAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        const newAddApp: AddAppCuration = {
          key: uuid(),
          launchCommand: ''
        };

        switch (payload.addAppType) {
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

        curation.addApps.push(newAddApp);
      }
    }),
    removeAddApp: lockedFunc((state: CurateState, { payload }: PayloadAction<RemoveAddAppAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        const addAppIdx = curation.addApps.findIndex(i => i.key === payload.key);
        if (addAppIdx > -1) {
          curation.addApps.splice(addAppIdx, 1);
        }
      }
    }),
    editAddApp: lockedFunc((state: CurateState, { payload }: PayloadAction<EditAddAppAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        const addApp = curation.addApps.find(a => a.key === payload.key);
        if (addApp) {
          addApp[payload.property] = payload.value;
        }
      }
    }),
    regenUuid: lockedFunc((state: CurateState, { payload }: PayloadAction<BaseCurateAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.uuid = uuid();
      }
    }),
    editCurationMeta: lockedFunc((state: CurateState, { payload }: PayloadAction<EditCurationAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.game[payload.property] = payload.value;
      }
    }),
    addTag: lockedFunc((state: CurateState, { payload }: PayloadAction<TagAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        if (curation.game.tags) {
          if (!curation.game.tags.find(t => t.id === payload.tag.id)) {
            curation.game.tags.push(payload.tag);
          }
        } else {
          curation.game.tags = [payload.tag];
        }
      }
    }),
    removeTag: lockedFunc((state: CurateState, { payload }: PayloadAction<RemoveTagAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        if (curation.game.tags) {
          const idx = curation.game.tags.findIndex(t => t.id === payload.tagId);
          if (idx > -1) {
            curation.game.tags.splice(idx, 1);
          }
        }
      }
    }),
    setPrimaryPlatform: lockedFunc((state: CurateState, { payload }: PayloadAction<SetPrimaryPlatformAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.game.primaryPlatform = payload.value;

        // Set the common app path for the new platform
        if (payload.platformAppPaths) {
          if (curation.game.primaryPlatform in payload.platformAppPaths) {
            curation.game.applicationPath = payload.platformAppPaths[curation.game.primaryPlatform][0].appPath;
          }
        }
      }
    }),
    addPlatform: lockedFunc((state: CurateState, { payload }: PayloadAction<SetPlatformAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        if (curation.game.platforms) {
          const idx = curation.game.platforms.findIndex(p => p.id === payload.platform.id);
          if (idx === -1) {
            curation.game.platforms.push(payload.platform);
          }
        } else {
          curation.game.platforms = [payload.platform];
        }

        if (curation.game.platforms.length === 1) {
          curation.game.primaryPlatform = curation.game.platforms[0].name;

          if (payload.platformAppPaths && curation.game.primaryPlatform in payload.platformAppPaths && payload.platformAppPaths[curation.game.primaryPlatform].length > 0) {
            curation.game.applicationPath = payload.platformAppPaths[curation.game.primaryPlatform][0].appPath;
          }
        }
      }
    }),
    removePlatform: lockedFunc((state: CurateState, { payload }: PayloadAction<RemovePlatformAction>) => {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation && curation.game.platforms) {
        const platformIdx = curation.game.platforms.findIndex(p => p.id === payload.platformId);
        if (platformIdx > -1) {
          curation.game.platforms.splice(platformIdx, 1);

          // Change primary platform if it doesn't exist in new platforms array
          if (curation.game.platforms.length === 0) {
            curation.game.primaryPlatform = undefined;
          } else if (!curation.game.platforms.find(p => p.name === curation.game.primaryPlatform)) {
            curation.game.primaryPlatform = curation.game.platforms[0].name;
            if (payload.platformAppPaths && curation.game.primaryPlatform in payload.platformAppPaths) {
              curation.game.applicationPath = payload.platformAppPaths[curation.game.primaryPlatform][0].appPath;
            }
          }
        }
      }
    }),
    toggleContentNodeView(state: CurateState, { payload }: PayloadAction<ToggleContentNodeAction>) {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation && curation.contents && payload.tree.length >= 1) {
        let curNode = curation.contents.root.children.find(n => n.name === payload.tree[0]);
        if (curNode) {
          for (let pos = 1; pos < payload.tree.length; pos++) {
            if (curNode) {
              curNode = curNode.children.find(n => n.name === payload.tree[pos]);
            }
          }
          if (curNode) {
            curNode.expanded = !curNode.expanded;
          }
        }
      }
    },
    setContentTree(state: CurateState, { payload }: PayloadAction<SetContentTreeAction>) {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.contents = payload.contentTree;
      }
    },
    setWarnings(state: CurateState, { payload }: PayloadAction<SetWarningsAction>) {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.warnings = payload.warnings;

        // Always sync after setting warnings, every other modification end up here too!
        window.Shared.back.send(BackIn.CURATE_SYNC_CURATIONS, [{
          ...curation,
          contents: undefined // Don't send contents, unused and huge
        }]);
      }
    },
    replaceCurations(state: CurateState, { payload }: PayloadAction<CurationState[]>) {
      state.curations = payload;
    },
    modifyCurations(state: CurateState, { payload }: PayloadAction<ModifyCurationsAction>) {
      if (payload.removed) {
        for (const removed of payload.removed) {
          const curationIdx = state.curations.findIndex(c => c.folder === removed);
          if (curationIdx > -1) {
            state.curations.splice(curationIdx, 1);

            unselectCuration(state, removed);
          }
        }
      }

      if (payload.added) {
        for (const added of payload.added) {
          const curationIdx = state.curations.findIndex(c => c.folder === added.folder);
          if (curationIdx > -1) {
            // Replace existing
            state.curations[curationIdx] = added;
          } else {
            // Add new
            state.curations.push(added);
          }
        }
      }
    },
    createGroup(state: CurateState, { payload }: PayloadAction<CreateGroupAction>) {
      if (!state.groups.find(g => g.name === payload.name)) {
        state.groups.push({
          name: payload.name,
          icon: payload.icon,
        });
      }

      updatePreferencesData({
        groups: state.groups
      });
    },
    toggleGroupCollapse(state: CurateState, { payload }: PayloadAction<string>) {
      const group = state.groups.find(g => g.name === payload);
      if (group) {
        const collapsedIdx = state.collapsedGroups.findIndex(g => g === group.name);
        if (collapsedIdx > -1) {
          // Uncollapse
          state.collapsedGroups.splice(collapsedIdx, 1);
        } else {
          // Collapse
          state.collapsedGroups.push(group.name);

          // Unselect all games inside
          for (const cur of state.curations.filter(cur => cur.group === group.name)) {
            unselectCuration(state, cur.folder);
          }
        }
      }
    },
    toggleGroupPin(state: CurateState, { payload }: PayloadAction<CurateGroup>) {
      const groupIdx = state.groups.findIndex(g => g.name === payload.name);
      if (groupIdx > -1) {
        state.groups.push(payload);
      } else {
        state.groups.splice(groupIdx, 1);
      }

      updatePreferencesData({
        groups: state.groups
      });
    },
    changeGroup: lockedFunc((state: CurateState, { payload }: PayloadAction<ChangeGroupAction>)=> {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        if (state.selected.includes(curation.folder)) {
          // If it's inside a selection, change the entire selection
          for (const cur of state.curations.filter(c => state.selected.includes(c.folder))) {
            cur.group = payload.group;
          }
        } else {
          // Not inside selection, change single curation group
          curation.group = payload.group;
        }
      }
    }),
    setLock(state: CurateState, { payload }: PayloadAction<SetLockAction>) {
      const curation = state.curations.find(c => c.folder === payload.folder);
      if (curation) {
        curation.locked = payload.locked;
      }
    }
  }
});

function unselectCuration(state: CurateState, folder: string) {
  // Remove from selected array
  const selectedIdx = state.selected.findIndex(s => s === folder);
  if (selectedIdx > -1) {
    state.selected.splice(selectedIdx, 1);
  }

  // Change current to another inside array if possible
  if (state.current === folder) {
    if (state.selected.length > 0) {
      state.current = state.selected[0];
      if (state.lastSelected === folder) {
        state.lastSelected = state.current;
      }
    } else {
      state.current = '';
      if (state.lastSelected === folder) {
        state.lastSelected = '';
      }
    }
  }
}

function lockedFunc<T extends BaseCurateAction>(func: (state: CurateState, action: PayloadAction<T>) => void) {
  return (state: CurateState, action: PayloadAction<T>) => {
    const curation = state.curations.find(curation => curation.folder === action.payload.folder);
    if (curation && !curation.locked) {
      func(state, action);
    }
  };
}

export const { actions: curateActions } = curateSlice;
export const { createCuration,
  deleteCurations,
  importCurations,
  exportCurations,
  exportCurationDataPacks,
  setSelectedCurations,
  setCurrentCurationGroup,
  setCurrentCuration,
  createAddApp,
  removeAddApp,
  editAddApp,
  regenUuid,
  editCurationMeta,
  addTag,
  removeTag,
  setPrimaryPlatform,
  addPlatform,
  removePlatform,
  toggleContentNodeView,
  setContentTree,
  setWarnings,
  replaceCurations,
  modifyCurations,
  createGroup,
  toggleGroupCollapse,
  toggleGroupPin,
  changeGroup,
  setLock } = curateSlice.actions;
export default curateSlice.reducer;
