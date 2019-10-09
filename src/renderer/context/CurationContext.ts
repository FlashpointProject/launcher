import { createContextReducer } from '../context-reducer/contextReducer';
import { ReducerAction } from '../context-reducer/interfaces';
import { GameMetaDefaults } from '../curate/defaultValues';
import { launchCuration } from '../curate/importCuration';
import { createCurationIndexImage, CurationIndexContent, CurationIndexImage } from '../curate/indexCuration';
import { removeCurationFile, updateCurationFile } from '../curate/util';

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
    // Add curation
    case 'add-curation':
      return { ...prevState, curations: [ ...prevState.curations, action.payload.curation ] };
    // Remove curation
    case 'remove-curation': {
      // Find the curation
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        // Remove it from the (copied) array
        nextCurations.splice(index, 1);
      }
      return { ...prevState, curations: nextCurations };
    }
    // Remove a curations file
    case 'remove-curation-file': {
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        let nextCuration = nextCurations[index];
        nextCurations[index] = removeCurationFile(action.payload.file, nextCuration);
      }
      return { ...prevState, curations: nextCurations };
    }
    // Update a curations file
    case 'update-curation-file': {
      const nextCurations = [ ...prevState.curations ];
      const index = nextCurations.findIndex(c => c.key === action.payload.key);
      if (index >= 0) {
        let nextCuration = nextCurations[index];
        nextCurations[index] = updateCurationFile(action.payload.file, nextCuration, prevState.defaultMetaData);
      } else {
        // Not imported yet, do here
        const newCuration = createEditCuration();
        newCuration.key = action.payload.key;
        updateCurationFile(action.payload.file, newCuration,  prevState.defaultMetaData);
        nextCurations.push(newCuration);
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
        const nextCuration = { ...prevCuration, meta: { ...prevCuration.meta } };
        // Replace the value (in the copied meta)
        nextCuration.meta[action.payload.property] = action.payload.value;
        // Replace the previous curation with the new (in the copied array)
        nextCurations[index] = nextCuration;
      }
      return { ...prevState, curations: nextCurations };
    }
    // Set default metadata for new curations
    case 'set-default-meta': {
      return {...prevState, defaultMetaData: action.payload.defaultMeta};
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
    // Run a curation
    case 'run-curation': {
      const curation = prevState.curations.find((item) => item.key === action.payload.key);
      if (curation) {
        launchCuration(curation);
      }
      return { ...prevState };
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
  }
}

/** Create an "empty" edit curation. */
export function createEditCuration(): EditCuration {
  return {
    key: '',
    meta: {},
    content: [],
    addApps: [],
    thumbnail: createCurationIndexImage(),
    screenshot: createCurationIndexImage(),
    locked: false,
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
  /** Add a curation object. */
  ReducerAction<'add-curation', {
    curation: EditCuration,
  }> |
  /** Remove a curation object. */
  ReducerAction<'remove-curation', {
    /** Key of the curation to remove. */
    key: string;
  }> |
  /** Remove a file from a curation */
  ReducerAction<'remove-curation-file', {
    key: string;
    file: string;
  }> |
  /** Update a file for a curation */
  ReducerAction<'update-curation-file', {
    key: string;
    file: string;
  }> |
  /** Set the default metadata for new curations */
  ReducerAction<'set-default-meta', {
    defaultMeta: GameMetaDefaults;
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
  ReducerAction<'run-curation', {
    key: string;
  }> |
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
  }>
);

/** Data of a curation in the curation importer. */
export type EditCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Meta data of the curation. */
  meta: EditCurationMeta;
  /** Keys of additional applications that belong to this game. */
  addApps: EditAddAppCuration[];
  /** Data of each file in the content folder (and sub-folders). */
  content: CurationIndexContent[];
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
  /** If the curation and its additional applications are locked (and can not be edited). */
  locked: boolean;
};

/** Meta data of a curation. */
export type EditCurationMeta = {
  // Game fields
  title?: string;
  series?: string;
  developer?: string;
  publisher?: string;
  status?: string;
  extreme?: string;
  genre?: string;
  source?: string;
  launchCommand?: string;
  notes?: string;
  authorNotes?: string;
  platform?: string;
  applicationPath?: string;
  playMode?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
}

/** Data of an additional application curation in the curation importer. */
export type EditAddAppCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Meta data of the curation. */
  meta: EditAddAppCurationMeta;
};

/** Meta data of an additional application curation. */
export type EditAddAppCurationMeta = {
  heading?: string;
  applicationPath?: string;
  launchCommand?: string;
};

/** Types of sources for a loaded curation. */
export enum CurationSource {
  /** No source (or not yet decided). */
  NONE,
  /** Archive (zip file). */
  ARCHIVE,
  /** Folder. */
  FOLDER,
}
