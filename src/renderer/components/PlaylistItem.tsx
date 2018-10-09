import * as React from 'react';
import { IGamePlaylist } from '../playlist/interfaces';
import { EditableTextWrap } from './EditableTextWrap';
import { deepCopy } from '../../shared/Util';
import { ConfirmButton } from './ConfirmButton';
import { PlaylistItemGames } from './PlaylistItemGames';
import { ICentralState } from '../interfaces';

export interface IPlaylistItemProps {
  playlist: IGamePlaylist;
  expanded?: boolean;
  editing?: boolean;
  central: ICentralState;
  gameScale: number;
  onHeadClick?: (playlist: IGamePlaylist) => void;
  onEditClick?: (playlist: IGamePlaylist) => void;
  onDeleteClick?: (playlist: IGamePlaylist) => void;
  onSaveClick?: (playlist: IGamePlaylist, edit: IGamePlaylist) => void;
}

export interface IPlaylistItemState {
  /** If any unsaved changes has been made to the playlist (the buffer) */
  hasChanged: boolean;
  /** Buffer for the playlist (stores all changes are made to it until edit is saved) */
  editPlaylist?: IGamePlaylist;
}

export class PlaylistItem extends React.Component<IPlaylistItemProps, IPlaylistItemState> {
  //
  private onTitleEditDone        = this.wrapOnEditDone((edit, text) => { edit.title = text; });
  private onAuthorEditDone       = this.wrapOnEditDone((edit, text) => { edit.author = text; });
  private onDescriptionEditDone  = this.wrapOnEditDone((edit, text) => { edit.description = text; });
  //
  private contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  private contentHeight: number = 0;

  constructor(props: IPlaylistItemProps) {
    super(props);
    this.state = {
      hasChanged: false,
    };
    this.onHeadClick = this.onHeadClick.bind(this);
    this.onEditClick = this.onEditClick.bind(this);
    this.onDeleteClick = this.onDeleteClick.bind(this);
    this.onSaveClick = this.onSaveClick.bind(this);
  }

  componentDidMount() {
    this.updateContentHeight();
    this.updateEdit();
  }

  componentDidUpdate(prevProps: IPlaylistItemProps, prevState: IPlaylistItemState) {
    this.updateEdit();
  }

  render() {
    this.updateContentHeight();
    // Normal rendering stuff
    const playlist = this.state.editPlaylist || this.props.playlist;
    const expanded = !!this.props.expanded;
    const editing = !!this.props.editing;
    let className = 'playlist-list-item';
    if (expanded) { className += ' playlist-list-item--expanded' }
    if (editing)  { className += ' playlist-list-item--editing' }
    const maxHeight = this.props.expanded && this.contentHeight || undefined;
    const titleProps = { className: 'playlist-list-item__head__title' };
    const authorProps = { className: 'playlist-list-item__head__author' };
    return (
      <div className={className}>
        {/* Head */}
        <div className='playlist-list-item__head' onClick={(!editing)?this.onHeadClick:undefined}>
          <EditableTextWrap textProps={titleProps} editProps={titleProps}
                            editDisabled={!editing}
                            text={playlist.title} placeholder={'No Title'}
                            onEditDone={this.onTitleEditDone} />
          <p className='playlist-list-item__head__divider'>by</p>
          <EditableTextWrap textProps={authorProps} editProps={authorProps}
                            editDisabled={!editing}
                            text={playlist.author} placeholder={'No Author'}
                            onEditDone={this.onAuthorEditDone} />
        </div>
        {/* Content */}
        <div className='playlist-list-item__content' ref={this.contentRef} style={{maxHeight}}>
          <div className='playlist-list-item__content__inner'>
            <div style={{ display: 'block' }}>
              <p className='playlist-list-item__content__id'>(ID: {playlist.id})</p>
              <div className='playlist-list-item__content__buttons'>
                {/* Save Button */}
                { editing ? (
                  <input type='button' value='Save' className='simple-button'
                         title='Save changes made and stop editing'
                         onClick={this.onSaveClick} disabled={!this.state.hasChanged} />
                ) : undefined }
                {/* Edit / Discard Button */}
                { editing ? (
                  <ConfirmButton props={{ value: 'Discard', title: 'Discard the changes made and stop editing',
                                          className: 'simple-button', }}
                                 confirm={{ value: 'Are you sure?',
                                            className: 'simple-button simple-button--red simple-vertical-shake', }}
                                 skipConfirm={!this.state.hasChanged}
                                 onConfirm={this.onEditClick} />
                ) : (
                  <input type='button' value='Edit' className='simple-button'
                         title='Start editing this playlist'
                         onClick={this.onEditClick} />
                ) }
                {/* Delete Button */}
                <ConfirmButton props={{ value: 'Delete', title: 'Delete this playlist', className: 'simple-button', }}
                               confirm={{ value: 'Are you sure?',
                                          className: 'simple-button simple-button--red simple-vertical-shake', }}
                               onConfirm={this.onDeleteClick} />
              </div>
            </div>
            {/* Games */}
            <PlaylistItemGames playlist={playlist}
                               collection={this.props.central.collection}
                               gameImages={this.props.central.gameImages} 
                               gameScale={this.props.gameScale} />
            {/* Description */}
            <p>Description:</p>
            <EditableTextWrap editDisabled={!editing}
                              text={playlist.description} placeholder={'No description'}
                              isMultiline={true}
                              onEditDone={this.onDescriptionEditDone} />
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

  private updateEdit() {
    if (this.props.editing) {
      if (!this.state.editPlaylist) {
        this.setState({ editPlaylist: deepCopy(this.props.playlist) });
      }
    } else {
      if (this.state.editPlaylist) {
        this.setState({
          editPlaylist: undefined,
          hasChanged: false,
        });
      }
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

  private onDeleteClick() {
    if (this.props.onDeleteClick) {
      this.props.onDeleteClick(this.props.playlist);
    }
  }

  private onSaveClick() {
    if (this.props.onSaveClick) {
      if (!this.state.editPlaylist) { throw new Error('editPlaylist is missing wtf?'); }
      this.props.onSaveClick(this.props.playlist, this.state.editPlaylist);
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (edit: IGamePlaylist, text: string) => void): (text: string) => void {
    return (text: string) => {
      const edit = this.state.editPlaylist;
      if (edit) {
        func(edit, text);
        this.setState({ hasChanged: true });
      }
    }
  }
}
