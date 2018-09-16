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
  /** Currnt quick search string (used to jump to a game in the list, not to filter the list) */
  quickSearch: string;
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  /** A timestamp of the previous the the quick search string was updated */
  private _prevQuickSearchUpdate: number = 0;

  private static readonly quickSearchTimeout: number = 1500;

  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
      quickSearch: '',
    };
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.onGameSelect = this.onGameSelect.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidUpdate(prevProps: IBrowsePageProps, prevState: IBrowsePageState) {
    // Check if quick search string changed, and if it isnt empty
    if (prevState.quickSearch !== this.state.quickSearch && this.state.quickSearch !== '') {
      console.log(`Try quick search (search: "${this.state.quickSearch}")`);
      const games: IGameInfo[] = this.orderGames();
      for (let index = 0; index < games.length; index++) {
        const game: IGameInfo = games[index];
        if (game.title.toLocaleLowerCase().startsWith(this.state.quickSearch)) {
          this.setState({ selectedGame: game });
          console.log(`Select: "${game.title}" (search: "${this.state.quickSearch}")`);
          break;
        }
      }
    }
  }

  render() {
    const games: IGameInfo[] = this.orderGames();
    const order = this.props.order || BrowsePage.defaultOrder;
    return (
      <div className="game-browser">
        <div className="game-browser__left" onKeyDown={this.onKeyDown}>
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = lerp(188, 691, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid games={games}
                          selectedGame={this.state.selectedGame}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          cellWidth={width}
                          cellHeight={height}/>
              );
            } else {
              const height: number = lerp(50, 225, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
              return (
                <GameList games={games}
                          selectedGame={this.state.selectedGame}
                          gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          rowHeight={height}/>
              );
            }
          })()}
        </div>
        {(games.length > 0)?(
          <div className={'game-browser__right'+(this.state.selectedGame?'':' game-browser__right--none')}>
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

  private onKeyDown(event: React.KeyboardEvent): void {
    const key: string = event.key.toLocaleLowerCase();
    if (key === 'backspace') { // (Backspace - Remove a character)
      const timedOut = updateTime.call(this);
      let newString: string = (timedOut ? '' : this.state.quickSearch);
      newString = newString.substr(0, newString.length - 1);
      console.log(newString);
      this.setState({ quickSearch: newString });
    } else if (key.length === 1) { // (Single character - add it to the search string)
      const timedOut = updateTime.call(this);
      let newString: string = (timedOut ? '' : this.state.quickSearch) + key;
      console.log(newString);
      this.setState({ quickSearch: newString });
    }

    function updateTime(this: BrowsePage): boolean {
      const now: number = Date.now();
      const timedOut: boolean = (now - this._prevQuickSearchUpdate > BrowsePage.quickSearchTimeout);
      this._prevQuickSearchUpdate = now;
      return timedOut;
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
