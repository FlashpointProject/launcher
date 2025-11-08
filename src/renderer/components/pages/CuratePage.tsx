import { CurateBox } from '@renderer/components/CurateBox';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import * as curateActions from '@renderer/store/curate/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { addTask, setTask } from '@renderer/store/tasks/slice';
import { axios, getCurationPostURL, getPlatformIconURL, openUrlInWindow } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { eventResponseDebouncerFactory } from '@shared/eventResponseDebouncer';
import { Task } from '@shared/interfaces';
import { getFileServerURL } from '@shared/Util';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { AppPreferencesData, CurationState, GameLaunchOverride, TagSuggestion } from 'flashpoint-launcher';
import * as path from 'node:path';
import * as React from 'react';
import { useShortcut } from 'react-keybind';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { CheckBox } from '../CheckBox';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CuratePageLeftSidebar } from '../CuratePageLeftSidebar';
import { Dropdown } from '../Dropdown';
import { useFileLoader } from '../FileLoader';
import { OpenIcon } from '../OpenIcon';
import { SimpleButton, SimpleButtonProps } from '../SimpleButton';

// ERROR: Failed to compile the file. Please check the file content. Legacy octal literals are not allowed in strict mode. (1:9)
// False error from the marker extension, this is still memomized
export function CuratePage() {
  const strings = useLocalization();
  const curate = useAppSelector((state) => state.curate);
  const currentCuration = curate.current;
  const extensions = useAppSelector((state) => state.main.extensions);
  const logoVersion = useAppSelector((state) => state.main.logoVersion);
  const tagCategories = useAppSelector((state) => state.tagCategories);
  const suggestions = useAppSelector((state) => state.main.suggestions);
  const platformAppPaths = useAppSelector((state) => state.main.platformAppPaths);
  const tagFiltersInCurate = useAppSelector(state => state.preferences.tagFiltersInCurate);
  const saveImportedCurations = useAppSelector(state => state.preferences.saveImportedCurations);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const browsePageShowExtreme = useAppSelector(state => state.preferences.browsePageShowExtreme);
  const shortcutPrefs = useAppSelector(state => state.preferences.shortcuts);
  const symlinkCurationContent = useAppSelector(state => state.preferences.symlinkCurationContent);
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);
  const curationTemplates = useAppSelector(state => state.main.curationTemplates);
  const extContextButtons = useAppSelector(state => state.main.contextButtons);
  const mad4fpEnabled = useAppSelector(state => state.main.mad4fpEnabled);
  const { fileLoader, openFileSelect } = useFileLoader();
  const shortcut = useShortcut();
  const dispatch = useDispatch();
  const curation: CurationState | undefined = curate.curations.find(c => c.folder === currentCuration);

  const suggsDebounce = eventResponseDebouncerFactory<TagSuggestion[]>();

  const [tagText, setTagText] = React.useState<string>('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);
  const [platformText, setPlatformText] = React.useState<string>('');
  const [platformSuggestions, setPlatformSuggestions] = React.useState<TagSuggestion[]>([]);

  const onCheckboxChange = (key: keyof AppPreferencesData) => (checked: boolean) => dispatch(updatePreferences({ [key]: checked }));

  const onSymlinkCurationContentChange = onCheckboxChange('symlinkCurationContent');
  const onSaveImportedCurationChange = onCheckboxChange('saveImportedCurations');
  const onTagFiltersInCurateChange = onCheckboxChange('tagFiltersInCurate');

  const onOpenSubmissionPage = () => {
    if (curation?.fpfssInfo) {
      const subPage = `${fpfssBaseUrl}/web/submission/${curation.fpfssInfo.id}`;
      openUrlInWindow(subPage);
    }
  };

  const onDupeCurations = () => {
    const selected = curate.selected;
    for (const folder of selected) {
      dispatch(curateActions.setLock({
        folder: folder,
        locked: true
      }));
    }
    window.Shared.back.request(BackIn.CURATE_DUPLICATE, selected)
    .catch((err: any) => {
      log.error('Curate', 'Error duping curations: ' + err.toString());
    })
    .finally(() => {
      for (const folder of selected) {
        dispatch(curateActions.setLock({
          folder: folder,
          locked: false
        }));
      }
    });
  };

  const onScanForNewCurations = () => {
    window.Shared.back.send(BackIn.CURATE_SCAN_NEW_CURATIONS);
  };

  const onLoadCuration = async () => {
    if (window.electronAPI !== undefined) {
      window.electronAPI.showOpenDialog({
        title: strings.dialog.selectCurationArchive,
        properties: [ 'multiSelections' ]
      })
      .then((filePaths) => {
        if (filePaths !== undefined && filePaths.length > 0) {
          const newTask = newCurateTask(`Loading ${filePaths.length} Archives`, 'Loading...');
          dispatch(addTask(newTask));
          window.Shared.back.send(BackIn.CURATE_LOAD_ARCHIVES, filePaths, newTask.id);
        }
      });
    } else {
      openFileSelect(async (fileList) => {
        if (fileList) {
          if (fileList.length > 0) {
            const newText = (index: number) => `Uploading Curations (${index} of ${fileList.length})`;
            const toastId = toast(newText(0), {
              type: 'info',
              autoClose: false,
              closeButton: false,
            });
            const url = `${getFileServerURL()}/curation`;
            for (let i = 0; i < fileList.length; i++) {
              const file = fileList[i];
              const res = await fetch(url, {
                method: 'POST',
                body: await file.arrayBuffer(),
              });
              if (!res.ok) {
                toast.update(toastId, {
                  render: () =><div>Upload Failure ({file.name}): {res.statusText}</div>,
                  type: 'error',
                  closeOnClick: true,
                  closeButton: true
                });
                return;
              }

              if (i < fileList.length - 1) {

                // Not last one, update text before loop starts
                toast.update(toastId, {
                  render: () => <div>{newText(i+1)}</div>
                });
              }
            }

            toast.update(toastId, {
              render: () =><div>Curation Upload Complete!</div>,
              type: 'success',
              closeOnClick: true,
              closeButton: true
            });
          }
        }
      }, {
        accept: '.7z',
        multiple: true,
      });
    }
  };

  const onNewCuration = (meta?: EditCurationMeta) => {
    dispatch(curateActions.createCuration({
      folder: uuid(),
      meta
    }));
  };

  // Keybinds

  React.useEffect(() => {
    const keybinds = shortcutPrefs.curate;
    if (shortcut && shortcut.registerShortcut) {
      shortcut.registerShortcut(() => {
        if (currentCuration) {
          // Find current curation, shift 1 up or wrap
          const curationIdx = curate.curations.findIndex(c => c.folder === currentCuration);
          if (curationIdx !== -1) {
            if (curationIdx > 0) {
              dispatch(curateActions.setCurrentCuration({
                folder: curate.curations[curationIdx-1].folder
              }));
            }
          } else {
            dispatch(curateActions.setCurrentCuration({
              folder: curate.curations[curate.curations.length-1].folder
            }));
          }
        } else {
          // Nothing selected, select last curation
          if (curate.curations.length > 0) {
            dispatch(curateActions.setCurrentCuration({
              folder: curate.curations[curate.curations.length - 1].folder
            }));
          }
        }
      }, shortcutPrefs.curate.prev, 'Prev', 'Previous Curation');

      shortcut.registerShortcut(() => {
        if (currentCuration) {
          // Find current curation, shift 1 down or wrap
          const curationIdx = curate.curations.findIndex(c => c.folder === currentCuration);
          if (curationIdx !== -1) {
            if (curationIdx < (curate.curations.length + 1)) {
              dispatch(curateActions.setCurrentCuration({
                folder: curate.curations[curationIdx+1].folder
              }));

            } else {
              dispatch(curateActions.setCurrentCuration({
                folder: curate.curations[0].folder
              }));
            }
          }
        } else {
          // Nothing selected, select first curation
          if (curate.curations.length > 0) {
            dispatch(curateActions.setCurrentCuration({
              folder: curate.curations[0].folder
            }));
          }
        }
      }, shortcutPrefs.curate.next, 'curate:Next', 'Next Curation');

      shortcut.registerShortcut(() => {
        dispatch(curateActions.createCuration({
          folder: uuid()
        }));
      }, shortcutPrefs.curate.newCur, 'curate:New', 'New Curation');

      shortcut.registerShortcut(() => {
        onLoadCuration();
      }, shortcutPrefs.curate.load, 'curate:Load Archives', 'Load Curation Archives');

      shortcut.registerShortcut(() => {
        if (currentCuration) {
          window.Shared.back.request(BackIn.CURATE_REFRESH_CONTENT, currentCuration);
        }
      }, shortcutPrefs.curate.refresh, 'curate:Refresh', 'Refresh Active Curation + Content Tree');

      shortcut.registerShortcut(() => {
        if (curate.selected.length > 0) {
          const newTask = newCurateTask(`Exporting ${curate.selected.length} Curations`, 'Exporting...');
          dispatch(addTask(newTask));
          dispatch(curateActions.exportCurations({
            taskId: newTask.id
          }));
        }
      }, shortcutPrefs.curate.exportCurs, 'curate:Export', 'Export Selected Curations');

      shortcut.registerShortcut(() => {
        if (curate.selected.length > 0) {
          const newTask = newCurateTask(`Exporting Data Packs for ${curate.selected.length} Curations`, 'Exporting...');
          dispatch(addTask(newTask));
          dispatch(curateActions.exportCurationDataPacks({
            taskId: newTask.id
          }));
        }
      }, shortcutPrefs.curate.exportDataPacks, 'curate:Export Data Packs', 'Export Data Packs for Selected Curations');

      shortcut.registerShortcut(() => {
        if (curation) {
          window.Shared.back.request(BackIn.LAUNCH_CURATION, {
            curation,
            mad4fp: false,
            symlinkCurationContent,
            override: null,
          });
        }
      }, shortcutPrefs.curate.run, 'curate:Test', 'Run Active Curation');

      shortcut.registerShortcut(() => {
        if (curation && symlinkCurationContent) {
          window.Shared.back.request(BackIn.LAUNCH_CURATION, {
            curation,
            mad4fp: true,
            symlinkCurationContent,
            override: null,
          });
        }
      }, shortcutPrefs.curate.runMad4fp, 'curate:Test MAD4FP', 'Run Active Curation with MAD4FP');
    }
    return () => {
      if (shortcut && shortcut.unregisterShortcut) {
        for (const keybind of Object.values(keybinds)) {
          shortcut.unregisterShortcut(keybind);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCuration]);

  const onTagTextChange = (tagText: string) => {
    const splitTags = tagText.split(';');
    const lastTag = (splitTags.length > 0 ? splitTags.pop() || '' : '').trim();
    setTagText(tagText);
    if (tagText !== '') {
      suggsDebounce.dispatch(window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, lastTag, tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !browsePageShowExtreme))), setTagSuggestions);
    } else {
      suggsDebounce.invalidate();
      setTagSuggestions([]);
    }
  };

  const onPlatformTextChange = (platformText: string) => {
    const splitPlatforms = platformText.split(';');
    const lastPlatform = (splitPlatforms.length > 0 ? splitPlatforms.pop() || '' : '').trim();
    if (platformText !== '') {
      window.Shared.back.request(BackIn.GET_PLATFORM_SUGGESTIONS, lastPlatform)
      .then((data) => {
        if (data) {
          setPlatformSuggestions(data);
          console.log(data.length + ' platform suggs');
        }
      });
    } else {
      setPlatformSuggestions([]);
    }
    setPlatformText(platformText);
  };

  const onOpenCurationsFolder = () => {
    window.electronAPI?.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations'));
  };

  const onOpenCurationFolder = () => {
    if (curation) {
      window.electronAPI?.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder));
    }
  };

  const onImportCuration = async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Importing ${curate.selected.length} Curations`, 'Importing...');
      dispatch(addTask(newTask));
      dispatch(curateActions.importCurations({
        taskId: newTask.id
      }));
    }
  };

  const onRegenerateUUID = async () => {
    if (curation) {
      dispatch(curateActions.regenUuid({
        folder: curation.folder
      }));
    }
  };

  const onExportDataPacks = async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Exporting Data Packs for ${curate.selected.length} Curations`, 'Exporting...');
      dispatch(addTask(newTask));
      dispatch(curateActions.exportCurationDataPacks({
        taskId: newTask.id
      }));
    }
  };

  const onExportCurations = async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Exporting ${curate.selected.length} Curations`, 'Exporting...');
      dispatch(addTask(newTask));
      dispatch(curateActions.exportCurations({
        taskId: newTask.id
      }));
    }
  };

  const onDeleteCurations = async () => {
    if (curate.selected.length > 0) {
      const newTask = newCurateTask(`Deleting ${curate.selected.length} Curations`, 'Deleting...');
      dispatch(addTask(newTask));
      dispatch(curateActions.deleteCurations({
        taskId: newTask.id
      }));
    }
  };

  const onRunCurationOverride = async (override: GameLaunchOverride) => {
    if (curation) {
      window.Shared.back.send(BackIn.LAUNCH_CURATION, {
        curation,
        mad4fp: false,
        symlinkCurationContent,
        override,
      });
    }
  };

  const onRunCuration = async () => {
    if (curation) {
      window.Shared.back.send(BackIn.LAUNCH_CURATION, {
        curation,
        mad4fp: false,
        symlinkCurationContent,
        override: null,
      });
    }
  };

  const onRunMAD4FPCuration = async () => {
    if (curation) {
      window.Shared.back.send(BackIn.LAUNCH_CURATION, {
        curation,
        mad4fp: true,
        symlinkCurationContent,
        override: null,
      });
    }
  };

  const warningCount = curation ? curation.warnings.writtenWarnings.length : 0;
  const disabled = !curation;

  const runExtCommand = (command: string) => {
    window.Shared.back.send(BackIn.RUN_COMMAND, command, [curation, curate.selected]);
  };

  // Gen extension buttons
  const extButtons = extContextButtons.map((c, index) => {
    const ext = extensions.find(e => e.id === c.extId);
    const buttons = c.value.filter(c => c.context === 'curation').map((contextButton, index) => (
      <SimpleButton
        key={index}
        className='curate-page__right--button'
        disabled={disabled && !contextButton.runWithNoCuration}
        onClick={() => runExtCommand(contextButton.command)}
        value={contextButton.name} />
    ));
    if (buttons.length > 0) {
      return (
        <div
          className='curate-page__right--section'
          key={index}>
          <div className='curate-page__right--header'>{ext ? ext.displayName || ext.name : c.extId}</div>
          {buttons}
        </div>
      );
    }
  });

  const curationTemplateButtons = curationTemplates.map(c => {
    return c.value.map((template, index) => {
      return (
        <label
          className='curate-page__right-dropdown-content simple-dropdown-button'
          key={index}
          onClick={() => {
            dispatch(curateActions.createCuration({
              folder: uuid(),
              meta: template.meta
            }));
          }}>
          <div
            className='curate-page__right-dropdown-content-icon'
            style={{ backgroundImage: `url('${getPlatformIconURL(template.logo, logoVersion)}')` }} />
          <div>
            {template.name}
          </div>
        </label>
      );
    });
  }).reduce((prev, cur) => prev.concat(cur), []);

  const onLoadCurationDrop = async (event: React.DragEvent) => {
    const files = event.dataTransfer.files;
    const newTask = newCurateTask(`Loading ${files.length} Archives`, 'Loading...');
    dispatch(addTask(newTask));

    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          dispatch(setTask({
            id: newTask.id,
            status: `Loading ${file.name}`,
            progress: i / files.length
          }));
          if (file.name.endsWith('.7z')) {
            await axios.post(getCurationPostURL(), await file.arrayBuffer());
          } else {
            alert(formatString(strings.dialog.mustBe7zArchiveSkipping, file.name));
          }
        }
      }
    }

    dispatch(setTask({
      id: newTask.id,
      status: '',
      finished: true
    }));
  };

  const leftSidebar = <CuratePageLeftSidebar
    logoVersion={logoVersion}
    onCurationDrop={onLoadCurationDrop}/>;

  const keybindsRender = (
    <div className='curate-page-keybinds-box'>
      <h3>{strings.curate.shortcuts}</h3>
      <table>
        <tbody>
          {shortcut && shortcut.shortcuts.filter(s => s.title.startsWith('curate:')).map((binding, idx) => (
            <tr key={idx} className='curate-page-keybinds-box-row'>
              <td>
                {filterKeysByOS(binding.keys).map((combo, idx) => {
                  return (
                    <div key={binding.title + idx} className='curate-page-keybinds-box-combo'>
                      {combo}
                    </div>
                  );
                })}
              </td>
              <td>{binding.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const dependantStrings = curate.selected.length > 1 ? {
    import: strings.curate.importSelected,
    export: strings.curate.exportSelected,
    delete: strings.curate.deleteSelected,
    exportDataPack: strings.curate.exportSelectedDataPacks
  } : {
    import: strings.curate.import,
    export: strings.curate.export,
    delete: strings.curate.delete,
    exportDataPack: strings.curate.exportDataPacks
  };

  return curate.loaded ? (
    <div className='curate-page'>
      {fileLoader}
      {leftSidebar}
      <div className='curate-page__center simple-scroll'>
        <div className='curate-page-keybinds'>
          <OpenIcon icon='info'/>
          {keybindsRender}
        </div>
        { curation ? (
          <CurateBox
            curation={curation}
            suggestions={suggestions}
            tagCategories={tagCategories}
            platformAppPaths={platformAppPaths}
            tagText={tagText}
            platformText={platformText}
            onPlatformTextChange={onPlatformTextChange}
            onTagTextChange={onTagTextChange}
            tagSuggestions={tagSuggestions}
            platformSuggestions={platformSuggestions}
            logoVersion={logoVersion}
            symlinkCurationContent={symlinkCurationContent} />
        ) : (
          <div className='curate-page__header-text'>
            {strings.curate.noCurationSelected}
          </div>
        )}
      </div>
      <div className='curate-page__right simple-scroll'>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerFileOperations}</div>
          { curationTemplateButtons.length > 0 && (
            <Dropdown
              className='curate-page__right--button'
              headerClassName='simple-dropdown-button'
              text={strings.curate.newCurationFromTemplate}>
              {curationTemplateButtons}
            </Dropdown>
          )}
          <SimpleButton
            className='curate-page__right--button'
            onClick={() => onNewCuration()}
            value={strings.curate.newCuration}/>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onDupeCurations}
            disabled={disabled}
            value={strings.curate.duplicateCuration}/>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onLoadCuration}
            value={strings.curate.loadArchive}/>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onScanForNewCurations}
            value={strings.curate.scanNewCurationFolders}/>
          { window.electronAPI !== undefined && (
            <SimpleButton
              className='curate-page__right--button'
              onClick={onOpenCurationsFolder}
              value={strings.curate.openCurationsFolder}
              title={strings.curate.openCurationsFolderDesc}/>
          )}
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerEditCuration}</div>
          { window.electronAPI !== undefined && (
            <SimpleButton
              className='curate-page__right--button'
              onClick={onOpenCurationFolder}
              disabled={disabled}
              value={strings.curate.openFolder}/>
          )}
          <ConfirmElement
            render={renderConfirmButton}
            message={strings.dialog.deleteCuration}
            onConfirm={onDeleteCurations}
            extra={{
              className: 'curate-page__right--button',
              value: dependantStrings.delete,
              disabled
            }}/>
          <ConfirmElement
            render={renderConfirmButton}
            message={warningCount > 0 ? strings.dialog.importCurationWithWarnings : strings.dialog.importCuration}
            onConfirm={onImportCuration}
            extra={{
              className: 'curate-page__right--button',
              value: dependantStrings.import,
              disabled
            }}/>
          { warningCount > 0 ? (
            <ConfirmElement
              render={renderConfirmButton}
              message={strings.dialog.exportCurationWithWarnings}
              onConfirm={onExportCurations}
              extra={{
                className: 'curate-page__right--button',
                value: dependantStrings.export,
                disabled
              }}/>
          ) : (
            <SimpleButton
              className='curate-page__right--button'
              onClick={onExportCurations}
              disabled={disabled}
              value={dependantStrings.export}/>
          )}
          <ConfirmElement
            render={renderConfirmButton}
            message={'Are you sure?'}
            onConfirm={onRegenerateUUID}
            extra={{
              className: 'curate-page__right--button',
              value: 'Regenerate UUID',
              disabled
            }}/>
          { warningCount > 0 ? (
            <ConfirmElement
              render={renderConfirmButton}
              message={strings.dialog.exportCurationWithWarnings}
              onConfirm={onExportDataPacks}
              extra={{
                className: 'curate-page__right--button',
                value: dependantStrings.exportDataPack,
                disabled
              }}/>
          ) : (
            <SimpleButton
              className='curate-page__right--button'
              onClick={onExportDataPacks}
              disabled={disabled}
              value={dependantStrings.exportDataPack}/>
          )}
          <SimpleButton
            className='curate-page__right--button'
            onClick={() => {
              if (currentCuration) {
                window.Shared.back.request(BackIn.CURATE_REFRESH_CONTENT, currentCuration);
              }
            }}
            disabled={disabled}
            value={strings.curate.indexContent}/>
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.useTagFilters}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onTagFiltersInCurateChange}
              checked={tagFiltersInCurate} />
          </div>
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.saveImportedCurations}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onSaveImportedCurationChange}
              checked={saveImportedCurations} />
          </div>
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerTest}</div>
          <SimpleButton
            className='curate-page__right--button'
            disabled={disabled}
            value={strings.curate.run}
            onClick={onRunCuration}/>
          { mad4fpEnabled && (
            <SimpleButton
              className='curate-page__right--button'
              disabled={disabled || !symlinkCurationContent}
              value={strings.curate.runWithMAD4FP}
              onClick={onRunMAD4FPCuration}/>
          )}
          <SimpleButton
            className='curate-page__right--button'
            disabled={disabled || !curation.game.launchCommand?.endsWith('.swf')}
            value={strings.browse.runWithFlashPlayer}
            onClick={() => onRunCurationOverride('flash')}/>
          <SimpleButton
            className='curate-page__right--button'
            disabled={disabled || (!curation.game.launchCommand?.endsWith('.swf') && !curation.game.ruffleSupport)}
            value={(curation?.game.ruffleSupport) ? strings.browse.runWithRuffle : strings.browse.runWithRuffleUnsupported}
            onClick={() => onRunCurationOverride('ruffle')}/>
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.symlinkCurationContent}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onSymlinkCurationContentChange}
              checked={symlinkCurationContent} />
          </div>
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerFpfss}</div>
          <SimpleButton
            className='curate-page__right--button'
            disabled={curation ? !curation.fpfssInfo : true}
            value={strings.curate.fpfssOpenSubmissionPage}
            onClick={onOpenSubmissionPage}/>
        </div>
        {extButtons}
      </div>
    </div>
  ) : (
    <div>Loading</div>
  );
}

function renderConfirmButton({ confirm, extra }: ConfirmElementArgs<SimpleButtonProps>) {
  return (
    <SimpleButton
      onClick={confirm}
      { ...extra }/>
  );
}

export function newCurateTask(name: string, status: string): Task {
  const task: Task = {
    id: uuid(),
    name,
    status,
    progress: 0,
    finished: false
  };
  return task;
}

function filterKeysByOS(keys: string[]): string[] {
  const platform = process.platform;
  return keys.filter((key) => {
    if (key.startsWith('ctrl') && platform === 'darwin') { return false; }
    if (key.startsWith('meta') && platform !== 'darwin') { return false; }
    return true;
  }).map(formatKeybind);
}

function formatKeybind(key: string): string {
  return key.split('+').map(s => s.toUpperCase()).join(' + ');
}
