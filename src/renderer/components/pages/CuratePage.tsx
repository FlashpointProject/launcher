import * as React from 'react';
import { useCallback, useReducer } from 'react';
import { IOldCurationMeta, parseOldCurationMeta } from '../../curate/oldFormat';
import { ReducerAction } from '../../interfaces';
import { SimpleButton } from '../SimpleButton';
import { CurateBox } from '../CurateBox';
import { indexCurationArchive, CurationIndexContent, CurationIndexImage } from '../../curate/indexCuration';
import { uuid } from '../../uuid';
import { deepCopy } from '../../../shared/Util';

export type CuratePageProps = {
};

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const [state, dispatch] = useReducer(curationReducer, curationDefaultState);
  const canEdit = true;
  // Load Curation Archive Callback
  const onLoadCurationArchiveClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialog({
      title: 'Select the curation archive(s) to load',
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['zip'], name: 'Curation archive' }],
    });
    if (filePaths) {
      for (let i = 0; i < filePaths.length; i++) {
        // Read and index the archive
        const curationIndex = await indexCurationArchive(filePaths[i]);
        // Check for errors
        if (curationIndex.errors.length > 0) {
          // @TODO Display errors
        } else {
          // Add curation
          dispatch({
            type: 'add-curation',
            payload: {
              curation: {
                key: uuid(),
                meta: curationIndex.meta,
                content: curationIndex.content,
                thumbnail: curationIndex.thumbnail,
                screenshot: curationIndex.screenshot,
              }
            }
          });
        }
      }
    }
  }, [dispatch]);
  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(() => {
    // Show dialog
    const filePaths = window.External.showOpenDialog({
      title: 'Select the curation folder(s) to load',
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      for (let i = 0; i < filePaths.length; i++) {
        // ...
      }
    }
  }, [dispatch]);
  // Load Meta Callback
  const onLoadMetaClick = useCallback(() => {
    // Show dialog
    const filePaths = window.External.showOpenDialog({
      title: 'Select the curation meta to load',
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['txt'], name: 'Curation meta file' }],
    });
    if (filePaths) {
      // Load all selected files
      for (let i = 0; i < filePaths.length; i++) {
        const filepath = filePaths[i];
        fetch(filepath)
        .then(response => response.text())
        .then((text) => {
          // Parse the file
          const meta = parseOldCurationMeta(text);
          // Add curation
          dispatch({
            type: 'add-curation',
            payload: {
              curation: {
                key: uuid(),
                meta: meta,
                content: [],
                thumbnail: { exists: false },
                screenshot: { exists: false },
              }
            }
          });
        })
        .catch(error => { console.error(error); });
      }
    }
  }, [dispatch]);
  // Render CurateBox
  const curateBoxes = React.useMemo(() => {
    return state.curations.map((curation, index) => (
      <CurateBox
        key={index}
        curation={curation}
        dispatch={dispatch} />
    ));
  }, [state.curations]);
  // Render
  return (
    <div className='curate-page simple-scroll'>
      <div className='curate-page__inner'>
        {/* Load buttons */}
        <div className='curate-page__top'>
          <SimpleButton
            value='Load Archive'
            title='Load one or more Curation archives.'
            onClick={onLoadCurationArchiveClick} />
          <SimpleButton
            value='Load Folder'
            title='Load one or more Curation folders.'
            onClick={onLoadCurationFolderClick} />
          <SimpleButton
            value='Load Meta'
            title='Load one or more Curation meta files.'
            onClick={onLoadMetaClick} />
        </div>
        {/* Curation(s) */}
        { curateBoxes }
      </div>
    </div>
  );
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

const curationDefaultState: CurationsState = {
  /** Currently loaded curations. */
  curations: [],
};

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
