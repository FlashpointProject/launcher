import * as chokidar from 'chokidar';
import { remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import * as YAML from 'yaml';
import { LangContainer } from '../../../shared/lang';
import { memoizeOne } from '../../../shared/memoize';
import { updatePreferencesData } from '../../../shared/preferences/util';
import { WithLibraryProps } from '../../containers/withLibrary';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { CurationContext, EditCuration, EditCurationMeta } from '../../context/CurationContext';
import { newProgress, ProgressContext, ProgressDispatch } from '../../context/ProgressContext';
import { GameMetaDefaults, getDefaultMetaValues } from '../../curate/defaultValues';
import { createCurationIndexImage, importCurationArchive, importCurationFolder, importCurationMeta, indexContentFolder } from '../../curate/importCuration';
import { importCuration } from '../../curate/importGame';
import { convertEditToCurationMeta, convertParsedToCurationMeta } from '../../curate/metaToMeta';
import { createCurationImage, curationLog, getContentFolderByKey, getCurationFolder, readCurationMeta, showWarningBox } from '../../curate/util';
import GameManager from '../../game/GameManager';
import { GameImageCollection } from '../../image/GameImageCollection';
import { getPlatformIconPath } from '../../Util';
import { LangContext } from '../../util/lang';
import { getSuggestions } from '../../util/suggestions';
import { uuid } from '../../uuid';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CurateBox, getCurationWarnings } from '../CurateBox';
import { getWarningCount } from '../CurateBoxWarnings';
import { AutoProgressComponent } from '../ProgressComponents';
import { ResizableSidebar } from '../ResizableSidebar';
import { SimpleButton } from '../SimpleButton';
import { IGameInfo } from 'src/shared/game/interfaces';

type OwnProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
};

export type CuratePageProps = OwnProps & WithLibraryProps & WithPreferencesProps;

const progressKey = 'curate-page';

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const strings = React.useContext(LangContext);
  const [state, dispatch] = useContext(CurationContext.context);
  const [progressState, progressDispatch] = useContext(ProgressContext.context);
  const [indexedCurations, setIndexedCurations] = React.useState<string[]>(initialIndexedCurations(state.curations));
  const pageRef = React.useRef<HTMLDivElement>(null);
  const localState = useMemo(() => { return { state: state }; }, []);
  // Get default curation game meta values
  const defaultGameMetaValues = useMemo(() => {
    return props.games ? getDefaultMetaValues(props.games.collection.games) : undefined;
  }, [props.games]); // (@NOTE The dependency value is never changed in the launcher, so this will never refresh)


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
        switch (filePath.toLowerCase()) {
          case 'meta.yaml':
          case 'meta.yml': {
            await readCurationMeta(fullPath, defaultGameMetaValues)
              .then(async (parsedMeta) => {
                dispatch({
                  type: 'set-curation-meta',
                  payload: {
                    key: key,
                    parsedMeta: parsedMeta
                  }
                });
              })
              .catch((error) => {
                const formedMessage = `Error Parsing Curation Meta at ${relativePath} - ${error.message}`;
                console.error(error);
                curationLog(formedMessage);
                showWarningBox(formedMessage);
              });
            break;
          }
          case 'meta.txt': {
            // Immediately save an old style file as new
            // Parse file then save back as a new style (YAML) file
            await readCurationMeta(fullPath, defaultGameMetaValues)
              .then(async (parsedMeta) => {
                console.log(parsedMeta);
                const newMetaPath = path.join(curationsPath, key, 'meta.yaml');
                const newMetaData = YAML.stringify(convertParsedToCurationMeta(parsedMeta));
                await fs.writeFile(newMetaPath, newMetaData);
                // Remove old style meta file
                await fs.unlink(fullPath);
              })
              .catch((error) => {
                const formedMessage = `Error Parsing Curation Meta at ${relativePath} - ${error.message}`;
                console.error(error);
                curationLog(formedMessage);
                showWarningBox(formedMessage);
              });
            break;
          }
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
        // Don't attempt to index a deleted curation
        if (!curation.delete) {
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
    }
    setIndexedCurations(indexedCurations);
  }, [dispatch, state, setIndexedCurations]);

  // Save and clean up on unmount (page changed, window closing)
  React.useEffect(() => {
    return () => {
      // Stop watcher to release locks
      watcher.close();
      const state = localState.state;
      // Save all working curation metas
      for (let curation of state.curations) {
        // Delete if marked
        if (curation.delete) {
          const curationPath = getCurationFolder(curation);
          fs.remove(curationPath);
        // Save if not marked
        } else {
          const metaPath = path.join(getCurationFolder(curation), 'meta.yaml');
          const meta = YAML.stringify(convertEditToCurationMeta(curation.meta, curation.addApps));
          fs.writeFile(metaPath, meta)
          .catch((error) => {
            curationLog(`Error saving meta for curation ${curation.key} - ` + error.message);
            console.error(error);
          });
        }
      }
    };
  }, []);

  // Import a curation callback
  const importCurationCallback = useCallback((curation: EditCuration, log?: boolean, date?: Date) => {
    if (!props.games)      { throw new Error('Failed to import curation. "games" is undefined.'); }
    if (!props.gameImages) { throw new Error('Failed to import curation. "gameImages" is undefined.'); }
    return importCuration(curation, props.games, props.gameImages,
                          props.libraryData.libraries, log, date);
  }, [props.games, props.gameImages, props.libraryData.libraries]);
  // Import All Curations Callback
  const onImportAllClick = useCallback(async () => {
    const { games, gameImages } = props;
    // Keep same date for all imports
    const now = new Date();
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
          // Check for warnings
          const warnings = getCurationWarnings(curation, suggestions, props.libraryData);
          const warningCount = getWarningCount(warnings);
          if (warningCount > 0) {
            // Prompt user
            const res = remote.dialog.showMessageBoxSync({
              title: 'Import Warnings',
              message: `There are Warnings present on this Curation.\n${curation.meta.title}\n\nDo you still wish to import?`,
              buttons: ['Yes', 'No']
            });
            if (res === 1) {
              // No - Skip to next curation
              continue;
            }
          }
          // Try importing curation
          try {
            // Import curation (and wait for it to complete)
            await importCurationCallback(curation, true, now)
              // Import failed, could be error or user cancelled
              .catch(async (error) => {
                curationLog(`Curation failed to import! (title: ${curation.meta.title} id: ${curation.key}) - ` + error.message);
                console.error(error);
                const content = await indexContentFolder(getContentFolderByKey(curation.key));
                dispatch({
                  type: 'set-curation-content',
                  payload: {
                    key: curation.key,
                    content: content
                  }
                });
              });
            // Increment success counter
            success += 1;
            // Log status
            curationLog(`Curation successfully imported! (title: ${curation.meta.title} id: ${curation.key})`);
            // Remove the curation
            dispatch({
              type: 'remove-curation',
              payload: { key: curation.key }
            });
          } catch (error) {
            // Log error
            curationLog(`Curation failed to import! (title: ${curation.meta.title} id: ${curation.key}) - ` + error.message);
            console.error(error);
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
        dispatch({
          type: 'change-curation-lock-all',
          payload: { lock: false },
        });
      })();
    }
  }, [dispatch, state.curations, props.games, props.gameImages]);

  // Delete all curations
  const onDeleteAllClick = useCallback(() => {
    for (let curation of state.curations) {
      dispatch({
        type: 'remove-curation',
        payload: { key: curation.key }
      });
    }
  }, [state.curations]);

  // Make a new curation (folder watcher does most of the work)
  const onNewCurationClick = useCallback(async () => {
    const newCurationFolder = path.join(window.External.config.fullFlashpointPath, 'Curations', uuid());
    try {
      // Create content folder and empty meta.yaml
      await fs.mkdir(newCurationFolder);
      await fs.mkdir(path.join(newCurationFolder, 'content'));
      await fs.close(await fs.open(path.join(newCurationFolder, 'meta.yaml'), 'w'));
    } catch (error) {
      curationLog('Error creating new curation - ' + error.message);
      console.error(error);
    }
  }, []);

  // Load Curation Archive Callback
  const onLoadCurationArchiveClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationArchive,
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['zip', '7z'], name: 'Curation archive' }],
    });
    // Create Status Progress for counting extracting archives
    const statusProgress = newProgress(progressKey, progressDispatch);
    let filesCounted = 1;
    if (filePaths) {
      ProgressDispatch.setText(statusProgress, `Importing Curation ${filesCounted} of ${filePaths.length}`);
      // Don't use percentDone
      ProgressDispatch.setUsePercentDone(statusProgress, false);
      for (let archivePath of filePaths) {
        // Mark as indexed so can index ourselves after extraction
        const key = uuid();
        indexedCurations.push(key);
        setIndexedCurations(indexedCurations);
        // Extract files to curation folder
        await importCurationArchive(archivePath, key, newProgress(progressKey, progressDispatch))
        .then(async key => {
          const content = await indexContentFolder(getContentFolderByKey(key));
          dispatch({
            type: 'set-curation-content',
            payload: {
              key: key,
              content: content
            }
          });
        })
        // Update Status Progress with new number of counted files
        .finally(() => {
          filesCounted++;
          ProgressDispatch.setText(statusProgress, `Importing Curation ${filesCounted} of ${filePaths.length}`);
        });
      }
    }
    ProgressDispatch.finished(statusProgress);
  }, [dispatch, indexedCurations, setIndexedCurations]);

  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectCurationFolder,
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      // Process in series - IO bound anyway, and serves progress better
      Promise.all(
        filePaths.map((dirPath) => {
          // Mark as indexed so can index ourselves after copying
          const key = uuid();
          indexedCurations.push(key);
          setIndexedCurations(indexedCurations);
          // Copy files to curation folder
          return importCurationFolder(dirPath, key, newProgress(progressKey, progressDispatch))
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
      filters: [{ extensions: ['txt', 'yaml', 'yml'], name: 'Curation meta file' }],
    });
    if (filePaths) {
      // Import all selected meta files
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        importCurationMeta(filePath);
      }
    }
  }, [dispatch]);

  // Open Curations Folder
  const onOpenCurationsFolder = useCallback(async () => {
    const curationsFolderPath = path.join(window.External.config.fullFlashpointPath, 'Curations');
    await fs.ensureDir(curationsFolderPath);
    remote.shell.openItem(curationsFolderPath);
  }, []);

  // On Left Sidebar Size change
  const onLeftSidebarResize = useCallback((event) => {
    console.log('resize');
    console.log(event);
    const maxWidth = getDivWidth(pageRef);
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    updatePreferencesData({
      curatePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }, [props.preferencesData, pageRef]);

  // Game property suggestions
  const suggestions = useMemo(() => {
    return props.games && getSuggestions(props.games.listPlatforms(), props.libraryData.libraries);
  }, [props.games, props.libraryData.libraries]);

  // Libraries an options list
  const libraryOptions = memoizeOne(() => {
    // Map library routes to options
    let options = props.libraryData.libraries.map((library, index) => (
      <option
        key={index}
        value={library.route}>
        {library.title}
      </option>
    ));
    // Add default entry if no libraries available
    if (props.libraryData.libraries.length === 0) {
      const defaultLibrary = (
        <option key={0}>
          {strings.curate.default}
        </option>
      );
      options.push(defaultLibrary);
    }
    return options;
  });

  // Render all owned ProgressData as components
  const progressComponent = useMemo(() => {
    const progressArray = progressState[progressKey];
    if (progressArray) {
      return progressArray.map((data, index) => {
        return (
          <AutoProgressComponent
            key={index}
            progressData={data}
            wrapperClass='curate-box' />
        );
      });
    }
  }, [progressState[progressKey]]);

  // Render Curation Boxes (if none, No Curations placeholder)
  const curateBoxes = React.useMemo(() => {
    if (state.curations.length > 0) {
      return state.curations.map((curation, index) => (
        curation.delete ? undefined :
        <CurateBox
          key={index}
          importCuration={importCurationCallback}
          curation={curation}
          dispatch={dispatch}
          suggestions={suggestions}
          libraryOptions={libraryOptions()}
          libraryData={props.libraryData} />
      ));
    } else {
      return (
        <div className='curate-box curate-box__placeholder'>
          {strings.curate.noCurations}
        </div>
      );
    }
  }, [state.curations, props.games, suggestions, strings]);

  // Render Curation Index (left sidebar)
  const curateIndex = React.useMemo(() => {
    return state.curations.map((curation, index) => {
      const platformIconPath = curation.meta.platform ? getPlatformIconPath(curation.meta.platform) : '';
      return (
        curation.delete ? undefined :
        <div
          key={index}
          className='curate-page__left-sidebar-item'
          onClick={() => { scrollToDiv(curation.key); }}>
            <div
              className='curate-page__left-sidebar-item__icon'
              style={{backgroundImage: `url(${platformIconPath})`}}/>
            {curation.meta.title ? curation.meta.title : 'No Title'}
        </div>
      );
    });
  }, [state.curations]);

  // Render
  return React.useMemo(() => (
    <div ref={pageRef} className='curate-page'>
      {/* Left Sidebar */}
      <ResizableSidebar
        hide={props.preferencesData.browsePageShowLeftSidebar && state.curations.length > 0}
        divider='after'
        width={props.preferencesData.curatePageLeftSidebarWidth}
        onResize={onLeftSidebarResize}>
          {curateIndex}
      </ResizableSidebar>
      <div className='curate-page__inner simple-scroll'>
        <div className='curate-page__left'>
        </div>
        {/* Curation(s) and Progress */}
        <div className='curate-page__center'>
          { progressComponent }
          { curateBoxes }
        </div>
        {/* Menu buttons */}
        <div className='curate-page__right'>
          <div className='curate-page__floating-box'>
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
            <div className='curate-page__floating-box__divider'/>
            <SimpleButton
              value={strings.curate.openCurationsFolder}
              title={strings.curate.openCurationsFolderDesc}
              onClick={onOpenCurationsFolder} />
            <div className='curate-page__floating-box__divider'/>
            <ConfirmElement
              onConfirm={onImportAllClick}
              children={renderImportAllButton}
              extra={strings.curate} />
            <div className='curate-page__floating-box__divider'/>
            <ConfirmElement
              onConfirm={onDeleteAllClick}
              children={renderDeleteAllButton}
              extra={strings.curate} />
          </div>
        </div>
      </div>
    </div>
  ), [curateBoxes, progressComponent, strings, state.curations.length,
     onImportAllClick, onLoadCurationArchiveClick, onLoadCurationFolderClick, onLoadMetaClick,
     props.preferencesData.curatePageLeftSidebarWidth, props.preferencesData.browsePageShowLeftSidebar]);
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

function renderDeleteAllButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['curate']>): JSX.Element {
  return (
    <SimpleButton
      className={(activationCounter > 0) ? 'simple-button--red simple-vertical-shake' : ''}
      value={extra.deleteAll}
      title={extra.deleteAllDesc}
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
    if (!meta.library)  { meta.library  = defaults.library;  }
    // Set default application path
    // (Note: This has to be set after the default platform)
    if (!meta.applicationPath) {
      meta.applicationPath = defaults.addPaths[meta.platform || ''] || '';
    }
  }
}

function initialIndexedCurations(curations: EditCuration[]) {
  return () => {
    // indexedCurations is wiped on unmount - Mark any curations with content as indexed already
    const indexedCurations: string[] = [];
    for (let curation of curations) {
      if (curation.content.length > 0) {
        indexedCurations.push(curation.key);
      }
    }
    return indexedCurations;
  };
}

/* Scroll the page down to a given div by id */
function scrollToDiv(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView();
  }
}

/* Returns the width of a div ref, minumum 10 */
function getDivWidth(ref: React.RefObject<HTMLDivElement>) {
  if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
  if (!ref.current) { throw new Error('div is missing.'); }
  return parseInt(document.defaultView.getComputedStyle(ref.current).width || '', 10);
}