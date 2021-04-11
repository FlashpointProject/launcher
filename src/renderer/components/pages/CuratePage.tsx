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
import { SimpleButton } from '../SimpleButton';
import * as path from 'path';
import { compare } from '@back/util/strings';
import { CurationState } from '@shared/curate/types';
import { getWarningCount } from '../CurateBoxWarnings';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';

const index_attr = 'data-index';

type OwnProps = {

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

  const onOpenCurationFolder = React.useCallback(() => {
    if (curation) {
      const p = path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder);
      console.log(p);
      electron.remote.shell.openExternal(path.join(window.Shared.config.fullFlashpointPath, 'Curations', 'Working', curation.folder));
    }
  }, [curation]);

  const onImportCuration = React.useCallback(async () => {
    if (curation) {
      const warningCount = getWarningCount(curation.warnings);
      const importMessage = warningCount > 0 ? strings.dialog.importCurationWithWarnings : strings.dialog.importCuration;
      // Check if we still want to import
      const res = await props.openConfirmDialog(importMessage, [strings.misc.yes, strings.misc.no], 1, true);
      if (res === 1) {
        // Rejected, abort import
        return;
      }
      props.dispatchCurate({
        type: CurateActionType.IMPORT,
        folder: curation.folder,
        saveCuration: props.preferencesData.saveImportedCurations
      });
    }
  }, [curation]);

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
        </div>
        <div className='curate-page__right--section'>
          <div className='curate-page__right--header'>{strings.curate.headerEditCuration}</div>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onOpenCurationFolder}
            disabled={!curation}
            value={strings.curate.openFolder}/>
          <SimpleButton
            className='curate-page__right--button'
            onClick={onImportCuration}
            disabled={!curation}
            value={strings.curate.import}/>
        </div>
      </div>
    </div>
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
