import * as React from 'react';
import { LangContainer } from '../../shared/lang';
import { WithPreferencesProps } from '../containers/withPreferences';
import { GamePlaylist } from '../playlist/types';
import { gameIdDataType } from '../Util';
import { LangContext } from '../util/lang';
import { OpenIcon } from './OpenIcon';
import { PlaylistItem } from './PlaylistItem';

type OwnProps = {
  playlists: GamePlaylist[];
  currentLibrary: string;
  onDelete: (playlistId: string) => void;
  onSave: (playlistId: string, edit: GamePlaylist) => void;
  onCreate: () => void;
  /** ID of the playlist that is selected (empty string if none). */
  selectedPlaylistID: string;
  /** Called when a playlist is selected. */
  onSelectPlaylist?: (playlist: GamePlaylist) => void;
  /** Called when a the current playlist is deselected (and no playlist is selected in its place). */
  onDeselectPlaylist?: () => void;
  /** Called when a displayed playlist has been changed (by means that doesn't already re-render). */
  onPlaylistChanged?: (playlist: GamePlaylist) => void;
  /** Called when the "Show All" button is clicked. */
  onShowAllClick?: () => void;
};

export type LeftBrowseSidebarProps = OwnProps & WithPreferencesProps;

type LeftBrowseSidebarState = {
  /** If the selected playlist is being edited. */
  isEditing: boolean;
};

export interface LeftBrowseSidebar {
  context: LangContainer;
}

/** Sidebar on the left side of BrowsePage. */
export class LeftBrowseSidebar extends React.Component<LeftBrowseSidebarProps, LeftBrowseSidebarState> {
  constructor(props: LeftBrowseSidebarProps) {
    super(props);
    this.state = {
      isEditing: false,
    };
  }

  render() {
    const strings = this.context.browse;
    const { onShowAllClick, playlists, preferencesData, selectedPlaylistID } = this.props;
    const { isEditing } = this.state;
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
              <p className='playlist-list-fake-item__inner__title'>{strings.allGames}</p>
            </div>
          </div>
          {/* List all playlists */}
          {playlists.map((playlist) => {
            const isSelected = playlist.id === selectedPlaylistID;
            return (
              <PlaylistItem
                key={playlist.id}
                playlist={playlist}
                expanded={isSelected}
                editingDisabled={editingDisabled}
                editing={isSelected && isEditing}
                onHeadClick={this.onPlaylistItemHeadClick}
                onEditClick={this.onPlaylistItemEditClick}
                onDeleteClick={this.onPlaylistItemDeleteClick}
                onSaveClick={this.onPlaylistItemSaveClick}
                onDrop={this.onPlaylistItemDrop}
                onDragOver={this.onPlaylistItemDragOver} />
            );
          })}
          {/* Create New Playlist */}
          { editingDisabled ? undefined : (
            <div
              className='playlist-list-fake-item'
              onClick={this.onCreatePlaylistClick}>
              <div className='playlist-list-fake-item__inner'>
                <OpenIcon icon='plus' />
              </div>
              <div className='playlist-list-fake-item__inner'>
                <p className='playlist-list-fake-item__inner__title'>{strings.newPlaylist}</p>
              </div>
            </div>
          ) }
        </div>
      </div>
    );
  }

  private onPlaylistItemHeadClick = (playlist: GamePlaylist): void => {
    if (this.props.selectedPlaylistID === playlist.id) {
      this.props.onDeselectPlaylist && this.props.onDeselectPlaylist();
    } else {
      this.props.onSelectPlaylist && this.props.onSelectPlaylist(playlist);
    }
    this.setState({ isEditing: false });
  }

  private onPlaylistItemEditClick = (playlist: GamePlaylist): void => {
    if (this.props.selectedPlaylistID === playlist.id) {
      this.setState({ isEditing: !this.state.isEditing });
    }
  }

  private onPlaylistItemDeleteClick = (playlist: GamePlaylist): void => {
    this.props.onDelete(playlist.id);
  }

  private onPlaylistItemSaveClick = (playlist: GamePlaylist, edit: GamePlaylist): void => {
    this.props.onSave(playlist.id, edit);
    this.setState({ isEditing: false });
  }

  private onPlaylistItemDrop = (event: React.DragEvent, playlist: GamePlaylist): void => {
    if (this.props.onPlaylistChanged) {
      this.props.onPlaylistChanged(playlist);
    }
  }

  private onPlaylistItemDragOver = (event: React.DragEvent, playlist: GamePlaylist): void => {
    if (this.props.preferencesData.enableEditing) {
      const types = event.dataTransfer.types;
      if (types.length === 1 && types[0] === gameIdDataType) {
        // Show the "You can drop here" cursor while dragging something droppable over this element
        event.dataTransfer.dropEffect = 'copy';
        event.preventDefault();
      }
    }
  }

  private onCreatePlaylistClick = (): void => {
    this.props.onCreate();
    /*
    const { currentLibrary, onSelectPlaylist, playlists } = this.props;
    // Create and save a new playlist
    const playlist = playlists.create();
    if (currentLibrary) { playlist.library = currentLibrary; }
    playlists.save(playlist);
    // Select the new playlist
    this.forceUpdate();
    setTimeout(() => { // (Give the playlist list item some time to be created before selecting it)
      onSelectPlaylist && onSelectPlaylist(playlist);
      this.setState({ isEditing: false });
    }, 1);
    */
  }

  static contextType = LangContext;
}
