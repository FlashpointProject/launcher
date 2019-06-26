import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { InputField } from './InputField';
import { EditCuration, CurationAction } from '../context/CurationContext';
import { sizeToString } from '../Util';
import { CurateBoxImage } from './CurateBoxImage';
import { CurateBoxRow } from './CurateBoxRow';
import { IOldCurationMeta } from '../curate/oldFormat';

type InputElement = HTMLInputElement | HTMLTextAreaElement;

export type CurateBoxProps = {
  /** Meta data of the curation to display. */
  curation?: EditCuration;
  /** Dispatcher for the curate page state reducer. */
  dispatch: React.Dispatch<CurationAction>;
};

/** A box that displays and lets the user edit a curation. */
export function CurateBox(props: CurateBoxProps) {
  // Callbacks for the fields (onChange)
  const key = props.curation ? props.curation.key : undefined;
  const onTitleChange         = useOnInputChance('title',         key, props.dispatch);
  const onSeriesChange        = useOnInputChance('series',        key, props.dispatch);
  const onDeveloperChange     = useOnInputChance('developer',     key, props.dispatch);
  const onPublisherChange     = useOnInputChance('publisher',     key, props.dispatch);
  const onStatusChange        = useOnInputChance('status',        key, props.dispatch);
  const onExtremeChange       = useOnInputChance('extreme',       key, props.dispatch);
  const onGenreChange         = useOnInputChance('genre',         key, props.dispatch);
  const onSourceChange        = useOnInputChance('source',        key, props.dispatch);
  const onLaunchCommandChange = useOnInputChance('launchCommand', key, props.dispatch);
  const onNotesChange         = useOnInputChance('notes',         key, props.dispatch);
  const onAuthorNotesChange   = useOnInputChance('authorNotes',   key, props.dispatch);
  // Callback for the fields (onInputKeyDown)
  const onInputKeyDown = useCallback(() => {
    // ...
  }, []);
  // Render content (files and folders inside the "content" folder)
  const contentFilenames = useMemo(() => {
    return props.curation && props.curation.content.map((content, index) => {
      // Folders file names ends with '/' and have a file size of 0
      const isFolder = (
        content.fileName[content.fileName.length - 1] === '/' &&
        content.fileSize === 0
      );
      // Render
      const child = isFolder ? (
        content.fileName + '\n'
      ) : (
        `${content.fileName} (${sizeToString(content.fileSize)})\n`
      );
      //
      return (
        <span
          className='curate-box-files__entry'
          key={index}>
          {child}
        </span>
      );
    });
  }, [props.curation && props.curation.content]);
  //
  const canEdit = true;
  // Render
  return (
    <div className='curate-box'>
      {/* Images */}
      <div className='curate-box-images'>
        <CurateBoxImage image={props.curation && props.curation.thumbnail} />
        <CurateBoxImage image={props.curation && props.curation.screenshot} />
      </div>
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
      <CurateBoxRow title='Status:'>
        <InputField
          text={props.curation && props.curation.meta.status || ''}
          placeholder='No Status'
          onChange={onStatusChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Extreme:'>
        <InputField
          text={props.curation && props.curation.meta.extreme || ''}
          placeholder='No Extreme'
          onChange={onExtremeChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Genre:'>
        <InputField
          text={props.curation && props.curation.meta.genre || ''}
          placeholder='No Genre'
          onChange={onGenreChange}
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
      <CurateBoxRow title='Launch Command:'>
        <InputField
          text={props.curation && props.curation.meta.launchCommand || ''}
          placeholder='No Launch Command'
          onChange={onLaunchCommandChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Notes:'>
        <InputField
          text={props.curation && props.curation.meta.notes || ''}
          placeholder='No Notes'
          onChange={onNotesChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      <CurateBoxRow title='Author Notes:'>
        <InputField
          text={props.curation && props.curation.meta.authorNotes || ''}
          placeholder='No Author Notes'
          onChange={onAuthorNotesChange}
          canEdit={canEdit}
          onKeyDown={onInputKeyDown} />
      </CurateBoxRow>
      {/* Content */}
      <div className='curate-box-files'>
        <div className='curate-box-files__head'>Content Files:</div>
        <pre className='curate-box-files__body'>
          {contentFilenames}
        </pre>
      </div>
    </div>
  );
}

/**
 * Create a callback for InputField's onChange.
 * When called, the callback will set the value of a metadata property to the value of the input field.
 * @param property Property the input field should change.
 * @param dispatch Dispatcher to use.
 */
function useOnInputChance(property: keyof IOldCurationMeta, key: string | undefined, dispatch: React.Dispatch<CurationAction>) {
  return useCallback((event: React.ChangeEvent<InputElement>) => {
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
  }, [dispatch]);
}
