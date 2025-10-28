import { getPointer } from '@renderer/context/MenuContext';
import { useView } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { useConfirmDialog } from '@renderer/hooks/useConfirmDialog';
import { useContextMenu } from '@renderer/hooks/useContextMenu';
import { createFpfssEditGame, saveFpfssEdit } from '@renderer/store/fpfss/slice';
import { getLastValidPage } from '@renderer/store/history/slice';
import { removePlaylistGame, setMainState } from '@renderer/store/main/slice';
import { deleteView, forceSearch, selectGame, selectPlaylist, setEditing, setSearchText, updateEditGame, updateGame } from '@renderer/store/search/slice';
import { LangContext } from '@renderer/util/lang';
import { ArchiveState, BackIn } from '@shared/back/types';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { PickType, ProcessAction } from '@shared/interfaces';
import { Paths } from '@shared/Paths';
import { sizeToString } from '@shared/Util';
import { isGame } from '@shared/utils/misc';
import { formatString } from '@shared/utils/StringFormatter';
import { Game, GameLaunchOverride, LangContainer, Playlist, PlaylistGame, ResultsView } from 'flashpoint-launcher';
import { GameComponentProps } from 'flashpoint-launcher-renderer';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Location, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { axios, getGameImagePath, getGameImageURL, launchGame, openUrlInWindow, wrapSearchTerm } from '../Util';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { DynamicComponent } from './DynamicComponent';
import { selectGameField } from './GameComponents';
import { GameDataBrowser } from './GameDataBrowser';
import { GameImageSplit } from './GameImageSplit';
import { ImagePreview } from './ImagePreview';
import { InputElement, InputField } from './InputField';
import { MenuItemType } from './Menu';
import { OpenIcon } from './OpenIcon';
import { SimpleButton } from './SimpleButton';

export type RightBrowseSidebarProps = {
  /** Currently selected game (if any) */
  game?: Game;
  /** Currently selected playlist (if any) */
  playlist?: Playlist;
  /** Whether the current game is extreme */
  isExtreme: boolean;
  /** Is the current game running? */
  gameRunning: boolean;
  /* Current Library */
  library: string;
  /** Called when the play button is pressed */
  onGameLaunch: (gameId: string, override: GameLaunchOverride) => Promise<void>;
  /** Called when the selected game is deleted by this */
  onDeleteSelectedGame: () => void;
  /** Called when a playlist is deselected (searching game fields) */
  onDeselectPlaylist: () => void;

  onRemovePlaylistGame: (playlistGame: PlaylistGame) => void;
  onEditClick: () => void;
  onDiscardClick: () => void;
  onSaveGame: () => void;

  onFpfssEditGame: (gameId: string) => void;
  onEditGame: (game: Partial<Game>) => void;
  onUpdateActiveGameData: (activeDataOnDisk: boolean, activeDataId?: number) => void;

  fpfssEditMode?: boolean;
};

function DeleteGameButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): React.JSX.Element {
  return (
    <div
      className='browse-right-sidebar__title-row__buttons__delete-game'
      title={extra.deleteGameAndAdditionalApps}
      onClick={confirm} >
      <OpenIcon icon='trash' />
    </div>
  );
}

function RemoveFromPlaylistButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): React.JSX.Element {
  return (
    <div
      className='browse-right-sidebar__title-row__buttons__remove-from-playlist'
      title={extra.removeGameFromPlaylist}
      onClick={confirm} >
      <OpenIcon icon='circle-x' />
    </div>
  );
}

type RightBrowseSidebarViewProps = {
  view: ResultsView<any>;
}

type RightBrowseSidebarFpfssProps = {
  view: ResultsView<Game>;
}

export function RightBrowseSidebarFpfss({ view }: RightBrowseSidebarFpfssProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const extremeTags = tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

  const onEditGame = (game: Partial<Game>) => {
    dispatch(updateEditGame({
      view: view.id,
      game
    }));
  };

  const onSaveGame = () => {
    dispatch(getLastValidPage()).unwrap()
    .then((validLoc?: Location) => {
      if (validLoc !== undefined) {
        navigate(validLoc.pathname);
      } else {
        navigate(Paths.HOME);
      }
    })
    .then(() => {
      setTimeout(() => {
        dispatch(saveFpfssEdit(view.id));
      }, 200);
    });
  };

  const onDiscardGame = () => {
    dispatch(getLastValidPage()).unwrap()
    .then((validLoc?: Location) => {
      if (validLoc !== undefined) {
        navigate(validLoc.pathname);
      } else {
        navigate(Paths.HOME);
      }
    })
    .then(() => {
      setTimeout(() => {
        dispatch(deleteView({ view: view.id }));
      }, 200);
    });
  };

  return (
    <RightBrowseSidebar
      game={view.selectedGame as Game}
      playlist={view.selectedPlaylist}
      isExtreme={isGame(view.selectedGame) ? view.selectedGame.tags.reduce<boolean>((prev, next) => extremeTags.includes(next) || prev, false) : false}
      gameRunning={false}
      library={view.id}
      onGameLaunch={async () => {}}
      onDeleteSelectedGame={() => {}}
      onDeselectPlaylist={() => {}}
      onRemovePlaylistGame={() => {}}
      onEditClick={() => {}}
      onDiscardClick={onDiscardGame}
      onSaveGame={onSaveGame}
      onFpfssEditGame={() => {}}
      onEditGame={onEditGame}
      onUpdateActiveGameData={() => {}}
    />
  );
}

export function RightBrowseSidebarView({ view }: RightBrowseSidebarViewProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const tagFilters = useAppSelector(state => state.preferences.tagFilters);
  const playlistEntry = useAppSelector(state => state.main.currentPlaylistEntry);
  const selectedPlaylistId = useAppSelector(state => state.main.selectedPlaylistId);
  const strings = useContext(LangContext);
  const gameRunning = useAppSelector(state => {
    if (view.selectedGame) {
      return state.main.services.findIndex(s => s.id === `game.${view.selectedGame.id}`) > -1;
    } else {
      return false;
    }
  });
  const extremeTags = tagFilters.filter(t => t.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), []);

  // Hide if nothing to show
  if (!view.selectedGame) {
    return <></>;
  }

  const onGameLaunch = async (gameId: string, override: GameLaunchOverride) => {
    launchGame(dispatch, gameId, override);
  };

  const onDeleteSelectedGame = async () => {
    dispatch(selectGame({
      view: view.id,
      game: undefined
    }));
    window.Shared.back.request(BackIn.DELETE_GAME, view.selectedGame.id)
    .catch((error) => {
      log.error('Launcher', `Error deleting game: ${error}`);
      alert(strings.dialog.unableToDeleteGame + '\n\n' + error);
    });
  };

  const onDeselectPlaylist = () => {
    dispatch(selectPlaylist({
      view: view.id,
      playlist: undefined
    }));
  };

  const onRemovePlaylistGame = async (playlistGame: PlaylistGame) => {
    // Remove game from playlist
    if (view.selectedPlaylist) {
      await window.Shared.back.request(BackIn.DELETE_PLAYLIST_GAME, view.selectedPlaylist.id, playlistGame.gameId);
      // Remove from playlist on frontend
      dispatch(removePlaylistGame({
        viewId: view.id,
        playlistId: view.selectedPlaylist.id,
        gameId: playlistGame.gameId
      }));
    } else {
      console.error('Unable to remove game from selected playlist - No playlist is selected?');
      return;
    }

    dispatch(setMainState({
      isEditingGame: false
    }));
  };

  const onEditClick = () => {
    dispatch(setEditing({
      view: view.id,
      editing: true
    }));
  };

  const onDiscardClick = () => {
    dispatch(setEditing({
      view: view.id,
      editing: false
    }));
  };

  const onSaveGame = async () => {
    if (view.editingGame) {
      window.Shared.back.request(BackIn.SAVE_GAME, view.editingGame)
      .then(() => {
        // Exit editing mode
        if (selectedPlaylistId && playlistEntry) {
          window.Shared.back.send(BackIn.SAVE_PLAYLIST_GAME, selectedPlaylistId, playlistEntry);
        }
      });
    }
    // Push update to all views
    dispatch(updateGame(view.editingGame));
    // Exit editing mode
    dispatch(setEditing({
      view: view.id,
      editing: false
    }));
  };

  const onFpfssEditGame = async (gameId: string) => {
    dispatch(createFpfssEditGame(gameId)).unwrap()
    .then(() => {
      navigate(Paths.FPFSS + '/' + gameId);
    })
    .catch((error) => {
      log.error('FPFSS', error.message);
      toast(error.message, {
        type: 'error',
        autoClose: false
      });
    });
  };

  const onEditGame = (game: Partial<Game>) => {
    game.id = view.editingGame?.id;
    dispatch(updateEditGame({
      view: view.id,
      game
    }));
  };

  const onUpdateActiveGameData = async (onDisk: boolean, dataId?: number) => {
    const game = await window.Shared.back.request(BackIn.GET_GAME, view.selectedGame.id);
    if (game) {
      game.activeDataOnDisk = onDisk;
      game.activeDataId = dataId;
      if (view.selectedGame.id === game.id) {
        dispatch(updateGame(game));
      }
      window.Shared.back.request(BackIn.SAVE_GAME, game);
    }
  };

  return (
    <RightBrowseSidebar
      game={view.selectedGame}
      playlist={view.selectedPlaylist}
      isExtreme={isGame(view.selectedGame) ? view.selectedGame.tags.reduce<boolean>((prev, next) => extremeTags.includes(next) || prev, false) : false}
      gameRunning={gameRunning}
      library={view.id}
      onGameLaunch={onGameLaunch}
      onDeleteSelectedGame={onDeleteSelectedGame}
      onDeselectPlaylist={onDeselectPlaylist}
      onRemovePlaylistGame={onRemovePlaylistGame}
      onEditClick={onEditClick}
      onDiscardClick={onDiscardClick}
      onSaveGame={onSaveGame}
      onFpfssEditGame={onFpfssEditGame}
      onEditGame={onEditGame}
      onUpdateActiveGameData={onUpdateActiveGameData}
    />
  );
}

export function RightBrowseSidebar(props: RightBrowseSidebarProps) {
  const allStrings = useContext(LangContext);
  const editingDisabled = useAppSelector(state => !state.preferences.enableEditing);
  const fpfssBaseUrl = useAppSelector(state => state.preferences.fpfssBaseUrl);
  const hideScreenshotSidebar = useAppSelector(state => state.preferences.hideScreenshotSidebar);
  const hideExtremeScreenshots = useAppSelector(state => state.preferences.hideExtremeScreenshots);
  const useCustomViews = useAppSelector(state => state.preferences.useCustomViews);
  const imageFolderPath = useAppSelector(state => state.preferences.imageFolderPath);
  const gameSidebarMiddle = useAppSelector(state => state.main.displaySettings.gameSidebar.middle);
  const gameSidebarBottom = useAppSelector(state => state.main.displaySettings.gameSidebar.bottom);
  const suggestions = useAppSelector(state => state.main.suggestions);
  const busyGames = useAppSelector(state => state.main.busyGames);
  const currentView = useView();
  const { isEditing } = currentView;
  const dispatch = useAppDispatch();
  const { openMenu } = useContextMenu();
  const { openConfirmDialog } = useConfirmDialog();
  const strings = allStrings.browse;
  const { game, playlist, gameRunning, library, fpfssEditMode, isExtreme,
    onGameLaunch, onEditGame, onUpdateActiveGameData, onDeselectPlaylist,
    onDiscardClick, onFpfssEditGame, onSaveGame, onEditClick, onDeleteSelectedGame,
    onRemovePlaylistGame,
  } = props;
  const [playlistGame, setPlaylistGame] = useState<PlaylistGame | null>(null);
  const [gameDataBrowserOpen, setGameDataBrowserOpen] = useState(false);
  const [showExtremeScreenshot, setShowExtremeScreenshot] = useState(!hideExtremeScreenshots);
  const [showPreview, setShowPreview] = useState(false);

  const gameTitle = useAppSelector(selectGameField(currentView.id, 'title'));
  const gameDeveloper = useAppSelector(selectGameField(currentView.id, 'developer'));
  const gameLibrary = useAppSelector(selectGameField(currentView.id, 'library'));

  const lastGameId = useRef(game?.id);
  const lastPlaylistId = useRef(playlist?.id);

  const activeData = game?.gameData?.find(d => d.id === game?.activeDataId);

  const setPlaylistGameResponse = useEffectEvent((gameId: string, playlistId: string, newPlaylistGame: PlaylistGame | null) => {
    if (gameId !== game?.id || playlistId !== playlist?.id) {
      return;
    }
    setPlaylistGame(newPlaylistGame);
  });

  useEffect(() => {
    let playlistChanged = false;
    let gameChanged = false;

    if (playlist?.id !== lastPlaylistId.current) {
      playlistChanged = true;
      lastPlaylistId.current = playlist?.id;
    }

    if (game?.id !== lastGameId.current) {
      gameChanged = true;
      lastGameId.current = game?.id;
    }

    if (playlistChanged || gameChanged) {
      // Game or playlist changed, update playlist game
      // TODO: Move this to view probably
      if (game && playlist) {
        window.Shared.back.request(BackIn.GET_PLAYLIST_GAME, playlist.id, game.id)
        .then((pg) => {
          if (pg) {
            setPlaylistGameResponse(game.id, playlist.id, pg);
          }
        });
      } else {
        (async () => {
          setPlaylistGame(null);
        })();
      }
    }

    if (gameChanged) {
      // Game changed, hide any new extreme screenshots
      (async () => {
        setShowExtremeScreenshot(!hideExtremeScreenshots);
      })();
    }
  });

  const onSearch = (text: string) => {
    dispatch(setSearchText({
      view: currentView.id,
      text
    }));
    dispatch(forceSearch({
      view: currentView.id,
      useCustomViews,
    }));
  };

  const gameComponentProps: GameComponentProps = {
    viewId: currentView.id,
    gameId: game ? game.id : '',
    editable: isEditing,
    playlistGame,
    suggestions: suggestions,
    fpfssEditMode: fpfssEditMode || false,
    doSearch: onSearch,
    launchGame: (gameId) => {
      onGameLaunch(gameId, null);
    },
    launchAddApp: (addAppId) => window.Shared.back.send(BackIn.LAUNCH_ADDAPP, addAppId, null),
    updateGame: onEditGame,
    updatePlaylistNotes: (notes) => {
      if (playlistGame) {
        setPlaylistGame({
          ...playlistGame,
          notes
        });
      }
    },
    updateGameExtData: (extId, key, value) => {
      // const extData = game?.extData ? game.extData : {};
      // onEditGame({
      //   extData: {
      //     ...extData,
      //     [extId]: {
      //       ...(extData[extId] ? extData[extId] : {}),
      //       [key]: value
      //     }
      //   }
      // });
    }
  };

  const wrapOnTextClick = <T extends PickType<Game, string>>(field: T, exact?: boolean) =>{
    return () => {
      if (!isEditing && game) {
        onDeselectPlaylist();
        const value = game[field as keyof Game]?.toString();
        if (exact) {
          const search = (value)
            ? `${field}=${wrapSearchTerm(value)}`
            : `${field}=""`;
          onSearch(search);
        } else {
          const search = (value)
            ? `${field}:${wrapSearchTerm(value)}`
            : `${field}:""`;
          onSearch(search);
        }
      }
    };
  };

  const onEditFactory = <K extends keyof Game>(key: K) => (event: React.ChangeEvent<InputElement>) => {
    onEditGame({
      [key]: event.target.value
    });
  };

  // Bound "on change" callbacks for game fields
  const onLibraryChange = onEditFactory('library');
  const onTitleChange = onEditFactory('title');
  const onDeveloperChange = onEditFactory('developer');
  // Bound "on click" callbacks for game fields
  const onDeveloperClick = wrapOnTextClick('developer');

  if (game == undefined) {
    return (
      <div className='browse-right-sidebar-empty'>
        <h1>{formatString(strings.noGameSelected, allStrings.libraries[library + 'Singular'] || allStrings.libraries['arcadeSingular'] || 'Game')}</h1>
        <p>{strings.clickToSelectGame}</p>
      </div>
    );
  }

  const anyActiveDataDownloaded = game.gameData !== undefined && game.gameData.findIndex((gd) => gd.presentOnDisk) !== -1;
  const isDownloadState = activeData && !anyActiveDataDownloaded;

  const contextMenu: MenuItemType[] = [];
  if (game.ruffleSupport !== '' || (
    activeData ? activeData.launchCommand.endsWith('.swf') : game.legacyLaunchCommand.endsWith('.swf')
  )) {
    contextMenu.push({
      type: 'button',
      label: strings.runWithFlashPlayer,
      onClick: () => {
        onGameLaunch(game.id, 'flash');
      }
    });
    contextMenu.push({
      type: 'button',
      label: game.ruffleSupport !== '' ? strings.runWithRuffle : strings.runWithRuffleUnsupported,
      onClick: () => {
        onGameLaunch(game.id, 'ruffle');
      }
    });
  }
  if (anyActiveDataDownloaded) {
    contextMenu.push({
      type: 'button',
      label: strings.uninstallGame,
      onClick: async () => {
        if (activeData) {
          if (!activeData.presentOnDisk) {
            if (game.gameData) {
              const gameData = game.gameData.find((gd) => gd.presentOnDisk);
              if (gameData === undefined) {
                alert('Broken uninstall logic, heckin confused');
                return;
              }
            } else {
              alert('Broken uninstall logic, heckin confused');
              return;
            }
          }
          const res = await openConfirmDialog({
            message: allStrings.dialog.uninstallGame,
            buttons: [allStrings.misc.yes, allStrings.misc.no],
            cancelId: 1
          });
          if (res === 0) {
            window.Shared.back.request(BackIn.UNINSTALL_GAME_DATA, activeData.id)
            .catch(() => {
              alert(allStrings.dialog.unableToUninstallGameData);
            });
          }
        }
      }
    });
  }

  const onScreenshotContextMenu = (event: React.MouseEvent) => {
    if (window.electronAPI !== undefined) {
      const template: MenuItemType[] = [];
      template.push({
        type: 'button',
        label: allStrings.menu.viewThumbnailInFolder,
        onClick: () => { window.electronAPI?.showItemInFolder(getGameImagePath(game.logoPath, imageFolderPath).replace(/\//g, '\\')); },
      });
      template.push({
        type: 'button',
        label: allStrings.menu.viewScreenshotInFolder,
        onClick: () => { window.electronAPI?.showItemInFolder(getGameImagePath(game.screenshotPath, imageFolderPath).replace(/\//g, '\\')); },
      });
      if (template.length > 0) {
        event.preventDefault();
        openMenu({ items: template }, getPointer(event));
      }
    }
  };

  const removeGameFromPlaylistElement =
    <ConfirmElement
      message={allStrings.dialog.removePlaylistGame}
      onConfirm={() => {
        if (playlistGame) {
          onRemovePlaylistGame(playlistGame);
        }
      }}
      render={RemoveFromPlaylistButton}
      extra={strings} />;

  const setImageFactory = (folder: typeof LOGOS | typeof SCREENSHOTS) => async (data: ArrayBuffer) => {
    const imagePath = folder === 'Logos' ? game.logoPath : game.screenshotPath;
    const res = await axios.post(`${getGameImageURL(imagePath)}`, data);
    if (res.status !== 200) {
      alert(`ERROR: Server Returned ${res.status} - ${res.statusText}`);
    }
  };

  const removeImage = (folder: string) => () => {
    window.Shared.back.send(BackIn.DELETE_IMAGE, folder, game.id);
  };


  const imageDrop = (type: typeof LOGOS | typeof SCREENSHOTS) => {
    return (event: React.DragEvent) => {
      event.preventDefault();
      const files = copyArrayLike(event.dataTransfer.files);
      if (files.length > 1) { // (Multiple files)
        saveImage(files[0], LOGOS, game.id);
        saveImage(files[1], SCREENSHOTS, game.id);
      } else { // (Single file)
        saveImage(files[0], type, game.id);
      }

      function saveImage(file: Blob, folder: string, id: string) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'object') {
            window.Shared.back.send(BackIn.SAVE_IMAGE, folder, id, Buffer.from(reader.result).toString('base64'));
          }
        };
        reader.readAsArrayBuffer(file.slice(0, file.size - 1));
      }
      function copyArrayLike<T>(arrayLike: { [key: number]: T }): Array<T> {
        const array: T[] = [];
        for (const key in arrayLike) {
          array[key] = arrayLike[key];
        }
        return array;
      }
    };
  };

  const onSetThumbnail = setImageFactory(LOGOS);
  const onSetScreenshot = setImageFactory(SCREENSHOTS);

  const onRemoveThumbnailClick = removeImage(LOGOS);
  const onRemoveScreenshotClick = removeImage(SCREENSHOTS);

  const onThumbnailDrop = imageDrop(LOGOS);
  const onScreenshotDrop = imageDrop(SCREENSHOTS);

  const onLocalKeyDown = (event: React.KeyboardEvent) => {
    // Save changes
    if (event.ctrlKey && event.key === 's' && isEditing) {
      onSaveGame();
      event.preventDefault();
    }
  };

  return (
    <div
      className={'browse-right-sidebar ' + (isEditing ? 'browse-right-sidebar--edit-enabled' : 'browse-right-sidebar--edit-disabled')}
      onKeyDown={onLocalKeyDown}>
      {/** Game Config Dialog */}
      {/* { this.state.gameConfigDialogOpen && this.props.currentGame && ( */}
      {/*   <GameConfigDialog */}
      {/*     saveConfig={saveGameConfig} */}
      {/*     deleteConfig={deleteGameConfig} */}
      {/*     makeTemplateConfig={makeTemplateGameConfig} */}
      {/*     duplicateConfig={duplicateGameConfig} */}
      {/*     info={this.props.currentGame} */}
      {/*     close={this.closeGameConfigDialog} */}
      {/*   /> */}
      {/* )} */}
      <div className='browse-right-sidebar__top'>
        {/* -- Title & Developer(s) -- */}
        <div className='browse-right-sidebar__section'>
          <div className='browse-right-sidebar__row'>
            <div className='browse-right-sidebar__title-row'>
              <div className='browse-right-sidebar__title-row__title'>
                <InputField
                  text={gameTitle}
                  placeholder={strings.noTitle}
                  editable={isEditing}
                  onChange={onTitleChange} />
              </div>
              <div className='browse-right-sidebar__title-row__buttons'>
                {editingDisabled ? (
                  <>
                    {/* "Remove From Playlist" Button */}
                    {playlistGame ? removeGameFromPlaylistElement : undefined}
                  </>
                ) : (
                  <>
                    {isEditing ? ( /* While Editing */
                      <>
                        {/* "Save" Button */}
                        <div
                          className='browse-right-sidebar__title-row__buttons__save-button'
                          title={strings.saveChanges}
                          onClick={onSaveGame}>
                          <OpenIcon icon='check' />
                        </div>
                        {/* "Discard" Button */}
                        <div
                          className='browse-right-sidebar__title-row__buttons__discard-button'
                          title={strings.discardChanges}
                          onClick={onDiscardClick}>
                          <OpenIcon icon='x' />
                        </div>
                      </>
                    ) : ( /* While NOT Editing */
                      <>
                        {fpfssBaseUrl && !editingDisabled && (
                          <div
                            className='browse-right-sidebar__title-row__buttons__edit-button'
                            title={strings.editFpfssGame}
                            onClick={() => onFpfssEditGame(game.id)}>
                            <OpenIcon icon='cloud-upload' />
                          </div>
                        )}
                        {/* "Edit" Button */}
                        {editingDisabled ? undefined : (
                          <div
                            className='browse-right-sidebar__title-row__buttons__edit-button'
                            title={strings.editGame}
                            onClick={onEditClick}>
                            <OpenIcon icon='pencil' />
                          </div>
                        )}
                        {/* "Remove From Playlist" Button */}
                        {playlistGame ? removeGameFromPlaylistElement : undefined}
                        {/* "Delete Game" Button */}
                        {playlistGame && !editingDisabled ? undefined : (
                          <ConfirmElement
                            message={allStrings.dialog.deleteGame}
                            onConfirm={onDeleteSelectedGame}
                            render={DeleteGameButton}
                            extra={strings} />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
            <p>{strings.by} </p>
            <InputField
              text={gameDeveloper}
              placeholder={strings.noDeveloper}
              className='browse-right-sidebar__searchable'
              editable={isEditing}
              onChange={onDeveloperChange}
              onClick={onDeveloperClick} />
          </div>
        </div>
        {/* -- Game Configurations  DISABLED - TODO: FIX */}
        {/* { !this.props.fpfssEditMode && false && ( */}
        {/*   <div className='browse-right-sidebar__game-config-row'> */}
        {/*     <div className='browse-right-sidebar__game-config-label'> */}
        {/*       {'Configuration:'} */}
        {/*     </div> */}
        {/*     <Dropdown */}
        {/*       className={`browse-right-sidebar__game-config-dropdown ${this.props.currentGame?.activeConfig ? '' : 'browse-right-sidebar__game-config-dropdown-none'}`} */}
        {/*       text={activeConfig ? `${configNamePrefix}${activeConfig.name}` : 'No Configuration'}> */}
        {/*       {gameConfigDropdown} */}
        {/*     </Dropdown> */}
        {/*     <div */}
        {/*       onClick={() => { */}
        {/*         this.openGameConfigDialog(); */}
        {/*       }} */}
        {/*       className='browse-right-sidebar__game-config-cog browse-right-sidebar__title-row__buttons__save-button'> */}
        {/*       <OpenIcon icon={'cog'}/> */}
        {/*     </div> */}
        {/*   </div> */}
        {/* )} */}
        {/** Mini download info */}
        {isEditing ? <div className='browse-right-sidebar__mini-download-info__size'></div> : (
          <div className='browse-right-sidebar__mini-download-info'>
            <div className='browse-right-sidebar__mini-download-info__state'>
              {
                fpfssEditMode ? strings.fpfssGame :
                  game.archiveState === 0 ? strings.notArchived :
                    game.archiveState === 1 ? strings.archived :
                      activeData ? (anyActiveDataDownloaded ? strings.installed : strings.notInstalled) : strings.legacyGame
              }
            </div>
            {game.archiveState === 2 && activeData && (
              <div className='browse-right-sidebar__mini-download-info__size'>
                {`${sizeToString(activeData.size)}`}
              </div>
            )}
          </div>
        )}
        {/* -- Play Button -- */}
        {isEditing ? undefined :
          busyGames.includes(game.id) ? (
            <div className='browse-right-sidebar__play-button--busy'>
              {strings.busy}
            </div>
          )
            : gameRunning ? (
              <div
                className='browse-right-sidebar__play-button--running'
                onClick={() => {
                  window.Shared.back.send(BackIn.SERVICE_ACTION, ProcessAction.STOP, `game.${game.id}`);
                }}>
                {strings.stop}
              </div>
            ) : (game.archiveState == 0) ? (
              <div
                className='browse-right-sidebar__play-button--busy'>
                {strings.notArchived}
              </div>
            ) : (game.archiveState == 1) ? (
              <div
                className='browse-right-sidebar__play-button--download'
                onClick={() => {
                  let url = game.source;
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    alert('Cannot open, not a valid source url.');
                  }
                  if (url.endsWith(')') && url.toLowerCase().includes('wayback')) {
                    // Cut off after space
                    url = url.split(' ')[0];
                  }
                  openUrlInWindow(url);
                }}>
                {strings.playOnline}
              </div>
            ) : (
              <div className={`browse-right-sidebar__play-button ${isDownloadState ? 'browse-right-sidebar__play-button--download' : ''}`}>
                {isDownloadState ? (
                  <div
                    className='browse-right-sidebar__play-button--text browse-right-sidebar__play-button--download-text'
                    onClick={() => {
                      onGameLaunch(game.id, null);
                    }}>
                    {strings.download}
                  </div>
                ) : (
                  <div
                    className='browse-right-sidebar__play-button--text browse-right-sidebar__play-button--play-text'
                    onClick={() => {
                      if (game) {
                        onGameLaunch(game.id, null);
                      }
                    }}>
                    {strings.play}
                  </div>
                )}
                {contextMenu.length > 0 ? (
                  <div className={`browse-right-sidebar__play-button--dropdown ${isDownloadState ? 'browse-right-sidebar__play-button--download-dropdown' : 'browse-right-sidebar__play-button--play-dropdown'}`}
                    onClick={(event) => {
                      openMenu({ items: contextMenu }, getPointer(event));
                    }}>
                    <OpenIcon icon='chevron-bottom' />
                  </div>
                ) : undefined}
              </div>
            )
        }
        {/** Gameplay Statistics */}
        {(isEditing || game.archiveState !== ArchiveState.Available) ? undefined : (
          <div className='browse-right-sidebar__stats'>
            <div className='browse-right-sidebar__stats-box'>
              <div className='browse-right-sidebar__stats-row-top'>
                <div className='browse-right-sidebar__stats-cell'>
                  {strings.lastPlayed}
                </div>
              </div>
              <div className='browse-right-sidebar__stats-row-bottom'>
                <div className='browse-right-sidebar__stats-cell'>
                  {game.lastPlayed ? formatLastPlayed(new Date(game.lastPlayed), strings) : strings.never}
                </div>
              </div>
            </div>
            <div className='browse-right-sidebar__stats-box'>
              <div className='browse-right-sidebar__stats-row-top'>
                <div className='browse-right-sidebar__stats-cell'>
                  {strings.playtime}
                </div>
              </div>
              <div className='browse-right-sidebar__stats-row-bottom'>
                <div className='browse-right-sidebar__stats-cell'>
                  {formatPlaytime(game.playtime, strings)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        className='browse-right-sidebar__middle simple-scroll'>
        {/* -- Most Fields -- */}
        <>
          <div className='browse-right-sidebar__section'>
            {isEditing && (
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.library}: </p>
                {/** TODO: Localize library options, make visible once library searching has merged */}
                <DropdownInputField
                  text={gameLibrary}
                  placeholder={strings.noLibrary}
                  onChange={onLibraryChange}
                  className='browse-right-sidebar__searchable'
                  editable={isEditing}
                  items={suggestions && filterSuggestions(suggestions.library) || []}
                  onItemSelect={text => onEditGame({ library: text })} />
              </div>
            )}
            {gameSidebarMiddle.map(key =>
              <DynamicComponent
                key={key}
                name={key}
                props={gameComponentProps} />
            )}
          </div>
        </>
        {gameSidebarBottom.map(key =>
          <DynamicComponent
            key={key}
            name={key}
            props={gameComponentProps} />
        )}
        {/* -- Game ID -- */}
        {isEditing ? (
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
              <p>ID: </p>
              <p className='browse-right-sidebar__row__game-id'>{game.id}</p>
            </div>
          </div>
        ) : undefined}
      </div>
      {!fpfssEditMode && (
        <div className='browse-right-sidebar__bottom'>
          {/* -- Screenshot -- */}
          {!hideScreenshotSidebar && (
            <>
              <div className='browse-right-sidebar__section browse-right-sidebar__section--below-gap'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row__spacer' />
                <div className='browse-right-sidebar__row browse-right-sidebar__row__screenshot-container'>
                  <div
                    className='browse-right-sidebar__row__screenshot'
                    onContextMenu={onScreenshotContextMenu}>
                    {isEditing ? (
                      <div className='browse-right-sidebar__row__screenshot__placeholder'>
                        <div className='browse-right-sidebar__row__screenshot__placeholder__back'>
                          <GameImageSplit
                            text={strings.thumbnail}
                            imgSrc={game.logoPath !== '' ? getGameImageURL(game.logoPath) : undefined}
                            showHeaders={true}
                            onSetImage={onSetThumbnail}
                            onRemoveClick={onRemoveThumbnailClick}
                            onDrop={onThumbnailDrop} />
                          <GameImageSplit
                            text={strings.screenshot}
                            imgSrc={game.screenshotPath !== '' ? getGameImageURL(game.screenshotPath) : undefined}
                            showHeaders={true}
                            onSetImage={onSetScreenshot}
                            onRemoveClick={onRemoveScreenshotClick}
                            onDrop={onScreenshotDrop} />
                        </div>
                        <div className='browse-right-sidebar__row__screenshot__placeholder__front'>
                          <p>{strings.dropImageHere}</p>
                        </div>
                      </div>
                    ) :
                      (isExtreme && showExtremeScreenshot) ? (
                        <div
                          className='browse-right-sidebar__row__screenshot-image--hidden'
                          onClick={() => setShowExtremeScreenshot(true)}>
                          <div className='browse-right-sidebar__row__screenshot-image--hidden-text'>
                            {strings.showExtremeScreenshot}
                          </div>
                        </div>
                      ) : (
                        <img
                          className='browse-right-sidebar__row__screenshot-image'
                          alt='' // Hide the broken link image if source is not found
                          src={game.screenshotPath !== '' ? getGameImageURL(game.screenshotPath) : undefined}
                          onClick={() => setShowPreview(true)} />
                      )
                    }
                  </div>
                </div>
              </div>
              {/* -- Screenshot Preview -- */}
              {showPreview ? (
                <ImagePreview
                  src={game.screenshotPath !== '' ? getGameImageURL(game.screenshotPath) : undefined}
                  onCancel={() => setShowPreview(false)} />
              ) : undefined}
            </>
          )}

        </div>
      )}
      {!isEditing && (
        <div className='browse-right-sidebar__super-bottom'>
          <SimpleButton
            value={strings.openGameDataBrowser}
            onClick={() => {
              setGameDataBrowserOpen(true);
            }}/>
          {!editingDisabled && !isEditing && (
            <>
              <SimpleButton
                value={allStrings.menu.copyGameUUID}
                onClick={() => navigator.clipboard.writeText(game.id)} />
            </>
          )}
          {gameDataBrowserOpen && (
            <GameDataBrowser
              onClose={() => {
                setGameDataBrowserOpen(false);
              }}
              game={game}
              onUpdateActiveGameData={onUpdateActiveGameData}
              onForceUpdateGameData={() => {}} />
          )}
        </div>
      )}
    </div>
  );
}

function filterSuggestions(suggestions?: string[]): string[] {
  if (!suggestions) { return []; }
  // if (suggestions.length > 25) { return suggestions.slice(0, 25); }
  return suggestions;
}

/**
 * Get a formatted last played string (Rounded to the nearest useful amount)
 *
 * @param lastPlayed Last Played Date
 * @param strings localized strings
 */
function formatLastPlayed(lastPlayed: Date, strings: any): string {
  const secondsInDay = 60 * 60 * 24;
  const diff = Math.ceil((Date.now() - lastPlayed.getTime()) / 1000);

  if (diff < (secondsInDay * 2)) {
    if ((new Date()).getDate() === lastPlayed.getDate()) {
      return strings.today;
    } else {
      return strings.yesterday;
    }
  } else if (diff < (secondsInDay * 8)) {
    return formatString(strings.daysAgo, Math.floor(diff / secondsInDay).toString()) as string;
  } else if (diff < (secondsInDay * 7 * 4)) {
    return formatString(strings.weeksAgo, Math.floor(diff / (secondsInDay * 7)).toString()) as string;
  } else {
    const ordinal = ordinalSuffixOf(lastPlayed.getDate());
    const month = lastPlayed.toLocaleString('default', { month: 'long' });
    return `${ordinal} ${month} ${lastPlayed.getFullYear()}`;
  }
}

/**
 * Get a formatted playtime string (Rounded to the nearest useful amount)
 *
 * @param playtime Seconds of playtime
 * @param strings localized strings
 */
function formatPlaytime(playtime: number, strings: any): string {
  // Less than 1 minute
  if (playtime <= 60) {
    return formatString(strings.seconds, playtime.toString()) as string;
  }
  // Less than 2 hours
  if (playtime <= (60 * 120)) {
    return formatString(strings.minutes, Math.floor(playtime / 60).toString()) as string;
  } else {
    return formatString(strings.hours, (playtime / (60 * 60)).toFixed(1)) as string;
  }
}

// https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number
function ordinalSuffixOf(i: number) {
  const j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + 'st';
  }
  if (j == 2 && k != 12) {
    return i + 'nd';
  }
  if (j == 3 && k != 13) {
    return i + 'rd';
  }
  return i + 'th';
}
