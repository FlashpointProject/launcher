import * as remote from '@electron/remote';
import { CurateBox } from '@renderer/components/CurateBox';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { WithTasksProps } from '@renderer/containers/withTasks';
import { axios, getCurationPostURL, getPlatformIconURL } from '@renderer/Util';
import { eventResponseDebouncerFactory } from '@shared/eventResponseDebouncer';
import { LangContext } from '@renderer/util/lang';
import { BackIn } from '@shared/back/types';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { ExtensionContribution } from '@shared/extensions/interfaces';
import { CustomIPC, Task } from '@shared/interfaces';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { ipcRenderer } from 'electron';
import { AppPreferencesData, CurationState, TagSuggestion } from 'flashpoint-launcher';
import * as path from 'path';
import * as React from 'react';
import { IWithShortcut } from 'react-keybind';
import { CheckBox } from '../CheckBox';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { CuratePageLeftSidebar } from '../CuratePageLeftSidebar';
import { Dropdown } from '../Dropdown';
import { OpenIcon } from '../OpenIcon';
import { SimpleButton, SimpleButtonProps } from '../SimpleButton';
import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useDispatch } from 'react-redux';
import * as curateActions from '@renderer/store/curate/slice';
import { setTask } from '@renderer/store/tasks/slice';

type OwnProps = {
  extCurationTemplates: ExtensionContribution<'curationTemplates'>[];
  extContextButtons: ExtensionContribution<'contextButtons'>[];
  mad4fpEnabled: boolean;
  logoVersion: number;
}

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithConfirmDialogProps & WithTasksProps & IWithShortcut;

export function CuratePage(props: CuratePageProps) {
  const strings = React.useContext(LangContext);
  const curate = useAppSelector((state) => state.curate);
  const dispatch = useDispatch();
  const curation: CurationState | undefined = curate.curations.find(c => c.folder === curate.current);

  const suggsDebounce = eventResponseDebouncerFactory<TagSuggestion[]>();

  const [tagText, setTagText] = React.useState<string>('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);
  const [platformText, setPlatformText] = React.useState<string>('');
  const [platformSuggestions, setPlatformSuggestions] = React.useState<TagSuggestion[]>([]);

  const onCheckboxChange = (key: keyof AppPreferencesData) => React.useCallback((checked: boolean) => {
    updatePreferencesData({ [key]: checked });
  }, []);

  const onSymlinkCurationContentChange = onCheckboxChange('symlinkCurationContent');
  const onSaveImportedCurationChange = onCheckboxChange('saveImportedCurations');
  const onTagFiltersInCurateChange = onCheckboxChange('tagFiltersInCurate');

  const onOpenSubmissionPage = () => {
    if (curation?.fpfssInfo) {
      const subPage = `${props.preferencesData.fpfssBaseUrl}/web/submission/${curation.fpfssInfo.id}`;
      remote.shell.openExternal(subPage);
    }
  };

  const onDupeCurations = React.useCallback(() => {
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
  }, [curate.selected]);

  const onScanForNewCurations = React.useCallback(() => {
    window.Shared.back.send(BackIn.CURATE_SCAN_NEW_CURATIONS);
  }, []);

  const onLoadCuration = React.useCallback(() => {
    // Generate task
    ipcRenderer.invoke(CustomIPC.SHOW_OPEN_DIALOG, {
      title: strings.dialog.selectCurationArchive,
      properties: [ 'multiSelections' ],
    })
    .then(value => {
      const filePaths = value.filePaths;
      if (filePaths.length > 0) {
        const newTask = newCurateTask(`Loading ${filePaths.length} Archives`, 'Loading...', props.addTask);
        window.Shared.back.send(BackIn.CURATE_LOAD_ARCHIVES, filePaths, newTask.id);
      }
    });
  }, []);

  const onNewCuration = React.useCallback((meta?: EditCurationMeta) => {
    dispatch(curateActions.createCuration({
      folder: uuid(),
      meta
    }));
  }, []);

  // Keybinds

  // Prev Curation
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        if (curate.current) {
          // Find current curation, shift 1 up or wrap
          const curationIdx = curate.curations.findIndex(c => c.folder === curate.current);
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
      }, props.preferencesData.shortcuts.curate.prev, 'Prev', 'Previous Curation');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.prev);
      }
    };
  }, [curate.current, curate.curations, props.preferencesData.shortcuts.curate.prev]);

  // Next Curation
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        if (curate.current) {
          // Find current curation, shift 1 down or wrap
          const curationIdx = curate.curations.findIndex(c => c.folder === curate.current);
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
      }, props.preferencesData.shortcuts.curate.next, 'curate:Next', 'Next Curation');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.next);
      }
    };
  }, [curate.current, curate.curations, props.preferencesData.shortcuts.curate.next]);

  // New Curation
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        onNewCuration();
      }, props.preferencesData.shortcuts.curate.newCur, 'curate:New', 'New Curation');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.newCur);
      }
    };
  }, [props.preferencesData.shortcuts.curate.newCur]);

  // Load Archives
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        onLoadCuration();
      }, props.preferencesData.shortcuts.curate.load, 'curate:Load Archives', 'Load Curation Archives');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.load);
      }
    };
  }, [props.preferencesData.shortcuts.curate.load]);

  // Refresh content tree
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        if (curate.current) {
          window.Shared.back.request(BackIn.CURATE_REFRESH_CONTENT, curate.current);
        }
      }, props.preferencesData.shortcuts.curate.refresh, 'curate:Refresh', 'Refresh Active Curation + Content Tree');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.refresh);
      }
    };
  }, [curate.current, props.preferencesData.shortcuts.curate.refresh]);

  // Export selected
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        if (curate.selected.length > 0) {
          const newTask = newCurateTask(`Exporting ${curate.selected.length} Curations`, 'Exporting...', props.addTask);
          dispatch(curateActions.exportCurations({
            taskId: newTask.id
          }));
        }
      }, props.preferencesData.shortcuts.curate.exportCurs, 'curate:Export', 'Export Selected Curations');
      props.shortcut.registerShortcut(() => {
        if (curate.selected.length > 0) {
          const newTask = newCurateTask(`Exporting Data Packs for ${curate.selected.length} Curations`, 'Exporting...', props.addTask);
          dispatch(curateActions.exportCurationDataPacks({
            taskId: newTask.id
          }));
        }
      }, props.preferencesData.shortcuts.curate.exportDataPacks, 'curate:Export Data Packs', 'Export Data Packs for Selected Curations');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.exportCurs);
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.exportDataPacks);
      }
    };
  }, [curate.selected, props.preferencesData.shortcuts.curate.exportCurs, props.preferencesData.shortcuts.curate.exportDataPacks]);

  // Test Run
  React.useEffect(() => {
    if (props.shortcut && props.shortcut.registerShortcut) {
      props.shortcut.registerShortcut(() => {
        if (curation) {
          window.Shared.back.request(BackIn.LAUNCH_CURATION, {
            curation,
            mad4fp: false,
            symlinkCurationContent: props.preferencesData.symlinkCurationContent
          });
        }
      }, props.preferencesData.shortcuts.curate.run, 'curate:Test', 'Run Active Curation');
      props.shortcut.registerShortcut(() => {
        if (curation && props.preferencesData.symlinkCurationContent) {
          window.Shared.back.request(BackIn.LAUNCH_CURATION, {
            curation,
            mad4fp: true,
            symlinkCurationContent: props.preferencesData.symlinkCurationContent
          });
        }
      }, props.preferencesData.shortcuts.curate.runMad4fp, 'curate:Test MAD4FP', 'Run Active Curation with MAD4FP');
    }
    return () => {
      if (props.shortcut && props.shortcut.unregisterShortcut) {
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.run);
        props.shortcut.unregisterShortcut(props.preferencesData.shortcuts.curate.runMad4fp);
      }
    };
  }, [curation, props.preferencesData.symlinkCurationContent, props.preferencesData.shortcuts.curate.run, props.preferencesData.shortcuts.curate.runMad4fp]);

  const onTagTextChange = React.useCallback((tagText: string) => {
    const splitTags = tagText.split(';');
    const lastTag = (splitTags.length > 0 ? splitTags.pop() || '' : '').trim();
    setTagText(tagText);
    if (tagText !== '') {
      suggsDebounce.dispatch(window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, lastTag, props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !props.preferencesData.browsePageShowExtreme))), setTagSuggestions);
    } else {
      suggsDebounce.invalidate();
      setTagSuggestions([]);
    }
  }, [setTagText, setTagSuggestions]);

  const onPlatformTextChange = React.useCallback((platformText: string) => {
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
  }, [setPlatformText, setPlatformSuggestions]);

  const onOpenCurationsFolder = React.useCallback(async () => {
    await remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations'));
  }, []);

  const onOpenCurationFolder = React.useCallback(async () => {
    if (curation) {
      await remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder));
    }
  }, [curation]);

  const onImportCuration = React.useCallback(async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Importing ${curate.selected.length} Curations`, 'Importing...', props.addTask);
      dispatch(curateActions.importCurations({
        taskId: newTask.id
      }));
    }
  }, [curate.selected]);

  const onRegenerateUUID = React.useCallback(async () => {
    if (curation) {
      dispatch(curateActions.regenUuid({
        folder: curation.folder
      }));
    }
  }, [curation, dispatch]);

  const onExportDataPacks = React.useCallback(async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Exporting Data Packs for ${curate.selected.length} Curations`, 'Exporting...', props.addTask);
      dispatch(curateActions.exportCurationDataPacks({
        taskId: newTask.id
      }));
    }
  }, [curate.selected, dispatch]);

  const onExportCurations = React.useCallback(async () => {
    if (curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Exporting ${curate.selected.length} Curations`, 'Exporting...', props.addTask);
      dispatch(curateActions.exportCurations({
        taskId: newTask.id
      }));
    }
  }, [curate.selected]);

  const onDeleteCurations = React.useCallback(async () => {
    if (curate.selected.length > 0) {
      const task = newCurateTask(`Deleting ${curate.selected.length} Curations`, 'Deleting...', props.addTask);
      dispatch(curateActions.deleteCurations({
        taskId: task.id
      }));
    }
  }, [curate.selected]);

  const onRunCuration = React.useCallback(async () => {
    if (curation) {
      window.Shared.back.send(BackIn.LAUNCH_CURATION, {
        curation,
        mad4fp: false,
        symlinkCurationContent: props.preferencesData.symlinkCurationContent
      });
    }
  }, [curation]);

  const onRunMAD4FPCuration = React.useCallback(async () => {
    if (curation) {
      window.Shared.back.send(BackIn.LAUNCH_CURATION, {
        curation,
        mad4fp: true,
        symlinkCurationContent: props.preferencesData.symlinkCurationContent
      });
    }
  }, [curation]);

  const warningCount = React.useMemo(() => curation ? curation.warnings.writtenWarnings.length : 0, [curation]);
  const disabled = !curation;

  const runExtCommand = (command: string) => {
    window.Shared.back.send(BackIn.RUN_COMMAND, command, [curation, curate.selected]);
  };

  // Gen extension buttons
  const extButtons = React.useMemo(() =>
    props.extContextButtons.map((c, index) => {
      const ext = props.main.extensions.find(e => e.id === c.extId);
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
    }), [disabled, props.extContextButtons, curate]);

  const curationTemplateButtons = React.useMemo(() => {
    const arrays = props.extCurationTemplates.map(c => {
      return c.value.map((template, index) => {
        return (
          <label
            className='curate-page__right-dropdown-content simple-dropdown-button'
            key={index}
            onClick={() => {
              onNewCuration(template.meta);
            }}>
            <div
              className='curate-page__right-dropdown-content-icon'
              style={{ backgroundImage: `url('${getPlatformIconURL(template.logo, props.main.logoVersion)}')` }} />
            <div>
              {template.name}
            </div>
          </label>
        );
      });
    });
    return arrays.reduce((prev, cur) => prev.concat(cur), []);
  }, [props.extCurationTemplates]);

  const onLoadCurationDrop = React.useCallback(async (event: React.DragEvent) => {
    const files = event.dataTransfer.files;
    const newTask = newCurateTask(`Loading ${files.length} Archives`, 'Loading...', props.addTask);

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
  }, []);

  const leftSidebar = React.useMemo(() => (
    <CuratePageLeftSidebar
      logoVersion={props.main.logoVersion}
      onCurationDrop={onLoadCurationDrop}/>
  ), [curate, props.main.logoVersion]);

  const keybindsRender = React.useMemo(() => {
    return (
      <div className='curate-page-keybinds-box'>
        <h3>{strings.curate.shortcuts}</h3>
        <table>
          <tbody>
            {props.shortcut && props.shortcut.shortcuts.filter(s => s.title.startsWith('curate:')).map((binding, idx) => (
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
  }, [props.shortcut]);

  const dependantStrings = React.useMemo(() => {
    if (curate.selected.length > 1) {
      return {
        import: strings.curate.importSelected,
        export: strings.curate.exportSelected,
        delete: strings.curate.deleteSelected,
        exportDataPack: strings.curate.exportSelectedDataPacks
      };
    } else {
      return {
        import: strings.curate.import,
        export: strings.curate.export,
        delete: strings.curate.delete,
        exportDataPack: strings.curate.exportDataPacks
      };
    }
  }, [curate.selected]);

  return (
    <div className='curate-page'>
      {leftSidebar}
      <div className='curate-page__center simple-scroll'>
        <div className='curate-page-keybinds'>
          <OpenIcon icon='info'/>
          {keybindsRender}
        </div>
        { curation ? (
          <CurateBox
            curation={curation}
            suggestions={props.main.suggestions}
            tagCategories={props.tagCategories}
            platformAppPaths={props.main.platformAppPaths}
            tagText={tagText}
            platformText={platformText}
            onPlatformTextChange={onPlatformTextChange}
            onTagTextChange={onTagTextChange}
            tagSuggestions={tagSuggestions}
            platformSuggestions={platformSuggestions}
            logoVersion={props.logoVersion}
            symlinkCurationContent={props.preferencesData.symlinkCurationContent} />
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
          <SimpleButton
            className='curate-page__right--button'
            onClick={onOpenCurationsFolder}
            value={strings.curate.openCurationsFolder}
            title={strings.curate.openCurationsFolderDesc}/>
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerEditCuration}</div>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onOpenCurationFolder}
            disabled={disabled}
            value={strings.curate.openFolder}/>
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
              if (curate.current) {
                window.Shared.back.request(BackIn.CURATE_REFRESH_CONTENT, curate.current);
              }
            }}
            disabled={disabled}
            value={strings.curate.indexContent}/>
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.useTagFilters}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onTagFiltersInCurateChange}
              checked={props.preferencesData.tagFiltersInCurate} />
          </div>
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.saveImportedCurations}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onSaveImportedCurationChange}
              checked={props.preferencesData.saveImportedCurations} />
          </div>
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerTest}</div>
          <SimpleButton
            className='curate-page__right--button'
            disabled={disabled}
            value={strings.curate.run}
            onClick={onRunCuration}/>
          { props.mad4fpEnabled && (
            <SimpleButton
              className='curate-page__right--button'
              disabled={disabled || !props.preferencesData.symlinkCurationContent}
              value={strings.curate.runWithMAD4FP}
              onClick={onRunMAD4FPCuration}/>
          )}
          <div className='curate-page__right--checkbox'>
            <div>{strings.curate.symlinkCurationContent}</div>
            <CheckBox
              className='browse-right-sidebar__row__check-box'
              onToggle={onSymlinkCurationContentChange}
              checked={props.preferencesData.symlinkCurationContent} />
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
  );
}

function renderConfirmButton({ confirm, extra }: ConfirmElementArgs<SimpleButtonProps>) {
  return (
    <SimpleButton
      onClick={confirm}
      { ...extra }/>
  );
}

export function newCurateTask(name: string, status: string, addTask: (task: Task) => void): Task {
  const task: Task = {
    id: uuid(),
    name,
    status,
    progress: 0,
    finished: false
  };
  addTask(task);
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
