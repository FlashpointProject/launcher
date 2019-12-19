
import { createContextReducer } from '../context-reducer/contextReducer';
import { ReducerAction } from '../context-reducer/interfaces';
import { uuid } from '../util/uuid';

export type ProgressData = {
  /* Key identifier */
  key: string;
  /* Items counted */
  itemCount: number;
  /* Total items to count */
  totalItems: number;
  /* Percent done */
  percentDone: number;
  /* Whether to use percentDone (info for progress components) */
  usePercentDone: boolean;
  /* If bar is finished (now invisible) */
  isDone: boolean;
  /* Text to display (primary) */
  text?: string;
  /* Text to display (secondary) */
  secondaryText?: string;
}

export type ProgressAction = (
  ReducerAction<'set-percent-done', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
    /** Percent done to set */
    percentDone: number;
  }> |
  ReducerAction<'set-use-percent-done', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
    /** Percent done to set */
    usePercentDone: boolean;
  }> |
  ReducerAction<'set-text', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
    /** Percent done to set */
    text: string;
  }> |
  ReducerAction<'set-secondary-text', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
    /** Percent done to set */
    secondaryText: string;
  }> |
  ReducerAction<'set-total-items', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
    /** Percent done to set */
    totalItems: number;
  }> |
  ReducerAction<'count-item', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
  }> |
  ReducerAction<'finished', {
    /** Identifier for parent component */
    parentKey: string;
    /** Key progress data to modify. */
    key: string;
  }>
);

// Empty Record
const defaultProgressState = {};

/** Stores the progress data of various components. */
export const ProgressContext = createContextReducer(
  progressReducer,
  defaultProgressState
);

/** Reducer for the progress state. */
function progressReducer(prevState: Record<string, (ProgressData[]|undefined)>, action: ProgressAction) {
  // Things to keep in mind when writing an action handler:
  // * Don't mutate the previous state or the action object.
  // * Objects/Arrays that have at least one property/element change value should be copied, so that
  //   their reference is different after reducing (this way it is cheap to check which objects/arrays
  //   changed). This should be applied "recursively" so you can trace all the changed values from the
  //   root state object.
  switch (action.type) {
    // Set Percent Done
    case 'set-percent-done': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      newParent[index].percentDone = action.payload.percentDone;
      newState[parentKey] = newParent;
      return newState;
    }
    // Set suggestion for whether rendering should use percent done
    case 'set-use-percent-done': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      newParent[index].usePercentDone = action.payload.usePercentDone;
      newState[parentKey] = newParent;
      return newState;
    }
    // Set primary text
    case 'set-text': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      newParent[index].text = action.payload.text;
      newState[parentKey] = newParent;
      return newState;
    }
    // Set secondary text
    case 'set-secondary-text': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      newParent[index].secondaryText = action.payload.secondaryText;
      newState[parentKey] = newParent;
      return newState;
    }
    // Set total items
    case 'set-total-items': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      newParent[index].totalItems = action.payload.totalItems;
      newState[parentKey] = newParent;
      return newState;
    }
    // Count an item and update Percent Done
    case 'count-item': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = ensureProgressIndex(newParent, key);
      const newItemCount = newParent[index].itemCount += 1;
      const newPercentDone = Math.min((newItemCount / newParent[index].totalItems) * 100, 100);
      newParent[index].itemCount = newItemCount;
      newParent[index].percentDone = newPercentDone;
      newState[parentKey] = newParent;
      return newState;
    }
    // Mark progress as finished by removing it
    case 'finished': {
      const { parentKey, key } = action.payload;
      const newState = { ...prevState };
      const newParent = ensureParent(newState, parentKey);
      const index = newParent.findIndex(data => data ? data.key === key : false);
      if (index >= 0) { newParent.splice(index, 1); }
      newState[parentKey] = newParent;
      return newState;
    }
    default:
      throw Error('ProgressAction sent had an invalid type.');
  }
}

/**
 * Returns the ProgressData of a parent (initalizes it if necessary)
 * @param state Mutable ProgressState
 * @param key Parent's Key
 */
function ensureParent(state: Record<string, (ProgressData[]|undefined)>, parentKey: string): ProgressData[] {
  const parent = state[parentKey];
  if (parent) { return [ ...parent ]; }
  else {
    const parent: ProgressData[] = [];
    state[parentKey] = parent;
    return parent;
  }
}

/**
 * Returns the index to the unique ProgressData inside a parent's ProgressData array
 * @param state State of a parent's ProgressData ( state[parentKey] )
 * @param key Unique progress key
 */
function ensureProgressIndex(state: ProgressData[], key: string): number {
  // Return ProgressData for key if exists
  const index = state.findIndex(data => data ? data.key === key : false);
  if (index >= 0) {
    return index;
  } else {
    // Create new data, return index (new length - 1)
    return state.push({
      key: key,
      itemCount: 0,
      totalItems: 0,
      percentDone: 0,
      usePercentDone: true,
      isDone: false
    }) - 1;
  }
}

/**
 * Return a new ProgressHandle to be given out to other functions
 * @param parentKey Identifier of parent (page, component etc)
 * @param dispatch Dispatcher to ProgressContext
 * @returns Handle containing all data necessary to dispatch ProgressAction's
 */
export function newProgress(parentKey: string, dispatch: React.Dispatch<ProgressAction>): ProgressHandle {
  return {
    parentKey: parentKey,
    key: uuid(),
    dispatch: dispatch
  };
}

/** Passed around to allow recording progress */
export type ProgressHandle = {
  parentKey: string;
  key: string;
  dispatch: React.Dispatch<ProgressAction>;
}


/* Util functions for dispatching Progress Actions given a Progress Handle */
export class ProgressDispatch {
  public static setPercentDone = (handle: ProgressHandle, percentDone: number) => {
    handle.dispatch({
      type: 'set-percent-done',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key,
        percentDone: percentDone
      }
    });
  }

  public static setUsePercentDone = (handle: ProgressHandle, usePercentDone: boolean) => {
    handle.dispatch({
      type: 'set-use-percent-done',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key,
        usePercentDone: usePercentDone
      }
    });
  }

  public static setText = (handle: ProgressHandle, text: string) => {
    handle.dispatch({
      type: 'set-text',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key,
        text: text
      }
    });
  }

  public static setSecondaryText = (handle: ProgressHandle, text: string) => {
    handle.dispatch({
      type: 'set-secondary-text',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key,
        secondaryText: text
      }
    });
  }

  public static setTotalItems = (handle: ProgressHandle, totalItems: number) => {
    handle.dispatch({
      type: 'set-total-items',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key,
        totalItems: totalItems
      }
    });
  }

  public static countItem = (handle: ProgressHandle) => {
    handle.dispatch({
      type: 'count-item',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key
      }
    });
  }

  public static finished = (handle: ProgressHandle) => {
    handle.dispatch({
      type: 'finished',
      payload: {
        parentKey: handle.parentKey,
        key: handle.key
      }
    });
  }
}