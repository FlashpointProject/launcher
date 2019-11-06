import * as electron from 'electron';
import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { BackOut, WrappedResponse } from '../../../shared/back/types';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { AdditionalApplicationInfo } from '../../../shared/game/AdditionalApplicationInfo';
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
import { stringifyCurationFormat } from '../../curate/format/stringifier';
import { convertToCurationMeta } from '../../curate/metaToMeta';
import { GameManager } from '../../game/GameManager';
import { GameLauncher } from '../../GameLauncher';
import { GameImageCollection } from '../../image/GameImageCollection';
import { getImageFolderName } from '../../image/util';
import { CentralState, GAMES, SUGGESTIONS } from '../../interfaces';
import { GamePlaylist, GamePlaylistEntry } from '../../playlist/types';
import { SearchQuery } from '../../store/search';
import { gameIdDataType, gameScaleSpan, getFileExtension } from '../../Util';
import { copyGameImageFile } from '../../util/game';
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
  games: GAMES;
  gamesTotal: number;
  playlists: GamePlaylist[];
  suggestions: SUGGESTIONS;
  save: (game: IGameInfo, addApps: IAdditionalApplicationInfo[] | undefined, saveToFile: boolean) => void;
  launchGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
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
  selectedPlaylist?: GamePlaylist;
  /** Called when a game is selected. */
  onSelectGame?: (game?: IGameInfo) => void;
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
  draggedGame?: IGameInfo;
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

  componentDidMount() {
    window.External.back.on('response', this.onMessage);
  }

  componentWillUnmount() {
    window.External.back.removeListener('response', this.onMessage);
  }

  componentDidUpdate(prevProps: BrowsePageProps, prevState: BrowsePageState) {
    const { central, gameLibrary: gameLibraryRoute, onSelectGame, selectedGame, selectedPlaylist } = this.props;
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
    if (selectedGame && selectedGame !== prevProps.selectedGame) {
      this.updateCurrentGameAndAddApps();
      this.setState({ isEditing: false });
    }
    // Update current game and add-apps if the selected game changes
    if (gameLibraryRoute === prevProps.gameLibrary &&
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
      // @FIXTHIS Quick search will require its own API perhaps
      for (let index = 0; index < this.props.games.length; index++) {
        const game: IGameInfo = this.props.games[index];
        if (game.title.toLowerCase().startsWith(quickSearch)) {
          if (onSelectGame) { onSelectGame(game); }
          break;
        }
      }
    }
    // Create a new game if the "New Game" button is pushed
    this.createNewGameIfClicked(prevProps.wasNewGameClicked);
    // Check the library selection changed (and no game is selected)
    if (!selectedGame && gameLibraryRoute !== prevProps.gameLibrary) {
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
    const { games, gamesTotal, selectedGame, selectedPlaylist } = this.props;
    const { draggedGame } = this.state;
    const order = this.props.order || BrowsePage.defaultOrder;
    // Find the selected game in the selected playlist (if both are selected)
    let gamePlaylistEntry: GamePlaylistEntry | undefined;
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
          hide={this.props.preferencesData.browsePageShowLeftSidebar}
          divider='after'
          width={this.props.preferencesData.browsePageLeftSidebarWidth}
          onResize={this.onLeftSidebarResize}>
          <ConnectedLeftBrowseSidebar
            central={this.props.central}
            currentLibrary={this.props.gameLibrary}
            playlists={this.props.playlists}
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
                  games={games}
                  gamesTotal={gamesTotal}
                  selectedGame={selectedGame}
                  draggedGame={draggedGame}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings.menu)}
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
                  games={games}
                  gamesTotal={gamesTotal}
                  selectedGame={selectedGame}
                  draggedGame={draggedGame}
                  gameImages={this.props.gameImages}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings.menu)}
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
        { this.props.selectedPlaylist ? (
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
    return (game: IGameInfo) => {
      return (
        openContextMenu([{
          label: strings.openFileLocation,
          click: this.openFileLocationCallback(game)
        }, {
          type: 'separator'
        }, {
          label: strings.duplicateMetaOnly,
          click: this.duplicateCallback(game, false),
          enabled: this.props.preferencesData.enableEditing,
        }, {
          label: strings.duplicateMetaAndImages, // ("&&" will be shown as "&")
          click: this.duplicateCallback(game, true),
          enabled: this.props.preferencesData.enableEditing,
        }, {
          type: 'separator'
        }, {
          label: strings.exportMetaOnly,
          click: this.exportMetaCallback(game)
        }, {
          label: strings.exportMetaAndImages, // ("&&" will be shown as "&")
          click: this.exportMetaAndImagesCallback(game)
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

  onGameSelect = (game?: IGameInfo): void => {
    if (this.props.selectedGame !== game) {
      if (this.props.onSelectGame) { this.props.onSelectGame(game); }
    }
  }

  onGameLaunch = (game: IGameInfo): void => {
    this.props.launchGame(game.id);
  }

  /** Create a callback for opening the file location of a game. */
  openFileLocationCallback(game: IGameInfo) {
    return () => {
      // Extract the game's "entry"/"main" file path
      const gamePath = GameLauncher.getGamePath(game);
      if (gamePath !== undefined) {
        // Check if the file exists
        fs.exists(gamePath, exists => {
          if (exists) { remote.shell.showItemInFolder(gamePath); }
          else {
            remote.dialog.showMessageBox({
              type: 'warning',
              title: this.context.dialog.fileNotFound,
              message: 'Failed to find the game file.\n'+
                        'If you are using Flashpoint Infinity, make sure you download the game first.\n'+
                        '\n'+
                        `Path: "${gamePath}"\n`+
                        '\n'+
                        'Note: If the path is too long, some portion will be replaced with three dots ("...").',
              buttons: ['Ok'],
            });
          }
        });
      } else {
        remote.dialog.showMessageBox({
          type: 'warning',
          title: this.context.dialog.pathNotFound,
          message: 'Failed to find a file path in the game\'s "launchCommand" field.\n'+
                    `Game: "${game.title}"`,
          buttons: ['Ok'],
        });
      }
    };
  }

  /**
   * Create a callback for duplicating a game and its additional applications.
   * @param game Game to duplicate.
   * @param copyImages If the games images should also be copied.
   */
  duplicateCallback(game: IGameInfo, copyImages: boolean = false) {
    return async () => {
      const res = await GameManager.fetchGame(game.id);
      const addApps = res.addApps;
      // Duplicate game and add-apps
      const newGame = GameInfo.duplicate(game);
      const newAddApps = addApps.map(addApp => AdditionalApplicationInfo.duplicate(addApp));
      // Generate new IDs for the game and add-apps
      newGame.id = uuid();
      for (let addApp of newAddApps) {
        addApp.id = uuid();
        addApp.gameId = newGame.id;
      }
      // Copy images
      if (copyImages) {
        const imageFolder = getImageFolderName(game);
        // Copy screenshot
        const screenshotPath = this.props.gameImages.getScreenshotPath(game);
        if (screenshotPath) {
          const cache = this.props.gameImages.getScreenshotCache(imageFolder);
          if (cache) { copyGameImageFile(screenshotPath, newGame, cache); }
        }
        // Copy thumbnail
        const thumbnailPath = this.props.gameImages.getThumbnailPath(game);
        if (thumbnailPath) {
          const cache = this.props.gameImages.getThumbnailCache(imageFolder);
          if (cache) { copyGameImageFile(thumbnailPath, newGame, cache); }
        }
      }
      // Add game and add-apps
      GameManager.updateMeta({
        games: [newGame],
        addApps: newAddApps,
        saveToDisk: true,
      });
    };
  }

  /** Create a callback for exporting the meta of a game (as a curation format meta file). */
  exportMetaCallback(game: IGameInfo) {
    return async () => {
      const res = await GameManager.fetchGame(game.id);
      const addApps = res.addApps;
      // Choose where to save the file
      const filePath = electron.remote.dialog.showSaveDialogSync({
        title: this.context.dialog.selectFileToExportMeta,
        defaultPath: 'meta',
        filters: [{
          name: 'Meta file',
          extensions: ['txt'],
        }]
      });
      if (filePath) {
        fs.ensureDir(path.dirname(filePath))
        .then(() => {
          const meta = stringifyCurationFormat(convertToCurationMeta(game, addApps));
          fs.writeFile(filePath, meta);
        });
      }
    };
  }

  /** Create a callback for exporting the meta and images of a game (as a curation format meta file and image files). */
  exportMetaAndImagesCallback(game: IGameInfo) {
    const strings = this.context.dialog;
    return async () => {
      const res = await GameManager.fetchGame(game.id);
      const addApps = res.addApps;
      // Choose where to save the file
      const filePaths = window.External.showOpenDialogSync({
        title: strings.selectFolderToExportMetaAndImages,
        properties: ['promptToCreate', 'openDirectory']
      });
      if (filePaths && filePaths.length > 0) {
        const filePath = filePaths[0];
        // Get image paths
        const screenPath = this.props.gameImages.getScreenshotPath(game);
        const thumbPath = this.props.gameImages.getThumbnailPath(game);
        // Create dest paths
        const metaPath = path.join(filePath,'meta.txt');
        const ssPath   = path.join(filePath,'ss'   + getFileExtension(screenPath || ''));
        const logoPath = path.join(filePath,'logo' + getFileExtension(thumbPath  || ''));
        // Check if files already exists
        const exists = [
          fs.pathExistsSync(metaPath),
          screenPath ? fs.pathExistsSync(ssPath)   : false,
          thumbPath  ? fs.pathExistsSync(logoPath) : false,
        ];
        if (exists.some(val => val)) { // (One or more of the files already exists)
          const result = electron.remote.dialog.showMessageBoxSync({
            type: 'warning',
            title: strings.replaceFilesQuestion,
            message: strings.exportedAlreadyExistsYesNo,
            buttons: ['Yes', 'No'],
            defaultId: 0,
          });
          if (result !== 0) { return; } // (Abort)
        }
        // Export files
        fs.ensureDir(filePath)
        .then(() => {
          Promise.all([
            (async () => {
              const meta = stringifyCurationFormat(convertToCurationMeta(game, addApps));
              await fs.writeFile(metaPath, meta);
            })(),
            screenPath ? fs.copyFile(screenPath, ssPath)   : undefined,
            thumbPath  ? fs.copyFile(thumbPath,  logoPath) : undefined,
          ]);
        });
      }
    };
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
    // Delete the game
    if (this.props.selectedGame) { this.props.deleteGame(this.props.selectedGame.id); }
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
  async updateCurrentGameAndAddApps(cb: (state: StateCallback2) => void = this.boundSetState): Promise<void> {
    const { selectedGame } = this.props;
    if (selectedGame) { // (If the selected game changes, discard the current game and use that instead)
      // Find additional applications for the selected game (if any)
      const res = await GameManager.fetchGame(selectedGame.id);
      const addApps = res.addApps;
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

  onMessage = async (res: WrappedResponse): Promise<void> => {
    if (res.type in [BackOut.REMOVE_GAMEAPP_RESPONSE, BackOut.UPDATE_META_RESPONSE, BackOut.UPDATE_PREFERENCES_RESPONSE]) {
      // @TODO Re-search games
      this.forceUpdate();
    }
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
