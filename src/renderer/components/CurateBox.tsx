import { remote } from 'electron';
import * as fs from 'fs-extra';
import { add } from 'node-7z';
import * as path from 'path';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LangContainer } from '../../shared/lang';
import { IGameLibraryFile } from '../../shared/library/interfaces';
import { ProgressData } from '../containers/withProgress';
import { CurationAction, EditCuration, EditCurationMeta } from '../context/CurationContext';
import { stringifyCurationFormat } from '../curate/format/stringifier';
import { indexContentFolder, IndexedContent } from '../curate/importCuration';
import { launchCuration, stringToBool } from '../curate/importGame';
import { convertEditToCurationMeta } from '../curate/metaToMeta';
import { curationLog, getContentFolderByKey, getCurationFolder } from '../curate/util';
import { GameLauncher } from '../GameLauncher';
import { sizeToString } from '../Util';
import { LangContext } from '../util/lang';
import { pathTo7z } from '../util/SevenZip';
import { GamePropSuggestions } from '../util/suggestions';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { CurateBoxAddApp } from './CurateBoxAddApp';
import { CurateBoxRow } from './CurateBoxRow';
import { CurateBoxWarnings, CurationWarnings } from './CurateBoxWarnings';
import { DropdownInputField } from './DropdownInputField';
import { GameImageSplit } from './GameImageSplit';
import { InputField } from './InputField';
import { SimpleButton } from './SimpleButton';

type CurateBoxProps = {
  /** Meta data of the curation to display. */
  curation?: EditCuration;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
  /** Import a curation. */
  importCuration: (curation: EditCuration, log?: boolean, progress?: ProgressData) => Promise<void>;
  /** Suggestions for the drop-down input fields. */
  suggestions?: Partial<GamePropSuggestions> | undefined;
  /** Libraries to pick in the drop-down input field. */
  libraryOptions: JSX.Element[];
  /** Full library data (for importing) */
  libraryData: IGameLibraryFile;
};

/** A box that displays and lets the user edit a curation. */
export function CurateBox(props: CurateBoxProps) {
  // Localized strings
  const strings = React.useContext(LangContext);
  // Content file collisions
  const [contentCollisions, setContentCollisions] = useState<ContentCollision[] | undefined>(undefined);
  // Check for content file collisions
  useEffect(() => {
    if (props.curation) {
      let isAborted = false;
      // Check if there are any content collisions
      checkCollisions(props.curation.content)
      .then((collisions) => {
        if (!isAborted) { setContentCollisions(collisions); }
      })
      .catch(console.error);
      // Ignore the result of the check if the content has changed
      return () => { isAborted = true; };
    }
  }, [props.curation && props.curation.content]);
  // Callbacks for the fields (onChange)
  const key                         = props.curation ? props.curation.key : undefined;
  const onTitleChange               = useOnInputChange('title',               key, props.dispatch);
  const onSeriesChange              = useOnInputChange('series',              key, props.dispatch);
  const onDeveloperChange           = useOnInputChange('developer',           key, props.dispatch);
  const onPublisherChange           = useOnInputChange('publisher',           key, props.dispatch);
  const onGenreChange               = useOnInputChange('genre',               key, props.dispatch);
  const onPlayModeChange            = useOnInputChange('playMode',            key, props.dispatch);
  const onStatusChange              = useOnInputChange('status',              key, props.dispatch);
  const onVersionChange             = useOnInputChange('version',             key, props.dispatch);
  const onReleaseDateChange         = useOnInputChange('releaseDate',         key, props.dispatch);
  const onLanguageChange            = useOnInputChange('language',            key, props.dispatch);
  const onSourceChange              = useOnInputChange('source',              key, props.dispatch);
  const onPlatformChange            = useOnInputChange('platform',            key, props.dispatch);
  const onApplicationPathChange     = useOnInputChange('applicationPath',     key, props.dispatch);
  const onLaunchCommandChange       = useOnInputChange('launchCommand',       key, props.dispatch);
  const onLibraryChange             = useOnInputChange('library',             key, props.dispatch);
  const onNotesChange               = useOnInputChange('notes',               key, props.dispatch);
  const onOriginalDescriptionChange = useOnInputChange('originalDescription', key, props.dispatch);
  const onAuthorNotesChange         = useOnInputChange('authorNotes',         key, props.dispatch);
  const onExtremeChange             = useOnCheckboxToggle('extreme',          key, props.dispatch);
  // Callbacks for the fields (onItemSelect)
  const onGenreItemSelect           = useCallback(transformOnItemSelect(onGenreChange),           [onGenreChange]);
  const onPlatformItemSelect        = useCallback(transformOnItemSelect(onPlatformChange),        [onPlatformChange]);
  const onApplicationPathItemSelect = useCallback(transformOnItemSelect(onApplicationPathChange), [onPlatformChange]);
  // Callback for the fields (onInputKeyDown)
  const onInputKeyDown = useCallback((event: React.KeyboardEvent<InputElement>) => {
    // @TODO Add keyboard shortcuts for things like importing and removing the curation.
    // ...
  }, []);
  // Callback for when the import button is clicked
  const onImportClick = useCallback(async () => {
    const { curation } = props;
    if (curation) {
      // Lock the curation (so it can't be edited while importing)
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: curation.key,
          lock: true,
        },
      });
      // Import the curation
      props.importCuration(curation)
      .then(() => {
        curationLog(`Curation successfully imported! (title: ${curation.meta.title} id: ${curation.key})`);
        // Remove the curation
        props.dispatch({
          type: 'remove-curation',
          payload: { key: curation.key }
        });
      })
      .catch(async (error) => {
        // Log error
        curationLog(`Curation failed to import! (title: ${curation.meta.title} id: ${curation.key}) - ` + error.message);
        console.error(error);
        // Unlock the curation
        props.dispatch({
          type: 'change-curation-lock',
          payload: {
            key: curation.key,
            lock: false,
          },
        });
        // Failed or cancelled, reindex content
        const content = await indexContentFolder(getContentFolderByKey(curation.key));
        props.dispatch({
          type: 'set-curation-content',
          payload: {
            key: curation.key,
            content: content
          }
        });
      });
    }
  }, [props.dispatch, props.curation]);
  // Callback for testing a curation works
  const onRun = useCallback(() => {
    if (props.curation) {
      launchCuration(props.curation);
    }
  }, [props.dispatch, props.curation]);
  // Callback for when the index content button is clicked
  const onIndexContent = useCallback(async () => {
    if (props.curation) {
      const content = await indexContentFolder(getContentFolderByKey(props.curation.key));
      props.dispatch({
        type: 'set-curation-content',
        payload: {
          key: props.curation.key,
          content: content
        }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when the open folder button is clicked
  const onOpenFolder = useCallback(() => {
    if (props.curation) {
      remote.shell.openItem(getCurationFolder(props.curation));
    }
  }, [props.curation && props.curation.key]);
  // Callback for when the remove button is clicked
  const onRemoveClick = useCallback(() => {
    if (props.curation) {
      props.dispatch({
        type: 'remove-curation',
        payload: { key: props.curation.key }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when the new additional application button is clicked
  const onNewAddApp = useCallback(() => {
    if (props.curation) {
      props.dispatch({
        type: 'new-addapp',
        payload: { key: props.curation.key }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when the export button is clicked
  const onExportClick = useCallback(() => {
    if (props.curation) {
      const curation = props.curation;
      // Choose where to save the file
      const filePath = remote.dialog.showSaveDialogSync({
        title: strings.dialog.selectFileToExportMeta,
        defaultPath: path.join(window.External.config.fullFlashpointPath, 'Curations'),
        filters: [{
          name: 'Curation archive',
          extensions: ['7z'],
        }]
      });
      if (filePath) {
        fs.ensureDir(path.dirname(filePath))
        .then(async () => {
          // Remove old zip (if overwriting)
          await fs.access(filePath, fs.constants.F_OK)
            .then(() => {
              return fs.unlink(filePath);
            })
            .catch((error) => { /* No file is okay, ignore error */ });
          // Save working meta
          const metaPath = path.join(getCurationFolder(curation), 'meta.txt');
          const meta = stringifyCurationFormat(convertEditToCurationMeta(curation.meta, curation.addApps));
          return fs.writeFile(metaPath, meta)
          .then(() => {
            // Zip it all up
            add(filePath, getCurationFolder(curation), { recursive: true, $bin: pathTo7z });
          });
        });
      }
    }
  }, [props.curation]);

  // Image callbacks
  const onAddThumbnailClick  = useAddImageCallback('logo.png', strings, props.curation);
  const onAddScreenshotClick = useAddImageCallback('ss.png', strings, props.curation);
  const onRemoveThumbnailClick  = useRemoveImageCallback('logo.png', props.curation);
  const onRemoveScreenshotClick = useRemoveImageCallback('ss.png', props.curation);
  const onDropThumbnail  = useDropImageCallback('logo.png', props.curation);
  const onDropScreenshot = useDropImageCallback('ss.png', props.curation);

  // Input props
  const editable = true;
  const disabled = props.curation ? props.curation.locked : false;

  // Render additional application elements
  const addApps = useMemo(() => (
    <>
    { strings.browse.additionalApplications }:
    { props.curation && props.curation.addApps.length > 0 ? (
      <>
        { props.curation.addApps.map(addApp => (
          <CurateBoxAddApp
            key={addApp.key}
            curationKey={props.curation && props.curation.key || ''}
            curation={addApp}
            dispatch={props.dispatch}
            disabled={disabled}
            onInputKeyDown={onInputKeyDown} />
        )) }
      </>
    ) : undefined }
    </>
  ), [
    props.curation && props.curation.addApps,
    props.curation && props.curation.key,
    props.dispatch,
    disabled
  ]);

  // Count the number of collisions
  const collisionCount: number | undefined = useMemo(() => {
    return contentCollisions && contentCollisions.reduce((v, c) => v + (c.fileExists ? 1 : 0), 0);
  }, [contentCollisions]);

  // Render content (files and folders inside the "content" folder)
  const contentFilenames = useMemo(() => {
    return props.curation && props.curation.content.map((content, index) => {
      const collision = contentCollisions && contentCollisions[index];
      // Folders file names ends with '/' and have a file size of 0
      const isFolder = (
        content.filePath[content.filePath.length - 1] === '/' &&
        content.fileSize === 0
      );
      // Render content element
      const contentElement = (
        <span className='curate-box-files__entry'>
          {content.filePath + (isFolder ? '' : ` (${sizeToString(content.fileSize)})`)}
        </span>
      );
      // Render collision element
      const collisionElement = (collision && collision.fileExists) ? (
        <span className='curate-box-files__entry-collision'>
          {' - Already Exists' + (collision.isFolder ? '' : ` (${sizeToString(content.fileSize)})`)}
        </span>
      ) : undefined;
      // Render
      return (
        <span key={index}>
          {contentElement}
          {collisionElement}
          {'\n'}
        </span>
      );
    });
  }, [props.curation && props.curation.content, contentCollisions]);

  // Generate Warnings
  const warnings = useMemo(() => {
    const warns: CurationWarnings = {};
    if (props.curation) {
      // Check if launch command uses HTTP
      warns.isNotHttp = !isHttp(props.curation.meta.launchCommand || '');
      // Validate release date
      const releaseDate = props.curation.meta.releaseDate;
      if (releaseDate) { warns.releaseDateInvalid = !isValidDate(releaseDate); }
      // Check for unused values (with suggestions)
      warns.unusedGenre = !isValueSuggested(props, 'genre');
      warns.unusedPlatform = !isValueSuggested(props, 'platform');
      warns.unusedApplicationPath = !isValueSuggested(props, 'applicationPath');
      warns.nonExistingLibrary = !!(
        (props.curation && props.curation.meta['library']) && // "Library" field is not empty
        !isValueSuggested(props, 'library')
      );
      // Check if there is no content
      warns.noContent = props.curation.content.length === 0;
      // Check if library is set
      const curLibrary = props.curation.meta.library;
      warns.nonExistingLibrary = props.libraryData.libraries.findIndex(library => library.route === curLibrary) === -1;
    }
    return warns;
  }, [props.curation && props.curation.meta, props.curation && props.curation.content]);

  // Render images (logo + ss)
  const imageSplit = useMemo(() => {
    if (props.curation) {
      const thumbnailPath = props.curation.thumbnail.exists ? `${props.curation.thumbnail.filePath}?v=${props.curation.thumbnail.version}` : undefined;
      const screenshotPath = props.curation.screenshot.exists ? `${props.curation.screenshot.filePath}?v=${props.curation.screenshot.version}` : undefined;
      return (
        <>
          <GameImageSplit
            text={strings.browse.thumbnail}
            imgSrc={thumbnailPath}
            onAddClick={onAddThumbnailClick}
            onRemoveClick={onRemoveThumbnailClick}
            disabled={disabled}
            onDrop={onDropThumbnail}
            />
          <GameImageSplit
            text={strings.browse.screenshot}
            imgSrc={screenshotPath}
            onAddClick={onAddScreenshotClick}
            onRemoveClick={onRemoveScreenshotClick}
            disabled={disabled}
            onDrop={onDropScreenshot}
            />
        </>
      );
    }
  }, [props.curation && props.curation.thumbnail, props.curation && props.curation.screenshot, disabled]);

  // Own Lirary Options
  const ownLibraryOptions = useMemo(() => {
    // Add meta's library if invalid (special option)
    if (warnings.nonExistingLibrary && props.curation) {
      const nonExistingLibrary = (
        <option
          className='curate-box-select__invalid-option'
          key={props.libraryOptions.length}
          value={props.curation.meta.library}>
          {props.curation.meta.library}
        </option>
      );
      return [ ...props.libraryOptions, nonExistingLibrary ];
    }
    return props.libraryOptions;
  }, [props.curation && props.curation.meta.library, props.libraryOptions, warnings]);

  // Meta
  const authorNotes = props.curation && props.curation.meta.authorNotes || '';
  // Misc
  const sharedInputProps = {
    editable: editable,
    disabled: disabled,
    onKeyDown: onInputKeyDown,
  };

  // Render
  return (
    <div className='curate-box'>
      {/* Images */}
      <div className='curate-box-images'>
        {imageSplit}
      </div>
      <div className='curate-box-images-footer'>
        <p>{strings.browse.dropImageHere}</p>
      </div>
      <hr className='curate-box-divider' />
      {/* Fields */}
      <CurateBoxRow title={strings.filter.title + ':'}>
        <InputField
          text={props.curation && props.curation.meta.title || ''}
          placeholder={strings.browse.noTitle}
          onChange={onTitleChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.library + ':'}>
        {/* Look like a DropdownInputField */}
        <div className={warnings.nonExistingLibrary ? 'curate-box-select--warn' : ''}>
          <select
            className={'input-field input-field--edit simple-input ' +
                      'input-dropdown__input-field__input__inner'}
            value={props.curation && props.curation.meta.library || ''}
            onChange={onLibraryChange}
            disabled={disabled}>
            {ownLibraryOptions}
          </select>
        </div>
      </CurateBoxRow>
      <CurateBoxRow title={strings.filter.series + ':'}>
        <InputField
          text={props.curation && props.curation.meta.series || ''}
          placeholder={strings.browse.noSeries}
          onChange={onSeriesChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.filter.developer + ':'}>
        <InputField
          text={props.curation && props.curation.meta.developer || ''}
          placeholder={strings.browse.noDeveloper}
          onChange={onDeveloperChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.publisher + ':'}>
        <InputField
          text={props.curation && props.curation.meta.publisher || ''}
          placeholder={strings.browse.noPublisher}
          onChange={onPublisherChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.genre + ':'}>
        <DropdownInputField
          text={props.curation && props.curation.meta.genre || ''}
          placeholder={strings.browse.noGenre}
          onChange={onGenreChange}
          items={props.suggestions && props.suggestions.genre || []}
          onItemSelect={onGenreItemSelect}
          className={warnings.unusedGenre ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.playMode + ':'}>
        <InputField
          text={props.curation && props.curation.meta.playMode || ''}
          placeholder={strings.browse.noPlayMode}
          onChange={onPlayModeChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.status + ':'}>
        <InputField
          text={props.curation && props.curation.meta.status || ''}
          placeholder={strings.browse.noStatus}
          onChange={onStatusChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.version + ':'}>
        <InputField
          text={props.curation && props.curation.meta.version || ''}
          placeholder={strings.browse.noVersion}
          onChange={onVersionChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.releaseDate + ':'}>
        <InputField
          text={props.curation && props.curation.meta.releaseDate || ''}
          placeholder={strings.browse.noReleaseDate}
          onChange={onReleaseDateChange}
          className={warnings.releaseDateInvalid ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.language + ':'}>
        <InputField
          text={props.curation && props.curation.meta.language || ''}
          placeholder={strings.browse.noLanguage}
          onChange={onLanguageChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.source + ':'}>
        <InputField
          text={props.curation && props.curation.meta.source || ''}
          placeholder={strings.browse.noSource}
          onChange={onSourceChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.platform + ':'}>
        <DropdownInputField
          text={props.curation && props.curation.meta.platform || ''}
          placeholder={strings.browse.noPlatform}
          onChange={onPlatformChange}
          items={props.suggestions && props.suggestions.platform || []}
          onItemSelect={onPlatformItemSelect}
          className={warnings.unusedPlatform ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.applicationPath + ':'}>
        <DropdownInputField
          text={props.curation && props.curation.meta.applicationPath || ''}
          placeholder={strings.browse.noApplicationPath}
          onChange={onApplicationPathChange}
          items={props.suggestions && props.suggestions.applicationPath || []}
          onItemSelect={onApplicationPathItemSelect}
          className={warnings.unusedApplicationPath ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.launchCommand + ':'}>
        <InputField
          text={props.curation && props.curation.meta.launchCommand || ''}
          placeholder={strings.browse.noLaunchCommand}
          onChange={onLaunchCommandChange}
          className={warnings.isNotHttp ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.notes + ':'}>
        <InputField
          text={props.curation && props.curation.meta.notes || ''}
          placeholder={strings.browse.noNotes}
          onChange={onNotesChange}
          multiline={true}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.originalDescription + ':'}>
        <InputField
          text={props.curation && props.curation.meta.originalDescription || ''}
          placeholder={strings.browse.noOriginalDescription}
          onChange={onOriginalDescriptionChange}
          multiline={true}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.curate.curationNotes + ':'}>
        <InputField
          text={authorNotes}
          placeholder={strings.curate.noCurationNotes}
          onChange={onAuthorNotesChange}
          multiline={true}
          className={authorNotes.length > 0 ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title={strings.browse.extreme + ':'}>
        <CheckBox
          checked={stringToBool(props.curation && props.curation.meta.extreme || '')}
          onToggle={onExtremeChange}
          disabled={disabled} />
      </CurateBoxRow>
      <hr className='curate-box-divider' />
      {/* Additional Application */}
      <div className='curate-box-add-apps'>
        {addApps}
        <SimpleButton
          className='curate-box-buttons__button'
          value={strings.curate.newAddApp}
          onClick={onNewAddApp} />
        <hr className='curate-box-divider' />
      </div>
      {/* Content */}
      <div className='curate-box-files'>
        <div className='curate-box-files__head'>
          {strings.curate.contentFiles + ': '}
          {(collisionCount !== undefined && collisionCount > 0) ? (
            <label className='curate-box-files__head-collision-count'>
              ({collisionCount} / {contentCollisions && contentCollisions.length} Files or Folders Already Exists)
            </label>
          ) : undefined}
        </div>
        <pre className='curate-box-files__body simple-scroll'>
          {contentFilenames}
        </pre>
      </div>
      <hr className='curate-box-divider' />
      {/* Warnings */}
      <CurateBoxWarnings warnings={warnings} />
      {/* Buttons */}
      <div className='curate-box-buttons'>
        <div className='curate-box-buttons__left'>
          <SimpleButton
            className='curate-box-buttons__button'
            value={strings.curate.indexContent}
            onClick={onIndexContent}
            disabled={disabled} />
          <SimpleButton
            className='curate-box-buttons__button'
            value={strings.curate.openFolder}
            onClick={onOpenFolder}
            disabled={disabled} />
          <SimpleButton
            className='curate-box-buttons__button'
            value={strings.curate.run}
            onClick={onRun}
            disabled={disabled} />
        </div>
        <div className='curate-box-buttons__right'>
          <ConfirmElement
            onConfirm={onRemoveClick}
            children={renderRemoveButton}
            extra={[strings.curate, disabled]} />
          <SimpleButton
            className='curate-box-buttons__button'
            value={strings.curate.export}
            onClick={onExportClick}
            disabled={disabled} />
          <SimpleButton
            className='curate-box-buttons__button'
            value={strings.curate.import}
            onClick={onImportClick}
            disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

function renderRemoveButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<[LangContainer['curate'], boolean]>): JSX.Element {
  const [ strings, disabled ] = extra;
  return (
    <SimpleButton
      className={
        'curate-box-buttons__button' +
        ((activationCounter > 0) ? ' curate-box-buttons__button--active simple-vertical-shake' : '')
      }
      value={strings.remove}
      title={strings.removeCurationDesc}
      disabled={disabled}
      onClick={activate}
      onMouseLeave={reset} />
  );
}


type InputElement = HTMLInputElement | HTMLTextAreaElement;

/** Subset of the input elements on change event, with only the properties used by the callbacks. */
type InputElementOnChangeEvent = {
  currentTarget: {
    value: React.ChangeEvent<InputElement>['currentTarget']['value']
  }
}

function transformOnItemSelect(callback: (event: InputElementOnChangeEvent) => void) {
  return (text: string) => {
    callback({ currentTarget: { value: text } });
  };
}

/**
 * Create a callback for InputField's onChange.
 * When called, the callback will set the value of a metadata property to the value of the input field.
 * @param property Property the input field should change.
 * @param key Key of the curation to edit.
 * @param dispatch Dispatcher to use.
 */
function useOnInputChange(property: keyof EditCurationMeta, key: string | undefined, dispatch: React.Dispatch<CurationAction>) {
  return useCallback((event: InputElementOnChangeEvent) => {
    if (key !== undefined) {
      dispatch({
        type: 'edit-curation-meta',
        payload: {
          key: key,
          property: property,
          value: event.currentTarget.value
        }
      });
    }
  }, [dispatch, key]);
}

function useOnCheckboxToggle(property: keyof EditCurationMeta, key: string | undefined, dispatch: React.Dispatch<CurationAction>) {
  const strings = React.useContext(LangContext);
  return useCallback((checked: boolean) => {
    if (key !== undefined) {
      dispatch({
        type: 'edit-curation-meta',
        payload: {
          key: key,
          property: property,
          value: boolToString(checked, strings.misc)
        }
      });
    }
  }, [dispatch, key]);
}

function useAddImageCallback(filename: string, strings: LangContainer, curation: EditCuration | undefined): () => void {
  return useCallback(() => {
    const filePaths = window.External.showOpenDialogSync({
      title: strings.dialog.selectScreenshot,
      properties: ['openFile'],
      filters: [{ extensions: ['png', 'PNG'], name: 'Image File' }]
    });
    if (curation && filePaths && filePaths[0].toLowerCase().endsWith('.png')) {
      fs.copyFile(filePaths[0], path.join(getCurationFolder(curation), filename));
    }
  }, [curation && curation.key]);
}

/**
 * Delete an image file inside the curation's folder.
 * @param filename Name of the image file.
 * @param curation Curation to delete it from.
 */
function useRemoveImageCallback(filename: string, curation: EditCuration | undefined): () => Promise<void> {
  return useCallback(async () => {
    if (curation) {
      const filePath = path.join(getCurationFolder(curation), filename);
      try {
        await fs.access(filePath, fs.constants.F_OK | fs.constants.W_OK);
        await fs.unlink(filePath);
      } catch (error) {
        curationLog('Error replacing image - ' + error.message);
        console.log(error);
      }
    }
  }, [curation && curation.key]);
}

function useDropImageCallback(filename: string, curation: EditCuration | undefined) {
  return useCallback((event: React.DragEvent<Element>) => {
    const files = event.dataTransfer.files;
    if (curation && files && files[0].name.toLowerCase().endsWith('.png')) {
      fs.copyFile(files[0].path, path.join(getCurationFolder(curation), filename));
    }
  }, [curation && curation.key]);
}

/**
 * Check if a the value of a field is in the suggestions for that field.
 * @param props Properties of the CurateBox.
 * @param key Key of the field to check.
 */
function isValueSuggested<T extends keyof Partial<GamePropSuggestions>>(props: CurateBoxProps, key: T & string): boolean {
  // Get the values used
  // (the dumb compiler doesn't understand that this is a string >:((( )
  const value = (props.curation && props.curation.meta[key] || '') as string;
  const suggestions = props.suggestions && props.suggestions[key];
  // Check if the value is suggested
  return suggestions ? (suggestions.indexOf(value) >= 0) : false;
}

/** Data about a file that collided with a content file from a curation. */
type ContentCollision = {
  fileName: string;
  fileSize: number;
  fileExists: boolean;
  isFolder: boolean;
}

/** Check all the "collisions" (the files that will be overwritten if the curation is imported) */
async function checkCollisions(content: IndexedContent[]) {
  const collisions: ContentCollision[] = [];
  for (let i = 0; i < content.length; i++) {
    const collision: ContentCollision = {
      fileName: GameLauncher.getPathOfHtdocsUrl(content[i].filePath) || '',
      fileSize: 0,
      fileExists: false,
      isFolder: false,
    };
    collisions[i] = collision;
    if (collision.fileName !== undefined) {
      const [stats, error] = await safeAwait(fs.stat(collision.fileName));
      if (stats) {
        collision.fileSize = stats.size;
        collision.fileExists = true;
        collision.isFolder = stats.isDirectory();
      }
    }
  }
  return collisions;
}

function safeAwait<T, E = Error>(promise: Promise<T>): Promise<[T,             E | undefined]>;
function safeAwait<T, E = Error>(promise: Promise<T>): Promise<[T | undefined, E            ]>;
/** Await a promise and return the value and error as a tuple (one will always be undefined). */
async function safeAwait<T, E = Error>(promise: Promise<T>): Promise<[T | undefined, E | undefined]> {
  let value: T | undefined = undefined;
  let error: E | undefined = undefined;
  try      { value = await promise; }
  catch (e) { error = e;             }
  return [value, error];
}

/**
 * Convert a boolean to a string ("Yes" or "No").
 * @param bool Boolean to convert.
 */
function boolToString(bool: boolean, strings: LangContainer['misc']): string {
  return bool ? strings.yes : strings.no;
}

/**
 * Check if a url uses the http protocol.
 * @param url Url to check.
 */
function isHttp(url: string): boolean {
  try { return new URL(url).protocol.toLowerCase() === 'http:'; }
  catch (e) { return false; }
}

/**
 * Check of a string is a valid date.
 * Format: "YYYY(-M(M)(-D(D)))"
 * Explanation: "M" and "D" can be one or two digits long.
 *              "M" must be between 1 and 12, and "D" must be between 1 and 31.
 * Examples: "2007", "2010-11", "2019-07-17"
 * Source: https://stackoverflow.com/questions/22061723/regex-date-validation-for-yyyy-mm-dd (but slightly modified)
 * @param str String to check.
 */
function isValidDate(str: string): boolean {
  return (/^\d{4}(-(0?[1-9]|1[012])(-(0?[1-9]|[12][0-9]|3[01]))?)?$/).test(str);
}
