import * as chokidar from 'chokidar';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import { CurateLang } from '../../../shared/lang/types';
import { CurationContext, EditCurationMeta } from '../../context/CurationContext';
import { GameMetaDefaults, getDefaultMetaValues } from '../../curate/defaultValues';
import { stringifyCurationFormat } from '../../curate/format/stringifier';
import { importCuration } from '../../curate/importCuration';
import { createCurationIndexImage, importCurationArchive, importCurationFolder, importCurationMeta, indexContentFolder } from '../../curate/indexCuration';
import { convertEditToCurationMeta } from '../../curate/metaToMeta';
import { createCurationImage, getContentFolderByKey, getCurationFolder, readCurationMeta } from '../../curate/util';
import GameManager from '../../game/GameManager';
import { GameImageCollection } from '../../image/GameImageCollection';
import { LangContext } from '../../util/lang';
import { getSuggestions } from '../../util/suggestions';
import { uuid } from '../../uuid';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CurateBox } from '../CurateBox';
import { SimpleButton } from '../SimpleButton';

export type CuratePageProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
};

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const strings = React.useContext(LangContext);
  const [state, dispatch] = useContext(CurationContext.context);
  const [indexedCurations, setIndexedCurations] = React.useState<string[]>([]);
  const localState = useMemo(() => { return { state: state }; }, []);
  // Get default curation game meta values
  const defaultGameMetaValues = useMemo(() => {
    return props.games ? getDefaultMetaValues(props.games.collection.games) : undefined;
  }, [props.games]);

  // Fires on mount
  React.useEffect(() => {
    // indexedCurations is wiped on unmount - Mark any curations with content as indexed already
    for (let curation of state.curations) {
      if (curation.content.length > 0) {
        indexedCurations.push(curation.key);
      }
    }
    setIndexedCurations(indexedCurations);
  }, []);

  // Callback for removed dir (watcher)
  const removeCurationDir = useCallback(async (fullPath) => {
    const curationsPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
    const relativePath = path.relative(curationsPath, fullPath);
    const splitPath = relativePath.split(path.sep);
    // Only 1 dir in relative path, must be curation dir
    if (splitPath.length === 1) {
      dispatch({
        type: 'remove-curation',
        payload: {
          key: path.dirname(fullPath)
        }
      });
    }
  }, [dispatch]);

  // Callback for removed file (watcher)
  const removeCurationFile = useCallback(async (fullPath) => {
    const curationsPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
    const relativePath = path.relative(curationsPath, fullPath);
    const splitPath = relativePath.split(path.sep);
    // Only read files inside curation folders
    if (splitPath.length > 1) {
      const key = splitPath.shift();
      const filePath = path.join(splitPath.join(path.sep));
      if (key) {
        if (filePath === 'logo.png') {
          dispatch({
            type: 'set-curation-logo',
            payload: {
              key: key,
              image: createCurationIndexImage()
            }
          });
        } else if (filePath === 'ss.png') {
          dispatch({
            type: 'set-curation-screenshot',
            payload: {
              key: key,
              image: createCurationIndexImage()
            }
          });
        }
      }
    }
  }, [dispatch]);

  // Callback for added/changed file/dir (watcher)
  const updateCurationFile = useCallback(async (fullPath) => {
    const curationsPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
    const relativePath = path.relative(curationsPath, fullPath);
    const splitPath = relativePath.split(path.sep);
    // Files inside curation folders
    if (splitPath.length > 1) {
      const key = splitPath.shift();
      const filePath = path.join(splitPath.join(path.sep));
      if (key) {
        // Send update based on filename
        switch (filePath) {
          case 'meta.txt':
            const parsedMeta = readCurationMeta(fullPath, defaultGameMetaValues);
            dispatch({
              type: 'set-curation-meta',
              payload: {
                key: key,
                parsedMeta: parsedMeta
              }
            });
            break;
          case 'logo.png':
            dispatch({
              type: 'set-curation-logo',
              payload: {
                key: key,
                image: await createCurationImage(fullPath)
              }
            });
            break;
          case 'ss.png':
            dispatch({
              type: 'set-curation-screenshot',
              payload: {
                key: key,
                image: await createCurationImage(fullPath)
              }
            });
            break;
        }
      }
    }
  }, [dispatch, localState, defaultGameMetaValues]);

  // Start a watcher for the 'Curations' folder to montior curations (meta + images)
  const watcher = useMemo(() => {
    const curationsPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
    fs.ensureDirSync(curationsPath);
    return chokidar.watch(curationsPath, {
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      },
      depth: 1
    })
    .on('change', (fullPath) => {
      updateCurationFile(fullPath);
    })
    .on('add', (fullPath) => {
      updateCurationFile(fullPath);
    })
    .on('unlink', (fullPath) => {
      removeCurationFile(fullPath);
    })
    .on('unlinkDir', (fullPath) => {
      removeCurationDir(fullPath);
    })
    .on('error', (error) => {
      // Discard watcher errors - Throws useless lstat errors when watching already unlinked files?
    });
  }, [dispatch]);

  // Called whenever the state changes
  React.useEffect(() => {
    localState.state = state;
    // Process any unindexed curations
    for (let curation of state.curations) {
      if (indexedCurations.findIndex(i => i === curation.key) === -1) {
        indexedCurations.push(curation.key);
        indexContentFolder(getContentFolderByKey(curation.key))
        .then((content) => {
          dispatch({
            type: 'set-curation-content',
            payload: {
              key: curation.key,
              content: content
            }
          });
        });
      }
    }
    setIndexedCurations(indexedCurations);
  }, [dispatch, state, setIndexedCurations]);

  // Save and clean up on unmount (page changed, window closing)
  React.useEffect(() => {
    return () => {
      // Stop watcher to release locks
      watcher.close();
      const state = localState.state;
      for (let curation of state.curations) {
        const metaPath = path.join(getCurationFolder(curation), 'meta.txt');
        const meta = stringifyCurationFormat(convertEditToCurationMeta(curation.meta, curation.addApps));
        fs.writeFileSync(metaPath, meta);
      }
      // Cleanup unused curation folders
      const curationsPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
      if (fs.pathExistsSync(curationsPath)) {
        fs.readdirSync(curationsPath).map((file) => {
          const fullPath = path.join(curationsPath, file);
          if (fs.lstatSync(fullPath).isDirectory()) {
            if (state.curations.findIndex((item) => item.key === file) === -1) {
              fs.removeSync(fullPath);
            }
          }
        });
      }
     };
  }, []);

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
            await importCuration(curation, games, gameImages, true);
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
            // Log errorA
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

  // Make a new curation (folder watcher does most of the work)
  const onNewCurationClick = useCallback(async () => {
    const newCurationFolder = path.join(window.External.config.fullFlashpointPath, 'Curations', uuid());
    // Create content folder and empty meta.txt
    fs.mkdirSync(newCurationFolder);
    fs.mkdirSync(path.join(newCurationFolder, 'content'));
    fs.closeSync(fs.openSync(path.join(newCurationFolder, 'meta.txt'), 'w'));
  }, []);

  // Load Curation Archive Callback
  const onLoadCurationArchiveClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationArchive,
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['zip', '7z', 'rar'], name: 'Curation archive' }],
    });
    if (filePaths) {
      for (let i = 0; i < filePaths.length; i++) {
        const archivePath = filePaths[i];
        // Mark as indexed so can index ourselves after extraction
        const key = uuid();
        indexedCurations.push(key);
        setIndexedCurations(indexedCurations);
        // Extract files to curation folder
        importCurationArchive(archivePath, key)
        .then(async key => {
          const content = await indexContentFolder(getContentFolderByKey(key));
          dispatch({
            type: 'set-curation-content',
            payload: {
              key: key,
              content: content
            }
          });
        });
      }
    }
  }, [dispatch, indexedCurations, setIndexedCurations]);

  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationFolder,
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      Promise.all(
        filePaths.map(dirPath => {
          // Mark as indexed so can index ourselves after copying
          const key = uuid();
          indexedCurations.push(key);
          setIndexedCurations(indexedCurations);
          // Copy files to curation folder
          importCurationFolder(dirPath, key)
          .then(async key => {
            const content = await indexContentFolder(getContentFolderByKey(key));
            dispatch({
              type: 'set-curation-content',
              payload: {
                key: key,
                content: content
              }
            });
          });
        })
      );
    }
  }, [dispatch, indexedCurations, setIndexedCurations]);

  // Load Meta Callback
  const onLoadMetaClick = useCallback(() => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationMeta,
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['txt'], name: 'Curation meta file' }],
    });
    if (filePaths) {
      // Import all selected meta files
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        importCurationMeta(filePath);
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
              value={strings.curate.newCuration}
              title={strings.curate.newCurationDesc}
              onClick={onNewCurationClick}
              />
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

function renderImportAllButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<CurateLang>): JSX.Element {
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
 * Set the default values of a game's meta (if they are missing).
 * @param meta Meta to set values of.
 * @param defaults Container of default values.
 */
export function setGameMetaDefaults(meta: EditCurationMeta, defaults?: GameMetaDefaults): void {
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