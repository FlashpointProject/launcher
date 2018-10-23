import * as React from 'react';
import { uuid } from '../uuid';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { EditableTextWrap } from './EditableTextWrap';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameInfo } from '../../shared/game/GameInfo';
import { AdditionalApplicationInfo } from '../../shared/game/AdditionalApplicationInfo';
import { BrowseSidebarAddApp } from './BrowseSidebarAddApp';
import { GameLauncher } from '../GameLauncher';
import { GameManager } from '../game/GameManager';
import { GameParser } from '../../shared/game/GameParser';
import { GameManagerPlatform } from '../game/GameManagerPlatform';
import { OpenIcon } from './OpenIcon';
import { ConfirmElement } from './ConfirmElement';

export interface IBrowseSidebarProps {
  gameImages: GameImageCollection;
  games: GameManager;
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
  /** Additional Applications of the currently selected game (if any) */
  selectedAddApps?: IAdditionalApplicationInfo[];
  /** Called when the selected game is deleted by this */
  onDeleteSelectedGame?: () => void;
}

export interface IBrowseSidebarState {
  /** If any unsaved changes has been made to the selected game (the buffer) */
  hasChanged: boolean;
  /** Buffer for the selected game (all changes are made to the game until saved) */
  editGame?: IGameInfo;
  /** Buffer for the selected games additional applications (all changes are made to this until saved) */
  editAddApps?: IAdditionalApplicationInfo[];
}

/** Sidebar for BrowsePage */
export class BrowseSidebar extends React.Component<IBrowseSidebarProps, IBrowseSidebarState> {
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

  constructor(props: IBrowseSidebarProps) {
    super(props);
    this.state = {
      hasChanged: false,
      editGame: undefined,
      editAddApps: undefined,
    };
    this.onNewAddAppClick = this.onNewAddAppClick.bind(this);
    this.onSaveClick = this.onSaveClick.bind(this);
    this.onAddAppEdit = this.onAddAppEdit.bind(this);
    this.onAddAppDelete = this.onAddAppDelete.bind(this);
    this.onDeleteGameClick = this.onDeleteGameClick.bind(this);
  }

  componentDidMount(): void {
    this.updateEditGame();
  }

  componentDidUpdate(prevProps: IBrowseSidebarProps, prevState: IBrowseSidebarState) {
    if (this.props.selectedGame !== prevProps.selectedGame) {
      this.updateEditGame();
      this.setState({ hasChanged: false });
    }
  }

  render() {
    const game: IGameInfo|undefined = this.state.editGame;
    if (game) {
      const isEditing: boolean = this.state.hasChanged;
      const editDisabled = window.External.config.data.disableEditing;
      const dateAdded = new Date(game.dateAdded).toUTCString();
      return (
        <div className={'browse-sidebar simple-scroll'+(!editDisabled?' browse-sidebar--edit-enabled':'')}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row'>
              <div className='browse-sidebar__title-row'>
                <div className='browse-sidebar__title-row__title'>
                  <EditableTextWrap target={game} editDisabled={editDisabled}
                                    text={game.title} onEditDone={this.onTitleEditDone}
                                    textProps={{title: game.title}}/>    
                </div>
                <div className='browse-sidebar__title-row__buttons'>
                  { editDisabled ? undefined : (
                    <ConfirmElement onConfirm={this.onDeleteGameClick}>
                      {({ activate, activationCounter, reset }) => {
                        return (
                          <div className={'browse-sidebar__title-row__buttons__remove'+
                                          ((activationCounter>0)?' browse-sidebar__title-row__buttons__remove--active simple-vertical-shake':'')}
                               title='Delete game'
                               onClick={activate} onMouseLeave={reset}>
                            <OpenIcon icon='trash' />
                          </div>
                        );
                      }}
                    </ConfirmElement>                    
                  ) }
                </div>
              </div>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>by </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.developer} onEditDone={this.onDeveloperEditDone}
                                textProps={{title: game.developer}}/>
            </div>
          </div>
          {/* -- Most Fields -- */}
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Genre: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.genre} onEditDone={this.onGenreEditDone}
                                textProps={{title: game.genre}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Series: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.series} onEditDone={this.onSeriesEditDone}
                                textProps={{title: game.series}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Publisher: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.publisher} onEditDone={this.onPublisherEditDone}
                                textProps={{title: game.publisher}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Source: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.source} onEditDone={this.onSourceEditDone}
                                textProps={{title: game.source}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Platform: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.platform} onEditDone={this.onPlatformEditDone}
                                textProps={{title: game.platform}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Play Mode: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.playMode} onEditDone={this.onPlayModeEditDone}
                                textProps={{title: game.playMode}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Status: </p>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.status} onEditDone={this.onStatusEditDone}
                                textProps={{title: game.status}}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Date Added: </p>
              <p className='browse-sidebar__row__date-added' title={dateAdded}>{dateAdded}</p>
            </div>
            <div className='browse-sidebar__row'>
              <CheckBox checked={game.broken} onChange={this.onBrokenChange} className='browse-sidebar__row__check-box'/>
              <p> Broken</p>
            </div>
            <div className='browse-sidebar__row'>
              <CheckBox checked={game.extreme} onChange={this.onExtremeChange} className='browse-sidebar__row__check-box'/>
              <p> Extreme</p>
            </div>
          </div>
          {/* -- Notes -- */}
          { !editDisabled || game.notes ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row'>
                <p>Notes: </p>
                <EditableTextWrap target={game} editDisabled={editDisabled}
                                  isMultiline={true} placeholder='[N/A]'
                                  textProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--text-multi-line'}}
                                  editProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--edit-multi-line'}}
                                  text={game.notes} onEditDone={this.onNotesEditDone}/>
              </div>
            </div>
          ) : undefined }
          {/* -- Additional Applications -- */}
          { !editDisabled || (this.state.editAddApps && this.state.editAddApps.length > 0) ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row browse-sidebar__row--additional-applications-header'>
                <p>Additional Applications:</p>
                { !editDisabled ? (
                  <input type='button' value='New' className='simple-button' onClick={this.onNewAddAppClick} />
                ) : undefined }
              </div>
              {this.state.editAddApps && this.state.editAddApps.map((addApp) => {
                return <BrowseSidebarAddApp key={addApp.id} addApp={addApp} editDisabled={editDisabled}
                                            onEdit={this.onAddAppEdit} onLaunch={this.onAddAppLaunch}
                                            onDelete={this.onAddAppDelete} />;
              })}
            </div>
          ) : undefined }
          {/* -- Application Path & Launch Command -- */}
          { !editDisabled ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row browse-sidebar__row--one-line'>
                <p>Application Path: </p>
                <EditableTextWrap target={game} editDisabled={editDisabled}
                                  text={game.applicationPath} onEditDone={this.onApplicationPathEditDone}
                                  textProps={{title: game.applicationPath}}/>
              </div>
              <div className='browse-sidebar__row browse-sidebar__row--one-line'>
                <p>Launch Command: </p>
                <EditableTextWrap target={game} editDisabled={editDisabled}
                                  text={game.launchCommand} onEditDone={this.onLaunchCommandEditDone}
                                  textProps={{title: game.launchCommand}}/>
              </div>
            </div>
          ) : undefined }
          {/* -- Game ID -- */}
          { !editDisabled ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row browse-sidebar__row--one-line'>
                <p>ID: </p>
                <p className='browse-sidebar__row__game-id'>{game.id}</p>
              </div>
            </div>
          ) : undefined }
          {/* -- Screenshot -- */}
          {(this.props.gameImages && game) ? (
            <div className='browse-sidebar__section browse-sidebar__section--below-gap'>
              <div className='browse-sidebar__row browse-sidebar__row__spacer'/>
              <div className='browse-sidebar__row'>
                <img className='browse-sidebar__row__screenshot'
                     src={this.props.gameImages.getScreenshotPath(game.title, game.platform)}/>
              </div>
            </div>
          ) : undefined}
          {/* -- Save Changes -- */}
          {isEditing ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row browse-sidebar__row--save'>
                <p>Changes have been made.</p>
                <input type='button' value='Save Changes' className='simple-button' onClick={this.onSaveClick}/>
              </div>
            </div>
          ) : undefined}
        </div>
      );
    } else {
      return (
        <p>No game selected.</p>
      );
    }
  }

  private onDeleteGameClick(): void {
    console.time('delete');
    const game = this.props.selectedGame;
    if (!game) { throw new Error('Can not delete a game when no game is selected.'); }
    const platform = this.props.games.getPlatfromOfGameId(game.id);
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

  private onAddAppLaunch(addApp: IAdditionalApplicationInfo): void {
    GameLauncher.launchAdditionalApplication(addApp);
  }

  private onAddAppDelete(addApp: IAdditionalApplicationInfo): void {
    const addApps = this.state.editAddApps;
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

  private updateEditGame(): void {
    this.setState({
      editGame: this.props.selectedGame && GameInfo.duplicate(this.props.selectedGame),
      editAddApps: this.props.selectedAddApps && this.props.selectedAddApps.map(AdditionalApplicationInfo.duplicate),
    });
  }

  private onNewAddAppClick(): void {
    if (!this.state.editAddApps) { throw new Error('???'); }
    if (!this.state.editGame) { throw new Error('???'); }
    const newAddApp = AdditionalApplicationInfo.create();
    newAddApp.id = uuid();
    newAddApp.gameId = this.state.editGame.id;
    this.state.editAddApps.push(newAddApp);
    this.setState({ hasChanged: true });
  }

  private onSaveClick(): void {
    console.time('save');
    // Overwrite the game and additional applications with the changes made
    if (this.props.selectedGame && this.state.editGame) {
      const gameId = this.state.editGame.id;
      const platform = this.props.games.getPlatfromOfGameId(gameId);
      if (!platform) { throw new Error('Platform not found.'); }
      // Update parsed game
      GameInfo.override(this.props.selectedGame, this.state.editGame);
      // Update raw game
      const rawGame = platform.findRawGame(gameId);
      if (!rawGame) { throw new Error('Raw game not found on platform the parsed game belongs to'); }
      Object.assign(rawGame, GameParser.reverseParseGame(this.props.selectedGame));
      // Override the additional applications
      updateAddApps.call(this, platform);
      // Refresh games collection
      this.props.games.refreshCollection();
      // Save changes to file
      platform.saveToFile().then(() => { console.timeEnd('save'); });
      // Update flag
      this.setState({ hasChanged: false });
    }
    // -- Functions --
    function updateAddApps(this: BrowseSidebar, platform: GameManagerPlatform) {
      if (!platform.collection) { throw new Error('Platform not has no collection.'); }
      // 1. Save the changes made to add-apps
      // 2. Save any new add-apps
      // 3. Delete any removed add-apps
      const selectedApps = this.props.selectedAddApps;
      const editApps = this.state.editAddApps;
      if (!editApps) { throw new Error('editAddApps is missing'); }
      if (!selectedApps) { throw new Error('selectedAddApps is missing'); }
      // -- Categorize add-apps --
      // Put all new add-apps in an array
      const newAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = editApps.length - 1; i >= 0; i--) {
        const editApp = editApps[i];
        let found = false;
        for (let j = selectedApps.length - 1; j >= 0; j--) {
          const selApp = selectedApps[j];
          if (editApp.id === selApp.id) {
            found = true;
            break;
          }
        }
        if (!found) { newAddApps.push(editApp); }
      }
      // Put all changed add-apps in an array
      const changedAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = editApps.length - 1; i >= 0; i--) {
        const editApp = editApps[i];
        for (let j = selectedApps.length - 1; j >= 0; j--) {
          const selApp = selectedApps[j];
          if (editApp.id === selApp.id) {
            changedAddApps.push(editApp);
            break;
          }
        }
      }
      // Put all removes add-apps in an array
      const removedAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = selectedApps.length - 1; i >= 0; i--) {
        const selApp = selectedApps[i];
        let found = false;
        for (let j = editApps.length - 1; j >= 0; j--) {
          const editApp = editApps[j];
          if (editApp.id === selApp.id) {
            found = true;
            break;
          }
        }
        if (!found) { removedAddApps.push(selApp); }
      }
      // -- Update --
      // Delete removed add-apps
      for (let i = removedAddApps.length - 1; i >= 0; i--) {
        const addApp = removedAddApps[i];
        platform.removeAdditionalApplication(addApp.id);
      }
      // Update changed add-apps
      for (let i = changedAddApps.length - 1; i >= 0; i--) {
        const addApp = changedAddApps[i];
        const oldAddApp = platform.collection.findAdditionalApplication(addApp.id);
        if (!oldAddApp) { throw new Error('???'); }
        const rawAddApp = platform.findRawAdditionalApplication(addApp.id);
        if (!rawAddApp) { throw new Error('???'); }
        Object.assign(oldAddApp, addApp);
        Object.assign(rawAddApp, GameParser.reverseParseAdditionalApplication(oldAddApp));
      }
      // Add new add-apps
      for (let i = newAddApps.length - 1; i >= 0; i--) {
        const addApp = newAddApps[i];
        platform.addAdditionalApplication(addApp);
        const newRawAddApp = Object.assign({}, GameParser.emptyRawAdditionalApplication, 
                                           GameParser.reverseParseAdditionalApplication(addApp));
        platform.addRawAdditionalApplication(newRawAddApp);
      }
    }
  }
  
  /** Called when an additional application is edited */
  private onAddAppEdit(): void {
    this.setState({ hasChanged: true });
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone callback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void): (text: string) => void {
    return (text: string) => {
      const game = this.state.editGame;
      if (game) {
        func(game, text);
        this.setState({ hasChanged: true });
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo, isChecked: boolean) => void): (isChecked: boolean) => void {
    return (isChecked: boolean) => {
      const game = this.state.editGame;
      if (game && !window.External.config.data.disableEditing) {
        func(game, isChecked);
        this.setState({ hasChanged: true });
      }
    }
  }
}
