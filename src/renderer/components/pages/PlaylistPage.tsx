import * as React from 'react';
import { ICentralState } from '../../interfaces';
import { IGamePlaylist } from '../../playlist/interfaces';
import { PlaylistItem } from '../PlaylistItem';
import { OpenIcon } from '../OpenIcon';

export interface IPlaylistPageProps {
  central: ICentralState;
  gameScale: number;
}

export interface IPlaylistPageState {
  /** ID of the playlist that is expanded (empty string if none) */
  expandedPlaylistID: string;
  /** ID of the playlist that is being edited (empty string if none) */
  editingPlaylistID: string;
}

export class PlaylistPage extends React.Component<IPlaylistPageProps, IPlaylistPageState> {
  constructor(props: IPlaylistPageProps) {
    super(props);
    this.state = {
      expandedPlaylistID: '',
      editingPlaylistID: '',
    };
    this.onPlaylistItemHeadClick = this.onPlaylistItemHeadClick.bind(this);
    this.onPlaylistItemEditClick = this.onPlaylistItemEditClick.bind(this);
    this.onPlaylistItemDeleteClick = this.onPlaylistItemDeleteClick.bind(this);
    this.onPlaylistItemSaveClick = this.onPlaylistItemSaveClick.bind(this);
    this.onCreatePlaylistClick = this.onCreatePlaylistClick.bind(this);
  }

  render() {
    const central = this.props.central;
    const anySelected = (this.state.expandedPlaylistID !== '');
    return (
      <div className='playlist-page'>
        {central.playlistsDoneLoading ? (
          !central.playlistsFailedLoading ? (
            <div className='playlist-list'>
              {/* List all playlists */}
              {this.props.central.playlists.playlists.map((playlist) => {
                return (
                  <PlaylistItem key={playlist.id} 
                                playlist={playlist}
                                expanded={anySelected && playlist.id === this.state.expandedPlaylistID}
                                editing={playlist.id === this.state.editingPlaylistID}
                                central={this.props.central}
                                gameScale={this.props.gameScale}
                                onHeadClick={this.onPlaylistItemHeadClick}
                                onEditClick={this.onPlaylistItemEditClick}
                                onDeleteClick={this.onPlaylistItemDeleteClick}
                                onSaveClick={this.onPlaylistItemSaveClick} />
                );
              })}
              {/* Create New Playlist */}
              <div className='playlist-list__create-playlist' onClick={this.onCreatePlaylistClick}>
                <div className='playlist-list__create-playlist__inner'>
                  <OpenIcon icon='plus' />
                  <p className='playlist-list__create-playlist__inner__title'>Create new playlist</p>
                </div>
              </div>
            </div>
          ) : ( // Failed to load
            <div className='playlist-page__message'>
              <h2>Failed to load playlist folder.</h2>
              <p>Check the log for more information.</p>
            </div>
          )
        ) : ( // Loading
          <div className='playlist-page__message'>
            <p>Loading Playlists...</p>
          </div>
        ) }
      </div>
    );
  }

  private onPlaylistItemHeadClick(playlist: IGamePlaylist): void {
    let expandedID: string = '';
    if (this.state.expandedPlaylistID !== playlist.id) {
      expandedID = playlist.id;
    }
    this.setState({
      expandedPlaylistID: expandedID,
      editingPlaylistID: '',
    });
  }

  private onPlaylistItemEditClick(playlist: IGamePlaylist): void {
    if (this.state.editingPlaylistID === playlist.id) {
      this.setState({ editingPlaylistID: '' });
    } else {
      this.setState({ editingPlaylistID: playlist.id });
    }
  }

  private onPlaylistItemDeleteClick(playlist: IGamePlaylist): void {
    if (this.props.central.playlistsDoneLoading) {
      this.props.central.playlists.delete(playlist.id);
      this.props.central.playlists.remove(playlist.id);
      this.forceUpdate();
    }
  }

  private onPlaylistItemSaveClick(playlist: IGamePlaylist, edit: IGamePlaylist): void {
    console.log('save me', playlist);
    // Overwrite the playlist with the new one
    const arr = this.props.central.playlists.playlists;
    arr.splice(arr.indexOf(playlist), 1, edit);
    // Save playlist
    this.props.central.playlists.save(edit);
    // Stop editing
    this.setState({ editingPlaylistID: '' });
  }

  private onCreatePlaylistClick(event: React.MouseEvent): void {
    if (this.props.central.playlistsDoneLoading) {
      // Create and save a new playlist
      const playlist = this.props.central.playlists.create();
      this.props.central.playlists.save(playlist);
      // Select the new playlist
      this.forceUpdate();
      setTimeout(() => { // (Give the playlist list item some time to be created before selecting it)
        this.setState({
          expandedPlaylistID: playlist.id,
          editingPlaylistID: '',
        });
      }, 1);
    }
  }
}
