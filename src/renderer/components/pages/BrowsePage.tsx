import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as React from 'react';
import { BackIn, BackOut, GetGameData, WrappedResponse, GetGameResponseData } from '../../../shared/back/types';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { GameInfo } from '../../../shared/game/GameInfo';
import { IAdditionalApplicationInfo, IGameInfo } from '../../../shared/game/interfaces';
import { LangContainer } from '../../../shared/lang';
import { memoizeOne } from '../../../shared/memoize';
import { updatePreferencesData } from '../../../shared/preferences/util';
import { formatDate } from '../../../shared/Util';
import { formatString } from '../../../shared/utils/StringFormatter';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { ConnectedRightBrowseSidebar } from '../../containers/ConnectedRightBrowseSidebar';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { GameImageCollection } from '../../image/GameImageCollection';
import { CentralState, GAMES, SUGGESTIONS } from '../../interfaces';
import { GamePlaylist, GamePlaylistEntry } from '../../playlist/types';
import { SearchQuery } from '../../store/search';
import { gameIdDataType, gameScaleSpan } from '../../Util';
import { LangContext } from '../../util/lang';
import { uuid } from '../../uuid';
import { GameGrid } from '../GameGrid';
import { GameList } from '../GameList';
import { GameOrderChangeEvent } from '../GameOrder';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';

type Pick<T, K extends keyof T> = { [P in K]: T[P]; };
type StateCallback1 = Pick<BrowsePageState, 'currentGame'|'currentAddApps'|'isEditing'|'isNewGame'>;
type StateCallback2 = Pick<BrowsePageState, 'currentGame'|'currentAddApps'|'isNewGame'>;

type OwnProps = {
  games: GAMES | undefined;
  gamesTotal: number;
  playlists: GamePlaylist[];
  suggestions: SUGGESTIONS;
  save: (game: IGameInfo, addApps: IAdditionalApplicationInfo[] | undefined, saveToFile: boolean) => void;
  launchGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  onRequestGames: (start: number, end: number) => void;
  onLaunchAddApp: (addAppId: string) => void;

  onDeletePlaylist: (playlistId: string) => void;
  onSavePlaylist: (playlistId: string, edit: GamePlaylist) => void;
  onCreatePlaylist: () => void;

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
  selectedGameId?: string;
  /** Currently selected playlist (if any). */
  selectedPlaylistId?: string;
  /** Called when a game is selected. */
  onSelectGame: (gameId?: string) => void;
  /** Called when a playlist is selected. */
  onSelectPlaylist?: (playlist?: GamePlaylist) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** "Route" of the currently selected library (empty string means no library). */
  gameLibrary: string;
};

export type BrowsePageProps = OwnProps & WithPreferencesProps;

export type BrowsePageState = {
  /** Current quick search string (used to jump to a game in the list, not to filter the list). */
  quickSearch: string;
  /** Currently dragged game (if any). */
  draggedGameId?: string;
  /** Buffer for the selected game (all changes are made to the game until saved). */
  currentGame?: IGameInfo;
  /** Buffer for the selected games additional applications (all changes are made to this until saved). */
  currentAddApps?: IAdditionalApplicationInfo[];
  /** If the "edit mode" is currently enabled. */
  isEditing: boolean;
  /** If the selected game is a new game being created. */
  isNewGame: boolean;
};

export interface BrowsePage {
  context: LangContainer;
}

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
      isEditing: false,
      isNewGame: false
    };
    const assignToState = <T extends keyof BrowsePageState>(state: Pick<BrowsePageState, T>) => { Object.assign(initialState, state); };
    this.updateCurrentGameAndAddApps(assignToState);
    this.createNewGameIfClicked(false, assignToState);
    this.state = initialState;
  }

  componentDidUpdate(prevProps: BrowsePageProps, prevState: BrowsePageState) {
    const { gameLibrary, onSelectGame, selectedGameId, selectedPlaylistId } = this.props;
    const { isEditing, quickSearch } = this.state;
    // Check if it ended editing
    if (!isEditing && prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      // this.setState({ suggestions: undefined });
    }
    // Check if it started editing
    if (isEditing && !prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      // this.setState({ suggestions: getSuggestions(central.games.listPlatforms(), libraryData.libraries) }); @FIXTHIS
    }
    // Update current game and add-apps if the selected game changes
    if (selectedGameId && selectedGameId !== prevProps.selectedGameId) {
      this.updateCurrentGameAndAddApps();
      this.setState({ isEditing: false });
    }
    // Update current game and add-apps if the selected game changes
    if (gameLibrary === prevProps.gameLibrary &&
        selectedPlaylistId !== prevProps.selectedPlaylistId) {
      this.setState({
        currentGame: undefined,
        currentAddApps: undefined,
        isNewGame: false,
        isEditing: false
      });
    }
    // Check if quick search string changed, and if it isn't empty
    if (prevState.quickSearch !== quickSearch && quickSearch !== '') {
      // @FIXTHIS Quick search will require its own API perhaps
      /*
      for (let index = 0; index < this.props.games.length; index++) {
        const game: IGameInfo = this.props.games[index];
        if (game.title.toLowerCase().startsWith(quickSearch)) {
          if (onSelectGame) { onSelectGame(game); }
          break;
        }
      }
      */
    }
    // Create a new game if the "New Game" button is pushed
    this.createNewGameIfClicked(prevProps.wasNewGameClicked);
    // Check the library selection changed (and no game is selected)
    if (!selectedGameId && gameLibrary !== prevProps.gameLibrary) {
      this.setState({
        currentGame: undefined,
        currentAddApps: undefined,
        isNewGame: false,
        isEditing: false
      });
    }
  }

  render() {
    const strings = this.context;
    const { games, selectedGameId: selectedGame, selectedPlaylistId } = this.props;
    const { draggedGameId } = this.state;
    const order = this.props.order || BrowsePage.defaultOrder;
    // Find the selected game in the selected playlist (if both are selected)
    let gamePlaylistEntry: GamePlaylistEntry | undefined;
    /*
    if (selectedPlaylist && selectedGame) {
      for (let gameEntry of selectedPlaylist.games) {
        if (gameEntry.id === selectedGame.id) {
          gamePlaylistEntry = gameEntry;
          break;
        }
      }
    }
    */
    // Render
    return (
      <div
        className='game-browser'
        ref={this.gameBrowserRef}>
        <ResizableSidebar
          hide={this.props.preferencesData.browsePageShowLeftSidebar}
          divider='after'
          width={this.props.preferencesData.browsePageLeftSidebarWidth}
          onResize={this.onLeftSidebarResize}>
          <ConnectedLeftBrowseSidebar
            onDelete={this.props.onDeletePlaylist}
            onSave={this.props.onSavePlaylist}
            onCreate={this.props.onCreatePlaylist}
            currentLibrary={this.props.gameLibrary}
            playlists={this.props.playlists}
            selectedPlaylistID={selectedPlaylistId || ''}
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
                  games={games}
                  gamesTotal={this.props.gamesTotal}
                  selectedGameId={selectedGame}
                  draggedGameId={draggedGameId}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings.menu)}
                  onGameDragStart={this.onGameDragStart}
                  onGameDragEnd={this.onGameDragEnd}
                  onRequestGames={this.props.onRequestGames}
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
                  games={games}
                  gamesTotal={this.props.gamesTotal}
                  selectedGameId={selectedGame}
                  draggedGameId={draggedGameId}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings.menu)}
                  onGameDragStart={this.onGameDragStart}
                  onGameDragEnd={this.onGameDragEnd}
                  onRequestGames={this.props.onRequestGames}
                  orderBy={order.orderBy}
                  orderReverse={order.orderReverse}
                  rowHeight={height}
                  listRef={this.gameGridOrListRefFunc} />
              );
            }
          })()}
        </div>
        <ResizableSidebar
          hide={this.props.preferencesData.browsePageShowRightSidebar}
          divider='before'
          width={this.props.preferencesData.browsePageRightSidebarWidth}
          onResize={this.onRightSidebarResize}>
          <ConnectedRightBrowseSidebar
            currentGame={this.state.currentGame}
            currentAddApps={this.state.currentAddApps}
            currentLibrary={this.props.gameLibrary}
            gameImages={this.props.gameImages}
            onDeleteSelectedGame={this.onDeleteSelectedGame}
            onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
            onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
            onEditPlaylistNotes={this.onEditPlaylistNotes}
            onLaunchAddApp={this.props.onLaunchAddApp}
            gamePlaylistEntry={gamePlaylistEntry}
            isEditing={this.state.isEditing}
            isNewGame={this.state.isNewGame}
            onEditClick={this.onStartEditClick}
            onDiscardClick={this.onDiscardEditClick}
            onSaveGame={this.onSaveEditClick}
            suggestions={this.props.suggestions} />
        </ResizableSidebar>
      </div>
    );
  }

  private noRowsRendererMemo = memoizeOne((strings: LangContainer['browse']) => {
    return () => (
      <div className='game-list__no-games'>
        { this.props.selectedPlaylistId ? (
          /* Empty Playlist */
          <>
            <h2 className='game-list__no-games__title'>{strings.emptyPlaylist}</h2>
            <br/>
            <p>{formatString(strings.dropGameOnLeft, <i>{strings.leftSidebar}</i>)}</p>
          </>
        ) : (
          /* No games found */
          <>
            <h1 className='game-list__no-games__title'>{strings.noGamesFound}</h1>
            <br/>
            { (this.props.gamesTotal > 0) ? (
              <>
                {strings.noGameMatchedDesc}
                <br/>
                {strings.noGameMatchedSearch}
              </>
            ) : (
              <>{strings.thereAreNoGames}</>
            ) }
          </>
        ) }
      </div>
    );
  });

  private onGameContextMenuMemo = memoizeOne((strings: LangContainer['menu']) => {
    return (gameId: string) => {
      return (
        openContextMenu([{
          label: strings.openFileLocation,
          // @TODO Open the file location
        }, {
          type: 'separator'
        }, {
          label: strings.duplicateMetaOnly,
          // @TODO Duplicate the game
          enabled: this.props.preferencesData.enableEditing,
        }, {
          label: strings.duplicateMetaAndImages, // ("&&" will be shown as "&")
          // @TODO Duplicate the game and images
          enabled: this.props.preferencesData.enableEditing,
        }, {
          type: 'separator'
        }, {
          label: strings.exportMetaOnly,
          // @TODO Export meta
        }, {
          label: strings.exportMetaAndImages, // ("&&" will be shown as "&")
          // @TODO Export meta and images
        }])
      );
    };
  });

  onLeftSidebarSelectPlaylist = (playlist: GamePlaylist): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch();              }
    if (onSelectPlaylist) { onSelectPlaylist(playlist); }
  }

  onLeftSidebarDeselectPlaylist = (): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch();               }
    if (onSelectPlaylist) { onSelectPlaylist(undefined); }
  }

  /** Deselect without clearing search (Right sidebar will search itself) */
  onRightSidebarDeselectPlaylist = (): void => {
    const { onSelectPlaylist } = this.props;
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
    updatePreferencesData({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  onRightSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth;
    const targetWidth = event.startWidth + event.startX - event.event.clientX;
    updatePreferencesData({
      browsePageRightSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  getGameBrowserDivWidth(): number {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!this.gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(this.gameBrowserRef.current).width || '', 10);
  }

  onGameSelect = (gameId?: string): void => {
    if (this.props.selectedGameId !== gameId) {
      this.props.onSelectGame(gameId);
    }
  }

  onGameLaunch = (gameId: string): void => {
    this.props.launchGame(gameId);
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

  onGameDragStart = (event: React.DragEvent, gameId: string): void => {
    this.setState({ draggedGameId: gameId });
    event.dataTransfer.setData(gameIdDataType, gameId);
  }

  onGameDragEnd = (event: React.DragEvent, gameId: string): void => {
    this.setState({ draggedGameId: undefined });
    event.dataTransfer.clearData(gameIdDataType);
  }

  onDeleteSelectedGame = (): void => {
    // Delete the game
    if (this.props.selectedGameId) { this.props.deleteGame(this.props.selectedGameId); }
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
    const playlist = this.props.selectedPlaylistId;
    const gameId = this.props.selectedGameId;
    if (!playlist) { throw new Error('Unable to remove game from selected playlist - No playlist is selected'); }
    if (!gameId)   { throw new Error('Unable to remove game from selected playlist - No game is selected'); }
    // Find the game entry (of the selected game) in the playlist
    /*
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
    */
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
    /*
    const playlist = this.props.selectedPlaylistId;
    const game = this.props.selectedGameId;
    if (!playlist) { throw new Error('Unable to remove game from selected playlist - No playlist is selected'); }
    if (!game)     { throw new Error('Unable to remove game from selected playlist - No game is selected'); }
    // Find the game entry (of the selected game) in the playlist
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
    */
  }

  /** Replace the "current game" with the selected game (in the appropriate circumstances) */
  async updateCurrentGameAndAddApps(cb: (state: StateCallback2) => void = this.boundSetState): Promise<void> {
    const gameId = this.props.selectedGameId;
    if (gameId !== undefined) {
      window.External.back.send<GetGameResponseData, GetGameData>(BackIn.GET_GAME, { id: gameId }, res => {
        if (res.data) {
          if (res.data.game) {
            cb({
              currentGame: res.data.game,
              currentAddApps: res.data.addApps || [],
              isNewGame: false,
            });
          } else { console.log(`Failed to get game. Game is undefined (GameID: "${gameId}").`); }
        } else { console.log(`Failed to get game. Empty data in response (GameID: "${gameId}").`); }
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
    const { currentGame, currentAddApps } = this.state;
    if (!currentGame) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    this.props.save(currentGame, currentAddApps, true);
    this.setState({
      isEditing: false,
      isNewGame: false
    });
    this.focusGameGridOrList();
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

  static contextType = LangContext;
}

function calcScale(defHeight: number, scale: number): number {
  return (defHeight + (scale - 0.5) * 2 * defHeight * gameScaleSpan) | 0;
}

function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

/* Check if two arrays are have strictly equal items (or if both are undefined). */
function checkIfArraysAreEqual(a: any[] | undefined, b: any[] | undefined): boolean {
  // Check if both arguments point to the same array (or if both are undefined)
  if (a === b) { return true; }
  // Check if either array is undefined
  if (!a || !b) { return false; }
  // Check if the arrays are of different lengths
  if (a.length !== b.length) { return false; }
  // Check if any of the items (with the same indices) in the arrays are not strictly equal
  for (let i = a.length; i >= 0; i--) {
    if (a[i] !== b[i]) { return false; }
  }
  // The arrays are equal
  return true;
}
