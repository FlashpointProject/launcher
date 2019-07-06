import { ReducerAction } from '../context-reducer/interfaces';
import { IOldCurationMeta } from '../curate/oldFormat';
import { CurationIndexContent, CurationIndexImage, createCurationIndexImage } from '../curate/indexCuration';
import { createContextReducer } from '../context-reducer/contextReducer';

const curationDefaultState: CurationsState = {
  /** Currently loaded curations. */
  curations: [],
};

/** Stores the currently loaded curations of the curate page. */
export const CurationContext = createContextReducer(
  curationReducer,
  curationDefaultState
);

/** Reducer for the curation state. */
function curationReducer(prevState: CurationsState, action: CurationAction): CurationsState {
  // Note: For performance reasons this will only (shallow) copy the objects that are edited
  //       and all the "parent" objects recursively up to the top state object.
  //       This makes the code ugly and hard to read, but just deep copying and replacing the objects
  //       is way to slow (and could case components to re-render for no good reason).
  switch (action.type) {
    default: throw new Error(`Invalid or not-yet-supported action type (type: "${(action as any).type}").`);
    // Add curation
    case 'add-curation':
      return { ...prevState, curations: [ ...prevState.curations, action.payload.curation ] };
    // Remove curation
    case 'remove-curation':
      var nextCurations = [ ...prevState.curations ];
      var index = prevState.curations.findIndex(c => c.key === action.payload.key);
      if (index >= 0 && index < nextCurations.length) {
        nextCurations.splice(index, 1);
      }
      return { ...prevState, curations: nextCurations };
    // Edit curation's meta
    case 'edit-curation-meta':
      var nextCurations = [ ...prevState.curations ];
      var index = prevState.curations.findIndex(c => c.key === action.payload.key);
      if (index >= 0 && index < prevState.curations.length) {
        const prevCuration = prevState.curations[index];
        const curation = { ...prevCuration, meta: { ...prevCuration.meta } };
        curation.meta[action.payload.property] = action.payload.value;
        nextCurations[index] = curation;
      }
      return { ...prevState, curations: nextCurations };
  }
}

/** Create an "empty" edit curation. */
export function createEditCuration(): EditCuration {
  return {
    key: '',
    source: '',
    meta: {},
    moreData: {
      platform: '',
      applicationPath: '',
    },
    content: [],
    thumbnail: createCurationIndexImage(),
    screenshot: createCurationIndexImage(),
  };
}

/** State of the current curations. */
type CurationsState = {
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
  /** Edit the value of a curation's meta's property. */
  ReducerAction<'edit-curation-meta', {
    /** Key of the curation to change. */
    key: string;
    /** Name of the property to change. */
    property: keyof IOldCurationMeta;
    /** Value to set the property to. */
    value: IOldCurationMeta[keyof IOldCurationMeta];
  }>
);

/** Data of a curation in the curation importer. */
export type EditCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Path of the folder or archive file the curation was loaded from. */
  source: string;
  /** Meta data of the curation. */
  meta: IOldCurationMeta;
  /** Data used for the game that is not from the meta. */
  moreData: EditCurationMoreData;
  /** Data of each file in the content folder (and sub-folders). */
  content: CurationIndexContent[];
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
};

/** Additional data of a curation in the curation importer. */
export type EditCurationMoreData = {
  /** Platform of the imported curation. */
  platform: string;
  /** Application path of the imported curation. */
  applicationPath: string;
}
