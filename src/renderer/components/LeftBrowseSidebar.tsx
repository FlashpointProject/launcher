import { useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { gameDragDataType } from '@renderer/Util';
import { Playlist } from 'flashpoint-launcher';
import { InputElement } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { OpenIcon } from './OpenIcon';
import { PlaylistItem } from './PlaylistItem';

export type LeftBrowseSidebarProps = {
  library: string;
  playlists: Playlist[];
  /** ID of the playlist that is selected (empty string if none). */
  isEditing: boolean;
  isNewPlaylist: boolean;
  currentPlaylist: Playlist | null;
  playlistIconCache: Record<string, string>;
  onDelete: () => void;
  onSave: () => void;
  onCreate: (event: React.MouseEvent) => void;
  onImport: () => void;
  onDiscard: () => void;
  onEditClick: () => void;
  onDrop: (event: React.DragEvent, playlistId: string) => void;
  onItemClick: (playlistId: string, selected: boolean) => void;
  onSetIcon: () => void;
  onTitleChange: (event: React.ChangeEvent<InputElement>) => void;
  onAuthorChange: (event: React.ChangeEvent<InputElement>) => void;
  onExtremeToggle: (isChecked: boolean) => void;
  onDescriptionChange: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<InputElement>) => void;
  onShowAllClick?: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => void
  onDownloadPlaylistContents: (playlistId: string) => void;
  onDuplicatePlaylist: (playlistId: string) => void;
  onExportPlaylist: (playlistId: string) => void;
};

export function LeftBrowseSidebar(props: LeftBrowseSidebarProps) {
  const allStrings = useLocalization();
  const strings = allStrings.browse;
  const browsePageShowExtreme = useAppSelector((state) => state.preferences.browsePageShowExtreme);
  const useCustomViews = useAppSelector((state) => state.preferences.useCustomViews);
  const { onShowAllClick, onDescriptionChange, onExtremeToggle, onKeyDown, onSave, onDiscard,
    onCreate, onImport, onEditClick, onDelete, onDownloadPlaylistContents, onDuplicatePlaylist,
    onExportPlaylist, onDrop, onItemClick, onSetIcon, onTitleChange, onAuthorChange, onContextMenu,
    library, playlists, playlistIconCache, currentPlaylist, isEditing, isNewPlaylist } = props;

  const onPlaylistItemDragOver = (event: React.DragEvent): void => {
    const types = event.dataTransfer.types;
    if (types.length === 1 && types[0] === gameDragDataType) {
      // Show the "You can drop here" cursor while dragging something droppable over this element
      event.dataTransfer.dropEffect = 'copy';
      event.preventDefault();
    }
  };

  const playlistRows = playlists
  .filter(p => browsePageShowExtreme || !p.extreme)
  .map(p => {
    const isSelected = currentPlaylist?.id === p.id;
    return (
      <PlaylistItem
        key={p.id}
        playlist={p}
        selected={isSelected}
        editing={isSelected && isEditing}
        playlistIconCache={playlistIconCache}
        onDrop={onDrop}
        onDragOver={onPlaylistItemDragOver}
        onHeadClick={onItemClick}
        onSetIcon={onSetIcon}
        onTitleChange={onTitleChange}
        onAuthorChange={onAuthorChange}
        onDescriptionChange={onDescriptionChange}
        onExtremeToggle={onExtremeToggle}
        onKeyDown={onKeyDown}
        onSave={onSave}
        onDiscard={onDiscard}
        onEdit={onEditClick}
        onDelete={onDelete}
        onDownloadPlaylistContents={onDownloadPlaylistContents}
        onDuplicatePlaylist={onDuplicatePlaylist}
        onExportPlaylist={onExportPlaylist}
        onContextMenu={onContextMenu} />
    );
  });

  const newPlaylistItem = (isNewPlaylist && currentPlaylist !== null) ? (
    <>
      <PlaylistItem
        key={'new_playlist'}
        playlist={currentPlaylist}
        selected={true}
        editing={isEditing}
        playlistIconCache={playlistIconCache}
        onDrop={onDrop}
        onDragOver={onPlaylistItemDragOver}
        onHeadClick={onItemClick}
        onSetIcon={onSetIcon}
        onTitleChange={onTitleChange}
        onAuthorChange={onAuthorChange}
        onDescriptionChange={onDescriptionChange}
        onExtremeToggle={onExtremeToggle}
        onKeyDown={onKeyDown}
        onSave={onSave}
        onDiscard={onDiscard}
        onEdit={onEditClick}
        onDelete={onDelete}
        onDownloadPlaylistContents={onDownloadPlaylistContents}
        onDuplicatePlaylist={onDuplicatePlaylist}
        onExportPlaylist={onExportPlaylist}
        onContextMenu={onContextMenu} />
    </>
  ) : <></>;

  return (
    <div className='browse-left-sidebar'>
      <div className='playlist-list'>
        {/* All games */}
        <div
          className='playlist-list-fake-item'
          onClick={onShowAllClick}>
          <div className='playlist-list-fake-item__inner'>
            <OpenIcon icon='eye' />
          </div>
          <div className='playlist-list-fake-item__inner'>
            <p className='playlist-list-fake-item__inner__title'>{useCustomViews ? strings.allGenericEntries : allStrings.libraries[library + 'Plural'] || 'All ' + library}</p>
          </div>
        </div>
        {/* List all playlists */}
        {playlistRows}
        {newPlaylistItem}
        {/* Create New Playlist */}
        <div
          className='playlist-list-fake-item-buttons' >
          <div className='playlist-list-fake-item'
            onClick={onCreate} >
            <div className='playlist-list-fake-item__inner'>
              <OpenIcon icon='plus' />
            </div>
            <div className='playlist-list-fake-item__inner'>
              <p className='playlist-list-fake-item__inner__title'>{strings.newPlaylist}</p>
            </div>
          </div>
          <div className='playlist-list-fake-item'
            onClick={onImport} >
            <div className='playlist-list-fake-item__inner'>
              <OpenIcon icon='file' />
            </div>
            <div className='playlist-list-fake-item__inner'>
              <p className='playlist-list-fake-item__inner__title'>{strings.importPlaylist}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
