import * as remote from '@electron/remote';
import { SearchBar } from '@renderer/components/SearchBar';
import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { forceSearch, RequestState, selectPlaylist } from '@renderer/store/search/slice';
import { BackIn } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { ExtensionContribution } from '@shared/extensions/interfaces';
import { uuid } from '@shared/utils/uuid';
import { Menu, MenuItemConstructorOptions } from 'electron';
import { LangContainer, Playlist } from 'flashpoint-launcher';
import { BrowsePageDisplayProps } from 'flashpoint-launcher-renderer';
import * as path from 'path';
import * as React from 'react';
import { RefObject, useRef, useState } from 'react';
import { gameDragDataType } from '../../Util';
import { LangContext } from '../../util/lang';
import { WebgameBrowsePageDisplayGrid, WebgameBrowsePageDisplayList } from '../BrowsePageDisplay';
import { InputElement } from '../InputField';
import { LeftBrowseSidebar } from '../LeftBrowseSidebar';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';
import { updatePreferences } from '@renderer/store/preferences/slice';

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

export type BrowsePageProps = {
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

export type BrowsePageState = {
  /** Currently dragged game (if any). */
  draggedGameIndex: number | null;

  /** Buffer for the selected playlist (all changes are made to this until saved). */
  currentPlaylist?: Playlist;
  isEditingPlaylist: boolean;
  isNewPlaylist: boolean;
};

export function BrowsePage(props: BrowsePageProps) {
  const { onUpdatePlaylist, playlists } = props;
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [isNewPlaylist, setIsNewPlaylist] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const gameBrowserRef: RefObject<HTMLDivElement | null> = useRef(null);
  const dispatch = useAppDispatch();
  const strings = React.useContext(LangContext);
  const useCustomViews = useAppSelector(state => state.preferences.useCustomViews);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const browsePageLayout = useAppSelector(state => state.preferences.browsePageLayout);
  const browsePageShowLeftSidebar = useAppSelector(state => state.preferences.browsePageShowLeftSidebar);
  const browsePageLeftSidebarWidth = useAppSelector(state => state.preferences.browsePageLeftSidebarWidth);
  const browsePageRightSidebarWidth = useAppSelector(state => state.preferences.browsePageRightSidebarWidth);
  const currentView = useView();
  const extremeTags = tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

  React.useEffect(() => {
    // Force the first search if view hasn't been used yet
    if (currentView.data.metaState === RequestState.WAITING) {
      // console.log('loading view ' + this.props.currentView.id);
      dispatch(forceSearch({
        view: currentView.id,
        useCustomViews: useCustomViews,
      }));
    }
  });

  React.useEffect(() => {
    setCurrentPlaylist(currentView.selectedPlaylist || null);
  }, [currentView.selectedPlaylist]);

  // Callbacks

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
    dispatch(updatePreferences({
      browsePageLeftSidebarWidth: Math.min(targetWidth, maxWidth)
    }));
  };

  const getGameBrowserDivWidth = () => {
    if (!document.defaultView) { throw new Error('"document.defaultView" missing.'); }
    if (!gameBrowserRef.current) { throw new Error('"game-browser" div is missing.'); }
    return parseInt(document.defaultView.getComputedStyle(gameBrowserRef.current).width || '', 10);
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
        <LeftBrowseSidebar
          library={currentView.id}
          playlists={props.playlists}
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
            const displayProps: BrowsePageDisplayProps<any> = {
              view: currentView,
              logoVersion: props.logoVersion,
              extremeTags,
              onMovePlaylistEntry: props.onMovePlaylistGame,
            };

            if (browsePageLayout === BrowsePageLayout.grid) {
              return (
                <WebgameBrowsePageDisplayGrid
                  {...displayProps} />
              );
            } else {
              return (
                <WebgameBrowsePageDisplayList
                  {...displayProps} />
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
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
