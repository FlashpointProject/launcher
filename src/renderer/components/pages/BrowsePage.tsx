import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { GameList } from '../gamelist/GameList';

export interface IBrowsePageProps extends IDefaultProps {
  central: ICentralState;
  search?: ISearchOnSearchEvent;
}
export interface IBrowsePageState {
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
    };
  }
  
  render() {
    // Order games
    const games: ILaunchBoxGame[] = this.orderGames();
    // Render
    return (
      <div className="game-browser">
        <GameList games={games} imageFolder={this.props.central.flashpointPath+'/Arcade/Images/Flash/Box - Front'} />
      </div>
    );
  }

  /** Order the games according to the current settings */
  private orderGames(): ILaunchBoxGame[] {
    // Get the array of games
    const games = this.props.central && this.props.central.platform && this.props.central.platform.games;
    if (!games) { return []; } // (No games found)
    // Order games
    // @TODO order games
    // Filter games
    const search = this.props.search;
    const searchText: string = (search && search.input.toLocaleLowerCase()) || '';
    const filteredGames = [];
    for (let game of games) {
      if (game.title !== undefined &&
          game.title.toLowerCase().indexOf(searchText) !== -1) {
        filteredGames.push(game);
      }
    }
    return filteredGames;
  }
}
