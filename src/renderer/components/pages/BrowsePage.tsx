import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';

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
    // Render
    return (
      <div>
        All Games:
        <ul className="game_list">
          {(games.map(
            (game) => {
              let className: string = 'game_list__item';
              // Filter games with search text
              const title: string = game.title || '';
              if (title.toLowerCase().indexOf(searchText) === -1) {
                className += ' game_list__item--hidden';
              }
              // Add game
              return (
                <li key={game.id} className={className}>
                  <img src={`../Data/Images/${title}-01.png`} />
                  {game.title}
                </li>
              );
            }
          ))}
        </ul>
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
    return games;
  }
}
