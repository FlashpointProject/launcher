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
  constructor(props: IBrowseSidebarProps) {
    super(props);
  }

  render() {
    const selectedGame = this.props.selectedGame;
    if (selectedGame) {
      return (
        <>
          <b><EditableTextWrap text={selectedGame.title} target={selectedGame}
                               onEditDone={this.wrapOnEditDone((game, text) => { game.title = text; })}/></b>
          <div>
            by <EditableTextWrap text={selectedGame.developer} target={selectedGame}
                                 onEditDone={this.wrapOnEditDone((game, text) => { game.developer = text; })}/>
          </div>
          <br/>
          <div>
            Genre: <EditableTextWrap text={selectedGame.genre} target={selectedGame}
                                     onEditDone={this.wrapOnEditDone((game, text) => { game.genre = text; })}/>
          </div>
          <div>
            Extreme: <CheckBox checked={selectedGame.extreme} 
                               onChange={this.wrapOnCheckBoxChange((game, isChecked) => { game.extreme = isChecked; })}/>
          </div>
          <div>
            Series: <EditableTextWrap text={selectedGame.series || 'N/A'} target={selectedGame}
                                      onEditDone={this.wrapOnEditDone((game, text) => { game.series = text; })}/>
          </div>
          <div>
            Source: <EditableTextWrap text={selectedGame.source} target={selectedGame}
                                      onEditDone={this.wrapOnEditDone((game, text) => { game.source = text; })}/>
          </div>
          <div>
            Launch Command: <EditableTextWrap text={selectedGame.launchCommand} target={selectedGame}
                                              onEditDone={this.wrapOnEditDone((game, text) => { game.launchCommand = text; })}/>
          </div>
          <div>
            Application Path: <EditableTextWrap text={selectedGame.applicationPath} target={selectedGame}
                                                onEditDone={this.wrapOnEditDone((game, text) => { game.applicationPath = text; })}/>
          </div>
        </>
      );
    } else {
      return (
        <p>No game selected.</p>
      );
    }
  }

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void) {
    const selected = this.props.selectedGame;
    if (selected) {
      return (text: string) => {
        func(selected, text);
        this.setState({ selectedGame: selected });
      }
    }
    return undefined;
  }

  /** Create a wrapper for a CheckBox's onChange calllback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo, isChecked: boolean) => void) {
    const selected = this.props.selectedGame;
    if (selected) {
      return (isChecked: boolean) => {
        func(selected, isChecked);
        this.setState({ selectedGame: selected });
      }
    }
    return undefined;
  }
}
