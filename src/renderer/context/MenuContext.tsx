import { Menu, MenuProps } from '@renderer/components/Menu';
import { createNewDialog } from '@renderer/dialog';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useLocalization } from '@renderer/hooks/useLocalization';
import { setCurrentCuration } from '@renderer/store/curate/slice';
import { getGameImagePath, getGameImageURL, getGamePath, openUrlInWindow } from '@renderer/Util';
import { BackIn } from '@shared/back/types';
import { Paths } from '@shared/Paths';
import { calcScale } from '@shared/Util';
import { DialogStateTemplate, LangContainer, Playlist } from 'flashpoint-launcher';
import { MenuContextStateProps, MenuItemType } from 'flashpoint-launcher-renderer';
import React, { createContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const defaultMenuWidth = 230;
export const menuDefHeight = 26;

type MenuContextProps = {
  children?: React.ReactNode;
}

export type Pointer = {
  x: number;
  y: number;
}

export const MenuContext = createContext<MenuContextStateProps>({
  openMenu: () => {},
  openGameContextMenu: () => {},
  closeMenu: () => {}
});

export function MenuProvider({ children }: MenuContextProps) {
  const [menu, setMenu] = useState<MenuProps>();
  const [style, setStyle] = useState<React.CSSProperties>();
  const menuRef = useRef<HTMLDivElement>(null);
  const strings = useLocalization();
  const dispatch = useAppDispatch();
  const playlists = useAppSelector(state => state.main.playlists);
  const enableEditing = useAppSelector(state => state.preferences.enableEditing);
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);
  const selectedPlaylistId = useAppSelector(state => state.main.selectedPlaylistId);
  const htdocsFolderPath = useAppSelector(state => state.preferences.htdocsFolderPath);
  const dataPacksFolderPath = useAppSelector(state => state.preferences.dataPacksFolderPath);
  const imageFolderPath = useAppSelector(state => state.preferences.imageFolderPath);
  const extContextButtonContribs = useAppSelector(state => state.main.contextButtons);
  const scale = useAppSelector(state => state.preferences.scaleValues.menuItem);
  const menuItemHeight = Math.floor(calcScale(menuDefHeight, scale));
  const navigate = useNavigate();

  const createGameContextMenu = (gameId: string, logoPath: string, screenshotPath: string): MenuItemType[] => {
    const fpfssButtons: MenuItemType[] = fpfssBaseUrl ? [
      {
        /* Edit via FPFSS */
        type: 'button',
        label: strings.browse.editFpfssGame,
        enabled: enableEditing,
        onClick: () => {
          // this.onFpfssEditGame(gameId);
        }
      },
      {
        /* Show on FPFSS */
        type: 'button',
        label: strings.browse.showOnFpfss,
        enabled: enableEditing,
        onClick: () => {
          openUrlInWindow(`${fpfssBaseUrl}/web/game/${gameId}`);
        }
      }
    ] : [];

    let contextButtons: MenuItemType[] = [
      {
        type: 'button',
        label: strings.menu.addToFavorites,
        enabled: playlists.filter(p => p.title.includes('Favorites')).length > 0,
        onClick: () => {
          const playlistId = playlists.filter(p => p.title.includes('Favorites'))[0].id;
          window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId);
        }
      },
      {
        type: 'submenu',
        label: strings.menu.addToPlaylist,
        enabled: playlists.length > 0,
        submenu: UniquePlaylistMenuFactory(playlists,
          strings,
          (playlistId) => window.Shared.back.send(BackIn.ADD_PLAYLIST_GAME, playlistId, gameId),
          selectedPlaylistId)
      }, {
        /* Copy Shortcut URL */
        type: 'button',
        label: strings.menu.copyShortcutURL,
        onClick: () => {
          navigator.clipboard.writeText(`flashpoint://run/${gameId}`);
        }
      },
      {
        /* Copy Game UUID */
        type: 'button',
        label: strings.menu.copyGameUUID,
        onClick: () => {
          navigator.clipboard.writeText(gameId);
        }
      }, { type: 'separator' }, {
        /* File Location */
        type: 'button',
        label: strings.menu.openFileLocation,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        onClick: () => {
          window.Shared.back.request(BackIn.GET_GAME, gameId)
          .then(async (game) => {
            if (game) {
              const gamePath = await getGamePath(game, window.Shared.config.fullFlashpointPath, htdocsFolderPath, dataPacksFolderPath);
              console.log(gamePath);
              if (gamePath) {
                const fileExists = await window.electronAPI?.fileExists(gamePath);
                if (fileExists) {
                  window.electronAPI?.showItemInFolder(gamePath);
                } else {
                  const template: DialogStateTemplate = {
                    largeMessage: true,
                    message: 'GameData has not been downloaded yet, cannot open the file location!',
                    buttons: ['Ok'],
                  };
                  createNewDialog(dispatch, template);
                  return;
                }
              }
            }
          });
        },
      },
      {
        /* Logo Location */
        type: 'button',
        label: strings.menu.openLogoLocation,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        onClick: async () => {
          const fullLogoPath = getGameImagePath(logoPath, imageFolderPath);
          const fileExists = await window.electronAPI?.fileExists(fullLogoPath);
          if (fileExists) {
            window.electronAPI?.showItemInFolder(fullLogoPath);
          } else {
            fetch(getGameImageURL(logoPath))
            .then(() => {
              window.electronAPI?.showItemInFolder(fullLogoPath);
            });
          }
        }
      },
      {
        /* Screenshot Location */
        type: 'button',
        label: strings.menu.openScreenshotLocation,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        onClick: async () => {
          const fullScreenshotPath = getGameImagePath(screenshotPath, imageFolderPath);
          const fileExists = await window.electronAPI?.fileExists(fullScreenshotPath);
          if (fileExists) {
            window.electronAPI?.showItemInFolder(fullScreenshotPath);
          } else {
            fetch(getGameImageURL(logoPath))
            .then(() => {
              window.electronAPI?.showItemInFolder(fullScreenshotPath);
            });
          }
        }
      }, { type: 'separator' }, {
        /* Clear Playtime Tracking */
        type: 'button',
        label: strings.config.clearPlaytimeTracking,
        enabled: !window.Shared.isBackRemote, // (Local "back" only)
        onClick: () => {
          window.Shared.back.send(BackIn.CLEAR_PLAYTIME_TRACKING_BY_ID, gameId);
        }
      }];

    // Add editing mode fields
    if (enableEditing) {
      const editingButtons: MenuItemType[] = [
        {
          /* Load as a curation */
          type: 'button',
          label: strings.menu.makeCurationFromGame,
          enabled: enableEditing,
          onClick: () => {
            window.Shared.back.request(BackIn.CURATE_FROM_GAME, gameId)
            .then((folder) => {
              if (folder) {
                // Select the new curation
                dispatch(setCurrentCuration({
                  folder
                }));
                // Redirect to Curate once it's been made
                navigate(Paths.CURATE);
              } else {
                createNewDialog(dispatch, {
                  message: 'Failed to create curation from this game. No error provided.',
                  largeMessage: true,
                  buttons: ['Ok']
                });
              }
            })
            .catch((err: any) => {
              createNewDialog(dispatch, {
                message: `Failed to create curation from this game.\nError: ${err.toString()}`,
                largeMessage: true,
                buttons: ['Ok']
              });
            });
          }
        }, ...fpfssButtons
      ];
      contextButtons = contextButtons.concat(editingButtons);
    }

    // Add extension contexts
    const extContextButtons: MenuItemType[] = [];
    for (const contribution of extContextButtonContribs) {
      for (const contextButton of contribution.value) {
        if (contextButton.context === 'game') {
          extContextButtons.push({
            type: 'button',
            label: contextButton.name,
            onClick: () => {
              window.Shared.back.request(BackIn.GET_GAME, gameId)
              .then((game) => {
                window.Shared.back.request(BackIn.RUN_COMMAND, contextButton.command, game)
                .catch((error) => {
                  log.error('Launcher', `Failed to run Ext Game command '${contextButton.command}': ${error}`);
                });
              });
            }
          });
        }
      }
    }

    if (extContextButtons.length > 0) {
      contextButtons.push({ type: 'separator' });
      return contextButtons.concat(extContextButtons);
    }
    return contextButtons;
  };

  const openMenu = (newMenu: MenuProps, pointer: Pointer) => {
    const availWidth = document.documentElement.clientWidth;
    const availHeight = document.documentElement.clientHeight;
    const menuWidth = newMenu.width ? newMenu.width * (scale + 0.5) : defaultMenuWidth * (scale + 0.5);

    // Calculate (ignoring rounding errors) pixel height of menu
    const menuHeight = 10 + Math.floor(newMenu.items.reduce((prev, cur) => {
      if (cur.type === 'submenu') {
        return prev;
      }
      if (cur.type !== 'separator') {
        return prev + menuItemHeight;
      }
      return prev + (menuItemHeight * 0.5);
    }, 0));

    const style: React.CSSProperties = {};
    // If there's not enough room, render above the cursor instead of below
    if (pointer.y + menuHeight > availHeight) {
      style.top = pointer.y - menuHeight;
    } else {
      style.top = pointer.y;
    }
    if (pointer.x + menuWidth > availWidth) {
      style.left = pointer.x - menuWidth;
    } else {
      style.left = pointer.x;
    }

    setStyle(style);
    setMenu(newMenu);
  };

  const openGameContextMenu = (gameId: string, logoPath: string, screenshotPath: string, pointer: Pointer) => {
    const contextButtons = createGameContextMenu(gameId, logoPath, screenshotPath);
    openMenu({ items: contextButtons }, pointer);
  };

  const closeMenu = () => {
    setMenu(undefined);
  };

  useEffect(() => {
    if (menu && menuRef.current) {
      menuRef.current.focus();
    }
  }, [menu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (menu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menu]);

  return (
    <MenuContext.Provider value={{
      openMenu,
      openGameContextMenu,
      closeMenu,
    }}>
      {children}
      { menu !== undefined && (
        <div
          className='context-menu'
          ref={menuRef}
          style={style}
          onClick={closeMenu}
          tabIndex={-1}>
          <Menu {...menu} />
        </div>
      )}
    </MenuContext.Provider>
  );
}

export function getPointer(event: React.MouseEvent): Pointer {
  return {
    x: event.pageX,
    y: event.pageY
  };
}

type MenuItemLibrary = MenuItemType & {
  library: string;
}

function UniquePlaylistMenuFactory(playlists: Playlist[], strings: LangContainer, onClick: (playlistId: string) => any, selectedPlaylistId?: string): MenuItemType[] {
  const grouped: Array<MenuItemLibrary> = [];
  for (const p of playlists.filter(p => p.id != selectedPlaylistId)) {
    let group = grouped.find(g => g.library === p.library);
    if (!group) {
      group = {
        type: 'submenu',
        library: p.library,
        enabled: true,
        label: strings.libraries[p.library] || p.library,
        submenu: []
      };
      grouped.push(group);
    }
    if (group.type === 'submenu' && group.submenu && Array.isArray(group.submenu)) {
      group.submenu.push({
        type: 'button',
        label: p.title || 'No Title',
        enabled: true,
        onClick: () => onClick(p.id)
      });
    }
  }
  return grouped;
}
