import { GameMetaDefaults } from '@shared/curate/defaultValues';
import { generateExtrasAddApp, generateMessageAddApp, ParsedCurationMeta } from '@shared/curate/parse';
import { CurationIndexImage, EditAddAppCurationMeta, EditCuration, EditCurationMeta, IndexedContent } from '@shared/curate/types';
import { createContextReducer } from '../context-reducer/contextReducer';
import { ReducerAction } from '../context-reducer/interfaces';
import { createCurationIndexImage } from '../curate/importCuration';
import { uuid } from '@shared/utils/uuid';

const curationDefaultState: CurationsState = {
  defaultMetaData: undefined,
  curations: [],
};

/** Stores the currently loaded curations of the curate page. */
export const CurationContext = createContextReducer(
  curationReducer,
  curationDefaultState
);

/** Reducer for the curation state. */
function curationReducer(prevState: CurationsState, action: CurationAction): CurationsState {
  // Things to keep in mind when writing an action handler:
  // * Don't mutate the previous state or the action object.
  // * Objects/Arrays that have at least one property/element change value should be copied, so that
  //   their reference is different after reducing (this way it is cheap to check which objects/arrays
  //   changed). This should be applied "recursively" so you can trace all the changed values from the
  //   root state object.
  switch (action.type) {
    default: throw new Error(`Invalid or not-yet-supported action type (type: "${(action as any).type}").`);
    // Remove curation
    case 'remove-curation': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index !== -1) {
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
        // Mark curation for deletion
        nextCuration.delete = true;
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    case 'mark-deleted': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index !== -1) {
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
        // Mark curation for deletion
        nextCuration.deleted = true;
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Set the metadata for a curation
    case 'set-curation-meta': {
      const nextCurations = [ ...prevState.curations ];
      const index = ensureCurationIndex(nextCurations, action.payload.key);
      const prevCuration = nextCurations[index];
      const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
      const parsedMeta = action.payload.parsedMeta;
      nextCuration.meta = parsedMeta.game;
      nextCuration.addApps = [];
      for (let i = 0; i < parsedMeta.addApps.length; i++) {
        const meta = parsedMeta.addApps[i];
        nextCuration.addApps.push({
          key: uuid(),
          meta: meta,
        });
      }
      nextCurations[index] = nextCuration;
      return { ...prevState, curations: nextCurations };
    }
    // Set a new image for a curation
    case 'set-curation-logo': {
      const nextCurations = [ ...prevState.curations ];
      const index = ensureCurationIndex(nextCurations, action.payload.key);
      const prevCuration = nextCurations[index];
      const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
      nextCuration.thumbnail = action.payload.image;
      nextCuration.thumbnail.version = prevCuration.thumbnail.version + 1;
      nextCurations[index] = nextCuration;
      return { ...prevState, curations: nextCurations };
    }
    // Set a new image for a curation
    case 'set-curation-screenshot': {
      const nextCurations = [ ...prevState.curations ];
      const index = ensureCurationIndex(nextCurations, action.payload.key);
      const prevCuration = nextCurations[index];
      const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
      nextCuration.screenshot = action.payload.image;
      nextCuration.screenshot.version = prevCuration.screenshot.version + 1;
      nextCurations[index] = nextCuration;
      return { ...prevState, curations: nextCurations };
    }
    // Index a curations content folder
    case 'set-curation-content': {
      const nextCurations = [ ...prevState.curations ];
      const index = ensureCurationIndex(nextCurations, action.payload.key);
      const prevCuration = nextCurations[index];
      const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
      nextCuration.content = action.payload.content;
      nextCurations[index] = nextCuration;
      return { ...prevState, curations: nextCurations };
    }
    // Add an empty additional application to a curation
    case 'new-addapp': {
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        // Copy the previous curation (and the nested addApps array)
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
        switch (action.payload.type) {
          case 'normal':
            nextCuration.addApps.push({
              key: uuid(),
              meta: {}
            });
            break;
          case 'extras':
            nextCuration.addApps.push({
              key: uuid(),
              meta: generateExtrasAddApp('')
            });
            break;
          case 'message':
            nextCuration.addApps.push({
              key: uuid(),
              meta: generateMessageAddApp('')
            });
            break;
        }
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Remove an additional application from a curation
    case 'remove-addapp': {
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.curationKey);
      if (index >= 0) {
        // Copy the previous curation (and the nested addApps array)
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
        const addAppIndex = nextCuration.addApps.findIndex(c => c.key === action.payload.key);
        if (addAppIndex >= 0) {
          nextCuration.addApps.splice(addAppIndex, 1);
        }
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Edit curation's meta
    case 'edit-curation-meta': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        // Copy the previous curation (and the nested meta object)
        const prevCuration = nextCurations[index];
        const nextCuration: any = { ...prevCuration, meta: { ...prevCuration.meta } };
        // Replace the value (in the copied meta)
        nextCuration.meta[action.payload.property] = action.payload.value;
        // Replace the previous curation with the new (in the copied array)
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Edit additional application's meta
    case 'edit-addapp-meta': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ]; // (New curations array to replace the current)
      const index = nextCurations.findIndex(c => c.key === action.payload.curationKey);
      if (index >= 0) {
        // Copy the previous curation (and the nested addApps array)
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration, addApps: [ ...prevCuration.addApps ] };
        // Find the additional application
        const addAppIndex = prevCuration.addApps.findIndex(c => c.key === action.payload.key);
        if (addAppIndex >= 0) {
          const prevAddApp = prevCuration.addApps[addAppIndex];
          const nextAddApp = { ...prevAddApp };
          // Replace the value (in the copied meta)
          nextAddApp.meta[action.payload.property] = action.payload.value;
          // Replace the previous additional application with the new (in the copied array)
          nextCuration.addApps[addAppIndex] = nextAddApp;
        }
        // Replace the previous curation with the new (in the copied array)
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Sorts all curations A-Z
    case 'sort-curations': {
      const newCurations = [...prevState.curations].sort((a, b) => {
        if (a.meta.title) {
          if (b.meta.title) {
            return a.meta.title.localeCompare(b.meta.title);
          }
          return 1;
        }
        return -1;
      });
      return { ...prevState, curations: newCurations };
    }
    // Change the lock status of a curation
    case 'change-curation-lock': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ]; // (New curations array to replace the current)
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        // Copy the previous curation
        const prevCuration = nextCurations[index];
        const nextCuration = { ...prevCuration };
        // Replace the locked value
        nextCuration.locked = action.payload.lock;
        // Replace the previous curation with the new (in the copied array)
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Check the lock status of all curations
    case 'change-curation-lock-all': {
      // Replace the "curations" array and all the curation objects in it
      // and set the "locked" value of all the curation objects
      return {
        ...prevState,
        curations: prevState.curations.map(curation => ({
          ...curation,
          locked: action.payload.lock,
        })),
      };
    }
    // Load a full curation
    case 'load-curation': {
      const nextCurations = [ ...prevState.curations ];
      const index = ensureCurationIndex(nextCurations, action.payload.curation.key);
      nextCurations[index] = action.payload.curation;
      return { ...prevState, curations: nextCurations };
    }
  }
}

/** Ensure a curation exists in the state
 * @param curations Mutable CurationState
 * @param key Unique curation key to find
 * @returns Index of the curation inside the CurationState
 */
function ensureCurationIndex(curations: EditCuration[], key: string): number {
  const index = curations.findIndex(c => c.key === key);
  if (index === -1) {
    return curations.push(createEditCuration(key)) - 1;
  }
  return index;
}

/** Create an "empty" edit curation. */
export function createEditCuration(key: string): EditCuration {
  return {
    key: key,
    meta: {},
    content: [],
    addApps: [],
    thumbnail: createCurationIndexImage(),
    screenshot: createCurationIndexImage(),
    locked: false,
    delete: false,
    deleted: false,
  };
}

/** State of the current curations. */
export type CurationsState = {
  /** Default metadata for new curations */
  defaultMetaData?: GameMetaDefaults;
  /** Currently loaded curations. */
  curations: EditCuration[];
};

/** Combined type with all actions for the curation reducer. */
export type CurationAction = (
  /** Remove a curation by key. */
  ReducerAction<'remove-curation', {
    /** Key of the curation to remove. */
    key: string;
  }> |
  /** Mark curation as fully deleted */
  ReducerAction<'mark-deleted', {
    /**  ofKey the curation to remove. */
    key: string;
  }> |
  /** Set the new metadata for a curation */
  ReducerAction<'set-curation-meta', {
    key: string;
    parsedMeta: ParsedCurationMeta;
  }> |
  /** Set a new image for a curation */
  ReducerAction<'set-curation-logo' | 'set-curation-screenshot', {
    key: string;
    image: CurationIndexImage;
  }> |
  /** Index a curations content folder */
  ReducerAction<'set-curation-content', {
    key: string;
    content: IndexedContent[];
  }> |
  /** Add an empty additional application to curation */
  ReducerAction<'new-addapp', {
    key: string;
    type: 'normal' | 'extras' | 'message';
  }> |
  /** Remove an additional application (by key) from a curation */
  ReducerAction<'remove-addapp', {
    curationKey: string;
    key: string;
  }> |
  /** Edit the value of a curation's meta's property. */
  ReducerAction<'edit-curation-meta', {
    /** Key of the curation to change. */
    key: string;
    /** Name of the property to change. */
    property: keyof EditCurationMeta;
    /** Value to set the property to. */
    value: EditCurationMeta[keyof EditCurationMeta];
  }> |
  /** Edit the value of an additional application's meta's property. */
  ReducerAction<'edit-addapp-meta', {
    /** Key of the curation the additional application belongs to. */
    curationKey: string;
    /** Key of the additional application to change. */
    key: string;
    /** Name of the property to change. */
    property: keyof EditAddAppCurationMeta;
    /** Value to set the property to. */
    value: EditAddAppCurationMeta[keyof EditAddAppCurationMeta];
  }> |
  /** Sort Curations A-Z */
  ReducerAction<'sort-curations', {}> |
  /** Change the lock status of a curation. */
  ReducerAction<'change-curation-lock', {
    /** Key of the curation to change the lock status of. */
    key: string;
    /** Lock status to set the curation to. */
    lock: boolean;
  }> |
  /** Change the lock status of all curations. */
  ReducerAction<'change-curation-lock-all', {
    /** Lock status to set all curations to. */
    lock: boolean;
  }> |
  /** Load a full curation */
  ReducerAction<'load-curation', {
    curation: EditCuration;
  }>
);

/** Types of sources for a loaded curation. */
export enum CurationSource {
  /** No source (or not yet decided). */
  NONE,
  /** Archive (zip file). */
  ARCHIVE,
  /** Folder. */
  FOLDER,
}
