import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { SimpleButton } from '../SimpleButton';
import { CurateBox } from '../CurateBox';
import { indexCurationArchive } from '../../curate/indexCuration';
import { uuid } from '../../uuid';
import { CurationContext, createEditCuration } from '../../context/CurationContext';
import GameManager from '../../game/GameManager';
import { GameImageCollection } from '../../image/GameImageCollection';
import { getSuggestions } from '../../util/suggestions';
import { parseCurationMeta } from '../../curate/parse';

export type CuratePageProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
};

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const [state, dispatch] = useContext(CurationContext.context);
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
        const source = filePaths[i];
        // Read and index the archive
        const curationIndex = await indexCurationArchive(source);
        // Check for errors
        if (curationIndex.errors.length > 0) {
          // @TODO Display errors
        } else {
          // Add curation
          dispatch({
            type: 'add-curation',
            payload: {
              curation: Object.assign(createEditCuration(), {
                key: uuid(),
                source: source,
                meta: curationIndex.meta.game,
                addApps: curationIndex.meta.addApps.map(meta => ({
                  key: uuid(),
                  meta: meta,
                })),
                content: curationIndex.content,
                thumbnail: curationIndex.thumbnail,
                screenshot: curationIndex.screenshot,
              })
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
          const meta = parseCurationMeta(text);
          // Add curation
          dispatch({
            type: 'add-curation',
            payload: {
              curation: {
                ...createEditCuration(),
                key: uuid(),
                source: filepath,
                meta: meta.game,
                addApps: meta.addApps.map(meta => ({
                  key: uuid(),
                  meta: meta,
                })),
              }
            }
          });
        })
        .catch(error => { console.error(error); });
      }
    }
  }, [dispatch]);
  // Game property suggestions
  const suggestions = useMemo(() => {
    return props.games && getSuggestions(props.games.collection);
  }, [props.games]);
  // Render CurateBox
  const curateBoxes = React.useMemo(() => {
    return state.curations.map((curation, index) => (
      <CurateBox
        key={index}
        curation={curation}
        dispatch={dispatch}
        games={props.games}
        gameImages={props.gameImages}
        suggestions={suggestions} />
    ));
  }, [state.curations, props.games, suggestions]);
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
          {/* <SimpleButton
            value='Load Folder'
            title='Load one or more Curation folders.'
            onClick={onLoadCurationFolderClick} /> */}
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
