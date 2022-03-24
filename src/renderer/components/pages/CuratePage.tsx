import * as remote from '@electron/remote';
import { CurateBox } from '@renderer/components/CurateBox';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';
import { WithCurateStateProps } from '@renderer/containers/withCurateState';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { WithTasksProps } from '@renderer/containers/withTasks';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateGroup } from '@renderer/store/curate/types';
import { getCurationPostURL, getPlatformIconURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { uuid } from '@renderer/util/uuid';
import { BackIn, TagSuggestion } from '@shared/back/types';
import { EditCurationMeta } from '@shared/curate/OLD_types';
import { CurationState } from '@shared/curate/types';
import { ExtensionContribution } from '@shared/extensions/interfaces';
import { Task } from '@shared/interfaces';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import axios from 'axios';
import * as path from 'path';
import * as React from 'react';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { getWarningCount } from '../CurateBoxWarnings';
import { CuratePageLeftSidebar } from '../CuratePageLeftSidebar';
import { Dropdown } from '../Dropdown';
import { SimpleButton, SimpleButtonProps } from '../SimpleButton';

type OwnProps = {
  extCurationTemplates: ExtensionContribution<'curationTemplates'>[];
  extContextButtons: ExtensionContribution<'contextButtons'>[];
  mad4fpEnabled: boolean;
}

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithCurateStateProps & WithConfirmDialogProps & WithTasksProps;

export function CuratePage(props: CuratePageProps) {
  const curation: CurationState | undefined = props.curate.curations.find(c => c.folder === props.curate.current);
  const strings = React.useContext(LangContext);

  const [tagText, setTagText] = React.useState<string>('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);

  const onTagTextChange = React.useCallback((tagText: string) => {
    const splitTags = tagText.split(';');
    const lastTag = (splitTags.length > 0 ? splitTags.pop() || '' : '').trim();
    setTagText(tagText);
    if (tagText !== '') {
      window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, lastTag, props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !props.preferencesData.browsePageShowExtreme)))
      .then(setTagSuggestions);
    } else {
      setTagSuggestions([]);
    }
  }, [setTagText, setTagSuggestions]);

  const onLeftSidebarCurationClick = React.useCallback((folder: string, ctrl?: boolean, shift?: boolean) => {
    props.dispatchCurate({
      type: CurateActionType.SET_CURRENT_CURATION,
      folder,
      ctrl,
      shift
    });
  }, [props.curate]);

  const onNewCuration = React.useCallback((meta?: EditCurationMeta) => {
    props.dispatchCurate({
      type: CurateActionType.CREATE_CURATION,
      folder: uuid(),
      meta
    });
  }, []);

  const onLoadCuration = React.useCallback(() => {
    // Generate task
    remote.dialog.showOpenDialog({
      title: strings.dialog.selectCurationArchive,
      properties: [ 'multiSelections' ],
    })
    .then(value => {
      if (value.filePaths.length > 0) {
        const newTask = newCurateTask(`Loading ${value.filePaths.length} Archives`, 'Loading...', props.addTask);
        window.Shared.back.send(BackIn.CURATE_LOAD_ARCHIVES, value.filePaths, newTask.id);
      }
    });
  }, []);

  const onOpenCurationsFolder = React.useCallback(async () => {
    await remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations'));
  }, []);

  const onOpenCurationFolder = React.useCallback(async () => {
    if (curation) {
      await remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder));
    }
  }, [curation]);

  const onImportCuration = React.useCallback(async () => {
    if (props.curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Importing ${props.curate.selected.length} Curations`, 'Importing...', props.addTask);
      props.dispatchCurate({
        type: CurateActionType.IMPORT,
        folders: props.curate.selected,
        saveCuration: props.preferencesData.saveImportedCurations,
        taskId: newTask.id
      });
    }
  }, [props.curate.selected]);

  const onRegenerateUUID = React.useCallback(async () => {
    if (curation) {
      props.dispatchCurate({
        type: CurateActionType.REGEN_UUID,
        folder: curation.folder
      });
    }
  }, [curation, props.dispatchCurate]);

  const onExportCurations = React.useCallback(async () => {
    if (props.curate.selected.length > 0) {
      // Generate task
      const newTask = newCurateTask(`Exporting ${props.curate.selected.length} Curations`, 'Exporting...', props.addTask);
      props.dispatchCurate({
        type: CurateActionType.EXPORT,
        folders: props.curate.selected,
        taskId: newTask.id
      });
    }
  }, [props.curate.selected]);

  const onDeleteCurations = React.useCallback(async () => {
    if (props.curate.selected.length > 0) {
      const task = newCurateTask(`Deleting ${props.curate.selected.length} Curations`, 'Deleting...', props.addTask);
      props.dispatchCurate({
        type: CurateActionType.DELETE,
        folders: props.curate.selected,
        taskId: task.id,
      });
    }
  }, [props.curate.selected]);

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

  const warningCount = React.useMemo(() => curation ? getWarningCount(curation.warnings) : 0, [curation]);
  const disabled = !curation;

  const runExtCommand = (command: string) => {
    window.Shared.back.send(BackIn.RUN_COMMAND, command, [curation]);
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
    }), [disabled, props.extContextButtons]);

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
          props.setTask(newTask.id, {
            status: `Loading ${file.name}`,
            progress: i / files.length
          });
          if (file.name.endsWith('.7z')) {
            await axios.post(getCurationPostURL(), await file.arrayBuffer());
          } else {
            alert(formatString(strings.dialog.mustBe7zArchiveSkipping, file.name));
          }
        }
      }
    }

    props.setTask(newTask.id, { finished: true });
  }, []);

  const onToggleGroupCollapse = React.useCallback((group: string) => {
    props.dispatchCurate({
      type: CurateActionType.TOGGLE_GROUP_COLLAPSE,
      group
    });
  }, [props.dispatchCurate]);

  const onToggleGroupPin = React.useCallback((group: CurateGroup) => {
    props.dispatchCurate({
      type: CurateActionType.TOGGLE_GROUP_PIN,
      group
    });
  }, [props.dispatchCurate]);

  const createNewGroup = React.useCallback((group: string) => {
    if (props.curate.groups.findIndex(g => g.name === group) === -1) {
      const newGroups = [ ...props.curate.groups, { name: group, icon: '' }];
      updatePreferencesData({
        groups: newGroups
      });
      props.dispatchCurate({
        type: CurateActionType.NEW_PERSISTANT_GROUP,
        name: group,
        icon: ''
      });
    }
  }, [props.dispatchCurate]);

  const moveCurationToGroup = React.useCallback((folder: string, group: string) => {
    props.dispatchCurate({
      type: CurateActionType.CHANGE_GROUP,
      folder,
      group,
    });
  }, [props.dispatchCurate]);

  const onSelectGroup = React.useCallback((group: string) => {
    props.dispatchCurate({
      type: CurateActionType.SET_CURRENT_CURATION_GROUP,
      group
    });
  }, [props.dispatchCurate]);

  const leftSidebar = React.useMemo(() => (
    <CuratePageLeftSidebar
      curate={props.curate}
      logoVersion={props.main.logoVersion}
      onCurationSelect={onLeftSidebarCurationClick}
      onCurationDrop={onLoadCurationDrop}
      onToggleGroupCollapse={onToggleGroupCollapse}
      onToggleGroupPin={onToggleGroupPin}
      onSelectGroup={onSelectGroup}
      createNewGroup={createNewGroup}
      moveCurationToGroup={moveCurationToGroup}/>
  ), [props.curate, props.main.logoVersion]);

  return (
    <div className='curate-page'>
      {leftSidebar}
      <div className='curate-page__center simple-scroll'>
        { curation ? (
          <CurateBox
            curation={curation}
            suggestions={props.main.suggestions}
            tagCategories={props.tagCategories}
            tagText={tagText}
            onTagTextChange={onTagTextChange}
            tagSuggestions={tagSuggestions}
            dispatch={props.dispatchCurate}
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
            onClick={onLoadCuration}
            value={strings.curate.loadArchive}/>
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
              value: strings.curate.delete,
              disabled
            }}/>
          <ConfirmElement
            render={renderConfirmButton}
            message={warningCount > 0 ? strings.dialog.importCurationWithWarnings : strings.dialog.importCuration}
            onConfirm={onImportCuration}
            extra={{
              className: 'curate-page__right--button',
              value: strings.curate.import,
              disabled
            }}/>
          { warningCount > 0 ? (
            <ConfirmElement
              render={renderConfirmButton}
              message={strings.dialog.exportCurationWithWarnings}
              onConfirm={onExportCurations}
              extra={{
                className: 'curate-page__right--button',
                value: strings.curate.export,
                disabled
              }}/>
          ) : (
            <SimpleButton
              className='curate-page__right--button'
              onClick={onExportCurations}
              disabled={disabled}
              value={strings.curate.export}/>
          )}
          <ConfirmElement
            render={renderConfirmButton}
            message={'Are you sure?'}
            onConfirm={onRegenerateUUID}
            extra={{
              className: 'curate-page__right--button',
              value: 'Regenerate UUID',
              disabled
            }}
            />
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

function newCurateTask(name: string, status: string, addTask: (task: Task) => void): Task {
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
