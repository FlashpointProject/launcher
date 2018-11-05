import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { ISearchOnSearchEvent } from '../Search';
import { GameList } from '../GameList';
import { IGameOrderChangeEvent } from '../GameOrder';
import { IGameInfo, IAdditionalApplicationInfo } from '../../../shared/game/interfaces';
import { gameScaleSpan } from '../../Util';
import { BrowseSidebar } from '../BrowseSidebar';
import { GameGrid } from '../GameGrid';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { orderGames, IOrderGamesArgs } from '../../../shared/game/GameFilter';
import { GameCollection } from '../../../shared/game/GameCollection';
import { GameLauncher } from '../../GameLauncher';
import { LeftBrowseSidebar } from '../LeftBrowseSidebar';
import { IGamePlaylist, IGamePlaylistEntry } from 'src/renderer/playlist/interfaces';

export interface IBrowsePageProps extends IDefaultProps {
  central: ICentralState;
  search?: ISearchOnSearchEvent;
  order?: IGameOrderChangeEvent;
  /** Scale of the games */
  gameScale: number;
  /** Layout of the games */
  gameLayout: BrowsePageLayout;
  /** Currently selected game (if any) */
  selectedGame?: IGameInfo;
  /** Currently selected playlist (if any) */
  selectedPlaylist?: IGamePlaylist;
  onSelectGame?: (game?: IGameInfo) => void;
  onSelectPlaylist?: (playlist?: IGamePlaylist) => void;
}

export interface IBrowsePageState {
  /** Current quick search string (used to jump to a game in the list, not to filter the list) */
  quickSearch: string;
  /** Ordered games using the most recent props, configs and preferences */
  orderedGames: IGameInfo[];
  /** Arguments used to order the "orderedGames" array in this state */
  orderedGamesArgs?: IOrderGamesArgs;
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  /** A timestamp of the previous the the quick search string was updated */
  private _prevQuickSearchUpdate: number = 0;

  private static readonly quickSearchTimeout: number = 1500;

  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
      quickSearch: '',
      orderedGames: [],
    };
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.onGameSelect = this.onGameSelect.bind(this);
    this.onGameLaunch = this.onGameLaunch.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDeleteSelectedGame = this.onDeleteSelectedGame.bind(this);
    this.onRemoveSelectedGameFromPlaylist = this.onRemoveSelectedGameFromPlaylist.bind(this);
    this.onEditPlaylistNotes = this.onEditPlaylistNotes.bind(this);
    this.onLeftSidebarSelectPlaylist = this.onLeftSidebarSelectPlaylist.bind(this);
    this.onLeftSidebarDeselectPlaylist = this.onLeftSidebarDeselectPlaylist.bind(this);
    this.onLeftSidebarPlaylistChanged = this.onLeftSidebarPlaylistChanged.bind(this);
    this.onGamesCollectionChange = this.onGamesCollectionChange.bind(this);
  }

  componentDidMount() {
    this.props.central.games.on('change', this.onGamesCollectionChange);
    this.orderGames(true);
  }

  componentWillUnmount() {
    this.props.central.games.removeListener('change', this.onGamesCollectionChange);
  }

  componentDidUpdate(prevProps: IBrowsePageProps, prevState: IBrowsePageState) {
    this.orderGames();
    // Check if quick search string changed, and if it isn't empty
    if (prevState.quickSearch !== this.state.quickSearch && this.state.quickSearch !== '') {
      const games: IGameInfo[] = this.state.orderedGames;
      for (let index = 0; index < games.length; index++) {
        const game: IGameInfo = games[index];
        if (game.title.toLowerCase().startsWith(this.state.quickSearch)) {
          this.props.onSelectGame && this.props.onSelectGame(game);
          break;
        }
      }
    }
  }

  render() {
    const games: IGameInfo[] = this.state.orderedGames;
    const order = this.props.order || BrowsePage.defaultOrder;
    const selectedGame = this.props.selectedGame;
    const selectedPlaylist = this.props.selectedPlaylist;
    const anyGames: boolean = (this.props.central.games.collection.games.length > 0);
    // Find the selected game in the selected playlist (if both are seleceted)
    let gamePlaylistEntry: IGamePlaylistEntry|undefined;
    if (selectedPlaylist && selectedGame) {
      for (let gameEntry of selectedPlaylist.games) {
        if (gameEntry.id === selectedGame.id) {
          gamePlaylistEntry = gameEntry;
          break;
        }
      }
    }
    // Find additional applications for the selected game (if any)
    let selectedAddApps: IAdditionalApplicationInfo[]|undefined;
    if (selectedGame) {
      selectedAddApps = GameCollection.findAdditionalApplicationsByGameId(this.props.central.games.collection, selectedGame.id);
    }
    // Render
    return (
      <div className='game-browser'>
        {anyGames ? (
          <div className={'game-browser__left'+
                          (selectedGame?'':' game-browser__left--none')+
                          (window.External.preferences.data.browsePageShowLeftSidebar?'':' game-browser__left--hidden')}>
            <LeftBrowseSidebar central={this.props.central}
                               selectedPlaylistID={selectedPlaylist ? selectedPlaylist.id : ''}
                               onSelectPlaylist={this.onLeftSidebarSelectPlaylist}
                               onDeselectPlaylist={this.onLeftSidebarDeselectPlaylist}
                               onPlaylistChanged={this.onLeftSidebarPlaylistChanged} />
          </div>
        ) : undefined}
        <div className='game-browser__center' onKeyDown={this.onKeyDown}>
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = calcScale(350, this.props.gameScale);
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid games={games}
                          selectedGame={selectedGame}
                          gameImages={this.props.central.gameImages}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          onGameLaunch={this.onGameLaunch}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          cellWidth={width}
                          cellHeight={height}/>
              );
            } else {
              const height: number = calcScale(120, this.props.gameScale);
              return (
                <GameList games={games}
                          selectedGame={selectedGame}
                          gameImages={this.props.central.gameImages}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          onGameLaunch={this.onGameLaunch}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          rowHeight={height}/>
              );
            }
          })()}
        </div>
        {anyGames ? (
          <div className={'game-browser__right'+
                          (selectedGame?'':' game-browser__right--none')+
                          (window.External.preferences.data.browsePageShowRightSidebar?'':' game-browser__right--hidden')}>
            <BrowseSidebar selectedGame={selectedGame} 
                           selectedAddApps={selectedAddApps}
                           gameImages={this.props.central.gameImages}
                           games={this.props.central.games}
                           onDeleteSelectedGame={this.onDeleteSelectedGame}
                           onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
                           onEditPlaylistNotes={this.onEditPlaylistNotes}
                           gamePlaylistEntry={gamePlaylistEntry} />
          </div>
        ) : undefined}
      </div>
    );
  }

  private noRowsRenderer() {
    return (
      <div className='game-list__no-games'>
        {this.props.central.gamesDoneLoading ? (
          this.props.selectedPlaylist ? (
            /* Empty Playlist */
            <>
              <h2 className='game-list__no-games__title'>Empty Playlist</h2>
              <br/>
              <p>Drop a game on this playlist in the <i>left sidebar</i> to add it.</p>
            </>
          ) : (
            /* No games found */
            <>
              <h1 className='game-list__no-games__title'>No Games Found!</h1>
              <br/>
              {(this.props.central.gamesFailedLoading) ? (
                <>
                  Have you set the path to the <b>Flashpoint path</b> at the <i>Config</i> page?<br/>
                  <br/>
                  Note: You have to press <b>"Save & Restart"</b> for the change to take effect.
                </>
              ) : (
                (this.props.central.games.collection.games.length > 0) ? (
                  <>
                    No game title matched your search.<br/>
                    Try searching for something less restrictive.
                  </>
                ) : (
                  <>
                    There are no games.
                  </>
                )
              )}
            </>
          )
        ) : (
          <p>
            Loading Games...
          </p>
        )}
      </div>
    );
  }

  private onLeftSidebarSelectPlaylist(playlist: IGamePlaylist): void {
    this.props.onSelectPlaylist && this.props.onSelectPlaylist(playlist);
  }

  private onLeftSidebarDeselectPlaylist(): void {
    this.props.onSelectPlaylist && this.props.onSelectPlaylist(undefined);
  }

  private onLeftSidebarPlaylistChanged(playlist: IGamePlaylist): void {
    this.forceUpdate();
  }

  private onGameSelect(game?: IGameInfo): void {
    if (this.props.selectedGame !== game) {
      this.props.onSelectGame && this.props.onSelectGame(game);
    }
  }

  private onGameLaunch(game: IGameInfo): void {
    const addApps = GameCollection.findAdditionalApplicationsByGameId(this.props.central.games.collection, game.id);
    GameLauncher.launchGame(game, addApps);
  }

  private onKeyDown(event: React.KeyboardEvent): void {
    const key: string = event.key.toLowerCase();
    if (key === 'backspace') { // (Backspace - Remove a character)
      const timedOut = updateTime.call(this);
      let newString: string = (timedOut ? '' : this.state.quickSearch);
      newString = newString.substr(0, newString.length - 1);
      this.setState({ quickSearch: newString });
    } else if (key.length === 1) { // (Single character - add it to the search string)
      const timedOut = updateTime.call(this);
      let newString: string = (timedOut ? '' : this.state.quickSearch) + key;
      this.setState({ quickSearch: newString });
    }

    function updateTime(this: BrowsePage): boolean {
      const now: number = Date.now();
      const timedOut: boolean = (now - this._prevQuickSearchUpdate > BrowsePage.quickSearchTimeout);
      this._prevQuickSearchUpdate = now;
      return timedOut;
    }
  }

  private onDeleteSelectedGame(): void {
    this.props.onSelectGame && this.props.onSelectGame(undefined);
  }

  private onRemoveSelectedGameFromPlaylist(): void {
    const playlist = this.props.selectedPlaylist;
    const game = this.props.selectedGame;
    if (!playlist) { throw new Error('Unable to remove game from selected playlist - No playlist is selected'); }
    if (!game)     { throw new Error('Unable to remove game from selected playlist - No game is selected'); }
    // Find the game entry (of the selected game) in the playlist
    const gameId = game.id;
    let index: number = -1;
    playlist.games.every((gameEntry, i) => {
      if (gameEntry.id === gameId) {
        index = i;
        return false;
      }
      return true;
    });
    if (index === -1) { throw new Error('Unable to remove game from selected playlist - Game is not in playlist'); }
    // Remove game from playlist, save the playlist and update the interface
    playlist.games.splice(index, 1); // Remove game entry
    this.props.central.playlists.save(playlist);
    this.orderGames(true);
    if (this.props.onSelectGame) { this.props.onSelectGame(undefined); }
  }

  private onEditPlaylistNotes(text: string): void {
    const playlist = this.props.selectedPlaylist;
    const game = this.props.selectedGame;
    if (!playlist) { throw new Error('Unable to remove game from selected playlist - No playlist is selected'); }
    if (!game)     { throw new Error('Unable to remove game from selected playlist - No game is selected'); }
    // Find the game entry (of the selected game) in the playlist
    const gameId = game.id;
    let index: number = -1;
    playlist.games.every((gameEntry, i) => {
      if (gameEntry.id === gameId) {
        index = i;
        return false;
      }
      return true;
    });
    if (index === -1) { throw new Error('Unable to remove game from selected playlist - Game is not in playlist'); }
    // Set game specific playlist notes
    playlist.games[index].notes = text;
    this.props.central.playlists.save(playlist);
    this.forceUpdate();
  }
  
  /**
   * Update the ordered games array if the related props, configs or preferences has been changed
   * @param force If checking for changes in the arguments should be skipped (it always re-orders the games)
   */
  private orderGames(force: boolean = false): void {
    const args = {
      games: this.props.central.games.collection.games,
      search: this.props.search ? this.props.search.input : '',
      extreme: !window.External.config.data.disableExtremeGames &&
               window.External.preferences.data.browsePageShowExtreme,
      broken: window.External.config.data.showBrokenGames,
      playlist: this.props.selectedPlaylist,
      order: this.props.order || BrowsePage.defaultOrder,
    };
    if (force || !checkOrderGamesArgsEqual(args, this.state.orderedGamesArgs)) {
      this.setState({
        orderedGames: orderGames(args),
        orderedGamesArgs: args,
      });
    }
  }

  private onGamesCollectionChange(): void {
    this.orderGames(true);
  }

  private static defaultOrder: Readonly<IGameOrderChangeEvent> = {
    orderBy: 'title',
    orderReverse: 'ascending',
  }
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0
}

/**
 * Check if two sets of "order games argumets" will produce the same games in the same order
 * (This is not an exhaustive test, as it does not check the contents of the games array)
 */
function checkOrderGamesArgsEqual(args1: IOrderGamesArgs, args2?: IOrderGamesArgs): boolean {
  if (!args2)                            { return false; }
  if (args1.games    !== args2.games)    { return false; }
  if (args1.search   !== args2.search)   { return false; }
  if (args1.extreme  !== args2.extreme)  { return false; }
  if (args1.broken   !== args2.broken)   { return false; }
  if (args1.playlist !== args2.playlist) { return false; }
  if (args1.order    !== args2.order)    { return false; }
  return true;
}
