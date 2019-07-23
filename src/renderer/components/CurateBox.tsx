import * as fs from 'fs';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { promisify } from 'util';
import { InputField } from './InputField';
import { EditCuration, CurationAction, EditCurationMeta } from '../context/CurationContext';
import { sizeToString } from '../Util';
import { CurateBoxImage } from './CurateBoxImage';
import { CurateBoxRow } from './CurateBoxRow';
import { SimpleButton } from './SimpleButton';
import { GameLauncher } from '../GameLauncher';
import { CurationIndexContent } from '../curate/indexCuration';
import GameManager from '../game/GameManager';
import { GameImageCollection } from '../image/GameImageCollection';
import { CheckBox } from './CheckBox';
import { DropdownInputField } from './DropdownInputField';
import { GamePropSuggestions } from '../util/suggestions';
import { CurationWarnings, CurateBoxWarnings } from './CurateBoxWarnings';
import { CurateBoxAddApp } from './CurateBoxAddApp';
import { importCuration, stringToBool } from '../curate/importCuration';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';

const fsStat = promisify(fs.stat);

export type CurateBoxProps = {
  /** Game manager to add imported curations to. */
  games?: GameManager;
  /** Game images collection to add imported images to. */
  gameImages?: GameImageCollection;
  /** Meta data of the curation to display. */
  curation?: EditCuration;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
  /** Suggestions for the drop-down input fields. */
  suggestions?: Partial<GamePropSuggestions> | undefined;
};

/** A box that displays and lets the user edit a curation. */
export function CurateBox(props: CurateBoxProps) {
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
  const key = props.curation ? props.curation.key : undefined;
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
    const { curation, games, gameImages } = props;
    if (curation && games && gameImages) {
      // Lock the curation (so it can't be edited while importing)
      props.dispatch({
        type: 'change-curation-lock',
        payload: {
          key: curation.key,
          lock: true,
        },
      });
      // Import the curation
      importCuration(curation, games, gameImages)
      .then(() => {
        // Remove the curation
        props.dispatch({
          type: 'remove-curation',
          payload: { key: curation.key }
        });
      })
      .catch((error) => {
        // Log error
        console.error(error);
        // Unlock the curation
        props.dispatch({
          type: 'change-curation-lock',
          payload: {
            key: curation.key,
            lock: false,
          },
        });
      });
    }
  }, [props.dispatch, props.curation, props.games, props.gameImages]);
  // Callback for when the remove button is clicked
  const onRemoveClick = useCallback(() => {
    if (props.curation) {
      props.dispatch({
        type: 'remove-curation',
        payload: { key: props.curation.key }
      });
    }
  }, [props.dispatch, props.curation && props.curation.key]);
  // Input props
  const canEdit = true;
  const disabled = props.curation ? props.curation.locked : false;
  // Render additional application elements
  const addApps = useMemo(() => (
    (props.curation && props.curation.addApps.length > 0) ? (
      <>
        Additional Applications:
        { props.curation.addApps.map(addApp => (
          <CurateBoxAddApp
            key={addApp.key}
            curationKey={props.curation && props.curation.key || ''}
            curation={addApp}
            dispatch={props.dispatch}
            disabled={disabled}
            onInputKeyDown={onInputKeyDown} />
        )) }
        <hr className='curate-box-divider' />
      </>
    ) : undefined
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
        content.fileName[content.fileName.length - 1] === '/' &&
        content.fileSize === 0
      );
      // Render content element
      const contentElement = (
        <span className='curate-box-files__entry'>
          {content.fileName + (isFolder ? '' : ` (${sizeToString(content.fileSize)})`)}
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
    }
    return warns;
  }, [props.curation && props.curation.meta]);
  // Meta
  const authorNotes = props.curation && props.curation.meta.authorNotes || '';
  // Misc
  const sharedInputProps = {
    canEdit: canEdit,
    disabled: disabled,
    onKeyDown: onInputKeyDown,
  };
  // Render
  return (
    <div className='curate-box'>
      {/* Images */}
      <div className='curate-box-image-titles'>
        <p className='curate-box-image-titles__title'>Thumbnail</p>
        <p className='curate-box-image-titles__title'>Screenshot</p>
      </div>
      <div className='curate-box-images'>
        <CurateBoxImage image={props.curation && props.curation.thumbnail} />
        <CurateBoxImage image={props.curation && props.curation.screenshot} />
      </div>
      <hr className='curate-box-divider' />
      {/* Fields */}
      <CurateBoxRow title='Title:'>
        <InputField
          text={props.curation && props.curation.meta.title || ''}
          placeholder='No Title'
          onChange={onTitleChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Series:'>
        <InputField
          text={props.curation && props.curation.meta.series || ''}
          placeholder='No Series'
          onChange={onSeriesChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Developer:'>
        <InputField
          text={props.curation && props.curation.meta.developer || ''}
          placeholder='No Developer'
          onChange={onDeveloperChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Publisher:'>
        <InputField
          text={props.curation && props.curation.meta.publisher || ''}
          placeholder='No Publisher'
          onChange={onPublisherChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Genre:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.genre || ''}
          placeholder='No Genre'
          onChange={onGenreChange}
          items={props.suggestions && props.suggestions.genre || []}
          onItemSelect={onGenreItemSelect}
          className={warnings.unusedGenre ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Play Mode:'>
        <InputField
          text={props.curation && props.curation.meta.playMode || ''}
          placeholder='No Play Mode'
          onChange={onPlayModeChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Status:'>
        <InputField
          text={props.curation && props.curation.meta.status || ''}
          placeholder='No Status'
          onChange={onStatusChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Version:'>
        <InputField
          text={props.curation && props.curation.meta.version || ''}
          placeholder='No Version'
          onChange={onVersionChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Release Date:'>
        <InputField
          text={props.curation && props.curation.meta.releaseDate || ''}
          placeholder='No Release Date'
          onChange={onReleaseDateChange}
          className={warnings.releaseDateInvalid ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Language:'>
        <InputField
          text={props.curation && props.curation.meta.language || ''}
          placeholder='No Language'
          onChange={onLanguageChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Source:'>
        <InputField
          text={props.curation && props.curation.meta.source || ''}
          placeholder='No Source'
          onChange={onSourceChange}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Platform:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.platform || ''}
          placeholder='No Platform'
          onChange={onPlatformChange}
          items={props.suggestions && props.suggestions.platform || []}
          onItemSelect={onPlatformItemSelect}
          className={warnings.unusedPlatform ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Application Path:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.applicationPath || ''}
          placeholder='No Application Path'
          onChange={onApplicationPathChange}
          items={props.suggestions && props.suggestions.applicationPath || []}
          onItemSelect={onApplicationPathItemSelect}
          className={warnings.unusedApplicationPath ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Launch Command:'>
        <InputField
          text={props.curation && props.curation.meta.launchCommand || ''}
          placeholder='No Launch Command'
          onChange={onLaunchCommandChange}
          className={warnings.isNotHttp ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Notes:'>
        <InputField
          text={props.curation && props.curation.meta.notes || ''}
          placeholder='No Notes'
          onChange={onNotesChange}
          multiline={true}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Original Description:'>
        <InputField
          text={props.curation && props.curation.meta.originalDescription || ''}
          placeholder='No Original Description'
          onChange={onOriginalDescriptionChange}
          multiline={true}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Curation Notes:'>
        <InputField
          text={authorNotes}
          placeholder='No Curation Notes'
          onChange={onAuthorNotesChange}
          multiline={true}
          className={authorNotes.length > 0 ? 'input-field--warn' : ''}
          { ...sharedInputProps } />
      </CurateBoxRow>
      <CurateBoxRow title='Extreme:'>
        <CheckBox
          checked={stringToBool(props.curation && props.curation.meta.extreme || '')}
          onToggle={onExtremeChange}
          disabled={disabled} />
      </CurateBoxRow>
      <hr className='curate-box-divider' />
      {/* Additional Application */}
      <div className='curate-box-add-apps'>
        {addApps}
      </div>
      {/* Content */}
      <div className='curate-box-files'>
        <div className='curate-box-files__head'>
          {'Content Files: '}
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
        <ConfirmElement
          onConfirm={onRemoveClick}
          children={renderRemoveButton} />
        <SimpleButton
          className='curate-box-buttons__button'
          value='Import'
          onClick={onImportClick} />
      </div>
    </div>
  );
}

function renderRemoveButton({ activate, activationCounter, reset }: ConfirmElementArgs): JSX.Element {
  return (
    <SimpleButton
      className={
        'curate-box-buttons__button' +
        ((activationCounter > 0) ? ' curate-box-buttons__button--active simple-vertical-shake' : '')
      }
      value='Remove'
      title='Remove this curation (no changes will be made to any files)'
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
          value: boolToString(checked)
        }
      });
    }
  }, [dispatch, key]);
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
async function checkCollisions(content: CurationIndexContent[]) {
  const collisions: ContentCollision[] = [];
  for (let i = 0; i < content.length; i++) {
    const collision: ContentCollision = {
      fileName: GameLauncher.getPathOfHtdocsUrl(content[i].fileName) || '',
      fileSize: 0,
      fileExists: false,
      isFolder: false,
    };
    collisions[i] = collision;
    if (collision.fileName !== undefined) {
      const [stats, error] = await safeAwait(fsStat(collision.fileName));
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
function boolToString(bool: boolean): string {
  return bool ? 'Yes' : 'No';
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
