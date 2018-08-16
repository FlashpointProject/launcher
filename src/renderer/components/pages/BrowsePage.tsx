import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { GameList } from '../gamelist/GameList';

export interface IBrowsePageProps extends IDefaultProps {
  platform: ILaunchBoxPlatform;
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
        <GameList games={games} />
      </div>
    );
  }

  /** Order the games according to the current settings */
  private orderGames(): ILaunchBoxGame[] {
    // Get the array of games
    const games = this.props.platform && this.props.platform.games;
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
