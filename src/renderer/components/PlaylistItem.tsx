import { Playlist } from '@database/entity/Playlist';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { LangContext } from '../util/lang';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';

export type PlaylistItemProps = {
  playlist: Playlist;
  editing: boolean;
  selected: boolean;
  playlistIconCache: Record<string, string>;
  onDrop: (event: React.DragEvent, playlistId: string) => void;
  onDragOver: (event: React.DragEvent) => void;
  onHeadClick: (playlistId: string, selected: boolean) => void;
  onSetIcon: () => void;
  onTitleChange: (event: React.ChangeEvent<InputElement>) => void;
  onAuthorChange: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<InputElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => void;
}

export function PlaylistItem(props: PlaylistItemProps) {
  const strings = React.useContext(LangContext).playlist;

  const [dragOver, setDragOver] = React.useState(false);

  const onContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (props.onContextMenu) { props.onContextMenu(event, props.playlist.id); }
  }, [props.onContextMenu]);

  const onDrop = useCallback((event: React.DragEvent) => {
    if (dragOver) { setDragOver(false); }
    props.onDrop(event, props.playlist.id);
  }, [dragOver, props.onDrop]);

  const onDragOver = useCallback((event: React.DragEvent): void => {
    props.onDragOver(event);
  }, [props.onDragOver, props.playlist]);

  const onDragEnter = useCallback((event: React.DragEvent): void => {
    if (!dragOver && !findParent(event.currentTarget, event.relatedTarget as Element)) {
      setDragOver(true);
      event.stopPropagation();
    }
  }, [dragOver]);

  const onDragLeave = useCallback((event: React.DragEvent): void => {
    if (dragOver && !findParent(event.currentTarget, event.relatedTarget as Element)) {
      setDragOver(false);
      event.stopPropagation();
    }
  }, [dragOver]);

  const onHeadClick = useCallback(() => {
    props.onHeadClick(props.playlist.id, props.selected);
  }, [props.playlist.id, props.selected]);

  const onIconClick = useCallback(() => {
    if (props.selected) { props.onSetIcon(); }
  }, [props.onSetIcon, props.selected]);

  const icon = useMemo(() => {
    return props.editing
      ? `url("${props.playlist.icon}")`
      : props.playlistIconCache[props.playlist.id];
  }, [props.editing, props.playlist.id, props.playlist.icon, props.playlistIconCache]);

  let className = 'playlist-list-item';
  if (props.selected) { className += ' playlist-list-item--selected'; }
  if (props.editing)  { className += ' playlist-list-item--editing'; }
  if (dragOver)       { className += ' playlist-list-item--drag-over'; }

  return (
    <div
      className={className}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={onContextMenu}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}>
      {/* Drag Overlay */}
      <div className='playlist-list-item__drag-overlay' />
      {/* Head */}
      <div
        className='playlist-list-item__head'
        onClick={onHeadClick}>
        {/* Icon */}
        { props.playlist.icon ? (
          <div className='playlist-list-item__icon'>
            <div
              className='playlist-list-item__icon-image'
              title={props.editing ? strings.changeIcon : undefined}
              style={{ backgroundImage: icon }}
              onClick={props.editing ? onIconClick : undefined} />
          </div>
        ) : (
          <div
            className='playlist-list-item__icon simple-center'
            onClick={onIconClick}>
            <div className='playlist-list-item__icon-placeholder simple-center__inner'>
              <OpenIcon
                icon='question-mark'
                className='playlist-list-item__icon-placeholder-inner' />
            </div>
          </div>
        ) }
        {/* Title */}
        <div className='playlist-list-item__title simple-center'>
          <InputField
            text={props.playlist.title}
            placeholder={strings.noTitle}
            className='playlist-list-item__text-field'
            onChange={props.onTitleChange}
            editable={props.editing}
            onKeyDown={props.onKeyDown} />
        </div>
        {/* Author */}
        { (props.editing || props.playlist.author) ? (
          <>
            <div className='playlist-list-item__divider simple-center'>
              <p className='simple-center__inner'>{strings.by}</p>
            </div>
            <div className='playlist-list-item__author simple-center'>
              <InputField
                text={props.playlist.author}
                placeholder={strings.noAuthor}
                className='playlist-list-item__text-field'
                onChange={props.onAuthorChange}
                editable={props.editing}
                onKeyDown={props.onKeyDown} />
            </div>
          </>
        ) : undefined }
      </div>
    </div>
  );
}

/** Check if an element or one of its parents is the same as another element. */
function findParent(parent: Element, leafElement: Element | null): boolean {
  let element: Element|null = leafElement;
  for (let i = 20; i >= 0; i--) { // (Depth limit - to stop endless looping)
    if (!element) { return false; }
    if (element === parent) { return true; }
    element = element.parentElement;
  }
  return false;
}
