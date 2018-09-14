import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ISearchOnSearchEvent } from '../Search';
import { GameList } from '../GameList';
import { IGameOrderChangeEvent } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { lerp } from '../../Util';
import { BrowseSidebar } from '../BrowseSidebar';
import { GameGrid } from '../GameGrid';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { filterSearch, filterExtreme, getOrderFunction } from '../../../shared/game/GameFilter';

export interface IBrowsePageProps extends IDefaultProps {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  /** Scale of the games */
  gameScale: number;
  /** Layout of the games */
  gameLayout: BrowsePageLayout;
  /** Show extreme games */
  showExtreme: boolean;
}

export interface IBrowsePageState {
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {};
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.onGameSelect = this.onGameSelect.bind(this);
  }

  render() {
    const games: IGameInfo[] = this.orderGames();
    const order = this.props.order || BrowsePage.defaultOrder;
    const selectedGame = this.state.selectedGame;
    return (
      <div className="game-browser">
        <div className="game-browser__left">
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = lerp(188, 691, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid games={games}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          cellWidth={width}
                          cellHeight={height} />
              );
            } else {
              const height: number = lerp(50, 225, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              return (
                <GameList games={games}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          rowHeight={height}
                          />
              );
            }
          })()}
        </div>
        {(games.length > 0)?(
          <div className={'game-browser__right'+(selectedGame?'':' game-browser__right--none')}>
            <BrowseSidebar selectedGame={this.state.selectedGame} />
          </div>
        ):undefined}
      </div>
    );
  }

  private noRowsRenderer() {
    return (
      <div className="game-list__no-games">
        {this.props.central?( // (Game loading complete - kind of a hacky way to check)
          <>
            <h1 className="game-list__no-games__title">No Games Found!</h1>
            <br/>
            {(this.props.central.collection && this.props.central.collection.games.length > 0)?(
              <>
                No game title matched your search.<br/>
                Try searching for something less restrictive.
              </>
            ):(
              <>
                Have you set the path to the <b>Flashpoint directory</b> at the <i>Config</i> page?<br/>
                <br/>
                Note: You have to press <b>"Save & Restart"</b> for the games to load.
              </>
            )}
          </>
        ):(
          <>
            Loading...
          </>
        )}
      </div>
    );
  }

  private onGameSelect(game?: IGameInfo): void {
    if (this.state.selectedGame !== game) {
      this.setState({ selectedGame: game });
    }
  }

  /** Order the games according to the current settings */
  private orderGames(): IGameInfo[] {
    // -- Get the array of games --
    let games = this.props.central && this.props.central.collection && this.props.central.collection.games;
    if (!games) { return []; } // (No games found)
    games = games.slice(); // (Copy array)
    // -- Filter games --
    const searchText: string|undefined = this.props.search && this.props.search.input.toLocaleLowerCase();
    const extreme: boolean = this.props.showExtreme;
    const filteredGames = filterSearch(filterExtreme(games, extreme), searchText);
    // -- Order games --
    const order = this.props.order || BrowsePage.defaultOrder;
    const orderedGames = filteredGames.sort(getOrderFunction(order));
    // -- Return --
    return orderedGames;
  }

  private static defaultOrder: Readonly<IGameOrderChangeEvent> = {
    orderBy: 'title',
    orderReverse: 'ascending',
  }
}
