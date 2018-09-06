import * as React from 'react';
import { IGameInfo } from '../../../shared/game/interfaces';
import { EditableTextWrap } from '../generic/EditableTextWrap';
import { CheckBox } from '../generic/CheckBox';

export interface IBrowseSidebarProps {
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
}

/** Sidebar for BrowsePage */
export class BrowseSidebar extends React.Component<IBrowseSidebarProps, {}> {
  private onTitleEditDone           = this.wrapOnEditDone((game, text) => { game.title = text; });
  private onDeveloperEditDone       = this.wrapOnEditDone((game, text) => { game.developer = text; });
  private onGenreEditDone           = this.wrapOnEditDone((game, text) => { game.genre = text; });
  private onSeriesEditDone          = this.wrapOnEditDone((game, text) => { game.series = text; });
  private onSourceEditDone          = this.wrapOnEditDone((game, text) => { game.source = text; });
  private onLaunchCommandEditDone   = this.wrapOnEditDone((game, text) => { game.launchCommand = text; });
  private onApplicationPathEditDone = this.wrapOnEditDone((game, text) => { game.applicationPath = text; });
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
            <div className="browse-sidebar__row browse-sidebar__row--title">
              <b>
                <EditableTextWrap text={selectedGame.title} target={selectedGame} onEditDone={this.onTitleEditDone}/>
              </b>
            </div>
            <div className="browse-sidebar__row">
              <p>by  </p>
              <EditableTextWrap text={selectedGame.developer} target={selectedGame} onEditDone={this.onDeveloperEditDone}/>
            </div>
          </div>
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row">
              <p>Genre: </p>
              <EditableTextWrap text={selectedGame.genre} target={selectedGame} onEditDone={this.onGenreEditDone}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Series: </p>
              <EditableTextWrap text={selectedGame.series || 'N/A'} target={selectedGame} onEditDone={this.onSeriesEditDone}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Source: </p>
              <EditableTextWrap text={selectedGame.source} target={selectedGame} onEditDone={this.onSourceEditDone}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Play Mode: </p>
              <EditableTextWrap text={'TODO'/*selectedGame.playMode*/} target={selectedGame}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Status: </p>
              <EditableTextWrap text={'TODO'/*selectedGame.status*/} target={selectedGame}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Broken: </p>
              <CheckBox checked={true/*selectedGame.broken*/}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Extreme: </p>
              <CheckBox checked={selectedGame.extreme} onChange={this.onExtremeChange}/>
            </div>
          </div>
          <div className="browse-sidebar__section">
            <div className="browse-sidebar__row">
              <p>Application Path: </p>
              <EditableTextWrap text={selectedGame.applicationPath} target={selectedGame} onEditDone={this.onApplicationPathEditDone}/>
            </div>
            <div className="browse-sidebar__row">
              <p>Launch Command: </p>
              <EditableTextWrap text={selectedGame.launchCommand} target={selectedGame} onEditDone={this.onLaunchCommandEditDone}/>
            </div>
          </div>
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
