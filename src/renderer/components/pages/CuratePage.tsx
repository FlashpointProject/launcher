import { CurateBox } from '@renderer/components/CurateBox';
import { WithCurateStateProps } from '@renderer/containers/withCurateState';
import { WithMainStateProps } from '@renderer/containers/withMainState';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { useMouse } from '@renderer/hooks/useMouse';
import { CurateActionType } from '@renderer/store/curate/enums';
import { findElementAncestor, getPlatformIconURL } from '@renderer/Util';
import { LangContext } from '@renderer/util/lang';
import { uuid } from '@renderer/util/uuid';
import { BackIn, TagSuggestion } from '@shared/back/types';
import * as electron from 'electron';
import * as React from 'react';
import { SimpleButton, SimpleButtonProps } from '../SimpleButton';
import * as path from 'path';
import { compare } from '@back/util/strings';
import { CurationState } from '@shared/curate/types';
import { getWarningCount } from '../CurateBoxWarnings';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';
import { ConfirmElement, ConfirmElementArgs } from '../ConfirmElement';
import { ExtensionContribution } from '@shared/extensions/interfaces';

const index_attr = 'data-index';

type OwnProps = {
  extContribs: ExtensionContribution<'contextButtons'>[];
}

export type CuratePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps & WithMainStateProps & WithCurateStateProps & WithConfirmDialogProps;

export function CuratePage(props: CuratePageProps) {
  const curation: CurationState | undefined = props.curate.curations.find(c => c.folder === props.curate.current);
  const strings = React.useContext(LangContext);

  const [tagText, setTagText] = React.useState<string>('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);

  const onTagTextChange = React.useCallback((tagText: string) => {
    setTagText(tagText);
    if (tagText !== '') {
      window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, tagText, props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !props.preferencesData.browsePageShowExtreme)))
      .then(setTagSuggestions);
    } else {
      setTagSuggestions([]);
    }
  }, [setTagText, setTagSuggestions]);

  const [onListMouseDown, onListMouseUp] = useMouse<string>(() => ({
    chain_delay: 500,
    find_id: (event) => {
      let index: string | undefined;
      try { index = findAncestorRowIndex(event.target as Element); }
      catch (error) { console.error(error); }
      return index;
    },
    on_click: (event, id, clicks) => {
      if (event.button === 0 && clicks === 1) { // Single left click
        props.dispatchCurate({
          type: CurateActionType.SET_CURRENT_CURATION,
          folder: id,
        });
      }
    },
  }));

  const onNewCuration = React.useCallback(() => {
    props.dispatchCurate({
      type: CurateActionType.CREATE_CURATION,
      folder: uuid(),
    });
  }, []);

  const onLoadCuration = React.useCallback(() => {
    electron.remote.dialog.showOpenDialog({
      title: strings.dialog.selectCurationArchive,
    })
    .then(value => window.Shared.back.send(BackIn.CURATE_LOAD_ARCHIVES, value.filePaths));
  }, []);

  const onOpenCurationsFolder = React.useCallback(() => {
    electron.remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations'));
  }, []);

  const onOpenCurationFolder = React.useCallback(() => {
    if (curation) {
      electron.remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder));
    }
  }, [curation]);

  const onImportCuration = React.useCallback(async () => {
    if (curation) {
      props.dispatchCurate({
        type: CurateActionType.IMPORT,
        folder: curation.folder,
        saveCuration: props.preferencesData.saveImportedCurations
      });
    }
  }, [curation]);

  const onDeleteCuration = React.useCallback(async () => {
    if (curation) {
      props.dispatchCurate({
        type: CurateActionType.DELETE,
        folder: curation.folder
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
    props.extContribs.map((c, index) => {
      const ext = props.main.extensions.find(e => e.id === c.extId);
      const buttons = c.value.filter(c => c.context === 'curation').map((contextButton, index) => (
        <SimpleButton
          key={index}
          className='curate-page__right--button'
          disabled={disabled}
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
    }), [disabled, props.extContribs]);

  return (
    <div className='curate-page'>
      <div
        className='curate-page__left simple-scroll'
        onMouseDown={onListMouseDown}
        onMouseUp={onListMouseUp}>
        {props.curate.curations.sort((a,b) => compare(a.game.title || `ZZZZZ_${a.folder}`, b.game.title || `ZZZZZ_${b.folder}`)).map((curation, index) => (
          <div
            className={
              'curate-list-item'+
              ((curation.folder === props.curate.current) ? ' curate-list-item--selected' : '')
            }
            key={curation.folder}
            { ...{ [index_attr]: curation.folder } }>
            <div
              className='curate-list-item__icon'
              style={{ backgroundImage: `url('${getPlatformIconURL('Flash'/* curation.meta.platform*/, props.main.logoVersion)}')` }} />
            <p className='curate-list-item__title'>
              {curation.game.title || curation.folder}
            </p>
          </div>
        ))}
      </div>
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
          <SimpleButton
            className='curate-page__right--button'
            onClick={onNewCuration}
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
            onConfirm={onDeleteCuration}
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

function findAncestorRowIndex(element: Element): string | undefined {
  const ancestor = findElementAncestor(element, target => target.getAttribute(index_attr) !== null, true);
  if (!ancestor) { return undefined; }

  const index = ancestor.getAttribute(index_attr);
  if (typeof index !== 'string') { throw new Error('Failed to get attribute from ancestor!'); }

  const index_str = (index as any) + ''; // Coerce to number

  return index_str;
}
