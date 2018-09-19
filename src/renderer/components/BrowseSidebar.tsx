import * as React from 'react';
import { IGameInfo } from '../../shared/game/interfaces';
import { EditableTextWrap, IEditableTextWrapProps } from './EditableTextWrap';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';

export interface IBrowseSidebarProps {
  gameImages?: GameImageCollection;
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
  /** Currently selected game (if any) */
  image?: IGameInfo;
}

/** Sidebar for BrowsePage */
export class BrowseSidebar extends React.Component<IBrowseSidebarProps, {}> {
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
  }

  render() {
    const selectedGame = this.props.selectedGame;
    if (selectedGame) {
      return (
        <div className="browse-sidebar">
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row browse-sidebar__row--title browse-sidebar__row--one-line">
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.title} onEditDone={this.onTitleEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>by </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.developer} onEditDone={this.onDeveloperEditDone}/>
            </div>
          </div>
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Genre: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.genre} onEditDone={this.onGenreEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Series: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.series} onEditDone={this.onSeriesEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Source: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.source} onEditDone={this.onSourceEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Platform: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.platform} onEditDone={this.onPlatformEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Play Mode: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.playMode} onEditDone={this.onPlayModeEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Status: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.status} onEditDone={this.onStatusEditDone}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Broken: </p>
              <CheckBox checked={selectedGame.broken} onChange={this.onBrokenChange} className="browse-sidebar__row__check-box"/>
            </div>
            <div className="browse-sidebar__row">
              <p>Extreme: </p>
              <CheckBox checked={selectedGame.extreme} onChange={this.onExtremeChange} className="browse-sidebar__row__check-box"/>
            </div>
          </div>
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row">
              <p>Notes: </p>
              <EditableTextWrap target={selectedGame} isMultiline={true} placeholder='[N/A]'
                                textProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--text-multi-line'}}
                                editProps={{className: 'browse-sidebar__row__editable-text browse-sidebar__row__editable-text--edit-multi-line'}}
                                text={selectedGame.notes} onEditDone={this.onNotesEditDone}/>
            </div>
          </div>
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Application Path: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.applicationPath} onEditDone={this.onApplicationPathEditDone}/>
            </div>
            <div className="browse-sidebar__row browse-sidebar__row--one-line">
              <p>Launch Command: </p>
              <EditableTextWrap target={selectedGame}
                                text={selectedGame.launchCommand} onEditDone={this.onLaunchCommandEditDone}/>
            </div>
          </div>
          {(this.props.gameImages && this.props.selectedGame) ? (
            <div className="browse-sidebar__section browse-sidebar__section__bottom">
              <div className="browse-sidebar__row browse-sidebar__row__spacer" />
              <div className="browse-sidebar__row">
                <img className="browse-sidebar__row__screenshot" 
                     src={this.props.gameImages.getScreenshotPath(this.props.selectedGame.title, this.props.selectedGame.platform)}/>
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

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void) {
    return (text: string) => {
      const game = this.props.selectedGame;
      if (game) {
        func(game, text);
        this.setState({ selectedGame: game });
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange calllback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo, isChecked: boolean) => void) {
    return (isChecked: boolean) => {
      const game = this.props.selectedGame;
      if (game) {
        func(game, isChecked);
        this.setState({ selectedGame: game });
      }
    }
  }
}
