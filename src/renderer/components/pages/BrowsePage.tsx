import * as React from 'react';
import { MenuItemConstructorOptions, remote, Menu } from 'electron';
import * as fs from 'fs';
import { CentralState } from '../../interfaces';
import { GameList } from '../GameList';
import { GameOrderChangeEvent } from '../GameOrder';
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
import { uuid } from '../../uuid';
import { formatDate } from '../../../shared/Util';
import { SearchQuery } from '../../store/search';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { ConnectedRightBrowseSidebar } from '../../containers/ConnectedRightBrowseSidebar';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';
import { GamePropSuggestions, getSuggestions } from '../../util/suggestions';
import { WithLibraryProps } from '../../containers/withLibrary';
import { IGameLibraryFileItem } from '../../../shared/library/interfaces';
import { GameImageCollection } from '../../image/GameImageCollection';

type Pick<T, K extends keyof T> = { [P in K]: T[P]; };
type StateCallback0 = Pick<BrowsePageState, 'orderedGames'|'orderedGamesArgs'>;
type StateCallback1 = Pick<BrowsePageState, 'currentGame'|'currentAddApps'|'isEditing'|'isNewGame'>;
type StateCallback2 = Pick<BrowsePageState, 'currentGame'|'currentAddApps'|'isNewGame'>;

type OwnProps = {
  /** Semi-global prop. */
  central: CentralState;
  /** Most recent search query. */
  search: SearchQuery;
  /** Current parameters for ordering games. */
  order?: GameOrderChangeEvent;
  /** Scale of the games. */
  gameScale: number;
  /** Layout of the games. */
  gameLayout: BrowsePageLayout;
  /** Collection to get game images from, and save game images to. */
  gameImages: GameImageCollection;
  /** Currently selected game (if any). */
  selectedGame?: IGameInfo;
  /** Currently selected playlist (if any). */
  selectedPlaylist?: IGamePlaylist;
  /** Called when a game is selected. */
  onSelectGame?: (game?: IGameInfo) => void;
  /** Called when a playlist is selected. */
  onSelectPlaylist?: (playlist?: IGamePlaylist) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** "Route" of the currently selected library (empty string means no library). */
  gameLibraryRoute: string;
};

export type BrowsePageProps = OwnProps & WithPreferencesProps & WithLibraryProps;

export type BrowsePageState = {
  /** Current quick search string (used to jump to a game in the list, not to filter the list). */
  quickSearch: string;
  /** Ordered games using the most recent props, configs and preferences. */
  orderedGames: IGameInfo[];
  /** Arguments used to order the "orderedGames" array in this state. */
  orderedGamesArgs?: IOrderGamesArgs;
  /** Currently dragged game (if any). */
  draggedGame?: IGameInfo;
  /** Buffer for the selected game (all changes are made to the game until saved). */
  currentGame?: IGameInfo;
  /** Buffer for the selected games additional applications (all changes are made to this until saved). */
  currentAddApps?: IAdditionalApplicationInfo[];
  /** If the "edit mode" is currently enabled. */
  isEditing: boolean;
  /** If the selected game is a new game being created. */
  isNewGame: boolean;
  /**
   * Suggestions for the different properties of a game (displayed while editing).
   * @TODO This should probably be memoized instead of being state.
   */
  suggestions?: Partial<GamePropSuggestions>;
};

/** Page displaying the games and playlists. */
export class BrowsePage extends React.Component<BrowsePageProps, BrowsePageState> {
  /** Reference of the game grid/list element. */
  gameGridOrListRef: HTMLDivElement | null = null;
  /** A timestamp of the previous the the quick search string was updated */
  _prevQuickSearchUpdate: number = 0;
  gameBrowserRef: React.RefObject<HTMLDivElement> = React.createRef();
  /** The "setState" function but bound to this instance. */
  boundSetState = this.setState.bind(this);

  /** Time it takes before the current "quick search" string to reset after a change was made (in milliseconds). */
  static readonly quickSearchTimeout: number = 1500;

  constructor(props: BrowsePageProps) {
    super(props);
    // Set initial state (this is set up to remove all "setState" calls)
    const initialState: BrowsePageState = {
      quickSearch: '',
      orderedGames: [],
      isEditing: false,
      isNewGame: false
    };
    const assignToState = <T extends keyof BrowsePageState>(state: Pick<BrowsePageState, T>) => { Object.assign(initialState, state); };
    this.orderGames(true, assignToState);
    this.updateCurrentGameAndAddApps(assignToState);
    this.createNewGameIfClicked(false, assignToState);
    this.state = initialState;
  }

  componentDidMount() {
    this.props.central.games.on('change', this.onGamesCollectionChange);
  }

  componentWillUnmount() {
    this.props.central.games.removeListener('change', this.onGamesCollectionChange);
  }

  componentDidUpdate(prevProps: BrowsePageProps, prevState: BrowsePageState) {
    const { central, gameLibraryRoute, onSelectGame, selectedGame, selectedPlaylist } = this.props;
    const { isEditing, orderedGames, quickSearch } = this.state;
    this.orderGames();
    // Check if it ended editing
    if (!isEditing && prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: undefined });
    }
    // Check if it started editing
    if (isEditing && !prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: getSuggestions(central.games.collection) });
    }
    // Update current game and add-apps if the selected game changes
    if (selectedGame && selectedGame !== prevProps.selectedGame) {
      this.updateCurrentGameAndAddApps();
      this.setState({ isEditing: false });
    }
    // Update current game and add-apps if the selected game changes
    if (gameLibraryRoute === prevProps.gameLibraryRoute &&
        selectedPlaylist !== prevProps.selectedPlaylist) {
      this.setState({
        currentGame: undefined,
        currentAddApps: undefined,
        isNewGame: false,
        isEditing: false
      });
    }
    // Check if quick search string changed, and if it isn't empty
    if (prevState.quickSearch !== quickSearch && quickSearch !== '') {
      const games: IGameInfo[] = orderedGames;
      for (let index = 0; index < games.length; index++) {
        const game: IGameInfo = games[index];
        if (game.title.toLowerCase().startsWith(quickSearch)) {
          if (onSelectGame) { onSelectGame(game); }
          break;
        }
      }
    }
    // Create a new game if the "New Game" button is pushed
    this.createNewGameIfClicked(prevProps.wasNewGameClicked);
    // Check the library selection changed (and no game is selected)
    if (!selectedGame && gameLibraryRoute !== prevProps.gameLibraryRoute) {
      this.setState({
        currentGame: undefined,
        currentAddApps: undefined,
        isNewGame: false,
        isEditing: false
      });
    }
  }

  render() {
    const { selectedGame, selectedPlaylist } = this.props;
    const { draggedGame, orderedGames } = this.state;
    const currentLibrary = this.getCurrentLibrary();
    const order = this.props.order || BrowsePage.defaultOrder;
    const showSidebars: boolean = this.props.central.gamesDoneLoading;
    // Find the selected game in the selected playlist (if both are selected)
    let gamePlaylistEntry: IGamePlaylistEntry | undefined;
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
      <div
        className='game-browser'
        ref={this.gameBrowserRef}>
        <ResizableSidebar
          hide={this.props.preferencesData.browsePageShowLeftSidebar && showSidebars}
          divider='after'
          width={this.props.preferencesData.browsePageLeftSidebarWidth}
          onResize={this.onLeftSidebarResize}>
          <ConnectedLeftBrowseSidebar
            central={this.props.central}
            currentLibrary={currentLibrary}
            selectedPlaylistID={selectedPlaylist ? selectedPlaylist.id : ''}
            onSelectPlaylist={this.onLeftSidebarSelectPlaylist}
            onDeselectPlaylist={this.onLeftSidebarDeselectPlaylist}
            onPlaylistChanged={this.onLeftSidebarPlaylistChanged}
            onShowAllClick={this.onLeftSidebarShowAllClick} />
        </ResizableSidebar>
        <div
          className='game-browser__center'
          onKeyDown={this.onCenterKeyDown}>
          {(() => {
            if (this.props.gameLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = calcScale(350, this.props.gameScale);
              const width: number = (height * 0.666) | 0;
              return (
                <GameGrid
                  games={orderedGames}
                  selectedGame={selectedGame}
                  draggedGame={draggedGame}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRenderer}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenu}
                  onGameDragStart={this.onGameDragStart}
                  onGameDragEnd={this.onGameDragEnd}
                  orderBy={order.orderBy}
                  orderReverse={order.orderReverse}
                  cellWidth={width}
                  cellHeight={height}
                  gridRef={this.gameGridOrListRefFunc} />
              );
            } else {
              const height: number = calcScale(30, this.props.gameScale);
              return (
                <GameList
                  games={orderedGames}
                  selectedGame={selectedGame}
                  draggedGame={draggedGame}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRenderer}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenu}
                  onGameDragStart={this.onGameDragStart}
                  onGameDragEnd={this.onGameDragEnd}
                  orderBy={order.orderBy}
                  orderReverse={order.orderReverse}
                  rowHeight={height}
                  listRef={this.gameGridOrListRefFunc} />
              );
            }
          })()}
        </div>
        <ResizableSidebar
          hide={this.props.preferencesData.browsePageShowRightSidebar && showSidebars}
          divider='before'
          width={this.props.preferencesData.browsePageRightSidebarWidth}
          onResize={this.onRightSidebarResize}>
          <ConnectedRightBrowseSidebar
            currentGame={this.state.currentGame}
            currentAddApps={this.state.currentAddApps}
            currentLibrary={currentLibrary}
            gameImages={this.props.gameImages}
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
        </ResizableSidebar>
      </div>
    );
  }

  noRowsRenderer = (): JSX.Element => {
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

  onLeftSidebarSelectPlaylist = (playlist: IGamePlaylist): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch();              }
    if (onSelectPlaylist) { onSelectPlaylist(playlist); }
  }

  onLeftSidebarDeselectPlaylist = (): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch();               }
    if (onSelectPlaylist) { onSelectPlaylist(undefined); }
  }

  onLeftSidebarPlaylistChanged = (): void => {
    this.forceUpdate();
  }

  onLeftSidebarShowAllClick = (): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch();               }
    if (onSelectPlaylist) { onSelectPlaylist(undefined); }
    this.setState({
      isEditing: false,
      isNewGame: false,
      currentGame: undefined,
      currentAddApps: undefined
    });
  }

  onLeftSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageRightSidebarWidth;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    this.props.updatePreferences({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  onRightSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth;
    const targetWidth = event.startWidth + event.startX - event.event.clientX;
    this.props.updatePreferences({
      browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  getGameBrowserDivWidth(): number {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!this.gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(this.gameBrowserRef.current).width || '', 10);
  }

  onGameSelect = (game?: IGameInfo): void => {
    if (this.props.selectedGame !== game) {
      if (this.props.onSelectGame) { this.props.onSelectGame(game); }
    }
  }

  onGameLaunch = (game: IGameInfo): void => {
    const addApps = GameCollection.findAdditionalApplicationsByGameId(this.props.central.games.collection, game.id);
    GameLauncher.launchGame(game, addApps);
  }

  onGameContextMenu = (game: IGameInfo): void => {
    const template: MenuItemConstructorOptions[] = [];
    template.push({
      label: 'Open File Location',
      click: () => {
        // Extract the game's "entry"/"main" file path
        const gamePath = GameLauncher.getGamePath(game);
        if (gamePath !== undefined) {
          // Check if the file exists
          fs.exists(gamePath, exists => {
            if (exists) { remote.shell.showItemInFolder(gamePath); }
            else {
              remote.dialog.showMessageBox({
                type: 'warning',
                title: 'File not found!',
                message: 'Failed to find the game file.\n'+
                         'If you are using Flashpoint Infinity, make sure you download the game first.\n'+
                         '\n'+
                         `Path: "${gamePath}"\n`+
                         '\n'+
                         'Note: If the path is too long, some portion will be replaced with three dots ("...").',

              });
            }
          });
        } else {
          remote.dialog.showMessageBox({
            type: 'warning',
            title: 'No Path Found!',
            message: 'Failed to find a file path in the game\'s "launchCommand" field.\n'+
                     `Game: "${game.title}"`,
          });
        }
      },
      enabled: true
    });
    openContextMenu(template);
  }

  onCenterKeyDown = (event: React.KeyboardEvent): void => {
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

    /** Check if the current quick search has timed out (and should reset). */
    function updateTime(this: BrowsePage): boolean {
      const now: number = Date.now();
      const timedOut: boolean = (now - this._prevQuickSearchUpdate > BrowsePage.quickSearchTimeout);
      this._prevQuickSearchUpdate = now;
      return timedOut;
    }
  }

  onGameDragStart = (event: React.DragEvent, game: IGameInfo): void => {
    this.setState({ draggedGame: game });
    event.dataTransfer.setData(gameIdDataType, game.id);
  }

  onGameDragEnd = (event: React.DragEvent, game: IGameInfo): void => {
    this.setState({ draggedGame: undefined });
    event.dataTransfer.clearData(gameIdDataType);
  }

  onDeleteSelectedGame = (): void => {
    // Deselect the game
    if (this.props.onSelectGame) { this.props.onSelectGame(undefined); }
    // Reset the state related to the selected game
    this.setState({
      currentGame: undefined,
      currentAddApps: undefined,
      isNewGame: false,
      isEditing: false
    });
    // Focus the game grid/list
    this.focusGameGridOrList();
  }

  onRemoveSelectedGameFromPlaylist = (): void => {
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
    // Remove the game from the playlist and save the change
    playlist.games.splice(index, 1); // Remove game entry
    this.props.central.playlists.save(playlist);
    // Update games grid/list
    this.orderGames(true);
    // Deselect the game
    if (this.props.onSelectGame) { this.props.onSelectGame(undefined); }
    // Reset the state related to the selected game
    this.setState({
      currentGame: undefined,
      currentAddApps: undefined,
      isNewGame: false,
      isEditing: false
    });
  }

  onEditPlaylistNotes = (text: string): void => {
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

  /** Replace the "current game" with the selected game (in the appropriate circumstances) */
  updateCurrentGameAndAddApps(cb: (state: StateCallback2) => void = this.boundSetState): void {
    const { central, selectedGame } = this.props;
    if (selectedGame) { // (If the selected game changes, discard the current game and use that instead)
      // Find additional applications for the selected game (if any)
      let addApps = GameCollection.findAdditionalApplicationsByGameId(central.games.collection, selectedGame.id);
      // Update State
      cb({
        currentGame: selectedGame && GameInfo.duplicate(selectedGame),
        currentAddApps: addApps && addApps.map(AdditionalApplicationInfo.duplicate),
        isNewGame: false,
      });
    }
  }

  onStartEditClick = (): void => {
    this.setState({ isEditing: true });
  }

  onDiscardEditClick = (): void => {
    const { currentAddApps, currentGame, isNewGame } = this.state;
    this.setState({
      isEditing: false,
      isNewGame: false,
      currentGame:    isNewGame ? undefined : currentGame,
      currentAddApps: isNewGame ? undefined : currentAddApps,
    });
    this.focusGameGridOrList();
  }

  onSaveEditClick = (): void => {
    this.saveGameAndAddApps();
    this.setState({
      isEditing: false,
      isNewGame: false
    });
    this.focusGameGridOrList();
  }

  saveGameAndAddApps(): void {
    const { selectedGame, central: { games } } = this.props;
    const { currentGame, currentAddApps } = this.state;
    if (!currentGame) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    // Get the current library
    const library = this.getCurrentLibrary();
    // Add or update game
    console.time('save');
    games.addOrUpdateGame({
      game: currentGame,
      addApps: currentAddApps,
      library: library,
      saveToFile: true,
    })
    .then(() => { console.timeEnd('save'); });
    // If a new game was created, select the new game
    if ((selectedGame && selectedGame.id) !== currentGame.id) {
      // Get the platform the game is added to or updated
      const libraryPrefix = (library && library.prefix) ? library.prefix : '';
      const platform = games.getPlatformOfGame(currentGame, libraryPrefix) ||
                       games.createOrGetUnknownPlatform(libraryPrefix);
      // Try selecting the new game
      if (!platform.collection) { throw new Error('Platform collection is missing.'); }
      if (this.props.onSelectGame) { this.props.onSelectGame(platform.collection.findGame(currentGame.id)); }
    }
  }

  getCurrentLibrary(): IGameLibraryFileItem|undefined {
    if (this.props.libraryData) {
      const route = this.props.gameLibraryRoute;
      return this.props.libraryData.libraries.find(item => item.route === route);
    }
    return undefined;
  }

  /** Find all the games for the current library - undefined if no library is selected */
  getCurrentLibraryGames(): IGameInfo[]|undefined {
    const currentLibrary = this.getCurrentLibrary();
    if (currentLibrary) {
      let games: IGameInfo[] = [];
      const allPlatforms = this.props.central.games.listPlatforms();
      if (currentLibrary.default) {
        // Find all platforms "used" by other libraries
        const usedPlatforms: GameManagerPlatform[] = [];
        this.props.libraryData.libraries.forEach(library => {
          if (library === currentLibrary) { return; }
          if (library.prefix) {
            const prefix = library.prefix;
            allPlatforms.forEach(platform => {
              if (platform.filename.startsWith(prefix)) { usedPlatforms.push(platform); }
            });
          }
        });
        // Get all games from all platforms that are not "used" by other libraries
        const unusedPlatforms = allPlatforms.filter(platform => usedPlatforms.indexOf(platform) === -1);
        unusedPlatforms.forEach(platform => {
          if (platform.collection) {
            Array.prototype.push.apply(games, platform.collection.games);
          }
        });
      } else if (currentLibrary.prefix) {
        const prefix = currentLibrary.prefix;
        const platforms = allPlatforms.filter(platform => platform.filename.startsWith(prefix));
        platforms.forEach(platform => {
          if (platform.collection) {
            Array.prototype.push.apply(games, platform.collection.games);
          }
        });
      }
      return games;
    }
    return undefined;
  }

  /**
   * Update the ordered games array if the related props, configs or preferences has been changed
   * @param force If checking for changes in the arguments should be skipped (it always re-orders the games)
   */
  orderGames(force: boolean = false, cb: (state: StateCallback0) => void = this.boundSetState): void {
    const args = {
      games: this.getCurrentLibraryGames() || this.props.central.games.collection.games,
      search: this.props.search ? this.props.search.text : '',
      extreme: !window.External.config.data.disableExtremeGames &&
               this.props.preferencesData.browsePageShowExtreme,
      broken: window.External.config.data.showBrokenGames,
      playlist: this.props.selectedPlaylist,
      platforms: undefined,
      order: this.props.order || BrowsePage.defaultOrder,
    };
    if (force || !checkOrderGamesArgsEqual(args, this.state.orderedGamesArgs)) {
      cb({
        orderedGames: orderGames(args),
        orderedGamesArgs: args,
      });
    }
  }

  onGamesCollectionChange = (): void => {
    this.orderGames(true);
  }

  /** Create a new game if the "New Game" button was clicked */
  createNewGameIfClicked(prevWasNewGameClicked: boolean, cb: (state: StateCallback1) => void = this.boundSetState): void {
    const { wasNewGameClicked } = this.props;
    // Create a new game if the "New Game" button is pushed
    if (wasNewGameClicked && !prevWasNewGameClicked) {
      const newGame = GameInfo.create();
      newGame.id = uuid();
      newGame.dateAdded = formatDate(new Date());
      cb({
        currentGame: newGame,
        currentAddApps: [],
        isEditing: true,
        isNewGame: true,
      });
    }
  }

  /** Focus the game grid/list (if this has a reference to one). */
  focusGameGridOrList() {
    // Focus the game grid/list (to make the keyboard inputs work)
    setTimeout(() => {
      if (this.gameGridOrListRef) { this.gameGridOrListRef.focus(); }
    }, 0);
  }

  gameGridOrListRefFunc = (ref: HTMLDivElement | null): void => {
    this.gameGridOrListRef = ref;
  }

  static defaultOrder: Readonly<GameOrderChangeEvent> = {
    orderBy: 'title',
    orderReverse: 'ascending',
  }
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}

function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

/**
 * Check if two sets of "order games arguments" will produce the same games in the same order
 * (This is not an exhaustive test, as it does not check the contents of the games array)
 */
function checkOrderGamesArgsEqual(args1: IOrderGamesArgs, args2?: IOrderGamesArgs): boolean {
  if (!args2)                            { return false; }
  if (args1.search   !== args2.search)   { return false; }
  if (args1.extreme  !== args2.extreme)  { return false; }
  if (args1.broken   !== args2.broken)   { return false; }
  if (args1.playlist !== args2.playlist) { return false; }
  if (args1.order    !== args2.order)    { return false; }
  if (!checkIfArraysAreEqual(args1.platforms, args2.platforms)) { return false; }
  if (!checkIfArraysAreEqual(args1.games, args2.games)) { return false; }
  return true;
}

/** Check if two arrays are of equal length and contains the exact same items in the same order */
function checkIfArraysAreEqual(a: any[]|undefined, b: any[]|undefined): boolean {
  if (a === b) { return true; }
  if (!a || !b) { return false; }
  if (a.length !== b.length) { return false; }
  for (let i = a.length; i >= 0; i--) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}
