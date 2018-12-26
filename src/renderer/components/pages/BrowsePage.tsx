import * as React from 'react';
import { IDefaultProps, ICentralState } from '../../interfaces';
import { GameList } from '../GameList';
import { IGameOrderChangeEvent } from '../GameOrder';
import { IGameInfo, IAdditionalApplicationInfo } from '../../../shared/game/interfaces';
import { gameScaleSpan, gameIdDataType } from '../../Util';
import { GameGrid } from '../GameGrid';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { orderGames, IOrderGamesArgs } from '../../../shared/game/GameFilter';
import { GameCollection } from '../../../shared/game/GameCollection';
import { GameLauncher } from '../../GameLauncher';
import { IGamePlaylist, IGamePlaylistEntry } from '../../../renderer/playlist/interfaces';
import { GameInfo } from '../../../shared/game/GameInfo';
import { AdditionalApplicationInfo } from '../../../shared/game/AdditionalApplicationInfo';
import GameManagerPlatform from '../../game/GameManagerPlatform';
import { GameParser, generateGameOrderTitle } from '../../../shared/game/GameParser';
import { uuid } from '../../uuid';
import { formatDate } from '../../../shared/Util';
import { SearchQuery } from '../../store/search';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { ConnectedRightBrowseSidebar } from '../../containers/ConnectedRightBrowseSidebar';
import { IResizableSidebar, IResizeEvent } from '../IResizableSidebar';
import { GamePropSuggestions, getSuggestions } from '../../util/suggestions';

interface OwnProps {
  central: ICentralState;
  search: SearchQuery;
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
  clearSearch: () => void;
  wasNewGameClicked: boolean;
}

export type IBrowsePageProps = OwnProps & IDefaultProps & WithPreferencesProps;

export interface IBrowsePageState {
  /** Current quick search string (used to jump to a game in the list, not to filter the list) */
  quickSearch: string;
  /** Ordered games using the most recent props, configs and preferences */
  orderedGames: IGameInfo[];
  /** Arguments used to order the "orderedGames" array in this state */
  orderedGamesArgs?: IOrderGamesArgs;
  /** Currently dragged game (if any) */
  draggedGame?: IGameInfo;
  /** Buffer for the selected game (all changes are made to the game until saved) */
  currentGame?: IGameInfo;
  /** Buffer for the selected games additional applications (all changes are made to this until saved) */
  currentAddApps?: IAdditionalApplicationInfo[];
  /** If the "edit mode" is currently enabled */
  isEditing: boolean;
  /** If the selected game is a new game being created */
  isNewGame: boolean;
  /** ... */
  suggestions?: Partial<GamePropSuggestions>;
}

export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
  /** A timestamp of the previous the the quick search string was updated */
  private _prevQuickSearchUpdate: number = 0;

  private gameBrowserRef: React.RefObject<HTMLDivElement> = React.createRef();

  private static readonly quickSearchTimeout: number = 1500;

  constructor(props: IBrowsePageProps) {
    super(props);
    this.state = {
      quickSearch: '',
      orderedGames: [],
      isEditing: false,
      isNewGame: false,
    };
  }

  componentDidMount() {
    this.props.central.games.on('change', this.onGamesCollectionChange);
    this.orderGames(true);
    this.updateCurrentGameAndAddApps();
  }

  componentWillUnmount() {
    this.props.central.games.removeListener('change', this.onGamesCollectionChange);
  }

  componentDidUpdate(prevProps: IBrowsePageProps, prevState: IBrowsePageState) {
    this.orderGames();
    // Check if it ended editing
    if (!this.state.isEditing && prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: undefined });
    }
    // Check if it started editing
    if (this.state.isEditing && !prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: getSuggestions(this.props.central.games.collection) });
    }
    // Update current game and add-apps if the selected game changes
    if (this.props.selectedGame !== prevProps.selectedGame) {
      this.updateCurrentGameAndAddApps();
      this.setState({ isEditing: false });
    }
    // Create a new game if the "New Game" button is pushed
    if (this.props.wasNewGameClicked && !prevProps.wasNewGameClicked) {
      const newGame = GameInfo.create();
      newGame.id = uuid();
      newGame.dateAdded = formatDate(new Date());
      this.setState({
        currentGame: newGame,
        currentAddApps: [],
        isEditing: true,
        isNewGame: true,
      });
    }
    // Check if quick search string changed, and if it isn't empty
    if (prevState.quickSearch !== this.state.quickSearch && this.state.quickSearch !== '') {
      const games: IGameInfo[] = this.state.orderedGames;
      for (let index = 0; index < games.length; index++) {
        const game: IGameInfo = games[index];
        if (game.title.toLowerCase().startsWith(this.state.quickSearch)) {
          if (this.props.onSelectGame) { this.props.onSelectGame(game); }
          break;
        }
      }
    }
  }

  render() {
    const games: IGameInfo[] = this.state.orderedGames;
    const order = this.props.order || BrowsePage.defaultOrder;
    const selectedGame = this.props.selectedGame;
    const draggedGame = this.state.draggedGame;
    const selectedPlaylist = this.props.selectedPlaylist;
    const showSidebars: boolean = this.props.central.gamesDoneLoading;
    // Find the selected game in the selected playlist (if both are selected)
    let gamePlaylistEntry: IGamePlaylistEntry|undefined;
    if (selectedPlaylist && selectedGame) {
      for (let gameEntry of selectedPlaylist.games) {
        if (gameEntry.id === selectedGame.id) {
          gamePlaylistEntry = gameEntry;
          break;
        }
      }
    }
    // Render
    return (
      <div className='game-browser' ref={this.gameBrowserRef}>
        <IResizableSidebar none={!!selectedGame}
                           hide={this.props.preferencesData.browsePageShowLeftSidebar && showSidebars}
                           divider='after'
                           width={this.props.preferencesData.browsePageLeftSidebarWidth}
                           onResize={this.onLeftSidebarResize}>
          <ConnectedLeftBrowseSidebar central={this.props.central}
                                      selectedPlaylistID={selectedPlaylist ? selectedPlaylist.id : ''}
                                      onSelectPlaylist={this.onLeftSidebarSelectPlaylist}
                                      onDeselectPlaylist={this.onLeftSidebarDeselectPlaylist}
                                      onPlaylistChanged={this.onLeftSidebarPlaylistChanged}
                                      onShowAllClick={this.onLeftSidebarShowAllClick} />
        </IResizableSidebar>
        <div className='game-browser__center' onKeyDown={this.onCenterKeyDown}>
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = calcScale(350, this.props.gameScale);
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid games={games}
                          selectedGame={selectedGame}
                          draggedGame={draggedGame}
                          gameImages={this.props.central.gameImages}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          onGameLaunch={this.onGameLaunch}
                          onGameDragStart={this.onGameDragStart}
                          onGameDragEnd={this.onGameDragEnd}
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
                          draggedGame={draggedGame}
                          gameImages={this.props.central.gameImages}
                          noRowsRenderer={this.noRowsRenderer}
                          onGameSelect={this.onGameSelect}
                          onGameLaunch={this.onGameLaunch}
                          onGameDragStart={this.onGameDragStart}
                          onGameDragEnd={this.onGameDragEnd}
                          orderBy={order.orderBy}
                          orderReverse={order.orderReverse}
                          rowHeight={height} />
              );
            }
          })()}
        </div>
        <IResizableSidebar none={!!this.state.currentGame}
                           hide={this.props.preferencesData.browsePageShowRightSidebar && showSidebars}
                           divider='before'
                           width={this.props.preferencesData.browsePageRightSidebarWidth}
                           onResize={this.onRightSidebarResize}>
          <ConnectedRightBrowseSidebar currentGame={this.state.currentGame}
                                       currentAddApps={this.state.currentAddApps}
                                       gameImages={this.props.central.gameImages}
                                       games={this.props.central.games}
                                       onDeleteSelectedGame={this.onDeleteSelectedGame}
                                       onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
                                       onEditPlaylistNotes={this.onEditPlaylistNotes}
                                       gamePlaylistEntry={gamePlaylistEntry}
                                       isEditing={this.state.isEditing}
                                       isNewGame={this.state.isNewGame}
                                       onEditClick={this.onStartEditClick}
                                       onDiscardClick={this.onDiscardEditClick}
                                       onSaveGame={this.onSaveEditClick}
                                       suggestions={this.state.suggestions} />
        </IResizableSidebar>
      </div>
    );
  }

  private noRowsRenderer = (): JSX.Element => {
    return (
      <div className='game-list__no-games'>
        { this.props.central.gamesDoneLoading ? (
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
        ) }
      </div>
    );
  }

  private onLeftSidebarSelectPlaylist = (playlist: IGamePlaylist): void => {
    if (this.props.onSelectPlaylist) { this.props.onSelectPlaylist(playlist); }
  }

  private onLeftSidebarDeselectPlaylist = (): void => {
    if (this.props.onSelectPlaylist) { this.props.onSelectPlaylist(undefined); }
  }

  private onLeftSidebarPlaylistChanged = (playlist: IGamePlaylist): void => {
    this.forceUpdate();
  }

  private onLeftSidebarShowAllClick = (): void => {
    if (this.props.clearSearch) { this.props.clearSearch(); }
    if (this.props.onSelectPlaylist) { this.props.onSelectPlaylist(undefined); }
  }

  private onLeftSidebarResize = (event: IResizeEvent): void => {
    const maxWidth = this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageRightSidebarWidth;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    this.props.updatePreferences({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  private onRightSidebarResize = (event: IResizeEvent): void => {
    const maxWidth = this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth;
    const targetWidth = event.startWidth + event.startX - event.event.clientX;
    this.props.updatePreferences({
      browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }
  
  private getGameBrowserDivWidth(): number {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!this.gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(this.gameBrowserRef.current).width || '', 10);
  }

  private onGameSelect = (game?: IGameInfo): void => {
    if (this.props.selectedGame !== game) {
      if (this.props.onSelectGame) { this.props.onSelectGame(game); }
    }
  }

  private onGameLaunch = (game: IGameInfo): void => {
    const addApps = GameCollection.findAdditionalApplicationsByGameId(this.props.central.games.collection, game.id);
    GameLauncher.launchGame(game, addApps);
  }

  private onCenterKeyDown = (event: React.KeyboardEvent): void => {
    const key: string = event.key.toLowerCase();
    if (!event.ctrlKey && !event.altKey) { // (Don't add CTRL or ALT modified key presses)
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
    }

    function updateTime(this: BrowsePage): boolean {
      const now: number = Date.now();
      const timedOut: boolean = (now - this._prevQuickSearchUpdate > BrowsePage.quickSearchTimeout);
      this._prevQuickSearchUpdate = now;
      return timedOut;
    }
  }

  private onGameDragStart = (event: React.DragEvent, game: IGameInfo, index: number): void => {
    this.setState({ draggedGame: game });
    event.dataTransfer.setData(gameIdDataType, game.id);
  }

  private onGameDragEnd = (event: React.DragEvent, game: IGameInfo, index: number): void => {
    this.setState({ draggedGame: undefined });
    event.dataTransfer.clearData(gameIdDataType);
  }

  private onDeleteSelectedGame = (): void => {
    if (this.props.onSelectGame) { this.props.onSelectGame(undefined); }
  }

  private onRemoveSelectedGameFromPlaylist = (): void => {
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

  private onEditPlaylistNotes = (text: string): void => {
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

  private updateCurrentGameAndAddApps(): void {
    const game = this.props.selectedGame;
    // Find additional applications for the selected game (if any)
    let addApps: IAdditionalApplicationInfo[]|undefined;
    if (game) { addApps = GameCollection.findAdditionalApplicationsByGameId(this.props.central.games.collection, game.id); }
    // Update State
    this.setState({
      currentGame: game && GameInfo.duplicate(game),
      currentAddApps: addApps && addApps.map(AdditionalApplicationInfo.duplicate),
      isNewGame: false,
    });
  }

  private onStartEditClick = (): void => {
    this.setState({ isEditing: true });
  }

  private onDiscardEditClick = (): void => {
    this.setState({ isEditing: false });
  }

  private onSaveEditClick = (): void => {
    this.saveGameAndAddApps();
    this.setState({
      isEditing: false,
      isNewGame: false
    });
  }
  
  private saveGameAndAddApps(): void {
    console.time('save');
    const game = this.state.currentGame;
    if (!game) { console.error(`Can't save game. "currentGame" is missing.`); return; }
    // Find the platform the game is in (or should be in, if it is not in one already)
    const games = this.props.central.games;
    let platform = games.getPlatformOfGameId(game.id) ||
                   games.getPlatformByName(game.platform) ||
                   games.getPlatformByName('Unknown Platform');
    if (!platform) {
      platform = new GameManagerPlatform('Unknown Platform.xml');
      platform.collection = new GameCollection();
      platform.data = { LaunchBox: {} };
      games.addPlatform(platform);
    }
    // Update game's order title
    game.orderTitle = generateGameOrderTitle(game.title);
    // Overwrite the game and additional applications with the changes made
    platform.addOrUpdateGame(game);
    // Override the additional applications
    const addApps = GameCollection.findAdditionalApplicationsByGameId(games.collection, game.id);
    updateAddApps.call(this, addApps, platform);
    // Refresh games collection
    games.refreshCollection();
    // If a new game was created, select the new game
    if ((this.props.selectedGame && this.props.selectedGame.id) !== game.id) {
      if (!platform.collection) { throw new Error('Platform collection is missing.'); }
      if (this.props.onSelectGame) { this.props.onSelectGame(platform.collection.findGame(game.id)); }
    }
    // Save changes to file
    platform.saveToFile().then(() => { console.timeEnd('save'); });

    // -- Functions --
    function updateAddApps(this:  BrowsePage, selectedApps: IAdditionalApplicationInfo[], platform: GameManagerPlatform): void {
      if (!platform.collection) { throw new Error('Platform does not have a collection.'); }
      // 1. Save the changes made to add-apps
      // 2. Save any new add-apps
      // 3. Delete any removed add-apps
      const editApps = this.state.currentAddApps;
      if (!editApps) { throw new Error('editAddApps is missing'); }
      if (!selectedApps) { throw new Error('selectedAddApps is missing'); }
      // -- Categorize add-apps --
      // Put all new add-apps in an array
      const newAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = editApps.length - 1; i >= 0; i--) {
        const editApp = editApps[i];
        let found = false;
        for (let j = selectedApps.length - 1; j >= 0; j--) {
          const selApp = selectedApps[j];
          if (editApp.id === selApp.id) {
            found = true;
            break;
          }
        }
        if (!found) { newAddApps.push(editApp); }
      }
      // Put all changed add-apps in an array
      const changedAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = editApps.length - 1; i >= 0; i--) {
        const editApp = editApps[i];
        for (let j = selectedApps.length - 1; j >= 0; j--) {
          const selApp = selectedApps[j];
          if (editApp.id === selApp.id) {
            changedAddApps.push(editApp);
            break;
          }
        }
      }
      // Put all removes add-apps in an array
      const removedAddApps: IAdditionalApplicationInfo[] = [];
      for (let i = selectedApps.length - 1; i >= 0; i--) {
        const selApp = selectedApps[i];
        let found = false;
        for (let j = editApps.length - 1; j >= 0; j--) {
          const editApp = editApps[j];
          if (editApp.id === selApp.id) {
            found = true;
            break;
          }
        }
        if (!found) { removedAddApps.push(selApp); }
      }
      // -- Update --
      // Delete removed add-apps
      for (let i = removedAddApps.length - 1; i >= 0; i--) {
        const addApp = removedAddApps[i];
        platform.removeAdditionalApplication(addApp.id);
      }
      // Update changed add-apps
      for (let i = changedAddApps.length - 1; i >= 0; i--) {
        const addApp = changedAddApps[i];
        const oldAddApp = platform.collection.findAdditionalApplication(addApp.id);
        if (!oldAddApp) { throw new Error('???'); }
        const rawAddApp = platform.findRawAdditionalApplication(addApp.id);
        if (!rawAddApp) { throw new Error('???'); }
        Object.assign(oldAddApp, addApp);
        Object.assign(rawAddApp, GameParser.reverseParseAdditionalApplication(oldAddApp));
      }
      // Add new add-apps
      for (let i = newAddApps.length - 1; i >= 0; i--) {
        const addApp = newAddApps[i];
        platform.addAdditionalApplication(addApp);
        const newRawAddApp = Object.assign({}, GameParser.emptyRawAdditionalApplication, 
                                          GameParser.reverseParseAdditionalApplication(addApp));
        platform.addRawAdditionalApplication(newRawAddApp);
      }
    }
  }
  
  /**
   * Update the ordered games array if the related props, configs or preferences has been changed
   * @param force If checking for changes in the arguments should be skipped (it always re-orders the games)
   */
  private orderGames(force: boolean = false): void {
    const args = {
      games: this.props.central.games.collection.games,
      search: this.props.search ? this.props.search.text : '',
      extreme: !window.External.config.data.disableExtremeGames &&
               this.props.preferencesData.browsePageShowExtreme,
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

  private onGamesCollectionChange = (): void => {
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
 * Check if two sets of "order games arguments" will produce the same games in the same order
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
