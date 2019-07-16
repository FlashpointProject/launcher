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
  const onTitleChange           = useOnInputChange('title',           key, props.dispatch);
  const onSeriesChange          = useOnInputChange('series',          key, props.dispatch);
  const onDeveloperChange       = useOnInputChange('developer',       key, props.dispatch);
  const onPublisherChange       = useOnInputChange('publisher',       key, props.dispatch);
  const onStatusChange          = useOnInputChange('status',          key, props.dispatch);
  const onGenreChange           = useOnInputChange('genre',           key, props.dispatch);
  const onSourceChange          = useOnInputChange('source',          key, props.dispatch);
  const onPlatformChange        = useOnInputChange('platform',        key, props.dispatch);
  const onApplicationPathChange = useOnInputChange('applicationPath', key, props.dispatch);
  const onLaunchCommandChange   = useOnInputChange('launchCommand',   key, props.dispatch);
  const onNotesChange           = useOnInputChange('notes',           key, props.dispatch);
  const onAuthorNotesChange     = useOnInputChange('authorNotes',     key, props.dispatch);
  const onExtremeChange         = useOnCheckboxToggle('extreme',      key, props.dispatch);
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
      // Import the curation
      importCuration(curation, games, gameImages)
      .then(() => {
        // Remove the curation
        props.dispatch({
          type: 'remove-curation',
          payload: { key: curation.key }
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
            onInputKeyDown={onInputKeyDown} />
        )) }
        <hr className='curate-box-divider' />
      </>      
    ) : undefined
  ), [props.curation && props.curation.addApps, props.curation && props.curation.key, props.dispatch]);
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
      // Check HTTP
      warns.isNotHttp = !isHttp(props.curation.meta.launchCommand || '');
    }
    return warns;
  }, [props.curation && props.curation.meta]);
  // Meta
  const authorNotes = props.curation && props.curation.meta.authorNotes || '';
  // Misc.
  const canEdit = true;
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
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Series:'>
        <InputField
          text={props.curation && props.curation.meta.series || ''}
          placeholder='No Series'
          onChange={onSeriesChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Developer:'>
        <InputField
          text={props.curation && props.curation.meta.developer || ''}
          placeholder='No Developer'
          onChange={onDeveloperChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Publisher:'>
        <InputField
          text={props.curation && props.curation.meta.publisher || ''}
          placeholder='No Publisher'
          onChange={onPublisherChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Genre:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.genre || ''}
          placeholder='No Genre'
          onChange={onGenreChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          items={props.suggestions && props.suggestions.genre || []}
          onItemSelect={onGenreItemSelect} />
      </CurateBoxRow>
      <CurateBoxRow title='Status:'>
        <InputField
          text={props.curation && props.curation.meta.status || ''}
          placeholder='No Status'
          onChange={onStatusChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Source:'>
        <InputField
          text={props.curation && props.curation.meta.source || ''}
          placeholder='No Source'
          onChange={onSourceChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Platform:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.platform || ''}
          placeholder='No Platform'
          onChange={onPlatformChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          items={props.suggestions && props.suggestions.platform || []}
          onItemSelect={onPlatformItemSelect} />
      </CurateBoxRow>
      <CurateBoxRow title='Application Path:'>
        <DropdownInputField
          text={props.curation && props.curation.meta.applicationPath || ''}
          placeholder='No Application Path'
          onChange={onApplicationPathChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          items={props.suggestions && props.suggestions.applicationPath || []}
          onItemSelect={onApplicationPathItemSelect} />
      </CurateBoxRow>
      <CurateBoxRow title='Launch Command:'>
        <InputField
          text={props.curation && props.curation.meta.launchCommand || ''}
          placeholder='No Launch Command'
          onChange={onLaunchCommandChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          className={warnings.isNotHttp ? 'input-field--warn' : ''} />
      </CurateBoxRow>
      <CurateBoxRow title='Notes:'>
        <InputField
          text={props.curation && props.curation.meta.notes || ''}
          placeholder='No Notes'
          onChange={onNotesChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          multiline={true} />
      </CurateBoxRow>
      <CurateBoxRow title='Author Notes:'>
        <InputField
          text={authorNotes}
          placeholder='No Author Notes'
          onChange={onAuthorNotesChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown}
          multiline={true}
          className={authorNotes.length > 0 ? 'input-field--warn' : ''} />
      </CurateBoxRow>
      <CurateBoxRow title='Extreme:'>
        <CheckBox
          checked={stringToBool(props.curation && props.curation.meta.extreme || '')}
          onToggle={onExtremeChange}
          />
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
        <pre className='curate-box-files__body'>
          {contentFilenames}
        </pre>
      </div>
      <hr className='curate-box-divider' />
      {/* Warnings */}
      <CurateBoxWarnings warnings={warnings} />
      {/* Buttons */}
      <div className='curate-box-buttons'>
        <SimpleButton
          className='curate-box-buttons__button'
          value='Remove'
          onClick={onRemoveClick} />
        <SimpleButton
          className='curate-box-buttons__button'
          value='Import'
          onClick={onImportClick} />
      </div>
    </div>
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
  }
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
  catch(e) { error = e;             }
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
  catch(e) { return false; }
}
