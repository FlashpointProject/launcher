import * as remote from '@electron/remote';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { BackIn } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { ExtensionContribution } from '@shared/extensions/interfaces';
import { LangContainer } from '@shared/lang';
import { memoizeOne } from '@shared/memoize';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { Menu, MenuItemConstructorOptions } from 'electron';
import { Playlist } from 'flashpoint-launcher';
import * as React from 'react';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { gameDragDataType, gameScaleSpan } from '../../Util';
import { LangContext } from '../../util/lang';
import { GameGrid } from '../GameGrid';
import { GameList } from '../GameList';
import { InputElement } from '../InputField';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';
import { Spinner } from '../Spinner';
import { RequestState } from '@renderer/store/search/slice';
import { WithSearchProps } from '@renderer/containers/withSearch';
import { WithViewProps } from '@renderer/containers/withView';
import { SearchBar } from '@renderer/components/SearchBar';
import path = require('path');
import { delayedThrottle } from '@shared/utils/throttle';

type Pick<T, K extends keyof T> = { [P in K]: T[P]; };

export type GameDragEventData = {
  gameId: string;
  index: number;
}

export type GameDragData = {
  sourceTable: string;
  gameId: string;
  index: number;
}

type OwnProps = {
  sourceTable: string;
  gamesTotal?: number;
  metaState?: RequestState;
  libraries: string[];
  searchStatus: string | null;
  playlists: Playlist[];
  playlistIconCache: Record<string, string>;
  onMovePlaylistGame: (sourceGameId: string, destGameId: string) => void;

  /** Generator for game context menu */
  onGameContextMenu: (gameId: string) => void;
  /** Called when a playlist is updated */
  onUpdatePlaylist: (playlist: Playlist) => void;
  /** Called when a playlist is deleted */
  onDeletePlaylist: (playlist: Playlist) => void;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** Context menu additions */
  contextButtons: ExtensionContribution<'contextButtons'>[];
};

export type BrowsePageProps = OwnProps & WithViewProps & WithPreferencesProps & WithTagCategoriesProps & WithSearchProps;

export type BrowsePageState = {
  /** Currently dragged game (if any). */
  draggedGameIndex: number | null;

  /** Buffer for the selected playlist (all changes are made to this until saved). */
  currentPlaylist?: Playlist;
  isEditingPlaylist: boolean;
  isNewPlaylist: boolean;
};

/** Page displaying the games and playlists. */
export class BrowsePage extends React.Component<BrowsePageProps, BrowsePageState> {
  static contextType = LangContext;
  declare context: React.ContextType<typeof LangContext>;

  /** Reference of the game grid/list element. */
  gameGridOrListRef: HTMLDivElement | null = null;
  gameBrowserRef: React.RefObject<HTMLDivElement> = React.createRef();

  /** Time it takes before the current "quick search" string to reset after a change was made (in milliseconds). */
  static readonly quickSearchTimeout: number = 1500;

  constructor(props: BrowsePageProps) {
    super(props);
    this.loadView();
    // Set initial state (this is set up to remove all "setState" calls)
    this.state = {
      isEditingPlaylist: false,
      isNewPlaylist: false,
      draggedGameIndex: null,
    };
  }

  componentDidUpdate(prevProps: Readonly<BrowsePageProps>, prevState: Readonly<BrowsePageState>, snapshot?: any) {
    if (prevProps.currentView.id !== this.props.currentView.id) {
      this.loadView();
    }
  }

  loadView() {
    // Force the first search if view hasn't been used yet
    if (this.props.currentView.data.metaState === RequestState.WAITING) {
      this.props.searchActions.forceSearch({
        view: this.props.currentView.id
      });
    }
  }

  render() {
    const strings = this.context;
    const { currentView } = this.props;
    const { draggedGameIndex } = this.state;
    const extremeTags = this.props.preferencesData.tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
    // Render
    return (
      <div
        className='game-browser'
        ref={this.gameBrowserRef}>
        <ResizableSidebar
          show={this.props.preferencesData.browsePageShowLeftSidebar}
          divider='after'
          width={this.props.preferencesData.browsePageLeftSidebarWidth}
          onResize={this.onLeftSidebarResize}>
          <ConnectedLeftBrowseSidebar
            library={currentView.id}
            playlists={this.props.playlists}
            selectedPlaylistID={currentView.selectedPlaylist?.id}
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
            onExtremeToggle={this.onPlaylistExtremeToggle}
            onKeyDown={this.onPlaylistKeyDown}
            onShowAllClick={this.onLeftSidebarShowAllClick}
            onDuplicatePlaylist={this.onDuplicatePlaylist}
            onExportPlaylist={(playlistId) => this.onExportPlaylist(strings, playlistId)}
            onContextMenu={this.onPlaylistContextMenuMemo(strings, this.state.isEditingPlaylist, this.props.currentView.selectedPlaylist?.id)} />
        </ResizableSidebar>
        <div
          className='game-browser__center'>
          <SearchBar libraries={this.props.libraries} />
          <div className='game-browser__center-results-container'>
            {(() => {
              if (this.props.preferencesData.browsePageLayout === BrowsePageLayout.grid) {
                // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
                const height: number = calcScale(350, this.props.preferencesData.browsePageGameScale);
                const width: number = (height * 0.666) | 0;
                return (
                  <GameGrid
                    games={currentView.data.games}
                    resultsTotal={currentView.data.total !== undefined ? currentView.data.total : Object.keys(currentView.data.games).length}
                    selectedGameId={currentView.selectedGame?.id}
                    draggedGameIndex={draggedGameIndex}
                    extremeTags={extremeTags}
                    noRowsRenderer={this.noRowsRenderer}
                    onGameSelect={this.onGameSelect}
                    onGameLaunch={this.onGameLaunch}
                    onContextMenu={this.props.onGameContextMenu}
                    onGameDragStart={this.onGameDragStart}
                    onGameDragEnd={this.onGameDragEnd}
                    cellWidth={width}
                    cellHeight={height}
                    logoVersion={this.props.logoVersion}
                    screenshotPreviewMode={this.props.preferencesData.screenshotPreviewMode}
                    screenshotPreviewDelay={this.props.preferencesData.screenshotPreviewDelay}
                    hideExtremeScreenshots={this.props.preferencesData.hideExtremeScreenshots}
                    gridRef={this.gameGridOrListRefFunc}
                    updateView={this.updateViewRange}/>
                );
              } else {
                const height: number = calcScale(30, this.props.preferencesData.browsePageGameScale);
                return (
                  <GameList
                    sourceTable={this.props.sourceTable}
                    games={currentView.data.games}
                    resultsTotal={currentView.data.total !== undefined ? currentView.data.total : Object.keys(currentView.data.games).length}
                    insideOrderedPlaylist={currentView.selectedPlaylist !== undefined && currentView.advancedFilter.playlistOrder}
                    selectedGameId={currentView.selectedGame?.id}
                    draggedGameIndex={draggedGameIndex}
                    showExtremeIcon={this.props.preferencesData.browsePageShowExtreme}
                    extremeTags={extremeTags}
                    noRowsRenderer={this.noRowsRenderer}
                    onGameSelect={this.onGameSelect}
                    onGameLaunch={this.onGameLaunch}
                    onContextMenu={this.props.onGameContextMenu}
                    onGameDragStart={this.onGameDragStart}
                    onGameDragEnd={this.onGameDragEnd}
                    onMovePlaylistGame={this.onMovePlaylistGame}
                    rowHeight={height}
                    logoVersion={this.props.logoVersion}
                    listRef={this.gameGridOrListRefFunc}
                    updateView={this.updateViewRange}/>
                );
              }
            })()}
          </div>
        </div>
      </div>
    );
  }

  updateViewRange = delayedThrottle((start: number, count: number) => {
    const { currentView } = this.props;
    this.props.searchActions.requestRange({
      view: currentView.id,
      searchId: currentView.data.searchId,
      start,
      count
    });
  }, 100);

  private noRowsRenderer = () => {
    const strings = this.context;
    const { currentView } = this.props;
    return (
      <div className='game-list__no-games'>
        {currentView.data.total !== undefined ?
          currentView.selectedPlaylist ?
            currentView.selectedPlaylist.games.length === 0 ?
            /* Empty Playlist */
              <>
                <h2 className='game-list__no-games__title'>{strings.browse.emptyPlaylist}</h2>
                <br/>
                <p>{formatString(strings.browse.dropGameOnLeft, <i>{strings.browse.leftSidebar}</i>)}</p>
              </>
              :
              <>
                <h2 className='game-list__no-games__title'>{strings.browse.noGamesFoundInsidePlaylist}</h2>
                <br/>
                <p>{strings.browse.noGameMatchedSearch}</p>
              </>
            : (
          /* Empty regular search */
              <>
                <h1 className='game-list__no-games__title'>{strings.browse.noGamesFound}</h1>
                <br/>
                { this.props.gamesTotal !== undefined && this.props.gamesTotal > 0 ? (
                  <>
                    {strings.browse.noGameMatchedDesc}
                    <br/>
                    {strings.browse.noGameMatchedSearch}
                  </>
                ) : (
                  <>{strings.browse.thereAreNoGames}</>
                ) }
              </>
            ) : (
        /* Searching */
            <div>
              <h1 className="game-list__no-games__title">{strings.browse.searching}</h1>
              <Spinner/>
            </div>
          )}
      </div>
    );
  };

  private onPlaylistContextMenuMemo = memoizeOne((strings: LangContainer, isEditing: boolean, selectedPlaylistId?: string) => {
    return (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => {
      if (!isEditing || selectedPlaylistId != playlistId) { // Don't export a playlist in the back while it's being edited in the front
        const contextButtons: MenuItemConstructorOptions[] = [{
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
        }];

        // Add extension contexts
        for (const contribution of this.props.contextButtons) {
          for (const contextButton of contribution.value) {
            if (contextButton.context === 'playlist') {
              contextButtons.push({
                label: contextButton.name,
                click: () => {
                  window.Shared.back.request(BackIn.GET_PLAYLIST, playlistId)
                  .then(playlist => {
                    window.Shared.back.send(BackIn.RUN_COMMAND, contextButton.command, [playlist]);
                  });
                }
              });
            }
          }
        }

        return (
          openContextMenu(contextButtons)
        );
      }
    };
  });

  onSelectPlaylist = (playlistId: string | null) => {
    const { currentView, searchActions } = this.props;
    if (playlistId) {
      window.Shared.back.request(BackIn.GET_PLAYLIST, playlistId)
      .then((playlist) => {
        searchActions.selectPlaylist({
          view: currentView.id,
          playlist
        });
      });
    } else {
      searchActions.selectPlaylist({
        view: currentView.id,
        playlist: undefined
      });
    }
  };

  onLeftSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = (this.getGameBrowserDivWidth() - this.props.preferencesData.browsePageRightSidebarWidth) - 5;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    updatePreferencesData({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  };

  getGameBrowserDivWidth(): number {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!this.gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(this.gameBrowserRef.current).width || '', 10);
  }

  onGameSelect = async (gameId?: string): Promise<void> => {
    const { currentView } = this.props;
    if (currentView.selectedGame?.id !== gameId && gameId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, gameId);
      if (game) {
        this.props.searchActions.selectGame({
          view: currentView.id,
          game,
        });
      }
    }
  };

  onGameLaunch = async (gameId: string): Promise<void> => {
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId);
  };

  onGameDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    const data: GameDragData = {
      ...dragEventData,
      sourceTable: this.props.sourceTable
    };
    console.log(data);
    this.setState({ draggedGameIndex: dragEventData.index });
    event.dataTransfer.setData(gameDragDataType, JSON.stringify(data));
  };

  onGameDragEnd = (event: React.DragEvent): void => {
    this.setState({ draggedGameIndex: null });
    event.dataTransfer.clearData(gameDragDataType);
  };

  onMovePlaylistGame = async (sourceGameId: string, destGameId: string): Promise<void> => {
    this.props.onMovePlaylistGame(sourceGameId, destGameId);
  };

  // -- Left Sidebar --

  onSavePlaylist = (): void => {
    if (this.state.currentPlaylist) {
      window.Shared.back.request(BackIn.SAVE_PLAYLIST, this.state.currentPlaylist)
      .then((data) => {
        this.props.onUpdatePlaylist(data);
      });
      this.setState({
        isEditingPlaylist: false,
        isNewPlaylist: false,
      });
    }
  };

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
      window.Shared.back.send(BackIn.IMPORT_PLAYLIST, filePath[0], this.props.currentView.id);
    }
  };

  onCreatePlaylistClick = (): void => {
    this.setState({
      currentPlaylist: {
        filePath: '',
        id: uuid(),
        games: [],
        title: '',
        description: '',
        author: '',
        icon: '',
        library: this.props.currentView.id,
        extreme: false
      },
      isEditingPlaylist: true,
      isNewPlaylist: true,
    });
    if (this.props.currentView.selectedPlaylist) {
      this.onSelectPlaylist(null);
    }
  };

  onDiscardPlaylistClick = (): void => {
    const newState: Pick<BrowsePageState, 'isEditingPlaylist' | 'isNewPlaylist' | 'currentPlaylist'> = {
      isEditingPlaylist: false,
      isNewPlaylist: false,
    };

    if (this.state.isNewPlaylist) {
      newState.currentPlaylist = undefined;
    }

    this.setState(newState);
  };

  onDeletePlaylist = (): void => {
    if (this.state.currentPlaylist) {
      const playlistId = this.state.currentPlaylist.id;
      window.Shared.back.request(BackIn.DELETE_PLAYLIST, playlistId)
      .then((data) => {
        this.onSelectPlaylist(null);
        if (data) {
          // DB wipes it, need it to remove it locally
          data.id = playlistId;
          this.props.onDeletePlaylist(data);
        }
      });
    }
  };

  onEditPlaylistClick = () => {
    if (this.state.currentPlaylist) {
      this.setState({
        isEditingPlaylist: true,
        isNewPlaylist: false,
      });
    }
  };

  onPlaylistDrop = (event: React.DragEvent, playlistId: string) => {
    console.log('play drop');
    if (!this.state.isEditingPlaylist) {
      const rawData = event.dataTransfer.getData(gameDragDataType);
      if (rawData) {
        const dragData = JSON.parse(rawData) as GameDragData;
        window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, dragData.gameId);
      }
    }
  };

  onPlaylistClick = (playlistId: string, selected: boolean): void => {
    if (!this.state.isEditingPlaylist || !selected) {
      const playlist = this.props.playlists.find(p => p.id === playlistId);
      this.setState({
        currentPlaylist: playlist,
        isEditingPlaylist: false,
        isNewPlaylist: false,
      });
      this.onSelectPlaylist(playlistId);
    }
  };

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
        })
        .catch((err) => {
          log.error('Launcher', 'Error fetching playlist icon: ' + err);
        });
      }
    }
  };

  onPlaylistTitleChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          title: event.target.value,
        }
      });
    }
  };

  onPlaylistAuthorChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          author: event.target.value,
        }
      });
    }
  };

  onPlaylistDescriptionChange = (event: React.ChangeEvent<InputElement>) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          description: event.target.value,
        }
      });
    }
  };

  onPlaylistExtremeToggle = (isChecked: boolean) => {
    if (this.state.currentPlaylist) {
      this.setState({
        currentPlaylist: {
          ...this.state.currentPlaylist,
          extreme: isChecked
        }
      });
    }
  };

  onPlaylistKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') { this.onSavePlaylist(); }
  };

  onLeftSidebarShowAllClick = (): void => {
    this.onSelectPlaylist(null);
    this.setState({
      isEditingPlaylist: false,
      isNewPlaylist: false,
      currentPlaylist: undefined,
    });
  };

  onDuplicatePlaylist = (playlistId: string): void => {
    window.Shared.back.send(BackIn.DUPLICATE_PLAYLIST, playlistId);
  };

  onExportPlaylist = (strings: LangContainer, playlistId: string): void => {
    const playlist = this.props.playlists.find(p => p.id === playlistId);
    const filePath = remote.dialog.showSaveDialogSync({
      title: strings.dialog.selectFileToExportPlaylist,
      defaultPath: playlist ? path.basename(playlist.filePath) : 'playlist.json',
      filters: [{
        name: 'Playlist file',
        extensions: ['json'],
      }]
    });
    if (filePath) { window.Shared.back.send(BackIn.EXPORT_PLAYLIST, playlistId, filePath); }
  };

  gameGridOrListRefFunc = (ref: HTMLDivElement | null): void => {
    this.gameGridOrListRef = ref;
  };
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
 *
 * @param url URL of content to convert.
 */
async function toDataURL(url: string): Promise<FileReaderResult> {
  return fetch(url)
  .then(response => response.blob())
  .then(blob => new Promise<FileReaderResult>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }));
}
