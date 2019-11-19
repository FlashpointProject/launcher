import * as electron from 'electron';
import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as React from 'react';
import { promisify } from 'util';
import * as YAML from 'yaml';
import { BrowsePageLayout } from '../../../shared/BrowsePageLayout';
import { AdditionalApplicationInfo } from '../../../shared/game/AdditionalApplicationInfo';
import { filterAndOrderGames, FilterAndOrderGamesOpts } from '../../../shared/game/GameFilter';
import { GameInfo } from '../../../shared/game/GameInfo';
import { IAdditionalApplicationInfo, IGameInfo } from '../../../shared/game/interfaces';
import { LangContainer } from '../../../shared/lang';
import { GameLibraryFileItem } from '../../../shared/library/types';
import { memoizeOne } from '../../../shared/memoize';
import { updatePreferencesData } from '../../../shared/preferences/util';
import { formatDate } from '../../../shared/Util';
import { formatString } from '../../../shared/utils/StringFormatter';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { ConnectedRightBrowseSidebar } from '../../containers/ConnectedRightBrowseSidebar';
import { WithLibraryProps } from '../../containers/withLibrary';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { convertToCurationMeta } from '../../curate/metaToMeta';
import GameManagerPlatform from '../../game/GameManagerPlatform';
import { GameLauncher } from '../../GameLauncher';
import { GameImageCollection } from '../../image/GameImageCollection';
import { getImageFolderName } from '../../image/util';
import { CentralState } from '../../interfaces';
import { GamePlaylist, GamePlaylistEntry } from '../../playlist/types';
import { SearchQuery } from '../../store/search';
import { gameIdDataType, gameScaleSpan, getFileExtension } from '../../Util';
import { copyGameImageFile } from '../../util/game';
import { LangContext } from '../../util/lang';
import { GamePropSuggestions, getSuggestions } from '../../util/suggestions';
import { uuid } from '../../uuid';
import { GameGrid } from '../GameGrid';
import { GameList } from '../GameList';
import { GameOrderChangeEvent } from '../GameOrder';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';

const writeFile = promisify(fs.writeFile);

type Pick<T, K extends keyof T> = { [P in K]: T[P]; };
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
  gameLibraryRoute: string;
};

export type BrowsePageProps = OwnProps & WithPreferencesProps & WithLibraryProps;

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
  /**
   * Suggestions for the different properties of a game (displayed while editing).
   * @TODO This should probably be memoized instead of being state.
   */
  suggestions?: Partial<GamePropSuggestions>;
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
    this.orderGames(true);
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
    const { central, gameLibraryRoute, libraryData, onSelectGame, selectedGame, selectedPlaylist } = this.props;
    const { isEditing, quickSearch } = this.state;
    // Check if it ended editing
    if (!isEditing && prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: undefined });
    }
    // Check if it started editing
    if (isEditing && !prevState.isEditing) {
      this.updateCurrentGameAndAddApps();
      this.setState({ suggestions: getSuggestions(central.games.listPlatforms(), libraryData.libraries) });
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
      const games: IGameInfo[] = this.orderGames();
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
    const strings = this.context;
    const { selectedGame, selectedPlaylist } = this.props;
    const { draggedGame } = this.state;
    const currentLibrary = this.getCurrentLibrary();
    const order = this.props.order || BrowsePage.defaultOrder;
    const showSidebars: boolean = this.props.central.gamesDoneLoading;
    const orderedGames = this.orderGames();
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
                  games={orderedGames}
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
            onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
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

  private noRowsRendererMemo = memoizeOne((strings: LangContainer['browse']) => {
    return () => (
      <div className='game-list__no-games'>
      { this.props.central.gamesDoneLoading ? (
        this.props.selectedPlaylist ? (
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
            {(this.props.central.gamesFailedLoading) ? (
              <>
                {formatString(strings.setFlashpointPathQuestion, <b>{strings.flashpointPath}</b>, <i>{strings.config}</i>)}
                <br/>
                {formatString(strings.noteSaveAndRestart, <b>'{strings.saveAndRestart}'</b>)}
              </>
            ) : (
              (this.props.central.games.collection.games.length > 0) ? (
                <>
                  {strings.noGameMatchedDesc}
                  <br/>
                  {strings.noGameMatchedSearch}
                </>
              ) : (
                <>{strings.thereAreNoGames}</>
              )
            )}
          </>
        )
      ) : (
        <p>{strings.loadingGames}</p>
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
    const maxWidth = (this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageRightSidebarWidth) - 5;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    updatePreferencesData({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  }

  onRightSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = (this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageLeftSidebarWidth) - 5;
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
    const addApps = this.props.central.games.collection.findAdditionalApplicationsByGameId(game.id);
    GameLauncher.launchGame(game, addApps);
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
    return () => {
      const addApps = this.props.central.games.collection.findAdditionalApplicationsByGameId(game.id);
      const library = this.getCurrentLibrary();
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
        const imageFolder = getImageFolderName(game, library && library.prefix || '', true);
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
      this.props.central.games.addOrUpdateGame({
        game: newGame,
        addApps: newAddApps,
        library: library,
        saveToFile: true,
      });
    };
  }

  /** Create a callback for exporting the meta of a game (as a curation format meta file). */
  exportMetaCallback(game: IGameInfo) {
    return () => {
      const addApps = this.props.central.games.collection.findAdditionalApplicationsByGameId(game.id);
      // Choose where to save the file
      const filePath = electron.remote.dialog.showSaveDialogSync({
        title: this.context.dialog.selectFileToExportMeta,
        defaultPath: 'meta',
        filters: [{
          name: 'Meta file',
          extensions: ['yaml'],
        }]
      });
      if (filePath) {
        fs.ensureDir(path.dirname(filePath))
        .then(() => {
          const meta = YAML.stringify(convertToCurationMeta(game, addApps));
          writeFile(filePath, meta);
        });
      }
    };
  }

  /** Create a callback for exporting the meta and images of a game (as a curation format meta file and image files). */
  exportMetaAndImagesCallback(game: IGameInfo) {
    const strings = this.context.dialog;
    return () => {
      const addApps = this.props.central.games.collection.findAdditionalApplicationsByGameId(game.id);
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
        const metaPath = path.join(filePath,'meta.yaml');
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
              const meta = YAML.stringify(convertToCurationMeta(game, addApps));
              await writeFile(metaPath, meta);
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
    // Re-order games (to include the new game)
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
      let addApps = central.games.collection.findAdditionalApplicationsByGameId(selectedGame.id);
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

  /** Get the current library (or undefined if there is none). */
  getCurrentLibrary(): GameLibraryFileItem | undefined {
    if (this.props.libraryData) {
      const route = this.props.gameLibraryRoute;
      return this.props.libraryData.libraries.find(item => item.route === route);
    }
    return undefined;
  }

  /**
   * Memoized wrapper around the "getLibraryGames" function, with an additional argument
   * that decides if the memoized value should be refreshed (even if the arguments are "equal").
   */
  getCurrentLibraryGames = memoizeOne(
    (args: GetLibraryGamesArgs, force?: boolean) => {
      return getLibraryGames(args);
    },
    (args1, args2) => {
      const [a, force] = args1;
      const [b]        = args2;
      // Check if this is "forced" to be updated
      if (force) { return false; }
      // Check if the argument objects are equal
      return (
        a.library === b.library &&
        checkIfArraysAreEqual(a.platforms, b.platforms) &&
        checkIfArraysAreEqual(a.libraries, b.libraries)
      );
    }
  );

  /** Memoized wrapper around the order games function. */
  orderGamesMemo = memoizeOne((games: IGameInfo[], opts: FilterAndOrderGamesOpts, force?: boolean): IGameInfo[] => {
    return filterAndOrderGames(games, opts);
  }, checkOrderGamesArgsEqual);

  /**
   * Order and filter the games according to the current settings.
   * @param force If the game should be re-ordered even if they seem to not have changed.
   */
  orderGames(force: boolean = false): IGameInfo[] {
    // Get the games to display for the current library
    const games = this.getCurrentLibraryGames({
      library: this.getCurrentLibrary(),
      platforms: this.props.central.games.listPlatforms(),
      libraries: this.props.libraryData.libraries
    }, force) || this.props.central.games.collection.games;
    // Get the order
    const order = this.props.order || BrowsePage.defaultOrder;
    // Order (and filter) the games according to the current settings
    return this.orderGamesMemo(games, {
      search: this.props.search ? this.props.search.text : '',
      extreme: !window.External.config.data.disableExtremeGames &&
               this.props.preferencesData.browsePageShowExtreme,
      broken: window.External.config.data.showBrokenGames,
      playlist: this.props.selectedPlaylist,
      platforms: undefined,
      orderBy: order.orderBy,
      orderReverse: order.orderReverse,
    }, force);
  }

  onGamesCollectionChange = (): void => {
    // Re-order games if a game was changed
    this.orderGames(true);
    this.forceUpdate();
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

type GetLibraryGamesArgs = {
  /** Library that the games belong to (if undefined, all games should be shown). */
  library?: GameLibraryFileItem;
  /** All platforms (to get the games from). */
  platforms: GameManagerPlatform[];
  /** All libraries. */
  libraries: GameLibraryFileItem[];
};

/** Find all the games for the current library - undefined if no library is selected */
function getLibraryGames({ library, platforms, libraries }: GetLibraryGamesArgs): IGameInfo[] | undefined {
  // Check if there is a library to filter the games from
  if (library) {
    let games: IGameInfo[] = [];
    if (library.default) { // (Default library)
      // Find all platforms "used" by other libraries
      const usedPlatforms: GameManagerPlatform[] = [];
      libraries.forEach(lib => {
        if (lib === library) { return; }
        if (lib.prefix) {
          const prefix = lib.prefix;
          platforms.forEach(platform => {
            if (platform.filename.startsWith(prefix)) { usedPlatforms.push(platform); }
          });
        }
      });
      // Get all games from all platforms that are not "used" by other libraries
      const unusedPlatforms = platforms.filter(platform => usedPlatforms.indexOf(platform) === -1);
      unusedPlatforms.forEach(platform => {
        if (platform.collection) {
          Array.prototype.push.apply(games, platform.collection.games);
        }
      });
    } else if (library.prefix) { // (Normal library)
      // Find all platforms with this platform's prefix, and add all their games
      const prefix = library.prefix;
      platforms
        .filter(platform => platform.filename.startsWith(prefix))
        .forEach(platform => {
          if (platform.collection) {
            Array.prototype.push.apply(games, platform.collection.games);
          }
        });
    }
    return games;
  }
}

/**
 * Check if two sets of arguments for the function that orders games are equal (it is
 * guaranteed that they will return the games in the same order).
 * @param args1 New arguments.
 *              If the "force" value of this is true, the check will fail no matter what.
 * @param args2 Old arguments.
 */
function checkOrderGamesArgsEqual(args1: OrderGamesForceArgs, args2: OrderGamesForceArgs): boolean {
  const [gamesA, optsA, force] = args1;
  const [gamesB, optsB]        = args2 || [undefined, undefined];
  // Check if this is "forced" to be updated
  if (force) { return false; }
  // Check if the second argument array is missing
  if (!optsB) { return false; }
  // Compare each value
  if (optsA.search        !== optsB.search)                     { return false; }
  if (optsA.extreme       !== optsB.extreme)                    { return false; }
  if (optsA.broken        !== optsB.broken)                     { return false; }
  if (optsA.playlist      !== optsB.playlist)                   { return false; }
  if (optsA.orderBy       !== optsB.orderBy)                    { return false; }
  if (optsA.orderReverse  !== optsB.orderReverse)               { return false; }
  if (!checkIfArraysAreEqual(optsA.platforms, optsB.platforms)) { return false; }
  if (!checkIfArraysAreEqual(gamesA, gamesB))                   { return false; }
  return true;
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

/** Arguments used by the filter & order games function wrapper. */
type OrderGamesForceArgs = [
  // Arguments passed to the order function
  IGameInfo[],
  FilterAndOrderGamesOpts,
  // If it should force it to filter and order (even if the arguments are identical)
  boolean?
];
