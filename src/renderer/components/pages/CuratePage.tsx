import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { LangContainer } from '../../../shared/lang';
import { WithLibraryProps } from '../../containers/withLibrary';
import { createEditCuration, CurationAction, CurationContext, CurationSource, EditCuration, EditCurationMeta } from '../../context/CurationContext';
import { GameMetaDefaults, getDefaultMetaValues } from '../../curate/defaultValues';
import { importCuration } from '../../curate/importCuration';
import { CurationIndex, indexCurationArchive, indexCurationFolder } from '../../curate/indexCuration';
import { parseCurationMeta } from '../../curate/parse';
import GameManager from '../../game/GameManager';
import { GameImageCollection } from '../../image/GameImageCollection';
import { LangContext } from '../../util/lang';
import { getSuggestions } from '../../util/suggestions';
import { uuid } from '../../uuid';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CurateBox } from '../CurateBox';
import { SimpleButton } from '../SimpleButton';

type OwnProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
};

export type CuratePageProps = OwnProps & WithLibraryProps;

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const strings = React.useContext(LangContext);
  const [state, dispatch] = useContext(CurationContext.context);
  // Get default curation game meta values
  const defaultGameMetaValues = useMemo(() => {
    return props.games ? getDefaultMetaValues(props.games.collection.games) : undefined;
  }, [props.games]);
  // Import a curation callback
  const importCurationCallback = useCallback((curation: EditCuration, log?: boolean) => {
    if (!props.games)      { throw new Error('Failed to import curation. "games" is undefined.'); }
    if (!props.gameImages) { throw new Error('Failed to import curation. "gameImages" is undefined.'); }
    return importCuration(curation, props.games, props.gameImages, props.libraryData.libraries, log);
  }, [props.games, props.gameImages, props.libraryData.libraries]);
  // Import All Curations Callback
  const onImportAllClick = useCallback(async () => {
    const { games, gameImages } = props;
    if (games && gameImages && state.curations.length > 0) {
      console.log(`Starting "Import All"... (${state.curations.length} curations)`);
      // Lock all curations
      dispatch({
        type: 'change-curation-lock-all',
        payload: { lock: true },
      });
      // Import all curations, one at a time
      (async () => {
        let success = 0;
        for (let curation of state.curations) {
          // Log status
          console.log(`Importing... (id: ${curation.key})`);
          // Try importing curation
          try {
            // Import curation (and wait for it to complete)
            await importCurationCallback(curation, true);
            // Increment success counter
            success += 1;
            // Log status
            console.log(`Import SUCCESSFUL! (id: ${curation.key})`);
            // Remove the curation
            dispatch({
              type: 'remove-curation',
              payload: { key: curation.key }
            });
          } catch (error) {
            // Log error
            console.log(`Import FAILED! (id: ${curation.key})`, error);
            // Unlock the curation
            dispatch({
              type: 'change-curation-lock',
              payload: {
                key: curation.key,
                lock: false,
              },
            });
          }
        }
        // Log state
        const total = state.curations.length;
        console.log(
          '"Import All" complete\n'+
          `  Total:   ${total}\n`+
          `  Success: ${success} (${100 * (success / total)}%)\n`+
          `  Failed:  ${total - success}`
        );
      })();
    }
  }, [dispatch, state.curations, props.games, props.gameImages]);
  // Load Curation Archive Callback
  const onLoadCurationArchiveClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationArchive,
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
        addCurationIndex(source, curationIndex, CurationSource.ARCHIVE, dispatch);
      }
    }
  }, [dispatch]);
  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationFolder,
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      Promise.all(
        filePaths.map(source => (
          // Read and index the folder
          indexCurationFolder(source)
          // Add curation index
          .then(curationIndex => {
            setGameMetaDefaults(curationIndex.meta.game, defaultGameMetaValues);
            addCurationIndex(source, curationIndex, CurationSource.FOLDER, dispatch);
          })
        ))
      );
    }
  }, [dispatch]);
  // Load Meta Callback
  const onLoadMetaClick = useCallback(() => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationMeta,
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
          // Set default meta values
          setGameMetaDefaults(meta.game, defaultGameMetaValues);
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
    return props.games && getSuggestions(props.games.listPlatforms(), props.libraryData.libraries);
  }, [props.games, props.libraryData.libraries]);
  // Render CurateBox
  const curateBoxes = React.useMemo(() => {
    return state.curations.map((curation, index) => (
      <CurateBox
        key={index}
        curation={curation}
        dispatch={dispatch}
        importCuration={importCurationCallback}
        suggestions={suggestions} />
    ));
  }, [state.curations, props.games, suggestions]);
  // Render
  return React.useMemo(() => (
    <div className='curate-page simple-scroll'>
      <div className='curate-page__inner'>
        {/* Load buttons */}
        <div className='curate-page-top'>
          <div className='curate-page-top__left'>
            <ConfirmElement
              onConfirm={onImportAllClick}
              children={renderImportAllButton}
              extra={strings.curate} />
          </div>
          <div className='curate-page-top__right'>
            <SimpleButton
              value={strings.curate.loadMeta}
              title={strings.curate.loadMetaDesc}
              onClick={onLoadMetaClick} />
            <SimpleButton
              value={strings.curate.loadArchive}
              title={strings.curate.loadArchiveDesc}
              onClick={onLoadCurationArchiveClick} />
            <SimpleButton
              value={strings.curate.loadFolder}
              title={strings.curate.loadFolderDesc}
              onClick={onLoadCurationFolderClick} />
          </div>
        </div>
        {/* Curation(s) */}
        { curateBoxes }
      </div>
    </div>
  ), [curateBoxes, onImportAllClick, onLoadCurationArchiveClick, onLoadCurationFolderClick, onLoadMetaClick]);
}

function renderImportAllButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['curate']>): JSX.Element {
  return (
    <SimpleButton
      className={(activationCounter > 0) ? 'simple-button--red simple-vertical-shake' : ''}
      value={extra.importAll}
      title={extra.importAllDesc}
      onClick={activate}
      onMouseLeave={reset} />
  );
}

/**
 * Dispatch an action that adds a curation.
 * @param source Source path of the curation.
 * @param curation Curation to add.
 * @param sourceType Type of source the curation originates from.
 * @param dispatch Dispatcher to add the curation with.
 */
async function addCurationIndex(
  source: string,
  curation: CurationIndex,
  sourceType: CurationSource,
  dispatch: React.Dispatch<CurationAction>
): Promise<void> {
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
          sourceType: sourceType,
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
 * @param defaults Container of default values.
 */
function setGameMetaDefaults(meta: EditCurationMeta, defaults?: GameMetaDefaults): void {
  if (defaults) {
    // Set default meta values
    if (!meta.language) { meta.language = defaults.language; }
    if (!meta.playMode) { meta.playMode = defaults.playMode; }
    if (!meta.status)   { meta.status   = defaults.status;   }
    if (!meta.platform) { meta.platform = defaults.platform; }
    // Set default application path
    // (Note: This has to be set after the default platform)
    if (!meta.applicationPath) {
      meta.applicationPath = defaults.addPaths[meta.platform || ''] || '';
    }
  }
}
