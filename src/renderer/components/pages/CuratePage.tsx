import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { BackIn, ImportCurationData, ImportCurationResponseData } from '@shared/back/types';
import { ARCADE } from '@shared/constants';
import { GameMetaDefaults } from '@shared/curate/defaultValues';
import { convertEditToCurationMeta, convertParsedToCurationMeta } from '@shared/curate/metaToMeta';
import { CurationIndex, EditCuration, EditCurationMeta } from '@shared/curate/types';
import { getContentFolderByKey, getCurationFolder, indexContentFolder } from '@shared/curate/util';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { getLibraryItemTitle } from '@shared/library/util';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import * as chokidar from 'chokidar';
import { remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { useCallback, useContext, useMemo } from 'react';
import * as YAML from 'yaml';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { CurationContext } from '../../context/CurationContext';
import { newProgress, ProgressContext, ProgressDispatch } from '../../context/ProgressContext';
import { createCurationIndexImage, importCurationArchive, importCurationFolder, importCurationMeta } from '../../curate/importCuration';
import { createCurationImage, curationLog, readCurationMeta, showWarningBox } from '../../curate/util';
import { getPlatformIconURL } from '../../Util';
import { LangContext } from '../../util/lang';
import { uuid } from '../../util/uuid';
import { CheckBox } from '../CheckBox';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CurateBox, getCurationWarnings } from '../CurateBox';
import { getWarningCount } from '../CurateBoxWarnings';
import { AutoProgressComponent } from '../ProgressComponents';
import { ResizableSidebar } from '../ResizableSidebar';
import { SimpleButton } from '../SimpleButton';

type OwnProps = {
  suggestions: Partial<GamePropSuggestions>;
  appPaths: { [platform: string]: string; };
  libraries: string[];
  mad4fpEnabled: boolean;
};

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps;

const progressKey = 'curate-page';

/** Page that is used for importing curations. */
export function CuratePage(props: CuratePageProps) {
  const strings = React.useContext(LangContext);
  const [state, dispatch] = useContext(CurationContext.context);
  const [progressState, progressDispatch] = useContext(ProgressContext.context);
  const [indexedCurations, setIndexedCurations] = React.useState<string[]>(initialIndexedCurations(state.curations));
  const [allLock, setAllLock] = React.useState<boolean>(false);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const localState = useMemo(() => { return { state: state }; }, []);

  // Get default curation game meta values
  const defaultGameMetaValues = useMemo<GameMetaDefaults>(() => {
    return {
      appPaths: props.appPaths,
      language: 'en',
      platform: 'Flash',
      playMode: 'Single Player',
      status:   'Playable',
      library:  ARCADE,
    };
  }, [props.appPaths]);

  // Callback for removed dir (watcher)
  const removeCurationDir = useCallback(async (fullPath) => {
    const curationsPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
    const relativePath = path.relative(curationsPath, fullPath);
    const splitPath = relativePath.split(path.sep);
    const dirName = path.basename(fullPath);
    console.log(dirName);
    // Inside curation dir and is unused
    if (splitPath.length > 1 && dirName !== 'content' && dirName !== 'Extras') {
      const key = splitPath.shift();
      console.log(key);
      // Forcefully re-render a curate box (Non-Content folder warnings)
      if (key) {
        dispatch({
          type: 'remove-unused-dir',
          payload: {
            key: key,
            dir: dirName
          }
        });
      }
    }
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
    const curationsPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
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

  // Callback for added/changed file (watcher)
  const updateCurationFile = useCallback(async (fullPath: string) => {
    const curationsPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
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
                const newMetaData = YAML.stringify(convertParsedToCurationMeta(parsedMeta, props.tagCategories));
                await fs.writeFile(newMetaPath, newMetaData);
                // Remove old style meta file
                await fs.unlink(fullPath);
              })
              .catch(async (error) => {
                const formedMessage = `Error Parsing Curation Meta at ${relativePath} - ${error.message}\n\n` +
                                      'A default meta has been loaded.\n' +
                                      'You may edit your meta.txt in the curation folder to be valid, this will then replace the loaded meta automatically.';
                console.error(error);
                curationLog(formedMessage);
                showWarningBox(formedMessage);
                const newMetaPath = path.join(curationsPath, key, 'meta.yaml');
                await fs.access(newMetaPath, fs.constants.F_OK)
                  .catch((error) => {
                    // File doesn't exist yet, make an empty one
                    return fs.createFile(newMetaPath);
                  });
                // Leave errored meta.txt intact
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
  }, [dispatch, localState, defaultGameMetaValues, props.tagCategories]);

  const updateCurationDir = useCallback(async (fullPath) => {
    const curationsPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
    const relativePath = path.relative(curationsPath, fullPath);
    const splitPath = relativePath.split(path.sep);
    const dirName = path.basename(fullPath);
    console.log(dirName);
    // Dir inside curation folders and unused
    if (splitPath.length > 1 && dirName !== 'content' && dirName !== 'Extras') {
      const key = splitPath.shift();
      console.log(key);
      // Forcefully re-render a curate box (Non-Content folder warnings)
      if (key) {
        // Verify it is actually a curation folder by searching for meta file
        const curationFiles = await fs.readdir(path.join(curationsPath, key));
        if (curationFiles.findIndex(f => f.startsWith('meta.')) !== -1) {
          dispatch({
            type: 'add-unused-dir',
            payload: {
              key: key,
              dir: dirName
            }
          });
        }
      }
    }
  }, [dispatch]);

  // Start a watcher for the 'Curations' folder to montior curations (meta + images)
  const watcher = useMemo(() => {
    const curationsPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
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
    .on('addDir', (fullPath) => {
      updateCurationDir(fullPath);
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
  }, []);

  // Called whenever the state changes
  React.useEffect(() => {
    localState.state = state;
    // Process any unindexed curations
    for (let curation of state.curations) {
      if (indexedCurations.findIndex(i => i === curation.key) === -1) {
        indexedCurations.push(curation.key);
        // Don't attempt to index a deleted curation
        if (!curation.delete) {
          indexContentFolder(getContentFolderByKey2(curation.key), curationLog)
          .then(content => {
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
          const curationPath = getCurationFolder2(curation);
          // Use sync methods to block tab switching before done
          fs.removeSync(curationPath);
        // Save if not marked
        } else {
          const metaPath = path.join(getCurationFolder2(curation), 'meta.yaml');
          const meta = YAML.stringify(convertEditToCurationMeta(curation.meta, props.tagCategories, curation.addApps));
          try {
            fs.writeFileSync(metaPath, meta);
          } catch (error) {
            curationLog(`Error saving meta for curation ${curation.key} - ` + error.message);
            console.error(error);
          }
        }
      }
    };
  }, [props.tagCategories]);

  // Import a curation callback
  const importCurationCallback = useCallback((curation: EditCuration, log?: boolean, date?: Date) => {
    return window.Shared.back.sendP<ImportCurationResponseData, ImportCurationData>(
      BackIn.IMPORT_CURATION, {
        curation: curation,
        log: log,
        date: date,
        saveCuration: props.preferencesData.saveImportedCurations,
      }
    ).then<void>(res => new Promise((resolve, reject) => {
      if (res.data && res.data.error) {
        reject(res.data.error);
      } else {
        resolve();
      }
    }));
  }, [props.libraries, props.preferencesData.saveImportedCurations]);

  // Import All Curations Callback
  const onImportAllClick = useCallback(async () => {
    // Keep same date for all imports
    const now = new Date();
    if (state.curations.length > 0) {
      console.log(`Starting "Import All"... (${state.curations.length} curations)`);
      // Lock all curations
      dispatch({
        type: 'change-curation-lock-all',
        payload: { lock: true },
      });
      setAllLock(true);
      // Import all curations, one at a time
      (async () => {
        let success = 0;
        // Build list of valid curations
        const curations = state.curations.filter(c => !c.delete);
        // Setup progress
        const statusProgress = newProgress(progressKey, progressDispatch);
        ProgressDispatch.setUsePercentDone(statusProgress, false);
        // Import each curation
        for (let i = 0; i < curations.length; i++) {
          const curation = curations[i];
          // Log status
          console.log(`Importing... (id: ${curation.key})`);
          ProgressDispatch.setText(statusProgress, `Importing Curation ${i+1} of ${curations.length}`);
          // Check for warnings
          const warnings = getCurationWarnings(curation, props.suggestions, props.libraries, strings.curate);
          const warningCount = getWarningCount(warnings);
          if (warningCount > 0) {
            // Prompt user
            const res = await remote.dialog.showMessageBox({
              title: 'Import Warnings',
              message: `There are Warnings present on this Curation.\n${curation.meta.title}\n\nDo you still wish to import?`,
              buttons: ['Yes', 'No']
            });
            if (res.response === 1) {
              // No - Skip to next curation
              // Unlock the curation
              dispatch({
                type: 'change-curation-lock',
                payload: {
                  key: curation.key,
                  lock: false,
                },
              });
              continue;
            }
          }
          // Try importing curation
          try {
            // Import curation (and wait for it to complete)
            await importCurationCallback(curation, true, now)
            .then(() => {
              // Increment success counter
              success += 1;
              // Log status
              curationLog(`Curation successfully imported! (title: ${curation.meta.title} id: ${curation.key})`);
              // Remove the curation
              dispatch({
                type: 'remove-curation',
                payload: { key: curation.key }
              });
            })
            // Import failed, could be error or user cancelled
            .catch(async (error) => {
              curationLog(`Curation failed to import! (title: ${curation.meta.title} id: ${curation.key}) - ` + error.message);
              console.error(error);
              const content = await indexContentFolder(getContentFolderByKey2(curation.key), curationLog);
              // Update curation content. It may have been changed before error thrown.
              dispatch({
                type: 'set-curation-content',
                payload: {
                  key: curation.key,
                  content: content
                }
              });
              // Unlock the curation
              dispatch({
                type: 'change-curation-lock',
                payload: {
                  key: curation.key,
                  lock: false,
                },
              });
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
        ProgressDispatch.finished(statusProgress);
        // Log state
        const total = curations.length;
        const logStr = '"Import All" complete\n'+
        `  Total:   ${total}\n`+
        `  Success: ${success} (${Math.floor(100 * (success / total))}%)\n`+
        `  Failed:  ${total - success}`;
        console.log(logStr);
        curationLog(logStr);
        if (remote.Notification.isSupported()) {
          const notification = new remote.Notification({
            title: 'Flashpoint',
            body: logStr
          });
          notification.show();
        }
        setAllLock(true);
        dispatch({
          type: 'change-curation-lock-all',
          payload: { lock: false },
        });
      })();
    }
  }, [dispatch, state.curations, importCurationCallback]);

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
    const newCurationFolder = path.join(window.Shared.config.fullFlashpointPath, 'Curations', uuid());
    try {
      // Create content folder and empty meta.yaml
      await fs.ensureDir(path.join(newCurationFolder, 'content'));
      await fs.createFile(path.join(newCurationFolder, 'meta.yaml'));
    } catch (error) {
      curationLog('Error creating new curation - ' + error.message);
      console.error(error);
    }
  }, []);

  // Load Curation Archive Callback
  const onLoadCurationArchiveClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.Shared.showOpenDialogSync({
      title: strings.dialog.selectCurationArchive,
      properties: ['openFile', 'multiSelections'],
      filters: [{ extensions: ['zip', '7z'], name: 'Curation archive' }],
    });
    // Create Status Progress for counting extracting archives
    const statusProgress = newProgress(progressKey, progressDispatch);
    let filesCounted = 1;
    if (filePaths) {
      ProgressDispatch.setText(statusProgress, `Loading Curation ${filesCounted} of ${filePaths.length}`);
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
          const content = await indexContentFolder(getContentFolderByKey2(key), curationLog);
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
          ProgressDispatch.setText(statusProgress, `Loading Curation ${filesCounted} of ${filePaths.length}`);
        });
      }
    }
    ProgressDispatch.finished(statusProgress);
  }, [dispatch, indexedCurations, setIndexedCurations]);

  // Load Curation Folder Callback
  const onLoadCurationFolderClick = useCallback(async () => {
    // Show dialog
    const filePaths = window.Shared.showOpenDialogSync({
      title: strings.dialog.selectCurationFolder,
      properties: ['openDirectory', 'multiSelections'],
    });
    if (filePaths) {
      const statusProgress = newProgress(progressKey, progressDispatch);
      ProgressDispatch.setUsePercentDone(statusProgress, false);
      let imported = 0;
      // Process in series - IO bound anyway, and serves progress better
      Promise.all(
        filePaths.map((dirPath) => {
          imported += 1;
          ProgressDispatch.setText(statusProgress, `Loading Curation ${imported} of ${filePaths.length}`);
          // Mark as indexed so can index ourselves after copying
          const key = uuid();
          indexedCurations.push(key);
          setIndexedCurations(indexedCurations);
          // Copy files to curation folder
          return importCurationFolder(dirPath, key, newProgress(progressKey, progressDispatch))
          .then(async key => {
            const content = await indexContentFolder(getContentFolderByKey2(key), curationLog);
            dispatch({
              type: 'set-curation-content',
              payload: {
                key: key,
                content: content
              }
            });
          });
        })
      )
      .finally(() => {
        ProgressDispatch.finished(statusProgress);
      });
    }
  }, [dispatch, indexedCurations, setIndexedCurations]);

  // Load Meta Callback
  const onLoadMetaClick = useCallback(() => {
    // Show dialog
    const filePaths = window.Shared.showOpenDialogSync({
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
    const curationsFolderPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations');
    await fs.ensureDir(curationsFolderPath);
    remote.shell.openItem(curationsFolderPath);
  }, []);

  // Open Exported Curations Folder
  const onOpenExportsFolder = useCallback(async () => {
    const exportsFolderPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', '_Exports');
    await fs.ensureDir(exportsFolderPath);
    remote.shell.openItem(exportsFolderPath);
  }, []);

  // Open Imported Curations Folder
  const onOpenImportedFolder = useCallback(async () => {
    const importedFolder = path.join(window.Shared.config.fullFlashpointPath, 'Curations', '_Imported');
    await fs.ensureDir(importedFolder);
    remote.shell.openItem(importedFolder);
  }, []);

  // On keep imports toggle
  const onSaveImportsToggle = useCallback((isChecked: boolean) => {
    updatePreferencesData({
      saveImportedCurations: isChecked
    });
  }, []);

  // On Left Sidebar Size change
  const onLeftSidebarResize = useCallback((event) => {
    const maxWidth = getDivWidth(pageRef) - 5;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    updatePreferencesData({
      curatePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }, [props.preferencesData, pageRef]);

  // Libraries an options list
  const libraryOptions = memoizeOne(() => {
    // Map library routes to options
    let options = props.libraries.map((library, index) => (
      <option
        key={index}
        value={library}>
        {getLibraryItemTitle(library, strings.libraries)}
      </option>
    ));
    // Add default enonRuntry if no libraries available
    if (props.libraries.length === 0) {
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
          suggestions={props.suggestions}
          libraryOptions={libraryOptions()}
          libraries={props.libraries}
          tagCategories={props.tagCategories}
          mad4fpEnabled={props.mad4fpEnabled} />
      ));
    } else {
      return (
        <div className='curate-box curate-box__placeholder'>
          {strings.curate.noCurations}
        </div>
      );
    }
  }, [state.curations, props.suggestions, strings, props.preferencesData.saveImportedCurations]);

  // Render Curation Index (left sidebar)
  const curateIndex = React.useMemo(() => {
    return state.curations.map((curation, index) => {
      const platformIconPath = curation.meta.platform ? getPlatformIconURL(curation.meta.platform) : '';
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
            <SimpleButton
              value={strings.curate.openExportsFolder}
              title={strings.curate.openExportsFolderDesc}
              onClick={onOpenExportsFolder} />
            <SimpleButton
              value={strings.curate.openImportedFolder}
              title={strings.curate.openImportedFolderDesc}
              onClick={onOpenImportedFolder} />
            <div className='curate-page__floating-box__divider'/>
            <ConfirmElement
              onConfirm={onImportAllClick}
              children={renderImportAllButton}
              extra={[strings.curate, allLock]} />
            <div className='curate-page__floating-box__divider'/>
            <ConfirmElement
              onConfirm={onDeleteAllClick}
              children={renderDeleteAllButton}
              extra={[strings.curate, allLock]} />
            <div className='curate-page__floating-box__divider'/>
            <div className='curate-page__checkbox'>
              <div className='curate-page__checkbox-text'>{strings.curate.saveImportedCurations}</div>
              <CheckBox
                onToggle={onSaveImportsToggle}
                checked={props.preferencesData.saveImportedCurations}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [curateBoxes, progressComponent, strings, state.curations.length,
     onImportAllClick, onLoadCurationArchiveClick, onLoadCurationFolderClick, onLoadMetaClick,
     props.preferencesData.curatePageLeftSidebarWidth, props.preferencesData.browsePageShowLeftSidebar,
     props.preferencesData.saveImportedCurations]);
}

function renderImportAllButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<[LangContainer['curate'], boolean]>): JSX.Element {
  return (
    <SimpleButton
      className={(activationCounter > 0) ? 'simple-button--red simple-vertical-shake' : ''}
      value={extra[0].importAll}
      title={extra[0].importAllDesc}
      onClick={activate}
      disabled={extra[1]}
      onMouseLeave={reset} />
  );
}

function renderDeleteAllButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<[LangContainer['curate'], boolean]>): JSX.Element {
  return (
    <SimpleButton
      className={(activationCounter > 0) ? 'simple-button--red simple-vertical-shake' : ''}
      value={extra[0].deleteAll}
      title={extra[0].deleteAllDesc}
      onClick={activate}
      disabled={extra[1]}
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
      meta.applicationPath = defaults.appPaths[meta.platform || ''] || '';
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

function getContentFolderByKey2(key: string) {
  return getContentFolderByKey(key, window.Shared.config.fullFlashpointPath);
}

function getCurationFolder2(curation: EditCuration | CurationIndex) {
  return getCurationFolder(curation, window.Shared.config.fullFlashpointPath);
}
