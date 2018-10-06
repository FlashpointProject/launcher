import * as React from 'react';
import { ICentralState } from '../../interfaces';
import { IGamePlaylist } from '../../playlist/interfaces';

export interface IPlaylistPageProps {
  central: ICentralState;
}

export interface IPlaylistPageState {
  /** ID of the playlist that is expanded (empty string if none) */
  expandedPlaylistID: string;
}

export class PlaylistPage extends React.Component<IPlaylistPageProps, IPlaylistPageState> {
  constructor(props: IPlaylistPageProps) {
    super(props);
    this.state = {
      expandedPlaylistID: '',
    };
    this.onPlaylistItemHeadClick = this.onPlaylistItemHeadClick.bind(this);
    this.onPlaylistItemEditClick = this.onPlaylistItemEditClick.bind(this);
    this.onPlaylistItemRemoveClick = this.onPlaylistItemRemoveClick.bind(this);
    this.onCreatePlaylistClick = this.onCreatePlaylistClick.bind(this);
  }

  render() {
    const central = this.props.central;
    const anySelected = (this.state.expandedPlaylistID !== '');
    return (
      <div className='playlist-page'>
        {central.playlistsDoneLoading ? (
          <div className='playlist-list'>
            {/* List all playlists */}
            {this.props.central.playlists.playlists.map((playlist) => {
              return (
                <PlaylistItem key={playlist.id} 
                              playlist={playlist}
                              expanded={anySelected && playlist.id === this.state.expandedPlaylistID}
                              onHeadClick={this.onPlaylistItemHeadClick}
                              onEditClick={this.onPlaylistItemEditClick}
                              onRemoveClick={this.onPlaylistItemRemoveClick} />
              );
            })}
            {/* Create New Playlist */}
            <div className='playlist-list__create-playlist' onClick={this.onCreatePlaylistClick}>
              Create new playlist
            </div>
          </div>
        ) : (
          <div>
            <p>Loading Playlists...</p>
          </div>
        ) }
      </div>
    );
  }

  private onPlaylistItemHeadClick(playlist: IGamePlaylist): void {
    if (this.state.expandedPlaylistID === playlist.id) {
      this.setState({ expandedPlaylistID: '' });
    } else {
      this.setState({ expandedPlaylistID: playlist.id });
    }
  }

  private onPlaylistItemEditClick(playlist: IGamePlaylist): void {
    console.log('edit me pls', playlist);
  }

  private onPlaylistItemRemoveClick(playlist: IGamePlaylist): void {
    if (this.props.central.playlistsDoneLoading) {
      this.props.central.playlists.delete(playlist.id);
      this.props.central.playlists.remove(playlist.id);
      this.forceUpdate();
    }
  }

  private onCreatePlaylistClick(event: React.MouseEvent): void {
    if (this.props.central.playlistsDoneLoading) {
      this.props.central.playlists.create();
      this.forceUpdate();
    }
  }
}

export interface IPlaylistItemProps {
  playlist: IGamePlaylist;
  expanded?: boolean;
  onHeadClick?: (playlist: IGamePlaylist) => void;
  onEditClick?: (playlist: IGamePlaylist) => void;
  onRemoveClick?: (playlist: IGamePlaylist) => void;
}

export interface IPlaylistItemState {  
}

export class PlaylistItem extends React.Component<IPlaylistItemProps, IPlaylistItemState> {
  private contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  private contentHeight: number = 0;

  constructor(props: IPlaylistItemProps) {
    super(props);
    this.state = {};
    this.onHeadClick = this.onHeadClick.bind(this);
    this.onEditClick = this.onEditClick.bind(this);
    this.onRemoveClick = this.onRemoveClick.bind(this);
  }

  componentDidMount() {
    this.updateContentHeight();
  }

  render() {
    this.updateContentHeight();
    // Normal rendering stuff
    const playlist = this.props.playlist;
    let className = 'playlist-list-item';
    if (this.props.expanded) { className += ' playlist-list-item--expanded' }
    const maxHeight = this.props.expanded && this.contentHeight || undefined;
    return (
      <div className={className}>
        <div className='playlist-list-item__head' onClick={this.onHeadClick}>
          <p className='playlist-list-item__head__title'>{playlist.title || 'No Title set'}</p>
          <p className='playlist-list-item__head__divider'>by</p>
          <p className='playlist-list-item__head__author'>{playlist.author || 'No Author set'}</p>
        </div>
        <div className='playlist-list-item__content' ref={this.contentRef} style={{maxHeight}}>
          <div className='playlist-list-item__content__inner'>
            <div style={{ display: 'block' }}>
              <p style={{ display: 'inline-block', 
                          fontSize: '0.9rem', 
                          fontWeight: 100,
                          color: '#6b6b73' }}>(ID: {playlist.id})</p>
              <div style={{ float: 'right' }}>
                <input type='button' value='Edit' className='simple-button'
                      onClick={this.onEditClick} />
                <input type='button' value='Remove' className='simple-button'
                      onClick={this.onRemoveClick} />
              </div>
            </div>
            <p>Description: {playlist.description || 'No description set'}</p>
          </div>
        </div>
      </div>
    );
  }

  private updateContentHeight() {
    if (this.contentRef.current) {
      this.contentHeight = this.contentRef.current.scrollHeight;
    }
  }

  private onHeadClick() {
    if (this.props.onHeadClick) {
      this.props.onHeadClick(this.props.playlist);
    }
  }

  private onEditClick() {
    if (this.props.onEditClick) {
      this.props.onEditClick(this.props.playlist);
    }
    
  }

  private onRemoveClick() {
    if (this.props.onRemoveClick) {
      this.props.onRemoveClick(this.props.playlist);
    }
  }
}

