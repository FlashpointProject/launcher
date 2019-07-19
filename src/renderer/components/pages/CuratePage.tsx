import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { SimpleButton } from '../SimpleButton';
import { CurateBox } from '../CurateBox';
import { indexCurationArchive, indexCurationFolder, CurationIndex } from '../../curate/indexCuration';
import { uuid } from '../../uuid';
import { CurationContext, createEditCuration, CurationSource, CurationAction, EditCurationMeta } from '../../context/CurationContext';
import GameManager from '../../game/GameManager';
import { GameImageCollection } from '../../image/GameImageCollection';
import { getSuggestions } from '../../util/suggestions';
import { parseCurationMeta } from '../../curate/parse';
import { getDefaultMetaValues, GameMetaDefaults } from '../../curate/defaultValues';

export type CuratePageProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
};

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const [state, dispatch] = useContext(CurationContext.context);
  // Get default curation game meta values
  const defaultGameMetaValues = useMemo(() => {
    return props.games ? getDefaultMetaValues(props.games.collection.games) : undefined;
  }, [props.games]);
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
        // Add curation index
        setGameMetaDefaults(curationIndex.meta.game, defaultGameMetaValues);
        addCurationIndex(source, curationIndex, dispatch);
      }
    }
  }, [dispatch]);
  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialog({
      title: 'Select the curation folder(s) to load',
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      await Promise.all(
        filePaths.map(source => (
          // Read and index the folder
          indexCurationFolder(source)
          // Add curation index
          .then(curationIndex => {
            setGameMetaDefaults(curationIndex.meta.game, defaultGameMetaValues);
            addCurationIndex(source, curationIndex, dispatch);
          })
        ))
      );
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

async function addCurationIndex(source: string, curation: CurationIndex, dispatch: React.Dispatch<CurationAction>): Promise<void> {
  // Check for errors
  if (curation.errors.length > 0) {
    // @TODO Display errors
  } else {
    // Add curation
    dispatch({
      type: 'add-curation',
      payload: {
        curation: Object.assign(createEditCuration(), {
          key: uuid(),
          source: source,
          sourceType: CurationSource.FOLDER,
          meta: curation.meta.game,
          addApps: curation.meta.addApps.map(meta => ({
            key: uuid(),
            meta: meta,
          })),
          content: curation.content,
          thumbnail: curation.thumbnail,
          screenshot: curation.screenshot,
        })
      }
    });
  }
}

/**
 * Set the default values of a game's meta (if they are missing).
 * @param meta Meta to set values of.
 * @param defaultGameMetaValues Container of default values.
 */
function setGameMetaDefaults(meta: EditCurationMeta, defaultGameMetaValues?: GameMetaDefaults): void {
  if (defaultGameMetaValues) {
    const { defaultAppPaths, defaultPlatform } = defaultGameMetaValues;
    // Set platform
    if (!meta.platform) {
      meta.platform = defaultPlatform;
    }
    // Set application path
    if (!meta.applicationPath) {
      meta.applicationPath = defaultAppPaths[meta.platform || ''] || '';
    }    
  }
}
