import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { BackIn, LaunchCurationData, TagByIdData, TagByIdResponse, TagGetOrCreateData, TagGetOrCreateResponse, TagSuggestion, TagSuggestionsData, TagSuggestionsResponse } from '@shared/back/types';
import { htdocsPath } from '@shared/constants';
import { convertEditToCurationMeta } from '@shared/curate/metaToMeta';
import { CurationIndex, EditCuration, EditCurationMeta, IndexedContent } from '@shared/curate/types';
import { getContentFolderByKey, getCurationFolder, indexContentFolder } from '@shared/curate/util';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { deepCopy, fixSlashes, sizeToString } from '@shared/Util';
import { Coerce } from '@shared/utils/Coerce';
import { remote } from 'electron';
import * as fs from 'fs-extra';
import { add } from 'node-7z';
import * as path from 'path';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as YAML from 'yaml';
import { ProgressData } from '../containers/withProgress';
import { CurationAction } from '../context/CurationContext';
import { newProgress, ProgressContext, ProgressDispatch } from '../context/ProgressContext';
import { curationLog } from '../curate/util';
import { toForcedURL } from '../Util';
import { LangContext } from '../util/lang';
import { pathTo7z } from '../util/SevenZip';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { CurateBoxAddApp } from './CurateBoxAddApp';
import { CurateBoxRow } from './CurateBoxRow';
import { CurateBoxWarnings, CurationWarnings, getWarningCount } from './CurateBoxWarnings';
import { DropdownInputField } from './DropdownInputField';
import { GameImageSplit } from './GameImageSplit';
import { InputField } from './InputField';
import { AutoProgressComponent } from './ProgressComponents';
import { SimpleButton } from './SimpleButton';
import { TagInputField } from './TagInputField';

const { strToBool } = Coerce;

type CurateBoxProps = {
  /** Meta data of the curation to display. */
  curation?: EditCuration;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
  /** Import a curation. */
  importCuration: (curation: EditCuration, log?: boolean, date?: Date, progress?: ProgressData) => Promise<void>;
  /** Suggestions for the drop-down input fields. */
  suggestions?: Partial<GamePropSuggestions> | undefined;
  /** Libraries to pick in the drop-down input field. */
  libraryOptions: JSX.Element[];
  libraries: string[];
  tagCategories: TagCategory[];
  mad4fpEnabled: boolean;
}

/** A box that displays and lets the user edit a curation. */
export function CurateBox(props: CurateBoxProps) {
  // Localized strings
  const strings = React.useContext(LangContext);
  const [progressState, progressDispatch] = React.useContext(ProgressContext.context);
  const [tagInputText, setTagInputText] = React.useState('');
  const [tagSuggestions, setTagSuggestions] = React.useState<TagSuggestion[]>([]);
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
  // Tag Input Field funcs
  const onCurrentTagChange = useCallback((event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = tagSuggestions;

    if (newTag !== '') {
      // Delayed set
      window.Shared.back.send<TagSuggestionsResponse, TagSuggestionsData>(BackIn.GET_TAG_SUGGESTIONS, newTag, (res) => {
        if (res.data) {
          setTagSuggestions(res.data);
        }
      });
    } else {
      newSuggestions = [];
    }

    setTagInputText(newTag);
    setTagSuggestions(newSuggestions);
  }, [tagSuggestions]);

  const onAddTagSuggestion = useCallback((suggestion: TagSuggestion) => {
    if (suggestion.tag.id) {
      window.Shared.back.send<TagByIdResponse, TagByIdData>(BackIn.GET_TAG_BY_ID, suggestion.tag.id, (res) => {
        const tag = res.data;
        if (tag) {
          const curation = props.curation;
          const oldTags = curation ? (curation.meta.tags || []) : [];
          if (curation && oldTags.findIndex(t => t.id == tag.id) == -1) {
            props.dispatch({
              type: 'edit-curation-meta',
              payload: {
                key: curation.key,
                property: 'tags',
                value: [...oldTags, tag]
              }
            });
          }
        }
      });
    }
    // Clear out suggestions box
    setTagSuggestions([]);
    setTagInputText('');
  }, [props.curation]);

  const onAddTagByString = useCallback((text: string): void => {
    if (text !== '') {
      window.Shared.back.send<TagGetOrCreateResponse, TagGetOrCreateData>(BackIn.GET_OR_CREATE_TAG, { tag: text }, (res) => {
        const tag = res.data;
        if (tag) {
          const curation = props.curation;
          if (curation && curation.meta.tags && curation.meta.tags.findIndex(t => t.id == tag.id) == -1) {
            props.dispatch({
              type: 'edit-curation-meta',
              payload: {
                key: curation.key,
                property: 'tags',
                value: [...curation.meta.tags, tag]
              }
            });
          }
        }
      });
    }
    // Clear out suggestions box
    setTagSuggestions([]);
    setTagInputText('');
  }, [props.curation]);

  const onRemoveTag = useCallback((tag: Tag, index: number): void => {
    const curation = props.curation;
    if (curation) {
      const tags = curation.meta.tags || [];
      const tagIndex = tags.findIndex(t => t.id == tag.id);
      if (tagIndex !== -1) {
        const newTags = deepCopy(tags);
        newTags.splice(tagIndex, 1);
        props.dispatch({
          type: 'edit-curation-meta',
          payload: {
            key: curation.key,
            property: 'tags',
            value: newTags
          }
        });
      }
    }
  }, [props.curation]);
  // Callbacks for the fields (onChange)
  const key                         = props.curation ? props.curation.key : undefined;
  const onTitleChange               = useOnInputChange('title',               key, props.dispatch);
  const onAlternateTitlesChange     = useOnInputChange('alternateTitles',     key, props.dispatch);
  const onSeriesChange              = useOnInputChange('series',              key, props.dispatch);
  const onDeveloperChange           = useOnInputChange('developer',           key, props.dispatch);
  const onPublisherChange           = useOnInputChange('publisher',           key, props.dispatch);
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
  const onCurationNotesChange       = useOnInputChange('curationNotes',       key, props.dispatch);
  const onExtremeChange             = useOnCheckboxToggle('extreme',          key, props.dispatch);
  // Callbacks for the fields (onItemSelect)
  const onPlayModeSelect            = useCallback(transformOnItemSelect(onPlayModeChange),        [onPlayModeChange]);
  const onStatusSelect              = useCallback(transformOnItemSelect(onStatusChange),          [onStatusChange]);
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
      // Check for warnings before importing
      const warnings = getCurationWarnings(curation, props.suggestions, props.libraries, strings.curate);
      const warningCount = getWarningCount(warnings);
      if (warningCount > 0) {
        // Prompt user
        const res = remote.dialog.showMessageBoxSync({
          title: 'Import Warnings',
          message: 'There are Warnings present on this Curation.\n\nDo you still wish to import?',
          buttons: ['Yes', 'No']
        });
        if (res === 1) {
          // No
          props.dispatch({
            type: 'change-curation-lock',
            payload: {
              key: curation.key,
              lock: false,
            },
          });
          return;
        }
      }
      // Set status text
      const statusProgress = newProgress(curation.key, progressDispatch);
      ProgressDispatch.setText(statusProgress, 'Importing Curation...');
      ProgressDispatch.setUsePercentDone(statusProgress, false);
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
        const content = await indexContentFolder(getContentFolderByKey2(curation.key), curationLog);
        props.dispatch({
          type: 'set-curation-content',
          payload: {
            key: curation.key,
            content: content
          }
        });
      })
      .finally(() => {
        ProgressDispatch.finished(statusProgress);
      });
    }
  }, [props.dispatch, props.curation, props.importCuration]);
  // Callback for testing a curation works
  const doRun = useCallback(async (mad4fp: boolean) => {
    if (props.curation) {
      // Lock the curation while copying files
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: props.curation.key,
          lock: true,
        },
      });
      const statusProgress = newProgress(props.curation.key, progressDispatch);
      ProgressDispatch.setText(statusProgress, 'Launching Curation...');
      ProgressDispatch.setUsePercentDone(statusProgress, false);
      await window.Shared.back.sendP<any, LaunchCurationData>(BackIn.LAUNCH_CURATION, {
        key: props.curation.key,
        meta: props.curation.meta,
        addApps: props.curation.addApps.map(addApp => addApp.meta),
        mad4fp: mad4fp
      });
      ProgressDispatch.finished(statusProgress);
      // Unlock the curation
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: props.curation.key,
          lock: false,
        },
      });
    }
  }, [props.dispatch, props.curation, strings.dialog]);
  const onRunWithMAD4FP = useCallback(() => {
    doRun(true);
  }, [doRun]);
  const onRun = useCallback(() => {
    doRun(false);
  }, [doRun]);
  // Callback for when the index content button is clicked
  const onIndexContent = useCallback(async () => {
    if (props.curation) {
      const content = await indexContentFolder(getContentFolderByKey2(props.curation.key), curationLog);
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
      remote.shell.openItem(getCurationFolder2(props.curation));
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
        payload: {
          key: props.curation.key,
          type: 'normal'
        }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when adding an Extras add app
  const onAddExtras = useCallback(() => {
    if (props.curation) {
      props.dispatch({
        type: 'new-addapp',
        payload: {
          key: props.curation.key,
          type: 'extras'
        }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when adding a Message add app
  const onAddMessage = useCallback(() => {
    if (props.curation) {
      props.dispatch({
        type: 'new-addapp',
        payload: {
          key: props.curation.key,
          type: 'message'
        }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Callback for when the export button is clicked
  const onExportClick = useCallback(async () => {
    if (props.curation) {
      const curation = props.curation;
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: curation.key,
          lock: true,
        },
      });
      const warnings = getCurationWarnings(curation, props.suggestions, props.libraries, strings.curate);
      const warningCount = getWarningCount(warnings);
      if (warningCount > 0) {
        // Prompt user
        const res = remote.dialog.showMessageBoxSync({
          title: 'Export Warnings',
          message: 'There are Warnings present on this Curation.\n\nDo you still wish to export?',
          buttons: ['Yes', 'No']
        });
        if (res === 1) {
          // No
          props.dispatch({
            type: 'change-curation-lock',
            payload: {
              key: curation.key,
              lock: false,
            },
          });
          return;
        }
      }
      // Choose where to save the file
      const defaultPath = path.join(window.Shared.config.fullFlashpointPath, 'Curations', '_Exports');
      await fs.ensureDir(defaultPath);
      const filePath = remote.dialog.showSaveDialogSync({
        title: strings.dialog.selectFileToExportMeta,
        defaultPath: defaultPath,
        filters: [{
          name: 'Curation archive',
          extensions: ['7z'],
        }]
      });
      if (filePath) {
        await fs.ensureDir(path.dirname(filePath));
        // Check if zip path already exists
        await fs.access(filePath, fs.constants.F_OK)
          .then(() => {
            // Remove old zip - 'Add' will expand zip if it exists
            return fs.unlink(filePath);
          })
          .catch((error) => { /* No file is okay, ignore error */ });
        // Save working meta
        const metaPath = path.join(getCurationFolder2(curation), 'meta.yaml');
        const meta = YAML.stringify(convertEditToCurationMeta(curation.meta, props.tagCategories, curation.addApps));
        const statusProgress = newProgress(props.curation.key, progressDispatch);
        ProgressDispatch.setText(statusProgress, 'Exporting Curation...');
        ProgressDispatch.setUsePercentDone(statusProgress, false);
        await fs.writeFile(metaPath, meta)
        .then(() => {
          // Zip it all up
          return new Promise<void>((resolve) => {
            return add(filePath, getCurationFolder2(curation), { recursive: true, $bin: pathTo7z })
            .on('end', () => { resolve(); })
            .on('error', (error) => {
              curationLog(error.message);
              resolve();
            });
          });
        })
        .finally(() => {
          ProgressDispatch.finished(statusProgress);
        });
      }
      const msg = `Successfully Exported ${curation.meta.title} to ${filePath}`;
      console.log(msg);
      curationLog(msg);
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: curation.key,
          lock: false,
        },
      });
    }
  }, [props.curation, props.tagCategories]);

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

  // Whether the platform used by the curation is native locked
  const native = useMemo(() => {
    if (props.curation && props.curation.meta.platform) {
      isPlatformNativeLocked(props.curation.meta.platform);
    }
    return false;
  }, [props.curation]);
  // Render additional application elements
  const addApps = useMemo(() => (
    <>
    { strings.browse.additionalApplications }:
    { props.curation && props.curation.addApps.length > 0 ? (
      <table className="curate-box-table">
        <tbody>
          { props.curation.addApps.map(addApp => (
            <CurateBoxAddApp
              key={addApp.key}
              curationKey={props.curation && props.curation.key || ''}
              curation={addApp}
              dispatch={props.dispatch}
              disabled={disabled}
              platform={props.curation && props.curation.meta.platform}
              onInputKeyDown={onInputKeyDown} />
          )) }
        </tbody>
      </table>
    ) : undefined }
    </>
  ), [
    props.curation && props.curation.addApps,
    props.curation && props.curation.key,
    props.dispatch,
    native,
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
    if (props.curation) {
      return getCurationWarnings(props.curation, props.suggestions, props.libraries, strings.curate);
    }
    return {};
  }, [props.curation, strings]);

  // Render images (logo + ss)
  const imageSplit = useMemo(() => {
    if (props.curation) {
      const thumbnailPath = props.curation.thumbnail.exists ? fixSlashes(`${props.curation.thumbnail.filePath}?v=${props.curation.thumbnail.version}`) : undefined;
      const screenshotPath = props.curation.screenshot.exists ? fixSlashes(`${props.curation.screenshot.filePath}?v=${props.curation.screenshot.version}`) : undefined;
      return (
        <>
          <GameImageSplit
            text={strings.browse.thumbnail}
            imgSrc={thumbnailPath}
            showHeaders={false}
            onAddClick={onAddThumbnailClick}
            onRemoveClick={onRemoveThumbnailClick}
            disabled={disabled}
            onDrop={onDropThumbnail}
            />
          <GameImageSplit
            text={strings.browse.screenshot}
            imgSrc={screenshotPath}
            showHeaders={false}
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

  // Render all owned ProgressData as components
  const progressComponent = useMemo(() => {
    const key = props.curation ? props.curation.key : 'invalid';
    const progressArray = progressState[key];
    if (progressArray) {
      return progressArray.map((data, index) => {
        return (
          <AutoProgressComponent
            key={index}
            progressData={data} />
        );
      });
    }
  }, [props.curation && progressState[props.curation.key]]);

  // Meta
  const curationNotes = props.curation && props.curation.meta.curationNotes || '';
  // Misc
  const sharedInputProps = {
    editable: editable,
    disabled: disabled,
    onKeyDown: onInputKeyDown,
  };

  // Render
  return React.useMemo(() => (
    <div id={props.curation && props.curation.key} className='curate-box'>
      {/* Images */}
      <div className='curate-box-images'>
        {imageSplit}
      </div>
      <div className='curate-box-images-footer'>
        <p>{strings.browse.dropImageHere}</p>
      </div>
      <hr className='curate-box-divider' />
      {/* Fields */}
      <table className="curate-box-table">
        <tbody>
          <CurateBoxRow title={strings.filter.title + ':'}>
            <InputField
              text={props.curation && props.curation.meta.title || ''}
              placeholder={strings.browse.noTitle}
              onChange={onTitleChange}
              { ...sharedInputProps } />
          </CurateBoxRow>
          <CurateBoxRow title={strings.browse.alternateTitles + ':'}>
            <InputField
              text={props.curation && props.curation.meta.alternateTitles || ''}
              placeholder={strings.browse.noAlternateTitles}
              onChange={onAlternateTitlesChange}
              { ...sharedInputProps } />
          </CurateBoxRow>
          <CurateBoxRow title={strings.browse.library + ':'}>
            {/* Look like a DropdownInputField */}
            <div className={warnings.nonExistingLibrary ? 'curate-box-select--warn' : ''}>
              <select
                className={'input-field input-field--edit simple-input ' +
                          'input-dropdown__input-field__input__inner ' +
                          (disabled ? 'simple-input--disabled' : '')}
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
          <CurateBoxRow title={strings.browse.tags + ':'}>
            <TagInputField
              placeholder={strings.browse.enterTag}
              text={tagInputText}
              editable={editable}
              tags={props.curation && props.curation.meta.tags || []}
              categories={props.tagCategories}
              suggestions={tagSuggestions}
              onChange={onCurrentTagChange}
              onTagSuggestionSelect={onAddTagSuggestion}
              onTagSubmit={onAddTagByString}
              onTagEditableSelect={onRemoveTag} />
          </CurateBoxRow>
          <CurateBoxRow title={strings.browse.playMode + ':'}>
            <DropdownInputField
              text={props.curation && props.curation.meta.playMode || ''}
              placeholder={strings.browse.noPlayMode}
              onChange={onPlayModeChange}
              items={props.suggestions && props.suggestions.playMode || []}
              onItemSelect={onPlayModeSelect}
              { ...sharedInputProps } />
          </CurateBoxRow>
          <CurateBoxRow title={strings.browse.status + ':'}>
            <DropdownInputField
              text={props.curation && props.curation.meta.status || ''}
              placeholder={strings.browse.noStatus}
              onChange={onStatusChange}
              items={props.suggestions && props.suggestions.status || []}
              onItemSelect={onStatusSelect}
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
              className={(warnings.noLaunchCommand || (warnings.invalidLaunchCommand && warnings.invalidLaunchCommand.length !== 0)) ? 'input-field--warn' : ''}
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
              text={curationNotes}
              placeholder={strings.curate.noCurationNotes}
              onChange={onCurationNotesChange}
              multiline={true}
              className={curationNotes.length > 0 ? 'input-field--info' : ''}
              { ...sharedInputProps } />
          </CurateBoxRow>
          <CurateBoxRow title={strings.browse.extreme + ':'}>
            <CheckBox
              checked={strToBool(props.curation && props.curation.meta.extreme || '')}
              onToggle={onExtremeChange}
              disabled={disabled} />
          </CurateBoxRow>
        </tbody>
      </table>
      <hr className='curate-box-divider' />
      {/* Additional Application */}
      <div className='curate-box-add-apps'>
        {addApps}
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
      <table>
        <tbody>
          <CurateBoxRow title={strings.curate.id + ':'}>
            <InputField
              text={props.curation && props.curation.key || ''}
              placeholder={'No ID? Something\'s broken.'}
              { ...sharedInputProps }
              disabled={true} />
          </CurateBoxRow>
        </tbody>
      </table>
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
          { props.mad4fpEnabled ? (
            <SimpleButton
              className='curate-box-buttons__button'
              value={strings.curate.runWithMAD4FP}
              onClick={onRunWithMAD4FP}
              disabled={disabled} />
          ) : undefined}
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
      {progressComponent}
    </div>
  ), [props.curation, strings, disabled, warnings, onImportClick, progressComponent,
      tagInputText, tagSuggestions]);
}

function renderRemoveButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<[LangContainer['curate'], boolean]>): JSX.Element {
  const [ strings, disabled ] = extra;
  return (
    <SimpleButton
      className={
        'curate-box-buttons__button' +
        ((activationCounter > 0) ? ' curate-box-buttons__button--active simple-vertical-shake' : '')
      }
      value={strings.delete}
      title={strings.deleteCurationDesc}
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
  return useCallback((checked: boolean) => {
    if (key !== undefined) {
      dispatch({
        type: 'edit-curation-meta',
        payload: {
          key: key,
          property: property,
          value: checked ? 'Yes' : 'No', // Note: This is hard-coded in english because it is written to the meta file
        }
      });
    }
  }, [dispatch, key]);
}

function useAddImageCallback(filename: string, strings: LangContainer, curation: EditCuration | undefined): () => void {
  return useCallback(() => {
    const filePaths = window.Shared.showOpenDialogSync({
      title: strings.dialog.selectScreenshot,
      properties: ['openFile'],
      filters: [{ extensions: ['png', 'PNG'], name: 'Image File' }]
    });
    if (curation && filePaths && filePaths[0].toLowerCase().endsWith('.png')) {
      fs.copyFile(filePaths[0], path.join(getCurationFolder2(curation), filename));
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
      const filePath = path.join(getCurationFolder2(curation), filename);
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
      fs.copyFile(files[0].path, path.join(getCurationFolder2(curation), filename));
    }
  }, [curation && curation.key]);
}



/**
 * Check if a the value of a field is in the suggestions for that field.
 * @param props Properties of the CurateBox.
 * @param key Key of the field to check.
 */
function isValueSuggested<T extends keyof Partial<GamePropSuggestions>>(curation: EditCuration, _suggestions: Partial<GamePropSuggestions> | undefined, key: T & string): boolean {
  // Get the values used
  // (the dumb compiler doesn't understand that this is a string >:((( )
  const value = (curation.meta[key] || '') as string;
  const suggestions = _suggestions && _suggestions[key];
  // Check if the value is suggested
  return suggestions ? (suggestions.indexOf(value) >= 0) : false;
}

/**
 * Check if a list value of a field is in the suggestions for that field.
 * @param props Properties of the CurateBox
 * @param key Key of the field to check
 * @param delimiter String delimiter between values
 * @returns List of values not found in suggestions
 */
function listValuesNotSuggested<T extends keyof Partial<GamePropSuggestions>>(curation: EditCuration, _suggestions: Partial<GamePropSuggestions> | undefined, key: T & string, delimiter: string): string[] {
  // Get the values used
  // (the dumb compiler doesn't understand that this is a string >:((( )
  const value = (curation.meta[key] || '') as string;
  const suggestions = _suggestions && _suggestions[key];
  const unusedValues: string[] = [];
  // Delimiter given, split string
  if (suggestions && value.length > 0) {
    const values = value.split(delimiter);
    // If any split values don't exist in suggestions, return false
    for (let i = 0; i < values.length; i++) {
      const trimmedValue = values[i].trim();
      if (suggestions.indexOf(trimmedValue) === -1) {
        unusedValues.push(trimmedValue);
      }
    }
    // All values found in suggestions
  }
  return unusedValues;
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
      fileName: getPathOfHtdocsUrl(content[i].filePath) || '',
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
 * Check if string is a http url
 * @param str String to check.
 */
function isHttpUrl(str: string): boolean {
  try { return new URL(str).protocol.toLowerCase() === 'http:'; }
  catch (e) { return false; }
}

function invalidLaunchCommandWarnings(folderPath: string, launchCommand: string, strings: LangContainer['curate']): string[] {
  // Keep list of warns for end
  const warns: string[] = [];
  // Extract first string from launch command via regex
  let match = launchCommand.match(/[^\s"']+|"([^"]*)"|'([^']*)'/);
  if (match) {
    // Match 1 - Inside quotes, Match 0 - No Quotes Found
    let lc = match[1] || match[0];
    // Extract protocol from potential URL
    console.log(lc);
    let protocol = lc.match(/(.+?):\/\//);
    console.log(protocol);
    if (protocol) {
      // Protocol found, must be URL
      if (protocol[1] !== 'http') {
        // Not using HTTP
        warns.push(strings.ilc_notHttp);
      }
      const ending = lc.split('/').pop();
      // If the string ends in file, cut off parameters
      if (ending && ending.includes('.')) {
        lc = lc.split('?')[0];
      }
      const filePath = path.join(folderPath, unescape(lc).replace(/(^\w+:|^)\/\//, ''));
      // Push a game to the list if its launch command file is missing
      if (!fs.existsSync(filePath)) {
        warns.push(strings.ilc_nonExistant);
      }
    }
  }
  return warns;
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

export function getCurationWarnings(curation: EditCuration, suggestions: Partial<GamePropSuggestions> | undefined, libraries: string[], strings: LangContainer['curate']) {
  const warns: CurationWarnings = {};
  // Check launch command exists
  const launchCommand = curation.meta.launchCommand || '';
  warns.noLaunchCommand = launchCommand === '';
  // Check launch command is valid (if exists)
  if (!warns.noLaunchCommand) {
    warns.invalidLaunchCommand = invalidLaunchCommandWarnings(getContentFolderByKey2(curation.key), launchCommand, strings);
  }
  // Validate release date
  const releaseDate = curation.meta.releaseDate;
  if (releaseDate) { warns.releaseDateInvalid = !isValidDate(releaseDate); }
  // Check for unused values (with suggestions)
  warns.unusedPlatform = !isValueSuggested(curation, suggestions, 'platform');
  warns.unusedApplicationPath = !isValueSuggested(curation, suggestions, 'applicationPath');
  warns.nonContentFolders = curation.unusedDirs;
  // Check if library is set
  const curLibrary = curation.meta.library;
  warns.nonExistingLibrary = (libraries.findIndex(l => l === curLibrary) === -1);
  return warns;
}

function getContentFolderByKey2(key: string) {
  return getContentFolderByKey(key, window.Shared.config.fullFlashpointPath);
}

function getCurationFolder2(curation: EditCuration | CurationIndex) {
  return getCurationFolder(curation, window.Shared.config.fullFlashpointPath);
}

function isPlatformNativeLocked(platform: string) {
  return window.Shared.config.data.nativePlatforms.findIndex((item) => { return item === platform; }) != -1;
}

function getPathOfHtdocsUrl(url: string): string | undefined {
  const urlObj = toForcedURL(url);
  if (urlObj) {
    return path.join(
      window.Shared.config.fullFlashpointPath,
      htdocsPath,
      decodeURIComponent(path.join(urlObj.hostname, urlObj.pathname))
    );
  }
}
