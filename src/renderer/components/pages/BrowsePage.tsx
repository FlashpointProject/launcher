import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { GameList } from '../gamelist/GameList';
import { IGameOrderChangeEvent } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { lerp } from '../../Util';
import { EditableTextWrap } from '../generic/EditableTextWrap';
import { CheckBox } from '../generic/CheckBox';

export interface IBrowsePageProps extends IDefaultProps {
  central?: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  /** Scale of the games */
  gameScale: number;
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
    const height: number = lerp(30, 175, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
    const selectedGame = this.state.selectedGame;
    return (
      <div className="game-browser">
        <div className="game-browser__left">
          <GameList games={games}
                    gameThumbnails={this.props.central && this.props.central.gameThumbnails}
                    noRowsRenderer={this.noRowsRenderer}
                    onGameSelect={this.onGameSelect}
                    orderBy={order.orderBy}
                    orderReverse={order.orderReverse}
                    rowHeight={height}
                    />
        </div>
        <div className={'game-browser__right'+(selectedGame?'':' game-browser__right--none')}>
          {(selectedGame) ? (
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
          ) : (
            <p>No game selected.</p>
          )}
        </div>
      </div>
    );
  }

  private noRowsRenderer() {
    return (
      <div className="game-list__no-games">
        <h1 className="game-list__no-games__title">No Games Found!</h1>
        <br/>
        {(this.props.central && this.props.central.collection) ? ( // (If the flashpoint folder has been found)
          <>
            No game title matched your search.<br/>
            Try searching for something less restrictive.
          </>
        ):(
          <>
            Have you set value of <i>"flashpointPath"</i> in <i>"config.json"</i>?<br/>
            It should point at the top folder of FlashPoint (Example: "C:/Users/Adam/Downloads/Flashpoint Infinity 4.0").<br/>
            <br/>
            Note: You have to restart this application for the config file to reload.
            <br/>
            Tip: Don't use single back-slashes ("\") in the path because that won't work.
            Use double back-slashes ("\\") or single forward-slashes ("/") instead.
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

  /** Create a wrapper for a EditableTextWrap's onEditDone calllback (this is to reduce redundancy) */
  private wrapOnEditDone(func: (game: IGameInfo, text: string) => void) {
    const selected = this.state.selectedGame;
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
    const selected = this.state.selectedGame;
    if (selected) {
      return (isChecked: boolean) => {
        func(selected, isChecked);
        this.setState({ selectedGame: selected });
      }
    }
    return undefined;
  }

  /** Order the games according to the current settings */
  private orderGames(): IGameInfo[] {
    // -- Get the array of games --
    const games = this.props.central && this.props.central.collection && this.props.central.collection.games;
    if (!games) { return []; } // (No games found)
    // -- Filter games --
    const search = this.props.search;
    const searchText: string = (search && search.input.toLocaleLowerCase()) || '';
    const filteredGames = [];
    for (let game of games) {
      if (game.title !== undefined &&
          game.title.toLowerCase().indexOf(searchText) !== -1) {
        filteredGames.push(game);
      }
    }
    // -- Order games --
    const order = this.props.order || BrowsePage.defaultOrder;
    let orderFn: OrderFn;
    switch (order.orderBy) {
      default: //case 'title':
        orderFn = orderByTitle;
        break;
      case 'genre':
        orderFn = orderByGenre;
        break;
    }
    if (order.orderReverse === 'descending') {
      orderFn = reverseOrder(orderFn);
    }
    const orderedGames = filteredGames.sort(orderFn);
    // -- Return --
    return orderedGames;
  }

  private static defaultOrder: Readonly<IGameOrderChangeEvent> = {
    orderBy: 'title',
    orderReverse: 'ascending',
  }
}

type OrderFn = (a: IGameInfo, b: IGameInfo) => number;

/** Order games by their title alphabetically (ascending) */
function orderByTitle(a: IGameInfo, b: IGameInfo): number {
  if (a.title < b.title) { return -1; }
  if (a.title > b.title) { return  1; }
  return 0;
}

/** Order games by their genre alphabetically (ascending) */
function orderByGenre(a: IGameInfo, b: IGameInfo): number {
  if (a.genre < b.genre) { return -1; }
  if (a.genre > b.genre) { return  1; }
  return 0;
}

/** Reverse the order (makes an ascending order function descending instead) */
function reverseOrder(compareFn: OrderFn): OrderFn {
  return (a: IGameInfo, b: IGameInfo) => {
    const ret: number = compareFn(a, b);
    if (ret ===  1) { return -1; }
    if (ret === -1) { return  1; }
    return 0;
  }
}
