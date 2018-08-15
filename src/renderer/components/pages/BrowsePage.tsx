import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer } from 'react-virtualized';

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
    // Get the search text
    const search = this.props.search;
    const searchText: string = (search && search.input.toLocaleLowerCase()) || '';
    // Order games
    const games: ILaunchBoxGame[] = this.orderGames();
    console.log(games)
    // Render
    return (
      <div className="game-browser">
        <AutoSizer>
          {({width, height}) => {
            return (
              <List 
                ref="List"
                className="game_list"
                width={width}
                height={height}
                rowHeight={50}
                rowCount={games.length}
                overscanRowCount={3}
                noRowsRenderer={this._noRowsRenderer}
                rowRenderer={({index, isScrolling, key, style}) => {
                  const game = games[index];
                  const title: string = game.title || '';
                  let className: string = 'game_list__item';
                  // Add class to all with an even index
                  if (index % 2 === 0) {
                    className += ' game_list__item--even';
                  }
                  // Render
                  return (
                    <li key={key} style={style} className={className}>
                      <img src={`../Data/Images/${title}-01.png`} />
                      {title}
                    </li>
                  );
                }} />
            );
          }}
        </AutoSizer>
      </div>
    );
  }
  _noRowsRenderer() {
    return (
      <div>No games found!</div>
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
