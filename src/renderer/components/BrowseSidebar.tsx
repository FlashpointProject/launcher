import * as React from 'react';
import { IGameInfo } from '../../shared/game/interfaces';
import { EditableTextWrap } from './EditableTextWrap';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameInfo } from '../../shared/game/GameInfo';

export interface IBrowseSidebarProps {
  gameImages?: GameImageCollection;
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
}

export interface IBrowseSidebarState {
  /** If any unsaved changes has been made to the selected game (the buffer) */
  hasChanged: boolean;
  /** Buffer for the selected game (all changes are made to this until saved) */
  edit?: IGameInfo;
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
      edit: undefined,
    };
    this.onSaveClick = this.onSaveClick.bind(this);
  }

  componentDidMount(): void {
    this.updateEdit();
  }

  componentDidUpdate(prevProps: IBrowseSidebarProps, prevState: IBrowseSidebarState) {
    if (this.props.selectedGame !== prevProps.selectedGame) {
      this.updateEdit();
      this.setState({ hasChanged: false });
    }
  }

  render() {
    const game: IGameInfo|undefined = this.state.edit;
    const isEditing: boolean = this.state.hasChanged;
    if (game) {
      return (
        <div className='browse-sidebar'>
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row browse-sidebar__row--title browse-sidebar__row--one-line'>
              <EditableTextWrap target={game}
                                text={game.title} onEditDone={this.onTitleEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>by </p>
              <EditableTextWrap target={game}
                                text={game.developer} onEditDone={this.onDeveloperEditDone}/>
            </div>
          </div>
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Genre: </p>
              <EditableTextWrap target={game}
                                text={game.genre} onEditDone={this.onGenreEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Series: </p>
              <EditableTextWrap target={game}
                                text={game.series} onEditDone={this.onSeriesEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Source: </p>
              <EditableTextWrap target={game}
                                text={game.source} onEditDone={this.onSourceEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Platform: </p>
              <EditableTextWrap target={game}
                                text={game.platform} onEditDone={this.onPlatformEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Play Mode: </p>
              <EditableTextWrap target={game}
                                text={game.playMode} onEditDone={this.onPlayModeEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Status: </p>
              <EditableTextWrap target={game}
                                text={game.status} onEditDone={this.onStatusEditDone}/>
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
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row'>
              <p>Notes: </p>
              <EditableTextWrap target={game} isMultiline={true} placeholder='[N/A]'
                                textProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--text-multi-line'}}
                                editProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--edit-multi-line'}}
                                text={game.notes} onEditDone={this.onNotesEditDone}/>
            </div>
          </div>
          <div className='browse-sidebar__section'>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Application Path: </p>
              <EditableTextWrap target={game}
                                text={game.applicationPath} onEditDone={this.onApplicationPathEditDone}/>
            </div>
            <div className='browse-sidebar__row browse-sidebar__row--one-line'>
              <p>Launch Command: </p>
              <EditableTextWrap target={game}
                                text={game.launchCommand} onEditDone={this.onLaunchCommandEditDone}/>
            </div>
          </div>
          {(this.props.gameImages && game) ? (
            <div className='browse-sidebar__section browse-sidebar__section--below-gap'>
              <div className='browse-sidebar__row browse-sidebar__row__spacer' />
              <div className='browse-sidebar__row'>
                <img className='browse-sidebar__row__screenshot'
                     src={this.props.gameImages.getScreenshotPath(game.title, game.platform)}/>
              </div>
            </div>
          ) : undefined}
          {isEditing ? (
            <div className='browse-sidebar__section'>
              <div className='browse-sidebar__row browse-sidebar__row--save'>
                <p>Changes have been made.</p>
                <input type='button' value='Save Changes' className='simple-button' onClick={this.onSaveClick} />
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

  private updateEdit(): void {
    const game: IGameInfo|undefined = this.props.selectedGame ? GameInfo.duplicate(this.props.selectedGame) : undefined;
    this.setState({ edit: game });
  }

  private onSaveClick(): void {
    if (this.props.selectedGame && this.state.edit) {
      // Save changes to the selected game
      // (@HACK This should probably be sent up the the app - which then does the override)
      GameInfo.override(this.props.selectedGame, this.state.edit);
      this.setState({ hasChanged: false });
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void) {
    return (text: string) => {
      const game = this.state.edit;
      if (game) {
        func(game, text);
        this.setState({ hasChanged: true });
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange calllback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo, isChecked: boolean) => void) {
    return (isChecked: boolean) => {
      const game = this.state.edit;
      if (game) {
        func(game, isChecked);
        this.setState({ hasChanged: true });
      }
    }
  }
}
