import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as React from 'react';
import { AdditionalApplicationInfo } from '../../shared/game/AdditionalApplicationInfo';
import { IAdditionalApplicationInfo, IGameInfo } from '../../shared/game/interfaces';
import { BrowseLang, DialogLang, MenuLang } from '../../shared/lang/types';
import { IGameLibraryFileItem } from '../../shared/library/interfaces';
import { WithPreferencesProps } from '../containers/withPreferences';
import GameManager from '../game/GameManager';
import { GameLauncher } from '../GameLauncher';
import { GameImageCollection } from '../image/GameImageCollection';
import { ImageFolderCache } from '../image/ImageFolderCache';
import { getImageFolderName } from '../image/util';
import { IGamePlaylistEntry } from '../playlist/interfaces';
import { copyGameImageFile, deleteGameImageFiles } from '../util/game';
import { LangContext } from '../util/lang';
import { GamePropSuggestions } from '../util/suggestions';
import { uuid } from '../uuid';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { GameImageSplit } from './GameImageSplit';
import { ImagePreview } from './ImagePreview';
import { InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';

type OwnProps = {
  gameImages: GameImageCollection;
  games: GameManager;
  /** Currently selected game (if any) */
  currentGame?: IGameInfo;
  /** Additional Applications of the currently selected game (if any) */
  currentAddApps?: IAdditionalApplicationInfo[];
  /* */
  currentLibrary?: IGameLibraryFileItem;
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
};

export type RightBrowseSidebarProps = OwnProps & WithPreferencesProps;

type RightBrowseSidebarState = {
  /** If a preview of the current game's screenshot should be shown. */
  showPreview: boolean;
};

/** Sidebar on the right side of BrowsePage. */
export class RightBrowseSidebar extends React.Component<RightBrowseSidebarProps, RightBrowseSidebarState> {
  // Bound "on done" handlers for various input elements
  onTitleChange               = this.wrapOnTextChange((game, text) => { game.title               = text; });
  onDeveloperChange           = this.wrapOnTextChange((game, text) => { game.developer           = text; });
  onGenreChange               = this.wrapOnTextChange((game, text) => { game.genre               = text; });
  onSeriesChange              = this.wrapOnTextChange((game, text) => { game.series              = text; });
  onSourceChange              = this.wrapOnTextChange((game, text) => { game.source              = text; });
  onPublisherChange           = this.wrapOnTextChange((game, text) => { game.publisher           = text; });
  onPlatformChange            = this.wrapOnTextChange((game, text) => { game.platform            = text; });
  onPlayModeChange            = this.wrapOnTextChange((game, text) => { game.playMode            = text; });
  onStatusChange              = this.wrapOnTextChange((game, text) => { game.status              = text; });
  onVersionChange             = this.wrapOnTextChange((game, text) => { game.version             = text; });
  onReleaseDateChange         = this.wrapOnTextChange((game, text) => { game.releaseDate         = text; });
  onLanguageChange            = this.wrapOnTextChange((game, text) => { game.language            = text; });
  onLaunchCommandChange       = this.wrapOnTextChange((game, text) => { game.launchCommand       = text; });
  onApplicationPathChange     = this.wrapOnTextChange((game, text) => { game.applicationPath     = text; });
  onNotesChange               = this.wrapOnTextChange((game, text) => { game.notes               = text; });
  onOriginalDescriptionChange = this.wrapOnTextChange((game, text) => { game.originalDescription = text; });
  onBrokenChange              = this.wrapOnCheckBoxChange(game => { game.broken  = !game.broken;  });
  onExtremeChange             = this.wrapOnCheckBoxChange(game => { game.extreme = !game.extreme; });

  launchCommandRef: React.RefObject<HTMLInputElement> = React.createRef();

  static contextType = LangContext;

  constructor(props: RightBrowseSidebarProps) {
    super(props);
    this.state = {
      showPreview: false,
    };
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  render() {
    const strings : BrowseLang = this.context.browse;
    const game: IGameInfo | undefined = this.props.currentGame;
    if (game) {
      const { currentAddApps, gameImages, gamePlaylistEntry, isEditing, isNewGame, preferencesData, suggestions } = this.props;
      const isPlaceholder = game.placeholder;
      const editDisabled = !preferencesData.enableEditing;
      const editable = !editDisabled && isEditing;
      const imageFolderName = this.getImageFolderName();
      const dateAdded = new Date(game.dateAdded).toUTCString();
      const screenshotSrc = gameImages.getScreenshotPath(game);
      const thumbnailSrc = gameImages.getThumbnailPath(game);
      return (
        <div
          className={'browse-right-sidebar ' + (editable ? 'browse-right-sidebar--edit-enabled' : 'browse-right-sidebar--edit-disabled')}
          onKeyDown={this.onLocalKeyDown}>
          {/* -- Title & Developer(s) -- */}
          <div className='browse-right-sidebar__section'>
            <div className='browse-right-sidebar__row'>
              <div className='browse-right-sidebar__title-row'>
                <div className='browse-right-sidebar__title-row__title'>
                  <InputField
                    text={game.title}
                    placeholder={strings.noTitle}
                    onChange={this.onTitleChange}
                    editable={editable} />
                </div>
                <div className='browse-right-sidebar__title-row__buttons'>
                  { editDisabled ? undefined : (
                    <>
                      { isEditing ? ( /* While Editing */
                        <>
                          {/* "Save" Button */}
                          <div
                            className='browse-right-sidebar__title-row__buttons__save-button'
                            title={strings.saveChanges}
                            onClick={this.props.onSaveGame}>
                            <OpenIcon icon='check' />
                          </div>
                          {/* "Discard" Button */}
                          <div
                            className='browse-right-sidebar__title-row__buttons__discard-button'
                            title={strings.discardChanges}
                            onClick={this.props.onDiscardClick}>
                            <OpenIcon icon='x' />
                          </div>
                        </>
                      ) : ( /* While NOT Editing */
                        <>
                          {/* "Edit" Button */}
                          { isPlaceholder ? undefined : (
                            <div
                              className='browse-right-sidebar__title-row__buttons__edit-button'
                              title={strings.editGame}
                              onClick={this.props.onEditClick}>
                              <OpenIcon icon='pencil' />
                            </div>
                          ) }
                          {/* "Remove From Playlist" Button */}
                          { gamePlaylistEntry ? (
                            <ConfirmElement
                              onConfirm={this.props.onRemoveSelectedGameFromPlaylist}
                              children={this.renderRemoveFromPlaylistButton}
                              extra={strings} />
                          ) : undefined }
                          {/* "Delete Game" Button */}
                          { (isPlaceholder || isNewGame || gamePlaylistEntry) ? undefined : (
                            <ConfirmElement
                              onConfirm={this.onDeleteGameClick}
                              children={this.renderDeleteGameButton}
                              extra={strings} />
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
                <p>{strings.by} </p>
                <InputField
                  text={game.developer}
                  placeholder={strings.noDeveloper}
                  onChange={this.onDeveloperChange}
                  editable={editable}
                  onKeyDown={this.onInputKeyDown} />
              </div>
            ) }
          </div>
          {/* -- Most Fields -- */}
          { isPlaceholder ? undefined : (
            <>
              <div className='browse-right-sidebar__section'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.genre}: </p>
                  <DropdownInputField
                    text={game.genre}
                    placeholder={strings.noGenre}
                    onChange={this.onGenreChange}
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.genre) || []}
                    onItemSelect={text => { game.genre = text; this.forceUpdate(); }}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.series}: </p>
                  <InputField
                    text={game.series}
                    placeholder={strings.noSeries}
                    onChange={this.onSeriesChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.publisher}: </p>
                  <InputField
                    text={game.publisher}
                    placeholder={strings.noPublisher}
                    onChange={this.onPublisherChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.source}: </p>
                  <InputField
                    text={game.source}
                    placeholder={strings.noSource}
                    onChange={this.onSourceChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.platform}: </p>
                  <DropdownInputField
                    text={game.platform}
                    placeholder={strings.noPlatform}
                    onChange={this.onPlatformChange}
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.platform) || []}
                    onItemSelect={text => { game.platform = text; this.forceUpdate(); }}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.playMode}: </p>
                  <DropdownInputField
                    text={game.playMode}
                    placeholder={strings.noPlayMode}
                    onChange={this.onPlayModeChange}
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.playMode) || []}
                    onItemSelect={text => { game.playMode = text; this.forceUpdate(); }}
                    onKeyDown={this.onInputKeyDown} />

                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.status}: </p>
                  <DropdownInputField
                    text={game.status}
                    placeholder={strings.noStatus}
                    onChange={this.onStatusChange}
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.status) || []}
                    onItemSelect={text => { game.status = text; this.forceUpdate(); }}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.version}: </p>
                  <InputField
                    text={game.version}
                    placeholder={strings.noVersion}
                    onChange={this.onVersionChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.releaseDate}: </p>
                  <InputField
                    text={game.releaseDate}
                    placeholder={strings.noReleaseDate}
                    onChange={this.onReleaseDateChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.language}: </p>
                  <InputField
                    text={game.language}
                    placeholder={strings.noLanguage}
                    onChange={this.onLanguageChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.dateAdded}: </p>
                  <p
                    className='browse-right-sidebar__row__date-added'
                    title={dateAdded}>{dateAdded}</p>
                </div>
                <div className='browse-right-sidebar__row'>
                  <div
                    className='browse-right-sidebar__row__check-box-wrapper'
                    onClick={this.onBrokenChange}>
                    <CheckBox
                      checked={game.broken}
                      className='browse-right-sidebar__row__check-box' />
                    <p> {strings.brokenInInfinity}</p>
                  </div>
                </div>
                <div className='browse-right-sidebar__row'>
                  <div
                    className='browse-right-sidebar__row__check-box-wrapper'
                    onClick={this.onExtremeChange}>
                    <CheckBox
                      checked={game.extreme}
                      className='browse-right-sidebar__row__check-box' />
                    <p> {strings.extreme}</p>
                  </div>
                </div>
              </div>
            </>
          ) }
          {/* -- Playlist Game Entry Notes -- */}
          { gamePlaylistEntry ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>{strings.playlistNotes}: </p>
                <InputField
                  text={gamePlaylistEntry.notes || ''}
                  placeholder={strings.noPlaylistNotes}
                  onChange={this.onEditPlaylistNotes}
                  editable={editable}
                  multiline={true} />
              </div>
            </div>
          ) : undefined }
          {/* -- Notes -- */}
          { (!editDisabled || game.notes) && !isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>{strings.notes}: </p>
                <InputField
                  text={game.notes}
                  placeholder={strings.noNotes}
                  onChange={this.onNotesChange}
                  editable={editable}
                  multiline={true} />
              </div>
            </div>
          ) : undefined }
          {/* -- Original Description -- */}
          { (!editDisabled || game.originalDescription) && !isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>{strings.originalDescription}: </p>
                <InputField
                  text={game.originalDescription}
                  placeholder={strings.noOriginalDescription}
                  onChange={this.onOriginalDescriptionChange}
                  editable={editable}
                  multiline={true} />
              </div>
            </div>
          ) : undefined }
          {/* -- Additional Applications -- */}
          { editable || (currentAddApps && currentAddApps.length > 0) ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--additional-applications-header'>
                <p>{strings.additionalApplications}:</p>
                { editable ? (
                  <input
                    type='button'
                    value={strings.new}
                    className='simple-button'
                    onClick={this.onNewAddAppClick} />
                ) : undefined }
              </div>
              { currentAddApps && currentAddApps.map((addApp) => (
                <RightBrowseSidebarAddApp
                  key={addApp.id}
                  addApp={addApp}
                  editDisabled={!editable}
                  onLaunch={this.onAddAppLaunch}
                  onDelete={this.onAddAppDelete} />
              )) }
            </div>
          ) : undefined }
          {/* -- Application Path & Launch Command -- */}
          { editable && !isPlaceholder ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.applicationPath}: </p>
                <DropdownInputField
                  text={game.applicationPath}
                  placeholder={strings.noApplicationPath}
                  onChange={this.onApplicationPathChange}
                  editable={editable}
                  items={suggestions && filterSuggestions(suggestions.applicationPath) || []}
                  onItemSelect={text => { game.applicationPath = text; this.forceUpdate(); }}
                  onKeyDown={this.onInputKeyDown} />
              </div>
              <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                <p>{strings.launchCommand}: </p>
                <InputField
                  text={game.launchCommand}
                  placeholder={strings.noLaunchCommand}
                  onChange={this.onLaunchCommandChange}
                  editable={editable}
                  onKeyDown={this.onInputKeyDown}
                  reference={this.launchCommandRef} />
              </div>
            </div>
          ) : undefined }
          {/* -- Game ID -- */}
          { editable || isPlaceholder ? (
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
                      <GameImageSplit
                        type='thumbnail'
                        text={strings.thumbnail}
                        imgSrc={thumbnailSrc}
                        onAddClick={this.addThumbnailDialog}
                        onRemoveClick={this.onRemoveThumbnailClick}
                        onDrop={this.onImageDrop}
                        disabled={!imageFolderName} />
                      <GameImageSplit
                        type='screenshot'
                        text={strings.screenshot}
                        imgSrc={screenshotSrc}
                        onAddClick={this.addScreenshotDialog}
                        onRemoveClick={this.onRemoveScreenshotClick}
                        onDrop={this.onImageDrop}
                        disabled={!imageFolderName} />
                    </div>
                    <div className='browse-right-sidebar__row__screenshot__placeholder__front'>
                      <p>{strings.dropImageHere}</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={screenshotSrc}
                    onClick={this.onScreenshotClick} />
                ) }
              </div>
            </div>
          </div>
          {/* -- Screenshot Preview -- */}
          { this.state.showPreview ? (
            <ImagePreview
              src={screenshotSrc}
              onCancel={this.onScreenshotPreviewClick} />
          ) : undefined }
        </div>
      );
    } else {
      return (
        <div className='browse-right-sidebar-empty'>
          <h1>{strings.noGameSelected}</h1>
          <p>{strings.clickToSelectGame}</p>
        </div>
      );
    }
  }

  renderDeleteGameButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<BrowseLang>): JSX.Element {
    return (
      <div
        className={
          'browse-right-sidebar__title-row__buttons__delete-game' +
          ((activationCounter > 0) ? ' browse-right-sidebar__title-row__buttons__delete-game--active simple-vertical-shake' : '')
        }
        title={extra.deleteGameAndAdditionalApps}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='trash' />
      </div>
    );
  }

  renderRemoveFromPlaylistButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<BrowseLang>): JSX.Element {
    return (
      <div
        className={
          'browse-right-sidebar__title-row__buttons__remove-from-playlist' +
          ((activationCounter > 0) ? ' browse-right-sidebar__title-row__buttons__remove-from-playlist--active simple-vertical-shake' : '')
        }
        title={extra.removeGameFromPlaylist} // TODO: LOCALIZATION
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='circle-x' />
      </div>
    );
  }

  /** When a key is pressed down "globally" (and this component is present) */
  onGlobalKeyDown = (event: KeyboardEvent) => {
    const { currentGame, isEditing, onEditClick } = this.props;
    // Start editing
    if (event.ctrlKey && event.code === 'KeyE' && // (CTRL + E ...
        !isEditing && currentGame) { // ... while not editing, and a game is selected)
      if (onEditClick) { onEditClick(); }
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  }

  onLocalKeyDown = (event: React.KeyboardEvent) => {
    const { currentGame, isEditing, onSaveGame } = this.props;
    // Save changes
    if (event.ctrlKey && event.key === 's' && // (CTRL + S ...
        isEditing && currentGame) { // ... while editing, and a game is selected)
      if (onSaveGame) { onSaveGame(); }
      event.preventDefault();
    }
  }

  onScreenshotContextMenu = (event: React.MouseEvent) => {
    const strings : MenuLang = this.context.menu;
    const { currentGame, gameImages } = this.props;
    const template: MenuItemConstructorOptions[] = [];
    if (currentGame) {
      const thumbnailFilename = gameImages.getThumbnailPath(currentGame);
      const screenshotFilename = gameImages.getScreenshotPath(currentGame);
      template.push({
        label: strings.viewThumbnailInFolder,
        click: () => {
          if (thumbnailFilename === undefined) { throw new Error('Can not view thumbnail, thumbnail filename not found'); }
          remote.shell.showItemInFolder(thumbnailFilename.replace(/\//g, '\\'));
        },
        enabled: thumbnailFilename !== undefined
      });
      template.push({
        label: strings.viewScreenshotInFolder,
        click: () => {
          if (screenshotFilename === undefined) { throw new Error('Can not view screenshot, screenshot filename not found'); }
          remote.shell.showItemInFolder(screenshotFilename.replace(/\//g, '\\'));
        },
        enabled: screenshotFilename !== undefined
      });
    }
    if (template.length > 0) {
      event.preventDefault();
      openContextMenu(template);
    }
  }

  deleteImage(cache: ImageFolderCache|undefined): void {
    const { currentGame } = this.props;
    if (!currentGame) { throw new Error('Failed to delete image file. The currently selected game could not be found.'); }
    if (!cache)       { throw new Error('Failed to delete image file. The image cache could not be found.'); }
    deleteGameImageFiles(currentGame, cache).then(() => { this.forceUpdate(); });
  }

  addScreenshotDialog = async () => {
    const strings : DialogLang = this.context.dialog;
    const { currentGame, gameImages } = this.props;
      if (!currentGame) { throw new Error('Failed to add image file. The currently selected game could not be found.'); }
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialogSync({
      title: strings.selectScreenshot,
      properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
      const imageFolderName = this.getImageFolderName();
      const cache = await gameImages.getOrCreateScreenshotCache(imageFolderName);
      copyGameImageFile(filePaths[0], currentGame, cache).then(() => { this.forceUpdate(); });
    }
  }

  addThumbnailDialog = async () => {
    const strings : DialogLang = this.context.dialog;
    const { currentGame, gameImages } = this.props;
      if (!currentGame) { throw new Error('Failed to add image file. The currently selected game could not be found.'); }
    // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
    const filePaths = window.External.showOpenDialogSync({
      title: strings.selectThumbnail,
      properties: ['openFile']
    });
    if (filePaths && filePaths[0]) {
      const imageFolderName = this.getImageFolderName();
      const cache = await gameImages.getOrCreateThumbnailCache(imageFolderName);
      copyGameImageFile(filePaths[0], currentGame, cache).then(() => { this.forceUpdate(); });
    }
  }

  onRemoveScreenshotClick = (): void => {
    this.deleteImage(this.props.gameImages.getScreenshotCache(this.getImageFolderName()));
  }

  onRemoveThumbnailClick = (): void => {
    this.deleteImage(this.props.gameImages.getThumbnailCache(this.getImageFolderName()));
  }

  onImageDrop = (event: React.DragEvent, type: string): void => {
    event.preventDefault();
    const files = copyArrayLike(event.dataTransfer.files);
    const game = this.props.currentGame;
    const imageFolderName = this.getImageFolderName();
    if (!game) { throw new Error('Can not add a new image, "currentGame" is missing.'); }
    const thumbnailCache = this.props.gameImages.getThumbnailCache(imageFolderName);
    if (!thumbnailCache) { throw new Error('Can not add a new image, the thumbnail cache is missing.'); }
    const screenshotCache = this.props.gameImages.getScreenshotCache(imageFolderName);
    if (!screenshotCache) { throw new Error('Can not add a new image, the screenshot cache is missing.'); }
    if (files.length > 1) { // (Multiple files)
      copyGameImageFile(files[0].path, game, thumbnailCache).then(() => { this.forceUpdate(); });
      copyGameImageFile(files[1].path, game, screenshotCache).then(() => { this.forceUpdate(); });
    } else { // (Single file)
      switch (type) {
        case 'thumbnail':
          copyGameImageFile(files[0].path, game, thumbnailCache).then(() => { this.forceUpdate(); });
          break;
        case 'screenshot':
          copyGameImageFile(files[0].path, game, screenshotCache).then(() => { this.forceUpdate(); });
          break;
        default:
          console.warn('No "add-single-file" case for the "text" of the GameImageSplit the file was dropped on.');
          break;
      }
    }
  }

  onDeleteGameClick = (): void => {
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

  onAddAppLaunch(addApp: IAdditionalApplicationInfo): void {
    GameLauncher.launchAdditionalApplication(addApp);
  }

  onAddAppDelete = (addApp: IAdditionalApplicationInfo): void => {
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

  onNewAddAppClick = (): void => {
    if (!this.props.currentAddApps) { throw new Error('Unable to add a new AddApp. "currentAddApps" is missing.'); }
    if (!this.props.currentGame)    { throw new Error('Unable to add a new AddApp. "currentGame" is missing.'); }
    const newAddApp = AdditionalApplicationInfo.create();
    newAddApp.id = uuid();
    newAddApp.gameId = this.props.currentGame.id;
    this.props.currentAddApps.push(newAddApp);
    this.forceUpdate();
  }

  onScreenshotClick = (): void => {
    this.setState({ showPreview: true });
  }

  onScreenshotPreviewClick = (): void => {
    this.setState({ showPreview: false });
  }

  onEditPlaylistNotes = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>): void => {
    if (this.props.onEditPlaylistNotes) {
      this.props.onEditPlaylistNotes(event.currentTarget.value);
      this.forceUpdate();
    }
  }

  /** When a key is pressed while an input field is selected (except for multiline fields) */
  onInputKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      if (this.props.onSaveGame) { this.props.onSaveGame(); }
    }
  }

  /** Create a wrapper for a EditableTextWrap's onChange callback (this is to reduce redundancy). */
  wrapOnTextChange(func: (game: IGameInfo, text: string) => void): (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => void {
    return (event) => {
      const game = this.props.currentGame;
      if (game) {
        func(game, event.currentTarget.value);
        this.forceUpdate();
      }
    };
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy). */
  wrapOnCheckBoxChange(func: (game: IGameInfo) => void): () => void {
    return () => {
      const game = this.props.currentGame;
      const editable = this.props.preferencesData.enableEditing && this.props.isEditing;
      if (game && editable) {
        func(game);
        this.forceUpdate();
      }
    };
  }

  /** Get the name of the image folder for the current game. */
  getImageFolderName(): string {
    const { currentGame, currentLibrary, isNewGame } = this.props;
    if (currentGame) {
      const prefix = currentLibrary && currentLibrary.prefix || '';
      return getImageFolderName(currentGame, prefix, isNewGame);
    } else { return ''; }
  }
}

function filterSuggestions(suggestions?: string[]): string[] {
  if (!suggestions) { return []; }
  // if (suggestions.length > 25) { return suggestions.slice(0, 25); }
  return suggestions;
}

/** Open a context menu, built from the specified template. */
function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

/**
 * Create a new array and populate it with the properties and values from another array or array like object.
 * @param arrayLike Array or array like object to copy properties and values from.
 * @returns New array with the same properties and values as the argument.
 */
function copyArrayLike<T>(arrayLike: { [key: number]: T }): Array<T> {
  const array: T[] = [];
  for (let key in arrayLike) {
    array[key] = arrayLike[key];
  }
  return array;
}
