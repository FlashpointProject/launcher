import { createSelector } from '@reduxjs/toolkit';
import { SearchBar } from '@renderer/components/SearchBar';
import { getPointer } from '@renderer/context/MenuContext';
import { createErrorDialogWithPrefix } from '@renderer/dialog';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { setMainState, updatePlaylist } from '@renderer/store/main/slice';
import { updatePreferences } from '@renderer/store/preferences/slice';
import { forceSearch, movePlaylistGame, RequestState, selectPlaylist } from '@renderer/store/search/slice';
import { RootState } from '@renderer/store/store';
import { BackIn } from '@shared/back/types';
import { BrowsePageLayout } from '@shared/BrowsePageLayout';
import { sanitizeFilename } from '@shared/utils/sanitizeFilename';
import { uuid } from '@shared/utils/uuid';
import { LangContainer, Playlist } from 'flashpoint-launcher';
import { BrowsePageDisplayProps, InputElement, MenuItemType } from 'flashpoint-launcher-renderer';
import * as React from 'react';
import { RefObject, useRef, useState } from 'react';
import { createDataDownloadJson, gameDragDataType } from '../../Util';
import { WebgameBrowsePageDisplayGrid, WebgameBrowsePageDisplayList } from '../BrowsePageDisplay';
import { useFileLoader } from '../FileLoader';
import { LeftBrowseSidebar } from '../LeftBrowseSidebar';
import { ResizableSidebar, SidebarResizeEvent } from '../ResizableSidebar';

export type GameDragEventData = {
  sourceId: string;
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
  viewName: string;
  sourceTable: string;
};

const selectPlaylists = createSelector(
  [(state: RootState) => state.main.playlists],
  (playlists) => {
    return [...playlists].sort((a, b) => {
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });
  }
);

export function BrowsePage(props: BrowsePageProps) {
  const { viewName } = props;
  const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
  const [isNewPlaylist, setIsNewPlaylist] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const gameBrowserRef: RefObject<HTMLDivElement | null> = useRef(null);
  const dispatch = useAppDispatch();
  const strings = useLocalization();
  const useCustomViews = useAppSelector(state => state.preferences.useCustomViews);
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const browsePageLayout = useAppSelector(state => state.preferences.browsePageLayout);
  const browsePageShowLeftSidebar = useAppSelector(state => state.preferences.browsePageShowLeftSidebar);
  const browsePageLeftSidebarWidth = useAppSelector(state => state.preferences.browsePageLeftSidebarWidth);
  const browsePageRightSidebarWidth = useAppSelector(state => state.preferences.browsePageRightSidebarWidth);
  const extContextButtons = useAppSelector(state => state.main.contextButtons);
  const logoVersion = useAppSelector(state => state.main.logoVersion);
  const playlists = useAppSelector(selectPlaylists);
  const playlistIconCache = useAppSelector(state => state.main.playlistIconCache);
  const { fileLoader, openFileSelect } = useFileLoader();
  const extremeTags = tagFilters.filter(t => !t.enabled && t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);
  const { openMenu, openGameContextMenu } = useContextMenu();

  const selectedContentId = useAppSelector(state => state.search.views[viewName].selectedGame?.id);
  const selectedPlaylist = useAppSelector(state => state.search.views[viewName].selectedPlaylist);
  const usingPlaylistOrder = useAppSelector(state => state.search.views[viewName].advancedFilter.playlistOrder);
  const searchMetaState = useAppSelector(state => state.search.views[viewName].data.metaState);
  const searchFilter = useAppSelector(state => state.search.views[viewName].searchFilter);
  const content = useAppSelector(state => state.search.views[viewName].data.content);
  const contentTotal = useAppSelector(state => state.search.views[viewName].data.total);
  const searchId = useAppSelector(state => state.search.views[viewName].data.searchId);

  const onGameContextMenu = (event: React.MouseEvent, sourceId: string, gameId: string, logoPath: string, screenshotPath: string) => {
    openGameContextMenu(sourceId, gameId, logoPath, screenshotPath, getPointer(event));
  };

  const onMovePlaylistGame = (sourceGameId: string, destGameId: string) => {
    if (selectedPlaylist && usingPlaylistOrder && (sourceGameId !== destGameId)) {
      dispatch(movePlaylistGame({
        view: viewName,
        sourceGameId,
        destGameId,
      }));
    }
  };

  React.useEffect(() => {
    // Force the first search if view hasn't been used yet
    if (searchMetaState === RequestState.WAITING) {
      dispatch(forceSearch({
        view: viewName,
        useCustomViews: useCustomViews,
      }));
    }
  });

  React.useEffect(() => {
    setCurrentPlaylist(selectedPlaylist || null);
  }, [selectedPlaylist]);

  // Callbacks

  const onSelectPlaylist = (playlistId: string | null) => {
    if (playlistId) {
      window.Shared.back.request(BackIn.GET_PLAYLIST, playlistId)
      .then((playlist) => {
        dispatch(selectPlaylist({
          view: viewName,
          playlist
        }));
      });
    } else {
      dispatch(selectPlaylist({
        view: viewName,
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
      dispatch(updatePlaylist(currentPlaylist));
      window.Shared.back.send(BackIn.SAVE_PLAYLIST, currentPlaylist);
      setIsEditingPlaylist(false);
      setIsNewPlaylist(false);
    }
  };

  const onImportPlaylistClick = (strings: LangContainer): void => {
    openFileSelect((fileList) => {
      if (fileList && fileList.length > 0) {
        const file = fileList[0];
        if (!file.name.toLowerCase().endsWith('.json')) {
          alert('Not a JSON file, ignoring...');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          window.Shared.back.send(BackIn.IMPORT_PLAYLIST, reader.result as string, viewName);
        };
        reader.onerror = () => {
          alert('Error reading the file. Please try again.');
        };
        reader.readAsText(file);
      }
    }, {
      accept: '.json'
    });
  };

  const onCreatePlaylistClick = (event: React.MouseEvent): void => {
    const contextButtons: MenuItemType[] = [{
      type: 'button',
      label: 'Create Empty Playlist',
      onClick: () => {
        setCurrentPlaylist({
          filePath: '',
          id: uuid(),
          games: [],
          title: '',
          description: '',
          author: '',
          icon: '',
          library: viewName,
          extreme: false
        });
        setIsEditingPlaylist(true);
        setIsNewPlaylist(true);
        if (selectedPlaylist) {
          onSelectPlaylist(null);
        }
      }
    },
    {
      type: 'button',
      label: 'Create From Search Results',
      onClick: () => {
        window.Shared.back.request(BackIn.BROWSE_ALL_RESULTS, {
          ...searchFilter,
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
            library: viewName,
            extreme: false
          });
          setIsEditingPlaylist(true);
          setIsNewPlaylist(true);
          if (selectedPlaylist) {
            onSelectPlaylist(null);
          }
        });
      }
    }];

    openMenu({ items: contextButtons }, getPointer(event));
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
      .then(() => {
        onSelectPlaylist(null);
        // DB wipes it, need it to remove it locally
        const index = playlists.findIndex(p => p.id === playlistId);
        if (index >= 0) {
          const newPlaylists = [...playlists];
          newPlaylists.splice(index, 1);

          const cache: Record<string, string> = { ...playlistIconCache };
          const id = newPlaylists[index].id;
          if (id in cache) { delete cache[id]; }

          dispatch(setMainState({
            playlists: playlists,
            playlistIconCache: cache
          }));
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

  const onPlaylistSetIcon = async () => {
    if (currentPlaylist && isEditingPlaylist) {
      // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
      const filePaths = await window.electronAPI?.showOpenDialog({
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
    window.Shared.back.request(BackIn.DOWNLOAD_PLAYLIST_CONTENTS, playlistId)
    .catch(createErrorDialogWithPrefix('Failed to download playlist'));
  };

  const onExportPlaylist = (playlistId: string): void => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      let cleanName = sanitizeFilename(playlist.title);
      if (cleanName.length === 0) {
        cleanName = 'playlist';
      }
      createDataDownloadJson(playlist, `${cleanName}.json`);
    }
  };

  const onPlaylistContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, playlistId: string) => {
    if (!isEditingPlaylist || selectedPlaylist?.id != playlistId) { // Don't export a playlist in the back while it's being edited in the front
      const contextButtons: MenuItemType[] = [{
        type: 'button',
        label: strings.menu.duplicatePlaylist,
        onClick: () => {
          onDuplicatePlaylist(playlistId);
        }
      },
      {
        type: 'button',
        label: strings.menu.exportPlaylist,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        onClick: () => {
          onExportPlaylist(playlistId);
        },
      }, {
        type: 'button',
        label: strings.menu.downloadPlaylistContent,
        enabled: true,
        onClick: () => {
          onDownloadPlaylistContents(playlistId);
        }
      }];

      // Add extension contexts
      for (const contribution of extContextButtons) {
        for (const contextButton of contribution.value) {
          if (contextButton.context === 'playlist') {
            contextButtons.push({
              type: 'button',
              label: contextButton.name,
              onClick: () => {
                window.Shared.back.request(BackIn.GET_PLAYLIST, playlistId)
                .then(playlist => {
                  window.Shared.back.request(BackIn.RUN_COMMAND, contextButton.command, playlist)
                  .catch(createErrorDialogWithPrefix(`Failed to run Ext Playlist command '${contextButton.command}`));
                });
              }
            });
          }
        }
      }

      openMenu({ items: contextButtons }, getPointer(event));
    }
  };

  return (
    <div
      className='game-browser'
      ref={gameBrowserRef}>
      {fileLoader}
      <ResizableSidebar
        show={browsePageShowLeftSidebar}
        divider='after'
        width={browsePageLeftSidebarWidth}
        onResize={onLeftSidebarResize}>
        <LeftBrowseSidebar
          library={viewName}
          playlists={playlists}
          isEditing={isEditingPlaylist}
          isNewPlaylist={isNewPlaylist}
          currentPlaylist={currentPlaylist}
          playlistIconCache={playlistIconCache}
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
          onExportPlaylist={(playlistId) => onExportPlaylist(playlistId)}
          onContextMenu={onPlaylistContextMenu} />
      </ResizableSidebar>
      <div
        className='game-browser__center'>
        <SearchBar />
        <div className='game-browser__center-results-container'>
          {(() => {
            const displayProps: BrowsePageDisplayProps<any> = {
              viewId: viewName,
              searchId,
              content,
              contentTotal,
              selectedContentId: selectedContentId,
              selectedPlaylist: selectedPlaylist,
              playlistOrder: usingPlaylistOrder,
              logoVersion,
              extremeTags,
              onContextMenu: onGameContextMenu,
              onMovePlaylistEntry: onMovePlaylistGame,
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
