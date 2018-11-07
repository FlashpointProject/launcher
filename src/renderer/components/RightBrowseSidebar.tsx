import * as React from 'react';
import { uuid } from '../uuid';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameInfo } from '../../shared/game/GameInfo';
import { AdditionalApplicationInfo } from '../../shared/game/AdditionalApplicationInfo';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { GameLauncher } from '../GameLauncher';
import GameManager from '../game/GameManager';
import { GameParser } from '../../shared/game/GameParser';
import GameManagerPlatform from '../game/GameManagerPlatform';
import { OpenIcon } from './OpenIcon';
import { ConfirmElement, IConfirmElementArgs } from './ConfirmElement';
import { IGamePlaylistEntry } from '../playlist/interfaces';
import { IEditableTextElementArgs, EditableTextElement } from './EditableTextElement';
import { ImagePreview } from './ImagePreview';

export interface IRightBrowseSidebarProps {
  gameImages: GameImageCollection;
  games: GameManager;
  /** Currently selected game (if any) */
  currentGame?: IGameInfo;
  /** Additional Applications of the currently selected game (if any) */
  currentAddApps?: IAdditionalApplicationInfo[];
  /** Currently selected game entry (if any) */
  gamePlaylistEntry?: IGamePlaylistEntry;
  /** Called when the selected game is deleted by this */
  onDeleteSelectedGame?: () => void;
  /** Called when the selected game is removed from the selected by this */
  onRemoveSelectedGameFromPlaylist?: () => void;
  /** Called when the playlist notes for the selected game has been changed */
  onEditPlaylistNotes?: (text: string) => void;
  /** Called when the "Save Changes" button is clicked */
  onSaveClick?: () => void;
}

export interface IRightBrowseSidebarState {
  /** If any unsaved changes has been made to the selected game (the buffer) */
  hasChanged: boolean;
  /** If a preview of the current games screenshot should be shown */
  showPreview: boolean;
}

/** Sidebar on the right side of BrowsePage */
export class RightBrowseSidebar extends React.Component<IRightBrowseSidebarProps, IRightBrowseSidebarState> {
  // Bound "on done" handlers
  private onTitleEditDone           = this.wrapOnEditDone((game, text) => { game.title = text; });
  private onDeveloperEditDone       = this.wrapOnEditDone((game, text) => { game.developer = text; });
  private onGenreEditDone           = this.wrapOnEditDone((game, text) => { game.genre = text; });
  private onSeriesEditDone          = this.wrapOnEditDone((game, text) => { game.series = text; });
  private onSourceEditDone          = this.wrapOnEditDone((game, text) => { game.source = text; });
  private onPublisherEditDone       = this.wrapOnEditDone((game, text) => { game.publisher = text; });
  private onPlatformEditDone        = this.wrapOnEditDone((game, text) => { game.platform = text; });
  private onPlayModeEditDone        = this.wrapOnEditDone((game, text) => { game.playMode = text; });
  private onStatusEditDone          = this.wrapOnEditDone((game, text) => { game.status = text; });
  private onLaunchCommandEditDone   = this.wrapOnEditDone((game, text) => { game.launchCommand = text; });
  private onApplicationPathEditDone = this.wrapOnEditDone((game, text) => { game.applicationPath = text; });
  private onNotesEditDone           = this.wrapOnEditDone((game, text) => { game.notes = text; });
  private onBrokenChange            = this.wrapOnCheckBoxChange((game, isChecked) => { game.broken = isChecked; });
  private onExtremeChange           = this.wrapOnCheckBoxChange((game, isChecked) => { game.extreme = isChecked; });
  // Bound render handlers
  private renderTitle           = RightBrowseSidebar.wrapRenderEditableText('No Title', 'Title...');
  private renderDeveloper       = RightBrowseSidebar.wrapRenderEditableText('No Developer', 'Author...');
  private renderGenre           = RightBrowseSidebar.wrapRenderEditableText('No Genre', 'Genre...');
  private renderSeries          = RightBrowseSidebar.wrapRenderEditableText('No Series', 'Series...');
  private renderSource          = RightBrowseSidebar.wrapRenderEditableText('No Source', 'Source...');
  private renderPublisher       = RightBrowseSidebar.wrapRenderEditableText('No Publisher', 'Publisher...');
  private renderPlatform        = RightBrowseSidebar.wrapRenderEditableText('No Platform', 'Platform...');
  private renderPlayMode        = RightBrowseSidebar.wrapRenderEditableText('No Play Mode', 'Play Mode...');
  private renderStatus          = RightBrowseSidebar.wrapRenderEditableText('No Status', 'Status...');
  private renderLaunchCommand   = RightBrowseSidebar.wrapRenderEditableText('No Launch Command', 'Launch Command...');
  private renderApplicationPath = RightBrowseSidebar.wrapRenderEditableText('No Application Path', 'Application Path...');

  constructor(props: IRightBrowseSidebarProps) {
    super(props);
    this.state = {
      hasChanged: false,
      showPreview: false,
    };
    this.onNewAddAppClick = this.onNewAddAppClick.bind(this);
    this.onScreenshotClick = this.onScreenshotClick.bind(this);
    this.onScreenshotPreviewClick = this.onScreenshotPreviewClick.bind(this);
    this.onSaveClick = this.onSaveClick.bind(this);
    this.onAddAppEdit = this.onAddAppEdit.bind(this);
    this.onAddAppDelete = this.onAddAppDelete.bind(this);
    this.onDeleteGameClick = this.onDeleteGameClick.bind(this);
    this.onRemoveFromPlaylistClick = this.onRemoveFromPlaylistClick.bind(this);
    this.onPlaylistNotesEditDone = this.onPlaylistNotesEditDone.bind(this);
    this.renderNotes = this.renderNotes.bind(this);
  }

  componentDidMount(): void {
  }

  componentDidUpdate(prevProps: IRightBrowseSidebarProps, prevState: IRightBrowseSidebarState) {
    if (this.props.currentGame !== prevProps.currentGame) {
      this.setState({ hasChanged: false });
    }
  }

  render() {
    const game: IGameInfo|undefined = this.props.currentGame;
    if (game) {
      const addApps: IAdditionalApplicationInfo[]|undefined = this.props.currentAddApps;
      const isEditing: boolean = this.state.hasChanged;
      const playlistEntry = this.props.gamePlaylistEntry;
      const editDisabled = window.External.config.data.disableEditing;
      const dateAdded = new Date(game.dateAdded).toUTCString();
      const screenshotSrc = this.props.gameImages.getScreenshotPath(game.title, game.platform);
      return (
        <div className={'browse-right-sidebar simple-scroll'+(!editDisabled?' browse-right-sidebar--edit-enabled':'')}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__title-row'>
                <div className='browse-right-sidebar__title-row__title'>
                  <EditableTextElement text={game.title} onEditConfirm={this.onTitleEditDone}
                                       editable={!editDisabled} children={this.renderTitle} />
                </div>
                <div className='browse-right-sidebar__title-row__buttons'>
                  {/* "Remove From Playlist" Button */}
                  { (!editDisabled && playlistEntry) ? (
                    <ConfirmElement onConfirm={this.onRemoveFromPlaylistClick}
                                    children={this.renderRemoveFromPlaylistButton} />             
                  ) : undefined }
                  {/* "Delete Game" Button */}
                  { editDisabled ? undefined : (
                    <ConfirmElement onConfirm={this.onDeleteGameClick}
                                    children={this.renderDeleteGameButton} />
                  ) }
                </div>
              </div>
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>by </p>
              <EditableTextElement text={game.developer} onEditConfirm={this.onDeveloperEditDone}
                                   editable={!editDisabled} children={this.renderDeveloper} />
            </div>
          </div>
          {/* -- Most Fields -- */}
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Genre: </p>
              <EditableTextElement text={game.genre} onEditConfirm={this.onGenreEditDone}
                                   editable={!editDisabled} children={this.renderGenre} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Series: </p>
              <EditableTextElement text={game.series} onEditConfirm={this.onSeriesEditDone}
                                   editable={!editDisabled} children={this.renderSeries} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Publisher: </p>
              <EditableTextElement text={game.publisher} onEditConfirm={this.onPublisherEditDone}
                                   editable={!editDisabled} children={this.renderPublisher} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Source: </p>
              <EditableTextElement text={game.source} onEditConfirm={this.onSourceEditDone}
                                   editable={!editDisabled} children={this.renderSource} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Platform: </p>
              <EditableTextElement text={game.platform} onEditConfirm={this.onPlatformEditDone}
                                   editable={!editDisabled} children={this.renderPlatform} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Play Mode: </p>
              <EditableTextElement text={game.playMode} onEditConfirm={this.onPlayModeEditDone}
                                   editable={!editDisabled} children={this.renderPlayMode} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Status: </p>
              <EditableTextElement text={game.status} onEditConfirm={this.onStatusEditDone}
                                   editable={!editDisabled} children={this.renderStatus} />
            </div>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>Date Added: </p>
              <p className='browse-right-sidebar__row__date-added' title={dateAdded}>{dateAdded}</p>
            </div>
            <div className='browse-right-sidebar__row'>
              <CheckBox checked={game.broken} onChange={this.onBrokenChange} className='browse-right-sidebar__row__check-box'/>
              <p> Broken</p>
            </div>
            <div className='browse-right-sidebar__row'>
              <CheckBox checked={game.extreme} onChange={this.onExtremeChange} className='browse-right-sidebar__row__check-box'/>
              <p> Extreme</p>
            </div>
          </div>
          {/* -- Playlist Game Entry Notes -- */}
          { playlistEntry ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>Playlist Notes: </p>
                <EditableTextElement text={playlistEntry.notes || ''} onEditConfirm={this.onPlaylistNotesEditDone}
                                     editable={!editDisabled} children={this.renderNotes} />
              </div>
            </div>
          ) : undefined }
          {/* -- Notes -- */}
          { !editDisabled || game.notes ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>Notes: </p>
                <EditableTextElement text={game.notes} onEditConfirm={this.onNotesEditDone}
                                     editable={!editDisabled} children={this.renderNotes} />
              </div>
            </div>
          ) : undefined }
          {/* -- Additional Applications -- */}
          { !editDisabled || (addApps && addApps.length > 0) ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-header'>
                <p>Additional Applications:</p>
                { !editDisabled ? (
                  <input type='button' value='New' className='simple-button' onClick={this.onNewAddAppClick} />
                ) : undefined }
              </div>
              { addApps && addApps.map((addApp) => {
                return <RightBrowseSidebarAddApp key={addApp.id} addApp={addApp} editDisabled={editDisabled}
                                                 onEdit={this.onAddAppEdit} onLaunch={this.onAddAppLaunch}
                                                 onDelete={this.onAddAppDelete} />;
              }) }
            </div>
          ) : undefined }
          {/* -- Application Path & Launch Command -- */}
          { !editDisabled ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>Application Path: </p>
                <EditableTextElement text={game.applicationPath} onEditConfirm={this.onApplicationPathEditDone}
                                     editable={!editDisabled} children={this.renderApplicationPath} />
              </div>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>Launch Command: </p>
                <EditableTextElement text={game.launchCommand} onEditConfirm={this.onLaunchCommandEditDone}
                                     editable={!editDisabled} children={this.renderLaunchCommand} />
              </div>
            </div>
          ) : undefined }
          {/* -- Game ID -- */}
          { !editDisabled ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>ID: </p>
                <p className='browse-right-sidebar__row__game-id'>{game.id}</p>
              </div>
            </div>
          ) : undefined }
          {/* -- Screenshot -- */}
          <div className='browse-right-sidebar__section browse-right-sidebar__section--below-gap'>
            <div className='browse-right-sidebar__row browse-right-sidebar__row__spacer'/>
            <div className='browse-right-sidebar__row'>
              <img className='browse-right-sidebar__row__screenshot'
                    src={screenshotSrc}
                    onClick={this.onScreenshotClick} />
            </div>
          </div>
          {/* -- Save Changes -- */}
          {isEditing ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--save'>
                <p>Changes have been made.</p>
                <input type='button' value='Save Changes' className='simple-button' onClick={this.onSaveClick}/>
              </div>
            </div>
          ) : undefined}
          {/* -- Screenshot Preview -- */}
          { this.state.showPreview ? (
            <ImagePreview src={screenshotSrc} onCancel={this.onScreenshotPreviewClick} />
          ) : undefined }
        </div>
      );
    } else {
      return (
        <>
          <h1>No game selected</h1>
          <p>Click on a game to select it.</p>
        </>
      );
    }
  }

  private renderDeleteGameButton({ activate, activationCounter, reset }: IConfirmElementArgs): JSX.Element {
    return (
      <div className={'browse-right-sidebar__title-row__buttons__delete-game'+
                      ((activationCounter>0)?' browse-right-sidebar__title-row__buttons__delete-game--active simple-vertical-shake':'')}
          title='Delete game'
          onClick={activate} onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  private renderRemoveFromPlaylistButton({ activate, activationCounter, reset }: IConfirmElementArgs): JSX.Element {
    return (
      <div className={'browse-right-sidebar__title-row__buttons__remove-from-playlist'+
                      ((activationCounter>0)?' browse-right-sidebar__title-row__buttons__remove-from-playlist--active simple-vertical-shake':'')}
          title='Remove game from playlist'
          onClick={activate} onMouseLeave={reset}>
        <OpenIcon icon='circle-x' />
      </div>
    );
  }

  public static wrapRenderEditableText(placeholderText: string, placeholderEdit: string) {
    return (o: IEditableTextElementArgs) => {
      if (o.editing) {
        return (
        <input value={o.text} placeholder={placeholderEdit}
               onChange={o.onInputChange} onKeyDown={o.onInputKeyDown}
               autoFocus onBlur={o.cancelEdit}
               className='browse-right-sidebar__row__editable-text browse-right-sidebar__row__editable-text--edit simple-input' />
        );
      } else {
        let className = 'browse-right-sidebar__row__editable-text';
        if (!o.text) { className += ' simple-disabled-text'; }
        return (
          <p onClick={o.startEdit} title={o.text} className={className}>
            {o.text || placeholderText}
          </p>
        );
      }
    };
  }
  
  private renderNotes(o: IEditableTextElementArgs): JSX.Element {
    if (o.editing) {
      return (
        <textarea value={o.text} placeholder='Enter notes here...'
                  onChange={o.onInputChange} onKeyDown={o.onInputKeyDown}
                  autoFocus onBlur={o.cancelEdit}
                  className='browse-right-sidebar__row__notes-edit simple-input simple-scroll' />
      );
    } else {
      let className = 'browse-right-sidebar__row__notes-text';
      if (!o.text) { className += ' simple-disabled-text'; }
      return (
        <p onClick={o.startEdit} className={className}>
          {o.text || '< No Notes >'}
        </p>
      );
    }
  }

  private onDeleteGameClick(): void {
    console.time('delete');
    const game = this.props.currentGame;
    if (!game) { throw new Error('Can not delete a game when no game is selected.'); }
    const platform = this.props.games.getPlatformOfGameId(game.id);
    if (!platform) { throw new Error('Can not delete a game when it does not belong to a platform.'); }
    platform.removeGame(game.id);
    platform.findAdditionalApplicationsOfGame(game.id).forEach(
      (addApp) => { platform.removeAdditionalApplication(addApp.id); }
    );
    // Refresh games collection
    this.props.games.refreshCollection();
    // Save changes to file
    platform.saveToFile().then(() => { console.timeEnd('delete'); });
    // Update flag
    this.setState({ hasChanged: false });
    // Callback
    if (this.props.onDeleteSelectedGame) {
      this.props.onDeleteSelectedGame();
    }
  }

  private onRemoveFromPlaylistClick(): void {
    if (this.props.onRemoveSelectedGameFromPlaylist) {
      this.props.onRemoveSelectedGameFromPlaylist();
    }
  }

  private onPlaylistNotesEditDone(text: string): void {
    if (this.props.onEditPlaylistNotes) {
      this.props.onEditPlaylistNotes(text);
    }
  }

  private onAddAppLaunch(addApp: IAdditionalApplicationInfo): void {
    GameLauncher.launchAdditionalApplication(addApp);
  }

  private onAddAppDelete(addApp: IAdditionalApplicationInfo): void {
    const addApps = this.props.currentAddApps;
    if (!addApps) { throw new Error('editAddApps is missing.'); }
    // Find and remove add-app
    let index = -1;
    for (let i = addApps.length - 1; i >= 0; i--) {
      if (addApps[i].id === addApp.id) {
        index = i;
        break;
      }
    }
    if (index === -1) { throw new Error('Cant remove additional application because it was not found.'); }
    addApps.splice(index, 1);
    // Flag as changed
    this.setState({ hasChanged: true });
  }

  private onNewAddAppClick(): void {
    if (!this.props.currentAddApps) { throw new Error(`Unable to add a new AddApp. "currentAddApps" is missing.`); }
    if (!this.props.currentGame)    { throw new Error(`Unable to add a new AddApp. "currentGame" is missing.`); }
    const newAddApp = AdditionalApplicationInfo.create();
    newAddApp.id = uuid();
    newAddApp.gameId = this.props.currentGame.id;
    this.props.currentAddApps.push(newAddApp);
    this.setState({ hasChanged: true });
  }

  private onScreenshotClick(): void {
    this.setState({ showPreview: true });
  }

  private onScreenshotPreviewClick(): void {
    this.setState({ showPreview: false });
  }

  private onSaveClick(): void {
    if (this.props.onSaveClick) {
      this.props.onSaveClick();
      this.setState({ hasChanged: false });
    }
  }
  
  /** Called when an additional application is edited */
  private onAddAppEdit(): void {
    this.setState({ hasChanged: true });
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void): (text: string) => void {
    return (text: string) => {
      const game = this.props.currentGame;
      if (game) {
        func(game, text);
        this.setState({ hasChanged: true });
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo, isChecked: boolean) => void): (isChecked: boolean) => void {
    return (isChecked: boolean) => {
      const game = this.props.currentGame;
      if (game && !window.External.config.data.disableEditing) {
        func(game, isChecked);
        this.setState({ hasChanged: true });
      }
    }
  }
}
