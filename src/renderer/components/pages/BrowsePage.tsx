import { Game } from '@database/entity/Game';
import { Playlist } from '@database/entity/Playlist';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { BackIn, DeletePlaylistData, DeletePlaylistGameData, DeletePlaylistResponse, DuplicateGameData, DuplicatePlaylistData, ExportGameData, ExportPlaylistData, GetGameData, GetGameResponseData, GetPlaylistGameData, GetPlaylistGameResponse, ImportPlaylistData, LaunchGameData, SavePlaylistData, SavePlaylistGameData, SavePlaylistGameResponse, SavePlaylistResponse } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { GamePropSuggestions } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as fs from 'fs';
import * as React from 'react';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { ConnectedRightBrowseSidebar } from '../../containers/ConnectedRightBrowseSidebar';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { UpdateView, ViewGameSet } from '../../interfaces';
import { SearchQuery } from '../../store/search';
import { gameIdDataType, gameScaleSpan, getGamePath } from '../../Util';
import { LangContext } from '../../util/lang';
import { uuid } from '../../util/uuid';
import { GameGrid } from '../GameGrid';
import { GameList } from '../GameList';
import { GameOrderChangeEvent } from '../GameOrder';
import { InputElement } from '../InputField';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';

type Pick<T, K extends keyof T> = { [P in K]: T[P]; };
type StateCallback1 = Pick<BrowsePageState, 'currentGame'|'isEditingGame'|'isNewGame'|'currentPlaylistEntry'>;

type OwnProps = {
  games: ViewGameSet;
  gamesTotal?: number;
  playlists: Playlist[];
  suggestions: Partial<GamePropSuggestions>;
  playlistIconCache: Record<string, string>;
  onSaveGame: (game: Game, playlistEntry?: PlaylistGame) => void;
  onDeleteGame: (gameId: string) => void;
  onQuickSearch: (search: string) => void;
  onOpenExportMetaEdit: (gameId: string) => void;
  updateView: UpdateView;

  /** Most recent search query. */
  search: SearchQuery;
  /** Current parameters for ordering games. */
  order?: GameOrderChangeEvent;
  /** Scale of the games. */
  gameScale: number;
  /** Layout of the games. */
  gameLayout: BrowsePageLayout;
  /** Currently selected game (if any). */
  selectedGameId?: string;
  /** Currently selected playlist (if any). */
  selectedPlaylistId?: string;
  /** Called when a game is selected. */
  onSelectGame: (gameId?: string) => void;
  /** Called when a playlist is selected. */
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  /** Called when a playlist is updated */
  onUpdatePlaylist: (playlist: Playlist) => void;
  /** Called when a playlist is deleted */
  onDeletePlaylist: (playlist: Playlist) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** If the "New Game" button was clicked (silly way of passing the event from the footer the the browse page). */
  wasNewGameClicked: boolean;
  /** "Route" of the currently selected library (empty string means no library). */
  gameLibrary: string;
};

export type BrowsePageProps = OwnProps & WithPreferencesProps & WithTagCategoriesProps;

export type BrowsePageState = {
  /** Current quick search string (used to jump to a game in the list, not to filter the list). */
  quickSearch: string;
  /** Currently dragged game (if any). */
  draggedGameId?: string;

  /** Buffer for the selected game (all changes are made to the game until saved). */
  currentGame?: Game;
  /** Buffer for the playlist notes of the selected game/playlist (all changes are made to the game until saved). */
  currentPlaylistEntry?: PlaylistGame;
  /** If the "edit mode" is currently enabled. */
  isEditingGame: boolean;
  /** If the selected game is a new game being created. */
  isNewGame: boolean;

  /** Buffer for the selected playlist (all changes are made to this until saved). */
  currentPlaylist?: Playlist;
  isEditingPlaylist: boolean;
  isNewPlaylist: boolean;
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
      isEditingGame: false,
      isNewGame: false,
      isEditingPlaylist: false,
      isNewPlaylist: false,
    };
    const assignToState = <T extends keyof BrowsePageState>(state: Pick<BrowsePageState, T>) => { Object.assign(initialState, state); };
    this.updateCurrentGame(this.props.selectedGameId, this.props.selectedPlaylistId);
    this.createNewGameIfClicked(false, assignToState);
    this.state = initialState;
  }

  componentDidUpdate(prevProps: BrowsePageProps, prevState: BrowsePageState) {
    const { gameLibrary, selectedGameId, selectedPlaylistId } = this.props;
    const { isEditingGame, quickSearch } = this.state;
    // Check if it started or ended editing
    if (isEditingGame != prevState.isEditingGame) {
      this.updateCurrentGame(this.props.selectedGameId, this.props.selectedPlaylistId);
    }
    // Update current game and add-apps if the selected game changes
    if (selectedGameId && selectedGameId !== prevProps.selectedGameId) {
      this.updateCurrentGame(this.props.selectedGameId, this.props.selectedPlaylistId);
      this.setState({ isEditingGame: false });
    }
    // Deselect the current game if the game has been deselected (from outside this component most likely)
    if (selectedGameId === undefined && this.state.currentGame && !this.state.isNewGame) {
      this.setState({
        currentGame: undefined,
        currentPlaylistEntry: undefined,
        isNewGame: false,
        isEditingGame: false
      });
    }
    // Update current game and add-apps if the selected game changes
    if (gameLibrary === prevProps.gameLibrary &&
        selectedPlaylistId !== prevProps.selectedPlaylistId) {
      this.setState({
        currentGame: undefined,
        isNewGame: false,
        isEditingGame: false
      });
    }
    // Check if quick search string changed, and if it isn't empty
    if (prevState.quickSearch !== quickSearch && quickSearch !== '') {
      this.props.onQuickSearch(quickSearch);
    }
    // Create a new game if the "New Game" button is pushed
    this.createNewGameIfClicked(prevProps.wasNewGameClicked);
    // Check the library selection changed (and no game is selected)
    if (!selectedGameId && gameLibrary !== prevProps.gameLibrary) {
      this.setState({
        currentGame: undefined,
        isNewGame: false,
        isEditingGame: false
      });
    }
  }

  render() {
    const strings = this.context;
    const { games, selectedGameId, selectedPlaylistId } = this.props;
    const { draggedGameId } = this.state;
    const order = this.props.order || BrowsePage.defaultOrder;
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
            library={this.props.gameLibrary}
            playlists={this.props.playlists}
            selectedPlaylistID={selectedPlaylistId || ''}
            isEditing={this.state.isEditingPlaylist}
            isNewPlaylist={this.state.isNewPlaylist}
            currentPlaylist={this.state.currentPlaylist}
            playlistIconCache={this.props.playlistIconCache}
            onDelete={this.onDeletePlaylist}
            onSave={this.onSavePlaylist}
            onCreate={this.onCreatePlaylistClick}
            onImport={() => this.onImportPlaylistClick(strings)}
            onDiscard={this.onDiscardPlaylistClick}
            onEditClick={this.onEditPlaylistClick}
            onDrop={this.onPlaylistDrop}
            onItemClick={this.onPlaylistClick}
            onSetIcon={this.onPlaylistSetIcon}
            onTitleChange={this.onPlaylistTitleChange}
            onAuthorChange={this.onPlaylistAuthorChange}
            onDescriptionChange={this.onPlaylistDescriptionChange}
            onKeyDown={this.onPlaylistKeyDown}
            onShowAllClick={this.onLeftSidebarShowAllClick}
            onDuplicatePlaylist={this.onDuplicatePlaylist}
            onExportPlaylist={(playlistId) => this.onExportPlaylist(strings, playlistId)}
            onContextMenu={this.onPlaylistContextMenuMemo(strings, this.state.isEditingPlaylist, this.props.selectedPlaylistId)} />
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
                  updateView={this.props.updateView}
                  gamesTotal={this.props.gamesTotal}
                  selectedGameId={selectedGameId}
                  draggedGameId={draggedGameId}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings)}
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
                  gamesTotal={this.props.gamesTotal}
                  selectedGameId={selectedGameId}
                  draggedGameId={draggedGameId}
                  noRowsRenderer={this.noRowsRendererMemo(strings.browse)}
                  onGameSelect={this.onGameSelect}
                  onGameLaunch={this.onGameLaunch}
                  onContextMenu={this.onGameContextMenuMemo(strings)}
                  onGameDragStart={this.onGameDragStart}
                  onGameDragEnd={this.onGameDragEnd}
                  updateView={this.props.updateView}
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
            currentPlaylistEntry={this.state.currentPlaylistEntry}
            currentLibrary={this.props.gameLibrary}
            onDeleteSelectedGame={this.onDeleteSelectedGame}
            onRemoveSelectedGameFromPlaylist={this.onRemoveSelectedGameFromPlaylist}
            onDeselectPlaylist={this.onRightSidebarDeselectPlaylist}
            onEditPlaylistNotes={this.onEditPlaylistNotes}
            isEditing={this.state.isEditingGame}
            isNewGame={this.state.isNewGame}
            onEditGame={this.onEditGame}
            onEditClick={this.onStartEditClick}
            onDiscardClick={this.onDiscardEditClick}
            onSaveGame={this.onSaveEditClick}
            tagCategories={this.props.tagCategories}
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
        ) : this.props.gamesTotal != undefined ? (
            <>
            <h1 className='game-list__no-games__title'>{strings.noGamesFound}</h1>
            <br/>
              { this.props.gamesTotal > 1 ? (
                <>
                  {strings.noGameMatchedDesc}
                  <br/>
                  {strings.noGameMatchedSearch}
                </>
              ) : (
                <>{strings.thereAreNoGames}</>
              ) }
            </>
          ) : <h1 className='game-list__no-games__title'>{strings.searching}</h1> }
      </div>
    );
  });

  private onPlaylistContextMenuMemo = memoizeOne((strings: LangContainer, isEditing: boolean, selectedPlaylistId?: string) => {
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => {
      if (!isEditing || selectedPlaylistId != playlistId) { // Don't export a playlist in the back while it's being edited in the front
        return (
          openContextMenu([{
            label: strings.menu.duplicatePlaylist,
            click: () => {
              this.onDuplicatePlaylist(playlistId);
            }
          },
          {
            label: strings.menu.exportPlaylist,
            enabled: !window.Shared.isBackRemote, // (Local "back" only)
            click: () => {
              this.onExportPlaylist(strings, playlistId);
            },
          }])
        );
      }
    };
  });

  private onGameContextMenuMemo = memoizeOne((strings: LangContainer) => {
    return (gameId: string) => {
      return (
        openContextMenu([{
          /* File Location */
          label: strings.menu.openFileLocation,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            window.Shared.back.send<GetGameResponseData, GetGameData>(BackIn.GET_GAME, { id: gameId }, res => {
              if (res.data && res.data.game) {
                const gamePath = getGamePath(res.data.game, window.Shared.config.fullFlashpointPath);
                if (gamePath) {
                  fs.stat(gamePath, error => {
                    if (!error) { remote.shell.showItemInFolder(gamePath); }
                    else {
                      const opts: Electron.MessageBoxOptions = {
                        type: 'warning',
                        message: '',
                        buttons: ['Ok'],
                      };
                      if (error.code === 'ENOENT') {
                        opts.title = this.context.dialog.fileNotFound;
                        opts.message = (
                          'Failed to find the game file.\n'+
                          'If you are using Flashpoint Infinity, make sure you download the game first.\n'
                        );
                      } else {
                        opts.title = 'Unexpected error';
                        opts.message = (
                          'Failed to check the game file.\n'+
                          'If you see this, please report it back to us (a screenshot would be great)!\n\n'+
                          `Error: ${error}\n`
                        );
                      }
                      opts.message += `Path: "${gamePath}"\n\nNote: If the path is too long, some portion will be replaced with three dots ("...").`;
                      remote.dialog.showMessageBox(opts);
                    }
                  });
                }
              }
            });
          },
        }, {  type: 'separator' }, {
          /* Duplicate Meta */
          label: strings.menu.duplicateMetaOnly,
          enabled: this.props.preferencesData.enableEditing,
          click: () => { window.Shared.back.send<any, DuplicateGameData>(BackIn.DUPLICATE_GAME, { id: gameId, dupeImages: false }); },
        }, {
          /* Duplicate Meta & Images */
          label: strings.menu.duplicateMetaAndImages, // ("&&" will be shown as "&")
          enabled: this.props.preferencesData.enableEditing,
          click: () => { window.Shared.back.send<any, DuplicateGameData>(BackIn.DUPLICATE_GAME, { id: gameId, dupeImages: true }); },
        }, { type: 'separator' }, {
          /* Export Meta */
          label: strings.menu.exportMetaOnly,
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            const filePath = remote.dialog.showSaveDialogSync({
              title: strings.dialog.selectFileToExportMeta,
              defaultPath: 'meta',
              filters: [{
                name: 'Meta file',
                extensions: ['txt'],
              }]
            });
            if (filePath) { window.Shared.back.send<any, ExportGameData>(BackIn.EXPORT_GAME, { id: gameId, location: filePath, metaOnly: true }); }
          },
        }, {
          /* Export Meta & Images */
          label: strings.menu.exportMetaAndImages, // ("&&" will be shown as "&")
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            const filePaths = window.Shared.showOpenDialogSync({
              title: strings.dialog.selectFolderToExportMetaAndImages,
              properties: ['promptToCreate', 'openDirectory']
            });
            if (filePaths && filePaths.length > 0) {
              window.Shared.back.send<any, ExportGameData>(BackIn.EXPORT_GAME, { id: gameId, location: filePaths[0], metaOnly: false });
            }
          },
        }, {  type: 'separator' }, {
          /* Export Partial Meta */
          label: strings.menu.exportMetaEdit, // ("&&" will be shown as "&")
          enabled: !window.Shared.isBackRemote, // (Local "back" only)
          click: () => {
            this.props.onOpenExportMetaEdit(gameId);
          },
        }])
      );
    };
  });

  /** Deselect without clearing search (Right sidebar will search itself) */
  onRightSidebarDeselectPlaylist = (): void => {
    const { onSelectPlaylist } = this.props;
    if (onSelectPlaylist) { onSelectPlaylist(this.props.gameLibrary, undefined); }
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

  onGameSelect = (gameId?: string): void => {
    if (this.props.selectedGameId !== gameId) {
      this.props.onSelectGame(gameId);
      const playlistId = this.state.currentPlaylist ? this.state.currentPlaylist.id : undefined;
      this.updateCurrentGame(gameId, playlistId);
    }
  }

  onGameLaunch = (gameId: string): void => {
    window.Shared.back.send<LaunchGameData>(BackIn.LAUNCH_GAME, { id: gameId });
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
    if (this.props.selectedGameId) {
      this.props.onDeleteGame(this.props.selectedGameId);
    }
    // Deselect the game
    this.props.onSelectGame(undefined);
    // Reset the state related to the selected game
    this.setState({
      currentGame: undefined,
      currentPlaylistEntry: undefined,
      isNewGame: false,
      isEditingGame: false
    });
    // Focus the game grid/list
    this.focusGameGridOrList();
  }

  onRemoveSelectedGameFromPlaylist = async (): Promise<void> => {
    // Remove game from playlist
    if (this.state.currentGame) {
      if (this.state.currentPlaylist) {
        await window.Shared.back.sendP<DeletePlaylistGameData, any>(BackIn.DELETE_PLAYLIST_GAME, {
          playlistId: this.state.currentPlaylist.id,
          gameId: this.state.currentGame.id
        });
      } else { logError('No playlist is selected'); }
    } else { logError('No game is selected'); }

    // Deselect the game
    this.props.onSelectGame(undefined);

    // Reset the state related to the selected game
    this.setState({
      currentGame: undefined,
      currentPlaylistEntry: undefined,
      isNewGame: false,
      isEditingGame: false
    });

    if (this.state.currentPlaylist) {
      this.props.onUpdatePlaylist(this.state.currentPlaylist);
    }

    function logError(text: string) {
      console.error('Unable to remove game from selected playlist - ' + text);
    }
  }

  onEditGame = (game: Partial<Game>) => {
    if (this.state.currentGame) {
      this.setState({
        currentGame: {...this.state.currentGame, ...game}
      });
    }
  }

  onEditPlaylistNotes = (text: string): void => {
    if (this.state.currentPlaylistEntry) {
      this.setState({
        currentPlaylistEntry: {
          ...this.state.currentPlaylistEntry,
          notes: text
        }
       });
    }
  }

  /** Replace the "current game" with the selected game (in the appropriate circumstances) */
  async updateCurrentGame(gameId?: string, playlistId?: string): Promise<void> {      // Find the selected game in the selected playlist
    let gamePlaylistEntry: PlaylistGame | undefined;
    if (gameId) {
      if (playlistId) {
        const res = await window.Shared.back.sendP<GetPlaylistGameResponse, GetPlaylistGameData>(BackIn.GET_PLAYLIST_GAME, {
          gameId: gameId,
          playlistId: playlistId
        });
        gamePlaylistEntry = res.data;
      }

      // Update game
      window.Shared.back.send<GetGameResponseData, GetGameData>(BackIn.GET_GAME, { id: gameId }, res => {
        if (res.data) {
          if (res.data.game) {
            this.setState({
              currentGame: res.data.game,
              currentPlaylistEntry: gamePlaylistEntry,
              isNewGame: false,
            });
          } else { console.log(`Failed to get game. Game is undefined (GameID: "${gameId}").`); }
        } else { console.log(`Failed to get game. Empty data in response (GameID: "${gameId}").`); }
      });
    }
  }

  onStartEditClick = (): void => {
    if (this.props.preferencesData.enableEditing) {
      this.setState({ isEditingGame: true });
    }
  }

  onDiscardEditClick = (): void => {
    this.setState({
      isEditingGame: false,
      isNewGame: false,
      currentGame: this.state.isNewGame ? undefined : this.state.currentGame,
    });
    this.focusGameGridOrList();
  }

  onSaveEditClick = (): void => {
    if (!this.state.currentGame) {
      console.error('Can\'t save game. "currentGame" is missing.');
      return;
    }
    this.props.onSaveGame(this.state.currentGame, this.state.currentPlaylistEntry);
    this.setState({
      isEditingGame: false,
      isNewGame: false
    });
    this.focusGameGridOrList();
  }

  /** Create a new game if the "New Game" button was clicked */
  createNewGameIfClicked(prevWasNewGameClicked: boolean, cb: (state: StateCallback1) => void = this.boundSetState): void {
    const { wasNewGameClicked } = this.props;
    const id = uuid();
    // Create a new game if the "New Game" button is pushed
    if (wasNewGameClicked && !prevWasNewGameClicked) {
      cb({
        currentGame: {
          id: id,
          parentGameId: id,
          title: '',
          alternateTitles: '',
          series: '',
          developer: '',
          publisher: '',
          platform: '',
          dateAdded: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          broken: false,
          extreme: false,
          playMode: '',
          status: '',
          notes: '',
          tags: [],
          source: '',
          applicationPath: '',
          launchCommand: '',
          releaseDate: '',
          version: '',
          originalDescription: '',
          language: '',
          library: this.props.gameLibrary,
          orderTitle: '',
          addApps: [],
          placeholder: false,
        },
        isEditingGame: true,
        isNewGame: true,
      });
    }
  }

  // -- Left Sidebar --

  onSavePlaylist = (): void => {
    if (this.state.currentPlaylist) {
      window.Shared.back.send<SavePlaylistResponse, SavePlaylistData>(BackIn.SAVE_PLAYLIST, this.state.currentPlaylist, (res) => {
        if (res.data) {
          this.props.onUpdatePlaylist(res.data);
        }
      });
      this.setState({
        isEditingPlaylist: false,
        isNewPlaylist: false,
      });
    }
  }

  onImportPlaylistClick = (strings: LangContainer): void => {
    const filePath = remote.dialog.showOpenDialogSync({
      title: strings.dialog.selectPlaylistToImport,
      defaultPath: 'playlists',
      filters: [{
        name: 'Playlist file',
        extensions: ['json'],
      }]
    });
    if (filePath) {
      window.Shared.back.send<any, ImportPlaylistData>(BackIn.IMPORT_PLAYLIST, filePath[0]);
    }
  }

  onCreatePlaylistClick = (): void => {
    this.setState({
      currentPlaylist: {
        id: uuid(),
        games: [],
        title: '',
        description: '',
        author: '',
        icon: '',
        library: this.props.gameLibrary,
      },
      isEditingPlaylist: true,
      isNewPlaylist: true,
    });
    if (this.props.selectedPlaylistId !== undefined) {
      this.props.onSelectPlaylist(this.props.gameLibrary, undefined);
    }
  }

  onDiscardPlaylistClick = (): void => {
    this.setState({
      currentPlaylist: undefined,
      isEditingPlaylist: false,
      isNewPlaylist: false,
    });
  }

  onDeletePlaylist = (): void => {
    if (this.state.currentPlaylist) {
      const playlistId = this.state.currentPlaylist.id;
      window.Shared.back.send<DeletePlaylistResponse, DeletePlaylistData>(BackIn.DELETE_PLAYLIST, playlistId, (res) => {
        this.props.onSelectPlaylist(this.props.gameLibrary, undefined);
        if (res.data) {
          // DB wipes it, need it to remove it locally
          res.data.id = playlistId;
          this.props.onDeletePlaylist(res.data);
        }
      });
    }
  }

  onEditPlaylistClick = () => {
    if (this.state.currentPlaylist) {
      this.setState({
        isEditingPlaylist: true,
        isNewPlaylist: false,
      });
    }
  }

  onPlaylistDrop = (event: React.DragEvent, playlistId: string) => {
    if (!this.state.isEditingPlaylist) {
      const gameId = event.dataTransfer.getData(gameIdDataType);
      if (gameId) {
        const newPlaylistEntry = createPlaylistGame(gameId, playlistId, 0);
        window.Shared.back.send<SavePlaylistGameResponse, SavePlaylistGameData>(BackIn.SAVE_PLAYLIST_GAME, newPlaylistEntry, entry =>{

        });
      }
    }
  }

  onPlaylistClick = (playlistId: string, selected: boolean): void => {
    if (!this.state.isEditingPlaylist || !selected) {
      const playlist = this.props.playlists.find(p => p.id === playlistId);
      this.setState({
        currentPlaylist: playlist,
        isEditingPlaylist: false,
        isNewPlaylist: false,
      });
      this.props.onSelectPlaylist(this.props.gameLibrary, playlistId);
      this.props.clearSearch();
    }
  }

  onPlaylistSetIcon = () => {
    if (this.state.currentPlaylist && this.state.isEditingPlaylist) {
      // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
      const filePaths = window.Shared.showOpenDialogSync({
        title: 'Select a file to use as the icon',
        properties: ['openFile'],
        filters: [
          {
            name: 'Image File (.png, .jpg, .jpeg)',
            extensions: ['png', 'jpg', 'jpeg'],
          },
          {
            name: 'All files (*.*)',
            extensions: [],
          }
        ]
      });
      if (filePaths && filePaths.length > 0) {
        toDataURL(filePaths[0])
        .then(dataUrl => {
          if (this.state.currentPlaylist) {
            this.setState({
              currentPlaylist: {
                ...this.state.currentPlaylist,
                icon: dataUrl+''
              }
            });
          }
        });
      }
    }
  }

  onPlaylistTitleChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          title: event.target.value,
        }
      });
    }
  }

  onPlaylistAuthorChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          author: event.target.value,
        }
      });
    }
  }

  onPlaylistDescriptionChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          description: event.target.value,
        }
      });
    }
  }

  onPlaylistKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') { this.onSavePlaylist(); }
  }

  onLeftSidebarShowAllClick = (): void => {
    const { clearSearch, onSelectPlaylist } = this.props;
    if (clearSearch)      { clearSearch(); }
    if (onSelectPlaylist) { onSelectPlaylist(this.props.gameLibrary, undefined); }
    this.setState({
      isEditingPlaylist: false,
      isNewPlaylist: false,
      currentPlaylist: undefined,
      isEditingGame: false,
      isNewGame: false,
      currentGame: undefined,
      currentPlaylistEntry: undefined,
    });
  }

  onDuplicatePlaylist = (playlistId: string): void => {
    window.Shared.back.send<any, DuplicatePlaylistData>(BackIn.DUPLICATE_PLAYLIST, playlistId);
  }

  onExportPlaylist = (strings: LangContainer, playlistId: string): void => {
    const filePath = remote.dialog.showSaveDialogSync({
      title: strings.dialog.selectFileToExportPlaylist,
      defaultPath: 'playlist.json',
      filters: [{
        name: 'Playlist file',
        extensions: ['json'],
      }]
    });
    if (filePath) { window.Shared.back.send<any, ExportPlaylistData>(BackIn.EXPORT_PLAYLIST, { id: playlistId, location: filePath }); }
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
    orderReverse: 'ASC',
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

type FileReaderResult = typeof FileReader['prototype']['result'];

/**
 * Convert the body of a URL to a data URL.
 * This will reject if the request or conversion fails.
 * @param url URL of content to convert.
 */
function toDataURL(url: string): Promise<FileReaderResult> {
  return fetch(url)
  .then(response => response.blob())
  .then(blob => new Promise<FileReaderResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }));
}

function createPlaylistGame(gameId: string, playlistId: string, order: number): PlaylistGame {
  return {
    gameId: gameId,
    playlistId: playlistId,
    order: order,
    notes: ''
  };
}