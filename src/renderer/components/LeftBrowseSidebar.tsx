import { Playlist } from '@database/entity/Playlist';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import * as React from 'react';
import { WithPreferencesProps } from '../containers/withPreferences';
import { gameIdDataType } from '../Util';
import { LangContext } from '../util/lang';
import { InputElement } from './InputField';
import { OpenIcon } from './OpenIcon';
import { PlaylistItemContent } from './PlaylistContent';
import { PlaylistItem } from './PlaylistItem';

type OwnProps = {
  library: string;
  playlists: Playlist[];
  /** ID of the playlist that is selected (empty string if none). */
  selectedPlaylistID: string;
  isEditing: boolean;
  isNewPlaylist: boolean;
  currentPlaylist?: Playlist;
  playlistIconCache: Record<string, string>;
  onDelete: () => void;
  onSave: () => void;
  onCreate: () => void;
  onImport: () => void;
  onDiscard: () => void;
  onEditClick: () => void;
  onDrop: (event: React.DragEvent, playlistId: string) => void;
  onItemClick: (playlistId: string, selected: boolean) => void;
  onSetIcon: () => void;
  onTitleChange: (event: React.ChangeEvent<InputElement>) => void;
  onAuthorChange: (event: React.ChangeEvent<InputElement>) => void;
  onDescriptionChange: (event: React.ChangeEvent<InputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<InputElement>) => void;
  onShowAllClick?: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => void
  onDuplicatePlaylist: (playlistId: string) => void;
  onExportPlaylist: (playlistId: string) => void;
};

export type LeftBrowseSidebarProps = OwnProps & WithPreferencesProps;

export interface LeftBrowseSidebar {
  context: LangContainer;
}

/** Sidebar on the left side of BrowsePage. */
export class LeftBrowseSidebar extends React.Component<LeftBrowseSidebarProps> {
  render() {
    const allStrings = this.context;
    const strings = this.context.browse;
    const { currentPlaylist, isEditing, isNewPlaylist: isEditingNew, onShowAllClick, playlistIconCache, playlists, preferencesData, selectedPlaylistID } = this.props;
    const editingDisabled = !preferencesData.enableEditing;
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
              <p className='playlist-list-fake-item__inner__title'>{allStrings.libraries[this.props.library + 'Plural'] || 'All ' + this.props.library}</p>
            </div>
          </div>
          {/* List all playlists */}
          {this.renderPlaylistsMemo(playlists, playlistIconCache, currentPlaylist, selectedPlaylistID, editingDisabled, isEditing, isEditingNew)}
          {/* Create New Playlist */}
          { editingDisabled ? undefined : (
            <div
              className='playlist-list-fake-item-buttons' >
              <div className='playlist-list-fake-item'
                onClick={this.props.onCreate} >
                <div className='playlist-list-fake-item__inner'>
                  <OpenIcon icon='plus' />
                </div>
                <div className='playlist-list-fake-item__inner'>
                  <p className='playlist-list-fake-item__inner__title'>{strings.newPlaylist}</p>
                </div>
              </div>
              <div className='playlist-list-fake-item'
                onClick={this.props.onImport} >
                <div className='playlist-list-fake-item__inner'>
                  <OpenIcon icon='file' />
                </div>
                <div className='playlist-list-fake-item__inner'>
                  <p className='playlist-list-fake-item__inner__title'>{strings.importPlaylist}</p>
                </div>
              </div>
            </div>
          ) }
        </div>
      </div>
    );
  }

  renderPlaylistsMemo = memoizeOne((
    playlists: Playlist[],
    playlistIconCache: Record<string, string>,
    currentPlaylist: Playlist | undefined,
    selectedPlaylistID: string,
    editingDisabled: boolean,
    isEditing: boolean,
    isEditingNew: boolean,
  ) => {
    const renderItem = (playlist: Playlist, isNew: boolean): void => {
      const isSelected = isNew || playlist.id === selectedPlaylistID;
      const p = (isSelected && currentPlaylist) ? currentPlaylist : playlist;
      const key = isNew ? '?new' : playlist.id;
      elements.push(
        <PlaylistItem
          key={key}
          playlist={p}
          selected={isSelected}
          editing={isSelected && isEditing}
          playlistIconCache={playlistIconCache}
          onDrop={this.props.onDrop}
          onDragOver={this.onPlaylistItemDragOver}
          onHeadClick={this.props.onItemClick}
          onSetIcon={this.props.onSetIcon}
          onTitleChange={this.props.onTitleChange}
          onAuthorChange={this.props.onAuthorChange}
          onKeyDown={this.props.onKeyDown}
          onContextMenu={this.props.onContextMenu} />
      );
      if (isSelected) {
        elements.push(
          <PlaylistItemContent
            key={key + '?content'} // Includes "?" because it's an invalid filename character
            editingDisabled={editingDisabled}
            editing={isSelected && isEditing}
            playlist={p}
            onDescriptionChange={this.props.onDescriptionChange}
            onKeyDown={this.props.onKeyDown}
            onSave={this.props.onSave}
            onDiscard={this.props.onDiscard}
            onEdit={this.props.onEditClick}
            onDelete={this.props.onDelete}
            onDuplicatePlaylist={this.props.onDuplicatePlaylist}
            onExportPlaylist={this.props.onExportPlaylist} />
        );
      }
    };

    const elements: JSX.Element[] = [];
    for (let i = 0; i < playlists.length; i++) {
      renderItem(playlists[i], false);
    }
    if (isEditingNew) {
      if (!this.props.currentPlaylist) { throw new Error('Failed to render new playlist. Playlist state is missing.'); }
      renderItem(this.props.currentPlaylist, true);
    }
    return elements;
  })

  onPlaylistItemDragOver = (event: React.DragEvent): void => {
    if (this.props.preferencesData.enableEditing) {
      const types = event.dataTransfer.types;
      if (types.length === 1 && types[0] === gameIdDataType) {
        // Show the "You can drop here" cursor while dragging something droppable over this element
        event.dataTransfer.dropEffect = 'copy';
        event.preventDefault();
      }
    }
  }

  static contextType = LangContext;
}
