import * as React from 'react';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { EditableTextWrap } from './EditableTextWrap';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameInfo } from '../../shared/game/GameInfo';
import { AdditionalApplicationInfo } from '../../shared/game/AdditionalApplicationInfo';
import { BrowseSidebarAddApp } from './BrowseSidebarAddApp';
import { GameLauncher } from '../GameLauncher';

export interface IBrowseSidebarProps {
  gameImages?: GameImageCollection;
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
  /** Additional Applications of the currently selected game (if any) */
  selectedAddApps?: IAdditionalApplicationInfo[];
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
    this.onSaveClick = this.onSaveClick.bind(this);
    this.onAddAppEdit = this.onAddAppEdit.bind(this);
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
      return (
        <div className={'browse-sidebar'+(!editDisabled?' browse-sidebar--edit-enabled':'')}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row browse-sidebar__row--title browse-sidebar__row--one-line'>
              <EditableTextWrap target={game} editDisabled={editDisabled}
                                text={game.title} onEditDone={this.onTitleEditDone}
                                textProps={{title: game.title}}/>
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
                  <input type="button" value="New" className="simple-button"/>
                ) : undefined }
              </div>
              {this.state.editAddApps && this.state.editAddApps.map((addApp) => {
                return <BrowseSidebarAddApp key={addApp.id} addApp={addApp} editDisabled={editDisabled}
                                            onEdit={this.onAddAppEdit} onLaunch={this.onAddAppLaunch}/>;
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

  private onAddAppLaunch(addApp: IAdditionalApplicationInfo): void {
    GameLauncher.launchAdditionalApplication(addApp);
  }

  private updateEditGame(): void {
    this.setState({
      editGame: this.props.selectedGame && GameInfo.duplicate(this.props.selectedGame),
      editAddApps: this.props.selectedAddApps && this.props.selectedAddApps.map(AdditionalApplicationInfo.duplicate),
    });
  }

  private onSaveClick(): void {
    if (this.props.selectedGame && this.state.editGame) {
      // Save changes to the selected game and additional applications
      // (@HACK This should probably be sent up the the app - which then does the override)
      GameInfo.override(this.props.selectedGame, this.state.editGame);
      if (this.props.selectedAddApps) {
        if (!this.state.editAddApps) { throw new Error('Edit versions of the additional applications are missing?'); }
        for (let i = this.props.selectedAddApps.length - 1; i >= 0; i--) {
          AdditionalApplicationInfo.override(this.props.selectedAddApps[i], 
                                             this.state.editAddApps[i]);
        }
        // @TODO Add a way to add newly created additional applications?
      }
      this.setState({ hasChanged: false });
    }
  }
  
  /** Called when an additional application is edited */
  private onAddAppEdit(): void {
    this.setState({ hasChanged: true });
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void): (text: string) => void {
    return (text: string) => {
      const game = this.state.editGame;
      if (game) {
        func(game, text);
        this.setState({ hasChanged: true });
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange calllback (this is to reduce redundancy) */
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
