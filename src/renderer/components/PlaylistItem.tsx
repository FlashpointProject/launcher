import { useLocalization } from '@renderer/hooks/useLocalization';
import { Playlist } from 'flashpoint-launcher';
import * as React from 'react';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { PlaylistItemContent } from './PlaylistContent';

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
  onDescriptionChange: (event: React.ChangeEvent<InputElement>) => void;
  onExtremeToggle: (isExtreme: boolean) => void;
  onKeyDown: (event: React.KeyboardEvent<InputElement>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadPlaylistContents: (playlistId: string) => void;
  onDuplicatePlaylist: (playlistId: string) => void;
  onExportPlaylist: (playlistId: string) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => void;
}

export function PlaylistItem(props: PlaylistItemProps) {
  const strings = useLocalization().playlist;

  const [dragOver, setDragOver] = React.useState(false);

  const onContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (props.onContextMenu) { props.onContextMenu(event, props.playlist.id); }
  };

  const onDrop = (event: React.DragEvent) => {
    if (dragOver) { setDragOver(false); }
    props.onDrop(event, props.playlist.id);
  };

  const onDragOver = (event: React.DragEvent): void => {
    props.onDragOver(event);
  };

  const onDragEnter = (event: React.DragEvent): void => {
    if (!dragOver && !findParent(event.currentTarget, event.relatedTarget as Element)) {
      setDragOver(true);
      event.stopPropagation();
    }
  };

  const onDragLeave = (event: React.DragEvent): void => {
    if (dragOver && !findParent(event.currentTarget, event.relatedTarget as Element)) {
      setDragOver(false);
      event.stopPropagation();
    }
  };

  const onHeadClick = () => {
    props.onHeadClick(props.playlist.id, props.selected);
  };

  const onIconClick = () => {
    if (props.selected) { props.onSetIcon(); }
  };

  const icon = props.editing
    ? `url("${props.playlist.icon}")`
    : props.playlistIconCache[props.playlist.id];

  let className = 'playlist-list-item';
  if (props.selected) { className += ' playlist-list-item--selected'; }
  if (props.editing)  { className += ' playlist-list-item--editing'; }
  if (dragOver)       { className += ' playlist-list-item--drag-over'; }

  return (
    <>
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
      { props.selected && (
        <PlaylistItemContent
          editingDisabled={false}
          editingExtremeDisabled={false}
          editing={props.editing}
          playlist={props.playlist}
          onDescriptionChange={props.onDescriptionChange}
          onExtremeToggle={props.onExtremeToggle}
          onKeyDown={props.onKeyDown}
          onSave={props.onSave}
          onDiscard={props.onDiscard}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onDownloadPlaylistContents={props.onDownloadPlaylistContents}
          onDuplicatePlaylist={props.onDuplicatePlaylist}
          onExportPlaylist={props.onExportPlaylist} />
      )}
    </>
  );
}

/**
 * Check if an element or one of its parents is the same as another element.
 *
 * @param parent Parent to find
 * @param leafElement Current element to search upwards from
 */
function findParent(parent: Element, leafElement: Element | null): boolean {
  let element: Element|null = leafElement;
  for (let i = 20; i >= 0; i--) { // (Depth limit - to stop endless looping)
    if (!element) { return false; }
    if (element === parent) { return true; }
    element = element.parentElement;
  }
  return false;
}
