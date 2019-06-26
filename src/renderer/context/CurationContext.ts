import { ReducerAction } from '../context-reducer/interfaces';
import { deepCopy } from '../../shared/Util';
import { IOldCurationMeta } from '../curate/oldFormat';
import { CurationIndexContent, CurationIndexImage } from '../curate/indexCuration';
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

function curationReducer(prevState: CurationsState, action: CurationAction): CurationsState {
  switch (action.type) {
    default: throw new Error(`Invalid or not-yet-supported action type (type: "${(action as any).type}").`);
    // Add curation
    case 'add-curation':
      return { ...prevState, curations: [ ...prevState.curations, action.payload.curation ] };
    // Remove curation
    case 'remove-curation':
      var nextCurations = [ ...prevState.curations ];
      var index = action.payload.index;
      if (index >= 0 && index < nextCurations.length) {
        nextCurations.splice(action.payload.index, 1);
      }
      return { ...prevState, curations: nextCurations };
    // Edit curation's meta
    case 'edit-curation-meta':
      var nextCurations = [ ...prevState.curations ];
      var index = prevState.curations.findIndex(c => c.key === action.payload.key);
      if (index >= 0 && index < prevState.curations.length) {
        const prevCuration = prevState.curations[index];
        const curation = deepCopy(prevCuration);
        curation.meta[action.payload.property] = action.payload.value;
        nextCurations[index] = curation;
      }
      return { ...prevState, curations: nextCurations };
  }
}

type CurationsState = {
  curations: EditCuration[];
};

export type CurationAction = (
  /** Add a curation object. */
  ReducerAction<'add-curation', {
    curation: EditCuration,
  }> |
  /** Remove a curation object. */
  ReducerAction<'remove-curation', {
    /** Index of the curation object. */
    index: number;
  }> |
  /** Edit the value of a curation's meta's property. */
  ReducerAction<'edit-curation-meta', {
    /** Key of the curation to change. */
    key: string;
    /** Name of the property to change. */
    property: keyof IOldCurationMeta;
    /** Value to set the proeprty to. */
    value: IOldCurationMeta[keyof IOldCurationMeta];
  }>
);

/** Data of a curation in the curation importer. */
export type EditCuration = {
  /** Unique key of the curation (UUIDv4). Generated when loaded. */
  key: string;
  /** Meta data of the curation. */
  meta: IOldCurationMeta;
  /** Data of each file in the content folder (and sub-folderss). */
  content: CurationIndexContent[];
  /** Screenshot. */
  screenshot: CurationIndexImage;
  /** Thumbnail. */
  thumbnail: CurationIndexImage;
};
