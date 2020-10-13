import { CurateBoxCheckBox } from '@renderer/components/CurateBoxCheckBoxRow';
import { CurateBoxDropdownInputRow, CurateBoxInputRow } from '@renderer/components/CurateBoxInputRow';
import { GameImageSplit } from '@renderer/components/GameImageSplit';
import { CurateActionType } from '@renderer/store/curate/enums';
import { CurateAction } from '@renderer/store/curate/types';
import { LangContext } from '@renderer/util/lang';
import { LoadedCuration } from '@shared/curate/types';
import { GamePropSuggestions } from '@shared/interfaces';
import * as React from 'react';
import { Dispatch } from 'redux';
import { CurateBoxRow } from './CurateBoxRow';
import { CurateBoxWarnings } from './CurateBoxWarnings';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';

export type CurateBoxProps = {
  curation: LoadedCuration;
  suggestions: Partial<GamePropSuggestions>;
  dispatch: Dispatch<CurateAction>;
}

export function CurateBox(props: CurateBoxProps) {
  const strings = React.useContext(LangContext);

  const onAddThumbnailClick  = useAddImageCallback('logo.png', props.curation, props.dispatch);
  const onAddScreenshotClick = useAddImageCallback('ss.png',   props.curation, props.dispatch);
  const onRemoveThumbnailClick  = useRemoveImageCallback('logo.png', props.curation, props.dispatch);
  const onRemoveScreenshotClick = useRemoveImageCallback('ss.png',  props.curation, props.dispatch);
  const onDropThumbnail  = useDropImageCallback('logo.png', props.curation, props.dispatch);
  const onDropScreenshot = useDropImageCallback('ss.png',   props.curation, props.dispatch);

  const thumbnailPath  = ''; // props.curation.thumbnail.exists  ? fixSlashes(`${props.curation.thumbnail.filePath }?v=${props.curation.thumbnail.version }`) : undefined;
  const screenshotPath = ''; // props.curation.screenshot.exists ? fixSlashes(`${props.curation.screenshot.filePath}?v=${props.curation.screenshot.version}`) : undefined;

  const onNewAddApp  = useCreateAddAppCallback('normal',  props.curation.folder, props.dispatch);
  const onAddExtras  = useCreateAddAppCallback('extras',  props.curation.folder, props.dispatch);
  const onAddMessage = useCreateAddAppCallback('message', props.curation.folder, props.dispatch);

  const disabled = false; // props.curation ? props.curation.locked : false;

  const shared = {
    curationFolder: props.curation.folder,
    disabled: disabled,
    dispatch: props.dispatch,
  } as const;

  return (
    <div className='curate-box'>
      <div className='simple-columns curate-box__columns'>
        {/* Left/Top */}
        <div className='simple-columns__column'>
          {/* Images */}
          <div className='curate-box__images'>
            <GameImageSplit
              text={strings.browse.thumbnail}
              imgSrc={thumbnailPath}
              showHeaders={false}
              onAddClick={onAddThumbnailClick}
              onRemoveClick={onRemoveThumbnailClick}
              disabled={disabled}
              onDrop={onDropThumbnail} />
            <GameImageSplit
              text={strings.browse.screenshot}
              imgSrc={screenshotPath}
              showHeaders={false}
              onAddClick={onAddScreenshotClick}
              onRemoveClick={onRemoveScreenshotClick}
              disabled={disabled}
              onDrop={onDropScreenshot} />
          </div>
          {/* Meta */}
          <table className='curate-box-table'>
            <tbody>
              <CurateBoxInputRow
                title={strings.filter.title}
                text={props.curation.game.title}
                placeholder={strings.browse.noTitle}
                property='title'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.alternateTitles}
                text={props.curation.game.alternateTitles}
                placeholder={strings.browse.noAlternateTitles}
                property='alternateTitles'
                { ...shared } />
              {/* @TODO Replace this with a Dropdown menu that does NOT allow selection of the text or typing into it. */}
              <CurateBoxDropdownInputRow
                title={strings.browse.library}
                text={props.curation.game.library}
                items={props.suggestions.library}
                property='library'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.series}
                text={props.curation.game.series}
                placeholder={strings.browse.noSeries}
                property='series'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.developer}
                text={props.curation.game.developer}
                placeholder={strings.browse.noDeveloper}
                property='developer'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.filter.publisher}
                text={props.curation.game.publisher}
                placeholder={strings.browse.noPublisher}
                property='publisher'
                { ...shared } />
              <tr><td/><td>@TODO Tags</td></tr>
              <CurateBoxInputRow
                title={strings.browse.playMode}
                text={props.curation.game.playMode}
                placeholder={strings.browse.noPlayMode}
                property='playMode'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.status}
                text={props.curation.game.status}
                placeholder={strings.browse.noStatus}
                property='status'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.version}
                text={props.curation.game.version}
                placeholder={strings.browse.noVersion}
                property='version'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.releaseDate}
                text={props.curation.game.releaseDate}
                placeholder={strings.browse.noReleaseDate}
                property='releaseDate'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.language}
                text={props.curation.game.language}
                placeholder={strings.browse.noLanguage}
                property='language'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.source}
                text={props.curation.game.source}
                placeholder={strings.browse.noSource}
                property='source'
                { ...shared } />
              <CurateBoxDropdownInputRow
                title={strings.browse.platform}
                text={props.curation.game.platform}
                placeholder={strings.browse.noPlatform}
                items={props.suggestions.platform}
                property='platform'
                { ...shared } />
              <CurateBoxDropdownInputRow
                title={strings.browse.applicationPath}
                text={props.curation.game.applicationPath}
                placeholder={strings.browse.noApplicationPath}
                items={props.suggestions.applicationPath}
                property='applicationPath'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.launchCommand}
                text={props.curation.game.launchCommand}
                placeholder={strings.browse.noLaunchCommand}
                property='launchCommand'
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.notes}
                text={props.curation.game.notes}
                placeholder={strings.browse.noNotes}
                property='notes'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.browse.originalDescription}
                text={props.curation.game.originalDescription}
                placeholder={strings.browse.noOriginalDescription}
                property='originalDescription'
                multiline={true}
                { ...shared } />
              <CurateBoxInputRow
                title={strings.curate.curationNotes}
                text={props.curation.game.curationNotes}
                placeholder={strings.curate.noCurationNotes}
                property='curationNotes'
                multiline={true}
                { ...shared } />
              <CurateBoxCheckBox
                title={strings.browse.extreme}
                checked={props.curation.game.extreme}
                property='extreme'
                { ...shared } />
            </tbody>
          </table>
        </div>
        {/* Right/Bottom */}
        <div className='simple-columns__column'>
          {/* Additional Applications */}
          <div className='curate-box__add-apps'>
            <div className='curate-box__add-apps-top'>
              <p>{strings.browse.additionalApplications}:</p>
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.newAddApp}
                onClick={onNewAddApp}
                disabled={disabled} />
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.addExtras}
                onClick={onAddExtras}
                disabled={disabled} />
              <SimpleButton
                className='curate-box-buttons__button'
                value={strings.curate.addMessage}
                onClick={onAddMessage}
                disabled={disabled} />
            </div>
            <span>@TODO List add apps</span>
          </div>
          <hr />
          {/* Content */}
          <div className='curate-box-files'>
            <div className='curate-box-files__head'>
              {strings.curate.contentFiles + ': '}
              {/*(collisionCount !== undefined && collisionCount > 0) ? (
                <label className='curate-box-files__head-collision-count'>
                  ({collisionCount} / {contentCollisions && contentCollisions.length} Files or Folders Already Exists)
                </label>
              ) : undefined*/}
            </div>
            <pre className='curate-box-files__body simple-scroll'>
              @TODO Content filenames
            </pre>
          </div>
          <hr />
          {/* Warnings */}
          <p>Warnings</p>
          <CurateBoxWarnings warnings={{}} />
          <hr />
          {/* Curation Folder */}
          <table>
            <tbody>
              <CurateBoxRow title={strings.curate.id + ':'}>
                <InputField
                  text={props.curation && props.curation.folder || ''}
                  placeholder={'No ID? Something\'s broken.'}
                  disabled={true} />
              </CurateBoxRow>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function useAddImageCallback(filename: 'logo.png' | 'ss.png', curation: LoadedCuration | undefined, dispatch: Dispatch<CurateAction>): () => void {
  return React.useCallback(async () => {
    // @TODO Request the back to add the image
    /*
    const filePaths = window.Shared.showOpenDialogSync({
      title: strings.dialog.selectScreenshot,
      properties: ['openFile'],
      filters: [{ extensions: ['png', 'PNG'], name: 'Image File' }]
    });
    if (curation && filePaths && filePaths[0].toLowerCase().endsWith('.png')) {
      const isLogo = filename === 'logo.png';
      const dest = path.join(getCurationFolder2(curation), filename);
      await fs.copyFile(filePaths[0], dest);
      const newImage = await createCurationImage(dest);
      newImage.version = isLogo ? curation.thumbnail.version + 1 : curation.screenshot.version + 1;
      dispatch({
        type: isLogo ? 'set-curation-logo' : 'set-curation-screenshot',
        payload: {
          key: curation.folder,
          image: newImage
        }
      });
    }
    */
  }, [curation && curation.folder]);
}

/**
 * Delete an image file inside the curation's folder.
 * @param filename Name of the image file.
 * @param curation Curation to delete it from.
 */
function useRemoveImageCallback(filename: 'logo.png' | 'ss.png', curation: LoadedCuration | undefined, dispatch: Dispatch<CurateAction>): () => Promise<void> {
  return React.useCallback(async () => {
    // @TODO Request the back to remove the image
    /*
    if (curation) {
      const filePath = path.join(getCurationFolder2(curation), filename);
      try {
        const isLogo = filename === 'logo.png';
        try {
          await fs.access(filePath, fs.constants.F_OK | fs.constants.W_OK);
          await fs.unlink(filePath);
        } catch (error) {
          curationLog('Curation image already deleted, probably missing, skipping...');
        }
        const newImage = createCurationIndexImage();
        newImage.version = isLogo ? curation.thumbnail.version + 1 : curation.screenshot.version + 1;
        dispatch({
          type: isLogo ? 'set-curation-logo' : 'set-curation-screenshot',
          payload: {
            key: curation.folder,
            image: createCurationIndexImage()
          }
        });
      } catch (error) {
        curationLog('Error replacing image - ' + error.message);
        console.log(error);
      }
    }
    */
  }, [curation && curation.folder]);
}

function useDropImageCallback(filename: 'logo.png' | 'ss.png', curation: LoadedCuration | undefined, dispatch: Dispatch<CurateAction>) {
  return React.useCallback(async (event: React.DragEvent<Element>) => {
    // @TODO Request the back to import the image
    /*
    const files = event.dataTransfer.files;
    if (curation && files && files[0].name.toLowerCase().endsWith('.png')) {
      const isLogo = filename === 'logo.png';
      const dest = path.join(getCurationFolder2(curation), filename);
      await fs.copyFile(files[0].path, dest);
      const newImage = await createCurationImage(dest);
      newImage.version = isLogo ? curation.thumbnail.version + 1 : curation.screenshot.version + 1;
      dispatch({
        type: isLogo ? 'set-curation-logo' : 'set-curation-screenshot',
        payload: {
          key: curation.folder,
          image: newImage
        }
      });
    }
    */
  }, [curation && curation.folder]);
}

function useCreateAddAppCallback(type: 'normal' | 'extras' | 'message', curationFolder: string, dispatch: Dispatch<CurateAction>) {
  return React.useCallback(() => {
    dispatch({
      type: CurateActionType.NEW_ADDAPP,
      payload: {
        key: curationFolder,
        type: type,
      }
    });
  }, [dispatch, curationFolder]);
}
