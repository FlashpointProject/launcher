import * as remote from '@electron/remote';
import { SearchBar } from '@renderer/components/SearchBar';
import { WithSearchProps } from '@renderer/containers/withSearch';
import { WithTagCategoriesProps } from '@renderer/containers/withTagCategories';
import { WithViewProps } from '@renderer/containers/withView';
import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { usePreferences } from '@renderer/hooks/usePreferences';
import { forceSearch, requestRange, RequestState, selectGame, selectPlaylist, setGridScroll, setListScroll } from '@renderer/store/search/slice';
import { BackIn } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { ExtensionContribution } from '@shared/extensions/interfaces';
import { updatePreferencesData } from '@shared/preferences/util';
import { formatString } from '@shared/utils/StringFormatter';
import { delayedThrottle } from '@shared/utils/throttle';
import { uuid } from '@shared/utils/uuid';
import { Menu, MenuItemConstructorOptions } from 'electron';
import { GameLaunchOverride, LangContainer, Playlist } from 'flashpoint-launcher';
import * as path from 'path';
import * as React from 'react';
import { RefObject, useRef, useState } from 'react';
import { ScrollIndices } from 'react-virtualized';
import { ConnectedLeftBrowseSidebar } from '../../containers/ConnectedLeftBrowseSidebar';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { gameDragDataType, gameScaleSpan } from '../../Util';
import { LangContext } from '../../util/lang';
import { GameGrid } from '../GameGrid';
import { GameList } from '../GameList';
import { InputElement } from '../InputField';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';
import { Spinner } from '../Spinner';

export type GameDragEventData = {
  gameId: string;
  index: number;
  logoPath: string;
  screenshotPath: string;
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
  onGameContextMenu: (gameId: string, logoPath: string, screenshotPath: string) => void;
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

export function BrowsePage(props: OwnProps) {
  const { sourceTable, onUpdatePlaylist, playlists } = props;
  const [draggedGameIndex, setDraggedGameIndex] = useState<number | null>(null);
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [isNewPlaylist, setIsNewPlaylist] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const gameBrowserRef: RefObject<HTMLDivElement | null> = useRef(null);
  const dispatch = useAppDispatch();
  const { displaySettings } = useAppSelector(state => state.main);
  const strings = React.useContext(LangContext);
  const { tagFilters, screenshotPreviewMode, screenshotPreviewDelay, hideExtremeScreenshots, browsePageShowExtreme, browsePageLayout, browsePageGameScale, browsePageShowLeftSidebar, browsePageLeftSidebarWidth, browsePageRightSidebarWidth } = usePreferences();
  const currentView = useView();
  const extremeTags = tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
  const tagGroupIcons = tagFilters.filter(t => !t.enabled && t.iconBase64 !== '').map(({ tags, iconBase64: tagGroupIcon }) => ({ tagFilter: tags, iconBase64: tagGroupIcon }));

  React.useEffect(() => {
    // Force the first search if view hasn't been used yet
    if (currentView.data.metaState === RequestState.WAITING) {
      // console.log('loading view ' + this.props.currentView.id);
      dispatch(forceSearch({
        view: currentView.id
      }));
    }
  });

  // Callbacks

  const updateViewRange = delayedThrottle((start: number, count: number) => {
    dispatch(requestRange({
      view: currentView.id,
      searchId: currentView.data.searchId,
      start,
      count
    }));
  }, 100);

  const onGridScrollToChange = (params: ScrollIndices, columns: number) => {
    const game = currentView.data.games[params.scrollToRow * columns + params.scrollToColumn];
    if (game) {
      onGridGameSelect(game.id, params.scrollToColumn, params.scrollToRow);
    }
  };

  const onListScrollToChange = (row: number) => {
    console.log(row);
    const game = currentView.data.games[row];
    if (game) {
      console.log(game.id);
      onListGameSelect(game.id, row);
    }
  };

  const onSelectPlaylist = (playlistId: string | null) => {
    if (playlistId) {
      window.Shared.back.request(BackIn.GET_PLAYLIST, playlistId)
      .then((playlist) => {
        dispatch(selectPlaylist({
          view: currentView.id,
          playlist
        }));
      });
    } else {
      dispatch(selectPlaylist({
        view: currentView.id,
        playlist: undefined
      }));
    }
  };

  const onLeftSidebarResize = (event: SidebarResizeEvent): void => {
    const maxWidth = (getGameBrowserDivWidth() - browsePageRightSidebarWidth) - 5;
    const targetWidth = event.startWidth + event.event.clientX - event.startX;
    updatePreferencesData({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    });
  };

  const getGameBrowserDivWidth = () => {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(gameBrowserRef.current).width || '', 10);
  };

  const onGridGameSelect = async (gameId?: string, col?: number, row?: number): Promise<void> => {
    if (currentView.selectedGame?.id !== gameId && gameId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, gameId);
      if (game) {
        if (col !== undefined && row !== undefined) {
          dispatch(setGridScroll({
            view: currentView.id,
            col,
            row
          }));
        }
        dispatch(selectGame({
          view: currentView.id,
          game,
        }));
      }
    }
  };


  const onListGameSelect = async (gameId?: string, row?: number): Promise<void> => {
    if (currentView.selectedGame?.id !== gameId && gameId) {
      const game = await window.Shared.back.request(BackIn.GET_GAME, gameId);
      if (game) {
        if (row !== undefined) {
          dispatch(setListScroll({
            view: currentView.id,
            row
          }));
        }
        dispatch(selectGame({
          view: currentView.id,
          game,
        }));
      }
    }
  };

  const onGameLaunch = async (gameId: string, override: GameLaunchOverride): Promise<void> => {
    await window.Shared.back.request(BackIn.LAUNCH_GAME, gameId, override);
  };

  const onGameDragStart = (event: React.DragEvent, dragEventData: GameDragEventData): void => {
    const data: GameDragData = {
      ...dragEventData,
      sourceTable: sourceTable
    };
    console.log(data);
    setDraggedGameIndex(dragEventData.index);
    event.dataTransfer.setData(gameDragDataType, JSON.stringify(data));
  };

  const onGameDragEnd = (event: React.DragEvent): void => {
    setDraggedGameIndex(null);
    event.dataTransfer.clearData(gameDragDataType);
  };

  const onMovePlaylistGame = async (sourceGameId: string, destGameId: string): Promise<void> => {
    props.onMovePlaylistGame(sourceGameId, destGameId);
  };

  // -- Left Sidebar --

  const onSavePlaylist = (): void => {
    if (currentPlaylist) {
      window.Shared.back.request(BackIn.SAVE_PLAYLIST, currentPlaylist)
      .then((data) => {
        dispatch(selectPlaylist({
          view: currentView.id,
          playlist: data
        }));
        onUpdatePlaylist(data);
      });
      setIsEditingPlaylist(false);
      setIsNewPlaylist(false);
    }
  };

  const onImportPlaylistClick = (strings: LangContainer): void => {
    const filePath = remote.dialog.showOpenDialogSync({
      title: strings.dialog.selectPlaylistToImport,
      defaultPath: 'playlists',
      filters: [{
        name: 'Playlist file',
        extensions: ['json'],
      }]
    });
    if (filePath) {
      window.Shared.back.send(BackIn.IMPORT_PLAYLIST, filePath[0], currentView.id);
    }
  };

  const onCreatePlaylistClick = (): void => {
    const contextButtons: MenuItemConstructorOptions[] = [{
      label: 'Create Empty Playlist',
      click: () => {
        setCurrentPlaylist({
          filePath: '',
          id: uuid(),
          games: [],
          title: '',
          description: '',
          author: '',
          icon: '',
          library: currentView.id,
          extreme: false
        });
        setIsEditingPlaylist(true);
        setIsNewPlaylist(true);
        if (currentView.selectedPlaylist) {
          onSelectPlaylist(null);
        }
      }
    },
    {
      label: 'Create From Search Results',
      click: () => {
        window.Shared.back.request(BackIn.BROWSE_ALL_RESULTS, {
          ...currentView.searchFilter,
          slim: true,
        })
        .then((games) => {
          setCurrentPlaylist({
            filePath: '',
            id: uuid(),
            games: games.map(g => ({
              gameId: g.id,
              notes: '',
            })),
            title: '',
            description: '',
            author: '',
            icon: '',
            library: currentView.id,
            extreme: false
          });
          setIsEditingPlaylist(true);
          setIsNewPlaylist(true);
          if (currentView.selectedPlaylist) {
            onSelectPlaylist(null);
          }
        });
      }
    }];
    const menu = remote.Menu.buildFromTemplate(contextButtons);
    menu.popup({ window: remote.getCurrentWindow() });
  };

  const onDiscardPlaylistClick = (): void => {
    setIsEditingPlaylist(false);
    setIsNewPlaylist(false);
    if (isNewPlaylist) {
      setCurrentPlaylist(null);
    }
  };

  const onDeletePlaylist = (): void => {
    if (currentPlaylist) {
      const playlistId = currentPlaylist.id;
      window.Shared.back.request(BackIn.DELETE_PLAYLIST, playlistId)
      .then((data) => {
        onSelectPlaylist(null);
        if (data) {
          // DB wipes it, need it to remove it locally
          data.id = playlistId;
          props.onDeletePlaylist(data);
        }
      });
    }
  };

  const onEditPlaylistClick = () => {
    if (currentPlaylist) {
      setIsEditingPlaylist(true);
      setIsNewPlaylist(false);
    }
  };

  const onPlaylistDrop = (event: React.DragEvent, playlistId: string) => {
    if (!isEditingPlaylist) {
      const rawData = event.dataTransfer.getData(gameDragDataType);
      if (rawData) {
        const dragData = JSON.parse(rawData) as GameDragData;
        window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, dragData.gameId);
      }
    }
  };

  const onPlaylistClick = (playlistId: string, selected: boolean): void => {
    if (!isEditingPlaylist || !selected) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        setCurrentPlaylist(playlist);
        setIsEditingPlaylist(false);
        setIsNewPlaylist(false);
      }
      onSelectPlaylist(playlistId);
    }
  };

  const onPlaylistSetIcon = () => {
    if (currentPlaylist && isEditingPlaylist) {
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
          if (currentPlaylist) {
            setCurrentPlaylist({
              ...currentPlaylist,
              icon: dataUrl + ''
            });
          }
        })
        .catch((err) => {
          log.error('Launcher', 'Error fetching playlist icon: ' + err);
        });
      }
    }
  };

  const onPlaylistTitleChange = (event: React.ChangeEvent<InputElement>) => {
    if (currentPlaylist) {
      setCurrentPlaylist({
        ...currentPlaylist,
        title: event.target.value
      });
    }
  };

  const onPlaylistAuthorChange = (event: React.ChangeEvent<InputElement>) => {
    if (currentPlaylist) {
      setCurrentPlaylist({
        ...currentPlaylist,
        author: event.target.value
      });
    }
  };

  const onPlaylistDescriptionChange = (event: React.ChangeEvent<InputElement>) => {
    if (currentPlaylist) {
      setCurrentPlaylist({
        ...currentPlaylist,
        description: event.target.value
      });
    }
  };

  const onPlaylistExtremeToggle = (isChecked: boolean) => {
    if (currentPlaylist) {
      setCurrentPlaylist({
        ...currentPlaylist,
        extreme: isChecked
      });
    }
  };

  const onPlaylistKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') { onSavePlaylist(); }
  };

  const onLeftSidebarShowAllClick = (): void => {
    onSelectPlaylist(null);
    setIsEditingPlaylist(false);
    setIsNewPlaylist(false);
    setCurrentPlaylist(null);
  };

  const onDuplicatePlaylist = (playlistId: string): void => {
    window.Shared.back.send(BackIn.DUPLICATE_PLAYLIST, playlistId);
  };

  const onDownloadPlaylistContents = (playlistId: string): void => {
    window.Shared.back.send(BackIn.DOWNLOAD_PLAYLIST_CONTENTS, playlistId);
  };

  const onExportPlaylist = (strings: LangContainer, playlistId: string): void => {
    const playlist = playlists.find(p => p.id === playlistId);
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

  const noRowsRenderer = () => {
    return (
      <div className='game-list__no-games'>
        {currentView.data.total !== undefined ?
          currentView.selectedPlaylist ?
            currentView.selectedPlaylist.games.length === 0 ?
              /* Empty Playlist */
              <>
                <h2 className='game-list__no-games__title'>{strings.browse.emptyPlaylist}</h2>
                <br />
                <p>{formatString(strings.browse.dropGameOnLeft, <i>{strings.browse.leftSidebar}</i>)}</p>
              </>
              :
              <>
                <h2 className='game-list__no-games__title'>{strings.browse.noGamesFoundInsidePlaylist}</h2>
                <br />
                <p>{strings.browse.noGameMatchedSearch}</p>
              </>
            : (
              /* Empty regular search */
              <>
                <h1 className='game-list__no-games__title'>{strings.browse.noGamesFound}</h1>
                <br />
                {props.gamesTotal !== undefined && props.gamesTotal > 0 ? (
                  <>
                    {strings.browse.noGameMatchedDesc}
                    <br />
                    {strings.browse.noGameMatchedSearch}
                  </>
                ) : (
                  <>{strings.browse.thereAreNoGames}</>
                )}
              </>
            ) : (
            /* Searching */
            <div>
              <h1 className="game-list__no-games__title">{strings.browse.searching}</h1>
              <Spinner />
            </div>
          )}
      </div>
    );
  };

  const onPlaylistContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => {
    if (!isEditingPlaylist || currentView.selectedPlaylist?.id != playlistId) { // Don't export a playlist in the back while it's being edited in the front
      const contextButtons: MenuItemConstructorOptions[] = [{
        label: strings.menu.duplicatePlaylist,
        click: () => {
          onDuplicatePlaylist(playlistId);
        }
      },
      {
        label: strings.menu.exportPlaylist,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        click: () => {
          onExportPlaylist(strings, playlistId);
        },
      }, {
        label: strings.menu.downloadPlaylistContent,
        enabled: true,
        click: () => {
          onDownloadPlaylistContents(playlistId);
        }
      }];

      // Add extension contexts
      for (const contribution of props.contextButtons) {
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

  return (
    <div
      className='game-browser'
      ref={gameBrowserRef}>
      <ResizableSidebar
        show={browsePageShowLeftSidebar}
        divider='after'
        width={browsePageLeftSidebarWidth}
        onResize={onLeftSidebarResize}>
        <ConnectedLeftBrowseSidebar
          library={currentView.id}
          playlists={props.playlists}
          selectedPlaylistID={currentView.selectedPlaylist?.id}
          isEditing={isEditingPlaylist}
          isNewPlaylist={isNewPlaylist}
          currentPlaylist={currentPlaylist}
          playlistIconCache={props.playlistIconCache}
          onDelete={onDeletePlaylist}
          onSave={onSavePlaylist}
          onCreate={onCreatePlaylistClick}
          onImport={() => onImportPlaylistClick(strings)}
          onDiscard={onDiscardPlaylistClick}
          onEditClick={onEditPlaylistClick}
          onDrop={onPlaylistDrop}
          onItemClick={onPlaylistClick}
          onSetIcon={onPlaylistSetIcon}
          onTitleChange={onPlaylistTitleChange}
          onAuthorChange={onPlaylistAuthorChange}
          onDescriptionChange={onPlaylistDescriptionChange}
          onExtremeToggle={onPlaylistExtremeToggle}
          onKeyDown={onPlaylistKeyDown}
          onShowAllClick={onLeftSidebarShowAllClick}
          onDownloadPlaylistContents={onDownloadPlaylistContents}
          onDuplicatePlaylist={onDuplicatePlaylist}
          onExportPlaylist={(playlistId) => onExportPlaylist(strings, playlistId)}
          onContextMenu={onPlaylistContextMenu} />
      </ResizableSidebar>
      <div
        className='game-browser__center'>
        <SearchBar />
        <div className='game-browser__center-results-container'>
          {(() => {
            if (browsePageLayout === BrowsePageLayout.grid) {
              // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
              const height: number = calcScale(350, browsePageGameScale);
              const width: number = (height * 0.666) | 0;
              const gameGridProps = {
                scrollCol: currentView.gridScrollCol,
                scrollRow: currentView.gridScrollRow,
                onScrollToChange: onGridScrollToChange
              };
              return (
                <GameGrid
                  displaySettings={displaySettings}
                  games={currentView.data.games}
                  resultsTotal={currentView.data.total !== undefined ? currentView.data.total : Object.keys(currentView.data.games).length}
                  insideOrderedPlaylist={currentView.selectedPlaylist !== undefined && currentView.advancedFilter.playlistOrder}
                  selectedGameId={currentView.selectedGame?.id}
                  draggedGameIndex={draggedGameIndex}
                  extremeTags={extremeTags}
                  noRowsRenderer={noRowsRenderer}
                  tagGroupIcons={tagGroupIcons}
                  onGameSelect={onGridGameSelect}
                  onGameLaunch={onGameLaunch}
                  onContextMenu={props.onGameContextMenu}
                  onGameDragStart={onGameDragStart}
                  onGameDragEnd={onGameDragEnd}
                  onMovePlaylistGame={onMovePlaylistGame}
                  cellWidth={width}
                  cellHeight={height}
                  logoVersion={props.logoVersion}
                  screenshotPreviewMode={screenshotPreviewMode}
                  screenshotPreviewDelay={screenshotPreviewDelay}
                  hideExtremeScreenshots={hideExtremeScreenshots}
                  updateView={updateViewRange}
                  viewId={currentView.id}
                  {...gameGridProps} />
              );
            } else {
              const height: number = calcScale(30, browsePageGameScale);
              return (
                <GameList
                  displaySettings={displaySettings}
                  sourceTable={sourceTable}
                  games={currentView.data.games}
                  resultsTotal={currentView.data.total !== undefined ? currentView.data.total : Object.keys(currentView.data.games).length}
                  insideOrderedPlaylist={currentView.selectedPlaylist !== undefined && currentView.advancedFilter.playlistOrder}
                  selectedGameId={currentView.selectedGame?.id}
                  draggedGameIndex={draggedGameIndex}
                  showExtremeIcon={browsePageShowExtreme}
                  extremeTags={extremeTags}
                  noRowsRenderer={noRowsRenderer}
                  tagGroupIcons={tagGroupIcons}
                  onGameSelect={onListGameSelect}
                  onGameLaunch={onGameLaunch}
                  onContextMenu={props.onGameContextMenu}
                  onGameDragStart={onGameDragStart}
                  onGameDragEnd={onGameDragEnd}
                  onMovePlaylistGame={onMovePlaylistGame}
                  rowHeight={height}
                  logoVersion={props.logoVersion}
                  updateView={updateViewRange}
                  scrollRow={currentView.listScrollRow}
                  onScrollToChange={onListScrollToChange}
                  viewId={currentView.id} />
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
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
