import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { remote, MenuItemConstructorOptions, Menu } from 'electron';
import { uuid } from '../uuid';
import { IGameInfo, IAdditionalApplicationInfo } from '../../shared/game/interfaces';
import { CheckBox } from './CheckBox';
import { GameImageCollection } from '../image/GameImageCollection';
import { AdditionalApplicationInfo } from '../../shared/game/AdditionalApplicationInfo';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { GameLauncher } from '../GameLauncher';
import GameManager from '../game/GameManager';
import { OpenIcon } from './OpenIcon';
import { ConfirmElement, IConfirmElementArgs } from './ConfirmElement';
import { IGamePlaylistEntry } from '../playlist/interfaces';
import { ImagePreview } from './ImagePreview';
import { WithPreferencesProps } from '../containers/withPreferences';
import { InputField } from './InputField';
import { DropdownInputField } from './DropdownInputField';
import { GamePropSuggestions } from '../util/suggestions';
import { formatImageFilename } from '../image/util';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { promisify } from 'util';
import { GameImageSplit } from './GameImageSplit';

const copyFile = promisify(fs.copyFile);
const unlink = promisify(fs.unlink);

interface OwnProps {
  gameImages: GameImageCollection;
  games: GameManager;
  /** Currently selected game (if any) */
  currentGame?: IGameInfo;
  /** Additional Applications of the currently selected game (if any) */
  currentAddApps?: IAdditionalApplicationInfo[];
  /** Currently selected game entry (if any) */
  gamePlaylistEntry?: IGamePlaylistEntry;
  /** Called when the selected game is deleted by this */
  onDeleteSelectedGame?: () => void;
  /** Called when the selected game is removed from the selected by this */
  onRemoveSelectedGameFromPlaylist?: () => void;
  /** Called when the playlist notes for the selected game has been changed */
  onEditPlaylistNotes?: (text: string) => void;
  /** If the "edit mode" is currently enabled */
  isEditing: boolean;
  /** If the selected game is a new game being created */
  isNewGame: boolean;
  /** ... */
  suggestions?: Partial<GamePropSuggestions>;
  
  onEditClick?: () => void;
  onDiscardClick?: () => void;
  onSaveGame?: () => void;
}

export type IRightBrowseSidebarProps = OwnProps & WithPreferencesProps;

export interface IRightBrowseSidebarState {
  /** If a preview of the current games screenshot should be shown */
  showPreview: boolean;
}

/** Sidebar on the right side of BrowsePage */
export class RightBrowseSidebar extends React.Component<IRightBrowseSidebarProps, IRightBrowseSidebarState> {
  // Bound "on done" handlers
  private onTitleChange           = this.wrapOnTextChange((game, text) => { game.title = text; });
  private onDeveloperChange       = this.wrapOnTextChange((game, text) => { game.developer = text; });
  private onGenreChange           = this.wrapOnTextChange((game, text) => { game.genre = text; });
  private onSeriesChange          = this.wrapOnTextChange((game, text) => { game.series = text; });
  private onSourceChange          = this.wrapOnTextChange((game, text) => { game.source = text; });
  private onPublisherChange       = this.wrapOnTextChange((game, text) => { game.publisher = text; });
  private onPlatformChange        = this.wrapOnTextChange((game, text) => { game.platform = text; });
  private onPlayModeChange        = this.wrapOnTextChange((game, text) => { game.playMode = text; });
  private onStatusChange          = this.wrapOnTextChange((game, text) => { game.status = text; });
  private onLaunchCommandChange   = this.wrapOnTextChange((game, text) => { game.launchCommand = text; });
  private onApplicationPathChange = this.wrapOnTextChange((game, text) => { game.applicationPath = text; });
  private onNotesChange           = this.wrapOnTextChange((game, text) => { game.notes = text; });
  private onBrokenChange          = this.wrapOnCheckBoxChange((game) => { game.broken = !game.broken; });
  private onExtremeChange         = this.wrapOnCheckBoxChange((game) => { game.extreme = !game.extreme; });

  private launchCommandRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IRightBrowseSidebarProps) {
    super(props);
    this.state = {
      showPreview: false,
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  render() {
    const game: IGameInfo|undefined = this.props.currentGame;
    if (game) {
      const { currentAddApps, gamePlaylistEntry, isEditing, isNewGame, suggestions } = this.props;
      const isPlaceholder = game.placeholder;
      const editDisabled = !this.props.preferencesData.enableEditing;
      const canEdit = !editDisabled && isEditing;
      const dateAdded = new Date(game.dateAdded).toUTCString();
      const screenshotSrc = this.props.gameImages.getScreenshotPath(game.platform, game.title, game.id);
      const thumbnailSrc = this.props.gameImages.getThumbnailPath(game.platform, game.title, game.id);
      return (
        <div className={'browse-right-sidebar '+
                        (canEdit ? 'browse-right-sidebar--edit-enabled' : 'browse-right-sidebar--edit-disabled')}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__title-row'>
                <div className='browse-right-sidebar__title-row__title'>
                  <InputField text={game.title} placeholder='No Title'
                              onChange={this.onTitleChange} canEdit={canEdit} />
                </div>
                <div className='browse-right-sidebar__title-row__buttons'>
                  { editDisabled ? undefined : (
                    <>
                      { isEditing ? ( /* While Editing */
                        <>
                          {/* "Save" Button */}
                          <div className='browse-right-sidebar__title-row__buttons__save-button'
                              title='Save Changes' onClick={this.props.onSaveGame}>
                            <OpenIcon icon='check' />
                          </div>
                          {/* "Discard" Button */}
                          <div className='browse-right-sidebar__title-row__buttons__discard-button'
                              title='Discard Changes' onClick={this.props.onDiscardClick}>
                            <OpenIcon icon='x' />
                          </div>
                        </>
                      ) : ( /* While NOT Editing */
                        <>
                          {/* "Edit" Button */}
                          { isPlaceholder ? undefined : (
                            <div className='browse-right-sidebar__title-row__buttons__edit-button'
                                 title='Edit Game' onClick={this.props.onEditClick}>
                              <OpenIcon icon='pencil' />
                            </div>
                          ) }
                          {/* "Remove From Playlist" Button */}
                          { gamePlaylistEntry ? (
                            <ConfirmElement onConfirm={this.props.onRemoveSelectedGameFromPlaylist}
                                            children={this.renderRemoveFromPlaylistButton} />
                          ) : undefined }
                          {/* "Delete Game" Button */}
                          { (isPlaceholder || isNewGame) ? undefined : (
                            <ConfirmElement onConfirm={this.onDeleteGameClick}
                                            children={this.renderDeleteGameButton} />
                          ) }
                        </>
                      ) }
                    </>
                  ) }
                </div>
              </div>
            </div>
            { isPlaceholder ? undefined : (
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>by </p>
                <InputField text={game.developer} placeholder='No Developer'
                            onChange={this.onDeveloperChange} canEdit={canEdit} onKeyDown={this.onInputKeyDown} />
              </div>
            ) }
          </div>
          {/* -- Most Fields -- */}
          { isPlaceholder ? undefined : (
            <>
              <div className='browse-right-sidebar__section'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Genre: </p>
                  <DropdownInputField text={game.genre} placeholder='No Genre'
                                      onChange={this.onGenreChange} canEdit={canEdit}
                                      items={suggestions && filterSuggestions(suggestions.genre) || []}
                                      onItemSelect={text => { game.genre = text; this.forceUpdate(); }}
                                      onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Series: </p>
                  <InputField text={game.series} placeholder='No Series'
                              onChange={this.onSeriesChange} canEdit={canEdit} onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Publisher: </p>
                  <InputField text={game.publisher} placeholder='No Publisher'
                              onChange={this.onPublisherChange} canEdit={canEdit} onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Source: </p>
                  <InputField text={game.source} placeholder='No Source'
                              onChange={this.onSourceChange} canEdit={canEdit} onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Platform: </p>
                  <DropdownInputField text={game.platform} placeholder='No Platform'
                                      onChange={this.onPlatformChange} canEdit={canEdit}
                                      items={suggestions && filterSuggestions(suggestions.platform) || []}
                                      onItemSelect={text => { game.platform = text; this.forceUpdate(); }}
                                      onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Play Mode: </p>
                  <DropdownInputField text={game.playMode} placeholder='No Play Mode'
                                      onChange={this.onPlayModeChange} canEdit={canEdit}
                                      items={suggestions && filterSuggestions(suggestions.playMode) || []}
                                      onItemSelect={text => { game.playMode = text; this.forceUpdate(); }}
                                      onKeyDown={this.onInputKeyDown} />

                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Status: </p>
                  <DropdownInputField text={game.status} placeholder='No Status'
                                      onChange={this.onStatusChange} canEdit={canEdit}
                                      items={suggestions && filterSuggestions(suggestions.status) || []}
                                      onItemSelect={text => { game.status = text; this.forceUpdate(); }}
                                      onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>Date Added: </p>
                  <p className='browse-right-sidebar__row__date-added' title={dateAdded}>{dateAdded}</p>
                </div>
                <div className='browse-right-sidebar__row'>
                  <div className='browse-right-sidebar__row__check-box-wrapper' onClick={this.onBrokenChange}>
                    <CheckBox checked={game.broken} className='browse-right-sidebar__row__check-box' />
                    <p> Broken</p>
                  </div>
                </div>
                <div className='browse-right-sidebar__row'>
                  <div className='browse-right-sidebar__row__check-box-wrapper' onClick={this.onExtremeChange}>
                    <CheckBox checked={game.extreme} className='browse-right-sidebar__row__check-box' />
                    <p> Extreme</p>                
                  </div>
                </div>
              </div>
            </>            
          ) }
          {/* -- Playlist Game Entry Notes -- */}
          { gamePlaylistEntry ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>Playlist Notes: </p>
                <InputField text={gamePlaylistEntry.notes || ''} placeholder='No Playlist Notes'
                            onChange={this.onEditPlaylistNotes} canEdit={canEdit} multiline={true} />
              </div>
            </div>
          ) : undefined }
          {/* -- Notes -- */}
          { (!editDisabled || game.notes) && !isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>Notes: </p>
                <InputField text={game.notes} placeholder='No Notes'
                            onChange={this.onNotesChange} canEdit={canEdit} multiline={true} />
              </div>
            </div>
          ) : undefined }
          {/* -- Additional Applications -- */}
          { canEdit || (currentAddApps && currentAddApps.length > 0) ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-header'>
                <p>Additional Applications:</p>
                { canEdit ? (
                  <input type='button' value='New' className='simple-button' onClick={this.onNewAddAppClick} />
                ) : undefined }
              </div>
              { currentAddApps && currentAddApps.map((addApp) => {
                return <RightBrowseSidebarAddApp key={addApp.id} addApp={addApp} editDisabled={!canEdit}
                                                 onLaunch={this.onAddAppLaunch}
                                                 onDelete={this.onAddAppDelete} />;
              }) }
            </div>
          ) : undefined }
          {/* -- Application Path & Launch Command -- */}
          { canEdit && !isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>Application Path: </p>
                <DropdownInputField text={game.applicationPath} placeholder='No Application Path'
                                    onChange={this.onApplicationPathChange} canEdit={canEdit}
                                    items={suggestions && filterSuggestions(suggestions.applicationPath) || []}
                                    onItemSelect={text => { game.applicationPath = text; this.forceUpdate(); }}
                                    onKeyDown={this.onInputKeyDown} />
              </div>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>Launch Command: </p>
                <InputField text={game.launchCommand} placeholder='No Launch Command'
                            onChange={this.onLaunchCommandChange} canEdit={canEdit} onKeyDown={this.onInputKeyDown}
                            reference={this.launchCommandRef} />
              </div>
            </div>
          ) : undefined }
          {/* -- Game ID -- */}
          { canEdit || isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>ID: </p>
                <p className='browse-right-sidebar__row__game-id'>{game.id}</p>
              </div>
            </div>
          ) : undefined }
          {/* -- Screenshot -- */}
          <div className='browse-right-sidebar__section browse-right-sidebar__section--below-gap'>
            <div className='browse-right-sidebar__row browse-right-sidebar__row__spacer'/>
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__row__screenshot'
                   onContextMenu={this.onScreenshotContextMenu}>
                { isEditing ? (
                  <div className='browse-right-sidebar__row__screenshot__placeholder'>
                    <div className='browse-right-sidebar__row__screenshot__placeholder__back'>
                      <GameImageSplit text='Thumbnail' imgSrc={thumbnailSrc}
                                      onAddClick={this.onAddThumbnailClick}
                                      onRemoveClick={this.onRemoveThumbnailClick}
                                      onDrop={this.onImageDrop}/>
                      <GameImageSplit text='Screenshot' imgSrc={screenshotSrc}
                                      onAddClick={this.onAddScreenshotClick}
                                      onRemoveClick={this.onRemoveScreenshotClick}
                                      onDrop={this.onImageDrop}/>
                    </div>
                    <div className='browse-right-sidebar__row__screenshot__placeholder__front'>
                      <p>Drop an image here to add it.</p>
                    </div>
                  </div>
                ) : (
                  <img src={screenshotSrc} onClick={this.onScreenshotClick} />
                ) }
              </div>
            </div>
          </div>
          {/* -- Screenshot Preview -- */}
          { this.state.showPreview ? (
            <ImagePreview src={screenshotSrc} onCancel={this.onScreenshotPreviewClick} />
          ) : undefined }
        </div>
      );
    } else {
      return (
        <div className='browse-right-sidebar-empty'>
          <h1>No game selected</h1>
          <p>Click on a game to select it.</p>
        </div>
      );
    }
  }

  private renderDeleteGameButton({ activate, activationCounter, reset }: IConfirmElementArgs): JSX.Element {
    return (
      <div className={'browse-right-sidebar__title-row__buttons__delete-game'+
                      ((activationCounter>0)?' browse-right-sidebar__title-row__buttons__delete-game--active simple-vertical-shake':'')}
           title='Delete Game (and Additional Applications)'
           onClick={activate} onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  private renderRemoveFromPlaylistButton({ activate, activationCounter, reset }: IConfirmElementArgs): JSX.Element {
    return (
      <div className={'browse-right-sidebar__title-row__buttons__remove-from-playlist'+
                      ((activationCounter>0)?' browse-right-sidebar__title-row__buttons__remove-from-playlist--active simple-vertical-shake':'')}
           title='Remove Game from Playlist'
           onClick={activate} onMouseLeave={reset}>
        <OpenIcon icon='circle-x' />
      </div>
    );
  }

  /** When a key is pressed down "globally" (and this component is present) */
  private onKeyDown = (event: KeyboardEvent) => {
    const { currentGame, isEditing, onEditClick } = this.props;
    // Start editing
    if (event.ctrlKey && event.code === 'KeyE' && // (CTRL + E ...
        !isEditing && currentGame) { // ... while not editing, and a game is selected)
      if (onEditClick) { onEditClick(); }
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  }
  
  private onScreenshotContextMenu = (event: React.MouseEvent) => {
    const template: MenuItemConstructorOptions[] = [];
    if (this.props.isEditing) {
      template.push({
        label: 'Add Thumbnail',
        click: () => { this.onAddThumbnailClick(); }
      });
      template.push({
        label: 'Add Screenshot',
        click: () => { this.onAddScreenshotClick(); }
      });
    }
    if (template.length > 0) {
      event.preventDefault();
      openContextMenu(template);
    }
  }

  private onAddScreenshotClick = (): void => {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialog({
      title: 'Select a Screenshot Image',
      properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
      const game = this.props.currentGame;
      if (!game) { throw new Error('"currentGame" is missing.'); }
      const cache = this.props.gameImages.getPlatformScreenshotCache(game.platform);
      if (!cache) { throw new Error('Can not add a new image, the cache is missing.'); }
      copyImageFile(filePaths[0], game, cache).then(() => { this.forceUpdate(); });
    }
  }

  private onAddThumbnailClick = (): void => {
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialog({
      title: 'Select a Thumbnail Image',
      properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
      const game = this.props.currentGame;
      if (!game) { throw new Error('"currentGame" is missing.'); }
      const cache = this.props.gameImages.getPlatformThumbnailCache(game.platform);
      if (!cache) { throw new Error('Can not add a new image, the cache is missing.'); }
      copyImageFile(filePaths[0], game, cache).then(() => { this.forceUpdate(); });
    }
  }
  
  private onRemoveThumbnailClick = (): void => {
    const game = this.props.currentGame;
    if (!game) { throw new Error('Can not remove image file, "currentGame" is missing.'); }
    const cache = this.props.gameImages.getPlatformThumbnailCache(game.platform);
    if (!cache) { throw new Error('Can not remove image file, the cache is missing.'); }
    deleteImageFiles(game, cache).then(() => { this.forceUpdate(); });
  }
  
  private onRemoveScreenshotClick = (): void => {
    const game = this.props.currentGame;
    if (!game) { throw new Error('Can not remove image file, "currentGame" is missing.'); }
    const cache = this.props.gameImages.getPlatformScreenshotCache(game.platform);
    if (!cache) { throw new Error('Can not remove image file, the cache is missing.'); }
    deleteImageFiles(game, cache).then(() => { this.forceUpdate(); });
  }

  private onImageDrop = (event: React.DragEvent, text: string): void => {
    event.preventDefault();
    const files = copyArrayLike(event.dataTransfer.files);
    const game = this.props.currentGame;
    if (!game) { throw new Error('Can not add a new image, "currentGame" is missing.'); }
    const thumbnailCache = this.props.gameImages.getPlatformThumbnailCache(game.platform);
    if (!thumbnailCache) { throw new Error('Can not add a new image, the thumbnail cache is missing.'); }
    const screenshotCache = this.props.gameImages.getPlatformScreenshotCache(game.platform);
    if (!screenshotCache) { throw new Error('Can not add a new image, the screenshot cache is missing.'); }
    if (files.length > 1) { // (Multiple files)
      copyImageFile(files[0].path, game, thumbnailCache).then(() => { this.forceUpdate(); });
      copyImageFile(files[1].path, game, screenshotCache).then(() => { this.forceUpdate(); });
    } else { // (Single file)
      switch(text) {
        case 'Thumbnail':
          copyImageFile(files[0].path, game, thumbnailCache).then(() => { this.forceUpdate(); });
          break;
        case 'Screenshot':
          copyImageFile(files[0].path, game, screenshotCache).then(() => { this.forceUpdate(); });
          break;
        default:
          console.warn('No "add-single-file" case for the "text" of the GameImageSplit the file was dropped on.');
          break;
      }
    }
  }

  private onDeleteGameClick = (): void => {
    console.time('delete');
    const game = this.props.currentGame;
    if (!game) { throw new Error('Can not delete a game when no game is selected.'); }
    const platform = this.props.games.getPlatformOfGameId(game.id);
    if (!platform) { throw new Error('Can not delete a game when it does not belong to a platform.'); }
    platform.removeGame(game.id);
    platform.findAdditionalApplicationsOfGame(game.id).forEach(
      (addApp) => { platform.removeAdditionalApplication(addApp.id); }
    );
    // Refresh games collection
    this.props.games.refreshCollection();
    // Save changes to file
    platform.saveToFile().then(() => { console.timeEnd('delete'); });
    // Callback
    if (this.props.onDeleteSelectedGame) {
      this.props.onDeleteSelectedGame();
    }
  }

  private onAddAppLaunch(addApp: IAdditionalApplicationInfo): void {
    GameLauncher.launchAdditionalApplication(addApp);
  }

  private onAddAppDelete = (addApp: IAdditionalApplicationInfo): void => {
    const addApps = this.props.currentAddApps;
    if (!addApps) { throw new Error('editAddApps is missing.'); }
    // Find and remove add-app
    let index = -1;
    for (let i = addApps.length - 1; i >= 0; i--) {
      if (addApps[i].id === addApp.id) {
        index = i;
        break;
      }
    }
    if (index === -1) { throw new Error('Cant remove additional application because it was not found.'); }
    addApps.splice(index, 1);
    this.forceUpdate();
  }

  private onNewAddAppClick = (): void => {
    if (!this.props.currentAddApps) { throw new Error(`Unable to add a new AddApp. "currentAddApps" is missing.`); }
    if (!this.props.currentGame)    { throw new Error(`Unable to add a new AddApp. "currentGame" is missing.`); }
    const newAddApp = AdditionalApplicationInfo.create();
    newAddApp.id = uuid();
    newAddApp.gameId = this.props.currentGame.id;
    this.props.currentAddApps.push(newAddApp);
    this.forceUpdate();
  }

  private onScreenshotClick = (): void => {
    this.setState({ showPreview: true });
  }

  private onScreenshotPreviewClick = (): void => {
    this.setState({ showPreview: false });
  }

  private onEditPlaylistNotes = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    if (this.props.onEditPlaylistNotes) {
      this.props.onEditPlaylistNotes(event.currentTarget.value);
      this.forceUpdate();
    }
  }

  /** When a key is pressed while an input field is selected (except for multiline fields) */
  private onInputKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.onSaveGame) { this.props.onSaveGame(); }
    }
  }

  /** Create a wrapper for a EditableTextWrap's onChange callback (this is to reduce redundancy) */
  private wrapOnTextChange(func: (game: IGameInfo, text: string) => void): (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void {
    return (event) => {
      const game = this.props.currentGame;
      if (game) {
        func(game, event.currentTarget.value);
        this.forceUpdate();
      }
    }
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy) */
  private wrapOnCheckBoxChange(func: (game: IGameInfo) => void): () => void {
    return () => {
      const game = this.props.currentGame;
      const canEdit = this.props.preferencesData.enableEditing && this.props.isEditing;
      if (game && canEdit) {
        func(game);
        this.forceUpdate();
      }
    }
  }
}

function filterSuggestions(suggestions?: string[]): string[] {
  if (!suggestions) { return []; }
  //if (suggestions.length > 25) { return suggestions.slice(0, 25); }
  return suggestions;
}

function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

/**
 * Copy an image file from anywhere to the folder of an "image cache" and for a specific game
 * @param source File path of the image to copy
 * @param game Game that the image will "belong" to
 * @param cache Image cache to store the image in (it is copied to this caches folder)
 */
async function copyImageFile(source: string, game: IGameInfo, cache: ImageFolderCache): Promise<void> {
  deleteImageFiles(game, cache);
  // Copy the image to index 1
  const outputPath = path.join(
    cache.getFolderPath(),
    formatImageFilename(game.title, 1) + getFileExtension(source)
  );
  return await copyFile(source, outputPath, fs.constants.COPYFILE_EXCL)
  .then(() => cache.refresh())
  .catch(error => { throw error; });
}

/** Get the file extension of a file (including the dot). Returns an empty string if none. */
function getFileExtension(filename: string): string {
  const firstDot = filename.lastIndexOf('.');
  if (firstDot === -1) { return ''; }
  return filename.substr(firstDot);
}

function copyArrayLike<T>(arrayLike: { [key: number]: T }): Array<T> {
  const array: T[] = [];
  for (let key in arrayLike) {
    array[key] = arrayLike[key];
  }
  return array;
}

/**
 * Delete all images of the given game in the given cache
 * @param game Game to delete images of
 * @param cache Cache to delete image from
 */
async function deleteImageFiles(game: IGameInfo, cache: ImageFolderCache): Promise<void> {
  // Find and delete all of the games images in the cache
  const filenames = [ ...cache.getFilePaths(game.id), ...cache.getFilePaths(game.title) ];
  for (let filename of filenames) {
    await unlink(path.join(cache.getFolderPath(), filename));
  }
  if (filenames.length > 0) { await cache.refresh(); }
}
