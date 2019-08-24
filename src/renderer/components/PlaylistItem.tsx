import * as React from 'react';
import { deepCopy } from '../../shared/Util';
import { CentralState } from '../interfaces';
import { IGamePlaylist, IGamePlaylistEntry } from '../playlist/interfaces';
import { gameIdDataType } from '../Util';
import { ConfirmButton } from './ConfirmButton';
import { EditableTextElement, EditableTextElementArgs } from './EditableTextElement';
import { OpenIcon } from './OpenIcon';
import { LangContext } from '../util/lang';

export type PlaylistItemProps = {
  /** Playlist to display. */
  playlist: IGamePlaylist;
  /** If the element is expanded (revealing the content sub-element). */
  expanded?: boolean;
  /** If this is in "edit mode". */
  editing?: boolean;
  /** If entering "edit mode" should not be allowed (defaults to false). */
  editingDisabled?: boolean;
  /** Semi-global prop. */
  central: CentralState;
  /** Called when the head element is clicked (the part that is always visible). */
  onHeadClick?: (playlist: IGamePlaylist) => void;
  /** Called when the "edit" button is clicked. */
  onEditClick?: (playlist: IGamePlaylist) => void;
  /** Called when the "delete" button is clicked. */
  onDeleteClick?: (playlist: IGamePlaylist) => void;
  /** Called when the "save" button is clicked. */
  onSaveClick?: (playlist: IGamePlaylist, edit: IGamePlaylist) => void;
  /** Called when a game is dropped on, and successfully added to, this playlist. */
  onDrop?: (event: React.DragEvent, playlist: IGamePlaylist) => void;
  /** Called when anything is dragged over this element. */
  onDragOver?: (event: React.DragEvent, playlist: IGamePlaylist) => void;
};

type PlaylistItemState = {
  /** If any unsaved changes has been made to the playlist (buffer). */
  hasChanged: boolean;
  /** Buffer for the playlist (stores all changes are made to it, until the edit is saved). */
  editPlaylist?: IGamePlaylist;
  /** If something is being dragged over this element. */
  dragOver: boolean;
};

/** Displays the information about a single playlist. Meant to be used in a list. */
export class PlaylistItem extends React.Component<PlaylistItemProps, PlaylistItemState> {
  //
  onTitleEditDone        = this.wrapOnEditDone((edit, text) => { edit.title = text; });
  onAuthorEditDone       = this.wrapOnEditDone((edit, text) => { edit.author = text; });
  onDescriptionEditDone  = this.wrapOnEditDone((edit, text) => { edit.description = text; });
  //
  renderTitle  = this.wrapRenderEditableText('No Title', 'Title...');
  renderAuthor = this.wrapRenderEditableText('No Author', 'Author...');
  //
  contentRef: React.RefObject<HTMLDivElement> = React.createRef();
  contentHeight: number = 0;
  updateContentHeightInterval: number = -1;
  //
  wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  width: number = 0;
  height: number = 0;

  static contextType = LangContext

  constructor(props: PlaylistItemProps) {
    super(props);
    this.state = {
      hasChanged: false,
      dragOver: false,
    };
  }

  componentDidMount() {
    this.updateContentHeight();
    this.updateEdit();
    this.updateCssVars();
    this.updateContentHeightInterval = window.setInterval(() => {
      if (this.props.expanded) {
        if (this.updateContentHeight()) { this.forceUpdate(); }
      }
    }, 150);
    if (this.props.expanded) { this.forceUpdate(); }
  }

  componentDidUpdate(prevProps: PlaylistItemProps, prevState: PlaylistItemState) {
    this.updateContentHeight();
    this.updateEdit();
    this.updateCssVars();
  }

  componentWillUnmount() {
    window.clearInterval(this.updateContentHeightInterval);
  }

  render() {
    const playlist = this.state.editPlaylist || this.props.playlist;
    const expanded = !!this.props.expanded;
    const editingDisabled = !!this.props.editingDisabled;
    const editing = !editingDisabled && !!this.props.editing;
    let className = 'playlist-list-item';
    if (expanded) { className += ' playlist-list-item--selected'; }
    if (editing)  { className += ' playlist-list-item--editing'; }
    if (this.state.dragOver) { className += ' playlist-list-item--drag-over'; }
    const maxHeight = this.props.expanded && this.contentHeight || undefined;
    return (
      <div
        className={className}
        onDrop={this.onDrop}
        onDragOver={this.onDragOver}
        onDragEnter={this.onDragEnter}
        onDragLeave={this.onDragLeave}>
        {/* Drag Overlay */}
        <div className='playlist-list-item__drag-overlay' />
        {/* Head */}
        <div
          className='playlist-list-item__head'
          onClick={editing ? undefined : this.onHeadClick}>
          { playlist.icon ? (
            <div className='playlist-list-item__head__icon'>
              <div
                className='playlist-list-item__head__icon__image'
                style={{ backgroundImage: playlist.icon ? `url('${playlist.icon}')` : undefined }}
                onClick={this.onIconClick} />
            </div>
          ) : (
            <div
              className='playlist-list-item__head__icon simple-center'
              onClick={this.onIconClick}>
              <div className='playlist-list-item__head__icon__no-image simple-center__inner'>
                <OpenIcon
                  icon='question-mark'
                  className='playlist-list-item__head__icon__no-image__icon' />
              </div>
            </div>
          ) }
          <div className='playlist-list-item__head__title simple-center'>
            <EditableTextElement
              text={playlist.title}
              onEditConfirm={this.onTitleEditDone}
              editable={editing}
              children={this.renderTitle} />
          </div>
          { editing || playlist.author ? (
            <>
              <div className='playlist-list-item__head__divider simple-center'>
                <p className='simple-center__inner'>by</p>
              </div>
              <div className='playlist-list-item__head__author simple-center'>
                <EditableTextElement
                  text={playlist.author}
                  onEditConfirm={this.onAuthorEditDone}
                  editable={editing}
                  children={this.renderAuthor} />
              </div>
            </>
          ) : undefined }
        </div>
        {/* Content */}
        <div
          className='playlist-list-item__content'
          ref={this.contentRef}
          style={{ maxHeight }}>
          <div className='playlist-list-item__content__inner'>
            { editingDisabled ? undefined : (
              <div className='playlist-list-item__content__edit'>
                <div className='playlist-list-item__content__id'>
                  <p className='playlist-list-item__content__id__pre'>ID: </p>
                  <div className='playlist-list-item__content__id__text'>
                    <p>{playlist.id}</p>
                  </div>
                </div>
                <div className='playlist-list-item__content__buttons'>
                  {/* Save Button */}
                  { editing ? (
                    <input
                      type='button'
                      value='Save'
                      className='simple-button'
                      title='Save changes made and stop editing'
                      onClick={this.onSaveClick}
                      disabled={!this.state.hasChanged} />
                  ) : undefined }
                  {/* Edit / Discard Button */}
                  { editing ? (
                    <ConfirmButton
                      props={{
                        value: 'Discard',
                        title: 'Discard the changes made and stop editing',
                        className: 'simple-button'
                      }}
                      confirm={{
                        value: 'Are you sure?',
                        className: 'simple-button simple-button--red simple-vertical-shake'
                      }}
                      skipConfirm={!this.state.hasChanged}
                      onConfirm={this.onEditClick} />
                  ) : (
                    <input
                      type='button'
                      value='Edit'
                      className='simple-button'
                      title='Start editing this playlist'
                      onClick={this.onEditClick} />
                  ) }
                  {/* Delete Button */}
                  <ConfirmButton
                    props={{
                      value: 'Delete',
                      title: 'Delete this playlist',
                      className: 'simple-button'
                    }}
                    confirm={{
                      value: 'Are you sure?',
                      className: 'simple-button simple-button--red simple-vertical-shake'
                    }}
                    onConfirm={this.onDeleteClick} />
                </div>
              </div>
            ) }
            {/* Description */}
            <EditableTextElement
              text={playlist.description}
              onEditConfirm={this.onDescriptionEditDone}
              editable={editing}
              children={this.renderDescription} />
          </div>
        </div>
      </div>
    );
  }

  wrapRenderEditableText(placeholderText: string, placeholderEdit: string) {
    return function(o: EditableTextElementArgs) {
      if (o.editing) {
        return (
        <input
          value={o.text}
          placeholder={placeholderEdit}
          onChange={o.onInputChange}
          onKeyDown={o.onInputKeyDown}
          autoFocus
          onBlur={o.cancelEdit}
          className='playlist-list-item__editable-text simple-vertical-inner simple-input' />
        );
      } else {
        let className = 'playlist-list-item__editable-text simple-vertical-inner';
        if (!o.text) { className += ' simple-disabled-text'; }
        return (
          <p
            onClick={o.startEdit}
            title={o.text}
            className={className}>
            {o.text || placeholderText}
          </p>
        );
      }
    };
  }

  renderDescription = (o: EditableTextElementArgs) => {
    if (o.editing) {
      return (
        <textarea
          value={o.text}
          placeholder='Enter a description here...'
          onChange={o.onInputChange}
          onKeyDown={o.onInputKeyDown}
          autoFocus
          onBlur={o.cancelEdit}
          className='playlist-list-item__content__description-edit playlist-list-item__editable-text simple-input simple-scroll' />
      );
    } else {
      let className = 'playlist-list-item__content__description-text';
      if (!o.text) { className += ' simple-disabled-text'; }
      return (
        <p
          onClick={o.startEdit}
          className={className}>
          {o.text || '< No Description >'}
        </p>
      );
    }
  }

  updateContentHeight(): boolean {
    if (this.contentRef.current) {
      const oldHeight = this.contentHeight;
      this.contentHeight = this.contentRef.current.scrollHeight;
      if (this.contentHeight !== oldHeight) { return true; }
    }
    return false;
  }

  updateEdit() {
    if (this.props.editing && !this.props.editingDisabled) {
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

  onHeadClick = () => {
    if (this.props.onHeadClick) {
      this.props.onHeadClick(this.props.playlist);
    }
  }

  onEditClick = () => {
    if (this.props.onEditClick) {
      this.props.onEditClick(this.props.playlist);
    }

  }

  onDeleteClick = () => {
    if (this.props.onDeleteClick) {
      this.props.onDeleteClick(this.props.playlist);
    }
  }

  onSaveClick = () => {
    if (this.props.onSaveClick) {
      if (!this.state.editPlaylist) { throw new Error('editPlaylist is missing wtf?'); }
      this.props.onSaveClick(this.props.playlist, this.state.editPlaylist);
    }
  }

  onIconClick = () => {
    const edit = this.state.editPlaylist;
    if (this.props.editing && edit) {
      // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
      const filePaths = window.External.showOpenDialogSync({
        title: 'Select a new icon for the playlist',
        properties: ['openFile'],
      });
      if (filePaths) {
        toDataURL(filePaths[0])
        .then(dataUrl => {
          edit.icon = dataUrl+'';
          this.setState({ hasChanged: true });
        });
      }
    }
  }

  onDrop = (event: React.DragEvent): void => {
    if (this.state.dragOver) {
      this.setState({ dragOver: false });
    }
    if (!this.props.editingDisabled) {
      // Find game
      const gameId: string = event.dataTransfer.getData(gameIdDataType);
      if (gameId) {
        const platform = this.props.central.games.getPlatformOfGameId(gameId);
        if (!platform || !platform.collection) { throw new Error('No game with that ID was found.'); }
        const game = platform.collection.findGame(gameId);
        if (!game) { throw new Error('Game was found but then it wasn\'t found. What?'); }
        // Check if game is already in the playlist
        if (this.props.playlist.games.every(g => g.id !== gameId)) {
          // Add game to playlist(s) (both the edited and unedited, if editing)
          const gameEntry: IGamePlaylistEntry = {
            id: gameId,
            notes: '',
          };
          this.props.playlist.games.push(deepCopy(gameEntry));
          if (this.state.editPlaylist) {
            this.state.editPlaylist.games.push(deepCopy(gameEntry));
          }
          // Save playlist (the un-edited version, even if editing)
          this.props.central.playlists.save(this.props.playlist);
          // Callback
          if (this.props.onDrop) {
            this.props.onDrop(event, this.props.playlist);
          }
        }
      } else {
        console.log('Item dropped on this playlist is not a game id, disregarding it.');
      }
    }
  }

  onDragOver = (event: React.DragEvent): void => {
    if (this.props.onDragOver) {
      this.props.onDragOver(event, this.props.playlist);
    }
  }

  onDragEnter = (event: React.DragEvent): void => {
    if (!this.state.dragOver) {
      if (!findParent(event.currentTarget, event.relatedTarget as Element)) {
        this.setState({ dragOver: true });
        event.stopPropagation();
      }
    }
  }

  onDragLeave = (event: React.DragEvent): void => {
    if (this.state.dragOver) {
      if (!findParent(event.currentTarget, event.relatedTarget as Element)) {
        this.setState({ dragOver: false });
        event.stopPropagation();
      }
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy). */
  wrapOnEditDone(func: (edit: IGamePlaylist, text: string) => void): (text: string) => void {
    return (text: string) => {
      const edit = this.state.editPlaylist;
      if (edit) {
        func(edit, text);
        this.setState({ hasChanged: true });
      }
    };
  }

  /** Update CSS Variables. */
  updateCssVars() {
    // Set CCS vars
    const wrapper = this.wrapperRef.current;
    if (wrapper) {
      wrapper.style.setProperty('--width', this.width+'');
      wrapper.style.setProperty('--height', this.height+'');
    }
  }
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

type FileReaderResult = typeof FileReader['prototype']['result'];

/**
 * Convert the body of a URL to a data URL.
 * This will reject if the request or conversion fails.
 * @param url URL of content to convert.
 */
function toDataURL(url: string): Promise<FileReaderResult> {
  return fetch(url)
  .then(response => response.blob())
  .then(blob => new Promise<FileReaderResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }));
}
