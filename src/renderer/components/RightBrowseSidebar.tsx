import { Game } from '@database/entity/Game';
import { PlaylistGame } from '@database/entity/PlaylistGame';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import { BackIn, BackOut, DeleteImageData, ImageChangeData, LaunchAddAppData, SaveImageData, TagByIdData, TagByIdResponse, TagGetOrCreateData, TagGetOrCreateResponse, TagSuggestion, WrappedResponse } from '@shared/back/types';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { wrapSearchTerm } from '@shared/game/GameFilter';
import { ModelUtils } from '@shared/game/util';
import { GamePropSuggestions, PickType } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { deepCopy } from '@shared/Util';
import { Menu, MenuItemConstructorOptions, remote } from 'electron';
import * as fs from 'fs';
import * as React from 'react';
import { WithPreferencesProps } from '../containers/withPreferences';
import { WithSearchProps } from '../containers/withSearch';
import { getGameImagePath, getGameImageURL } from '../Util';
import { LangContext } from '../util/lang';
import { uuid } from '../util/uuid';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { GameImageSplit } from './GameImageSplit';
import { ImagePreview } from './ImagePreview';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { TagInputField } from './TagInputField';

type OwnProps = {
  /** Currently selected game (if any) */
  currentGame?: Game;
  /* Current Library */
  currentLibrary: string;
  /** Currently selected game entry (if any) */
  currentPlaylistEntry?: PlaylistGame;
  /** Called when the selected game is deleted by this */
  onDeleteSelectedGame: () => void;
  /** Called when the selected game is removed from the selected by this */
  onRemoveSelectedGameFromPlaylist?: () => void;
  /** Called when a playlist is deselected (searching game fields) */
  onDeselectPlaylist: () => void;
  /** Called when the playlist notes for the selected game has been changed */
  onEditPlaylistNotes: (text: string) => void;
  /** If the "edit mode" is currently enabled */
  isEditing: boolean;
  /** If the selected game is a new game being created */
  isNewGame: boolean;
  /** Suggestions for entries */
  suggestions: Partial<GamePropSuggestions>;
  /** Tag Categories info */
  tagCategories: TagCategory[];

  onEditClick: () => void;
  onDiscardClick: () => void;
  onSaveGame: () => void;

  onEditGame: (game: Partial<Game>) => void;
};

export type RightBrowseSidebarProps = OwnProps & WithPreferencesProps & WithSearchProps;

type RightBrowseSidebarState = {
  /** If a preview of the current game's screenshot should be shown. */
  showPreview: boolean;
  screenshotExists: boolean;
  thumbnailExists: boolean;
  currentTagInput: string;
  tagSuggestions: TagSuggestion[];
};

export interface RightBrowseSidebar {
  context: LangContainer;
}

/** Sidebar on the right side of BrowsePage. */
export class RightBrowseSidebar extends React.Component<RightBrowseSidebarProps, RightBrowseSidebarState> {
  // Bound "on change" callbacks for game fields
  onTitleChange               = this.wrapOnTextChange((game, text) => this.props.onEditGame({ title: text }));
  onAlternateTitlesChange     = this.wrapOnTextChange((game, text) => this.props.onEditGame({ alternateTitles: text }));
  onDeveloperChange           = this.wrapOnTextChange((game, text) => this.props.onEditGame({ developer: text }));
  onSeriesChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ series: text }));
  onSourceChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ source: text }));
  onPublisherChange           = this.wrapOnTextChange((game, text) => this.props.onEditGame({ publisher: text }));
  onPlatformChange            = this.wrapOnTextChange((game, text) => this.props.onEditGame({ platform: text }));
  onPlayModeChange            = this.wrapOnTextChange((game, text) => this.props.onEditGame({ playMode: text }));
  onStatusChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ status: text }));
  onVersionChange             = this.wrapOnTextChange((game, text) => this.props.onEditGame({ version: text }));
  onReleaseDateChange         = this.wrapOnTextChange((game, text) => this.props.onEditGame({ releaseDate: text }));
  onLanguageChange            = this.wrapOnTextChange((game, text) => this.props.onEditGame({ language: text }));
  onLaunchCommandChange       = this.wrapOnTextChange((game, text) => this.props.onEditGame({ launchCommand: text }));
  onApplicationPathChange     = this.wrapOnTextChange((game, text) => this.props.onEditGame({ applicationPath: text }));
  onNotesChange               = this.wrapOnTextChange((game, text) => this.props.onEditGame({ notes: text }));
  onOriginalDescriptionChange = this.wrapOnTextChange((game, text) => this.props.onEditGame({ originalDescription: text }));
  onBrokenChange              = this.wrapOnCheckBoxChange(game => {
    if (this.props.currentGame) {
      this.props.onEditGame({ broken: !this.props.currentGame.broken });
    }});
  onExtremeChange             = this.wrapOnCheckBoxChange(game => {
    if (this.props.currentGame) {
      this.props.onEditGame({ extreme: !this.props.currentGame.extreme });
    }});
  // Bound "on click" callbacks for game fields
  onDeveloperClick            = this.wrapOnTextClick('developer');
  onSeriesClick               = this.wrapOnTextClick('series');
  onSourceClick               = this.wrapOnTextClick('source');
  onPublisherClick            = this.wrapOnTextClick('publisher');
  onPlatformClick             = this.wrapOnTextClick('platform');
  onPlayModeClick             = this.wrapOnTextClick('playMode');
  onStatusClick               = this.wrapOnTextClick('status');
  onVersionClick              = this.wrapOnTextClick('version');
  onReleaseDateClick          = this.wrapOnTextClick('releaseDate');
  onLanguageClick             = this.wrapOnTextClick('language');

  launchCommandRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: RightBrowseSidebarProps) {
    super(props);
    this.state = {
      showPreview: false,
      screenshotExists: false,
      thumbnailExists: false,
      currentTagInput: '',
      tagSuggestions: [],
    };
  }

  componentDidMount() {
    window.Shared.back.on('message', this.onResponse);
    window.addEventListener('keydown', this.onGlobalKeyDown);
  }

  componentWillUnmount() {
    window.Shared.back.off('message', this.onResponse);
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  componentDidUpdate(prevProps: RightBrowseSidebarProps, prevState: RightBrowseSidebarState): void {
    if (this.props.isEditing && !prevProps.isEditing) {
      if (this.props.currentGame) {
        this.checkImageExistance(SCREENSHOTS, this.props.currentGame.id);
        this.checkImageExistance(LOGOS, this.props.currentGame.id);
      } else {
        this.setState({
          screenshotExists: false,
          thumbnailExists: false,
        });
      }
    }
  }

  render() {
    const strings = this.context.browse;
    const game: Game | undefined = this.props.currentGame;
    if (game) {
      const { isEditing, isNewGame, currentPlaylistEntry, preferencesData, suggestions, tagCategories } = this.props;
      const currentAddApps = game.addApps;
      const isPlaceholder = game.placeholder;
      const editDisabled = !preferencesData.enableEditing;
      const editable = !editDisabled && isEditing;
      const dateAdded = game.dateAdded;
      const dateModified = game.dateModified;
      const screenshotSrc = getGameImageURL(SCREENSHOTS, game.id);
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
                    editable={editable}
                    onChange={this.onTitleChange}
                    onKeyDown={this.onInputKeyDown} />
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
                          { currentPlaylistEntry ? (
                            <ConfirmElement
                              onConfirm={this.props.onRemoveSelectedGameFromPlaylist}
                              children={this.renderRemoveFromPlaylistButton}
                              extra={strings} />
                          ) : undefined }
                          {/* "Delete Game" Button */}
                          { (isPlaceholder || isNewGame || currentPlaylistEntry) ? undefined : (
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
                  className='browse-right-sidebar__searchable'
                  editable={editable}
                  onChange={this.onDeveloperChange}
                  onClick={this.onDeveloperClick}
                  onKeyDown={this.onInputKeyDown} />
              </div>
            ) }
          </div>
          {/* -- Most Fields -- */}
          { isPlaceholder ? undefined : (
            <>
              <div className='browse-right-sidebar__section'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.alternateTitles}: </p>
                  <InputField
                    text={game.alternateTitles}
                    placeholder={strings.noAlternateTitles}
                    className='browse-right-sidebar__searchable'
                    onChange={this.onAlternateTitlesChange}
                    editable={editable}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.tags}: </p>
                  <TagInputField
                    text={this.state.currentTagInput}
                    placeholder={strings.enterTag}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    onChange={this.onCurrentTagChange}
                    tags={game.tags}
                    suggestions={this.state.tagSuggestions}
                    categories={tagCategories}
                    onTagSelect={this.onTagSelect}
                    onTagEditableSelect={this.onRemoveTag}
                    onTagSuggestionSelect={this.onAddTagSuggestion}
                    onTagSubmit={this.onAddTagByString}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.series}: </p>
                  <InputField
                    text={game.series}
                    placeholder={strings.noSeries}
                    className='browse-right-sidebar__searchable'
                    onChange={this.onSeriesChange}
                    editable={editable}
                    onClick={this.onSeriesClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.publisher}: </p>
                  <InputField
                    text={game.publisher}
                    placeholder={strings.noPublisher}
                    className='browse-right-sidebar__searchable'
                    onChange={this.onPublisherChange}
                    editable={editable}
                    onClick={this.onPublisherClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.source}: </p>
                  <InputField
                    text={game.source}
                    placeholder={strings.noSource}
                    onChange={this.onSourceChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    onClick={this.onSourceClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.platform}: </p>
                  <DropdownInputField
                    text={game.platform}
                    placeholder={strings.noPlatform}
                    onChange={this.onPlatformChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.platform) || []}
                    onItemSelect={text => this.props.onEditGame({ platform: text })}
                    onClick={this.onPlatformClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.playMode}: </p>
                  <DropdownInputField
                    text={game.playMode}
                    placeholder={strings.noPlayMode}
                    onChange={this.onPlayModeChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.playMode) || []}
                    onItemSelect={text => this.props.onEditGame({ playMode: text })}
                    onClick={this.onPlayModeClick}
                    onKeyDown={this.onInputKeyDown} />

                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.status}: </p>
                  <DropdownInputField
                    text={game.status}
                    placeholder={strings.noStatus}
                    onChange={this.onStatusChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.status) || []}
                    onItemSelect={text => this.props.onEditGame({ status: text })}
                    onClick={this.onStatusClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.version}: </p>
                  <InputField
                    text={game.version}
                    placeholder={strings.noVersion}
                    className='browse-right-sidebar__searchable'
                    onChange={this.onVersionChange}
                    editable={editable}
                    onClick={this.onVersionClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.releaseDate}: </p>
                  <InputField
                    text={game.releaseDate}
                    placeholder={strings.noReleaseDate}
                    onChange={this.onReleaseDateChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    onClick={this.onReleaseDateClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.language}: </p>
                  <InputField
                    text={game.language}
                    placeholder={strings.noLanguage}
                    onChange={this.onLanguageChange}
                    className='browse-right-sidebar__searchable'
                    editable={editable}
                    onClick={this.onLanguageClick}
                    onKeyDown={this.onInputKeyDown} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.dateAdded}: </p>
                  <p
                    className='browse-right-sidebar__row__date-added'
                    title={dateAdded}>
                    {dateAdded}
                  </p>
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.dateModified}: </p>
                  <p
                    className='browse-right-sidebar__row__date-added'
                    title={dateModified}>
                    {dateModified}
                  </p>
                </div>
                { game.broken || editable ? (
                  <div className='browse-right-sidebar__row'>
                    <div
                      className='browse-right-sidebar__row__check-box-wrapper'
                      onClick={this.onBrokenChange}>
                      { editable ? (
                        <>
                        <CheckBox
                          checked={game.broken}
                          className='browse-right-sidebar__row__check-box' />
                        <p> {strings.brokenInInfinity}</p>
                        </>
                      ) : (<b> {strings.brokenInInfinity}</b>) }
                    </div>
                  </div>
                ) : undefined }
                { game.extreme || editable ? (
                  <div className='browse-right-sidebar__row'>
                    <div
                      className='browse-right-sidebar__row__check-box-wrapper'
                      onClick={this.onExtremeChange}>
                      { editable ? (
                        <>
                        <CheckBox
                          checked={game.extreme}
                          className='browse-right-sidebar__row__check-box' />
                        <p> {strings.extreme}</p>
                        </>
                      ) : ( <b> {strings.extreme}</b> ) }
                    </div>
                  </div>
                ) : undefined }
              </div>
            </>
          ) }
          {/* -- Playlist Game Entry Notes -- */}
          { currentPlaylistEntry ? (
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <p>{strings.playlistNotes}: </p>
                <InputField
                  text={currentPlaylistEntry.notes}
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
                  onItemSelect={text => this.props.onEditGame({ applicationPath: text })}
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
            <div className='browse-right-sidebar__row browse-right-sidebar__row__spacer' />
            <div className='browse-right-sidebar__row'>
              <div
                className='browse-right-sidebar__row__screenshot'
                onContextMenu={this.onScreenshotContextMenu}>
                { isEditing ? (
                  <div className='browse-right-sidebar__row__screenshot__placeholder'>
                    <div className='browse-right-sidebar__row__screenshot__placeholder__back'>
                      <GameImageSplit
                        text={strings.thumbnail}
                        imgSrc={this.state.thumbnailExists ? getGameImageURL(LOGOS, game.id) : undefined}
                        showHeaders={true}
                        onAddClick={this.onAddThumbnailDialog}
                        onRemoveClick={this.onRemoveThumbnailClick}
                        onDrop={this.onThumbnailDrop} />
                      <GameImageSplit
                        text={strings.screenshot}
                        imgSrc={this.state.screenshotExists ? screenshotSrc : undefined}
                        showHeaders={true}
                        onAddClick={this.onAddScreenshotDialog}
                        onRemoveClick={this.onRemoveScreenshotClick}
                        onDrop={this.onScreenshotDrop} />
                    </div>
                    <div className='browse-right-sidebar__row__screenshot__placeholder__front'>
                      <p>{strings.dropImageHere}</p>
                    </div>
                  </div>
                ) : (
                  <img
                    className='browse-right-sidebar__row__screenshot-image'
                    alt='' // Hide the broken link image if source is not found
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

  renderDeleteGameButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
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

  renderRemoveFromPlaylistButton({ activate, activationCounter, reset, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
    return (
      <div
        className={
          'browse-right-sidebar__title-row__buttons__remove-from-playlist' +
          ((activationCounter > 0) ? ' browse-right-sidebar__title-row__buttons__remove-from-playlist--active simple-vertical-shake' : '')
        }
        title={extra.removeGameFromPlaylist}
        onClick={activate}
        onMouseLeave={reset}>
        <OpenIcon icon='circle-x' />
      </div>
    );
  }

  onResponse = (res: WrappedResponse) => {
    if (res.type === BackOut.IMAGE_CHANGE) {
      const resData: ImageChangeData = res.data;

      // Refresh image if it was replaced or removed
      if (this.props.isEditing && this.props.currentGame && this.props.currentGame.id === resData.id) {
        if (resData.folder === LOGOS) {
          this.checkImageExistance(LOGOS, this.props.currentGame.id);
        } else if (resData.folder === SCREENSHOTS) {
          this.checkImageExistance(SCREENSHOTS, this.props.currentGame.id);
        }
      }
    }
  }

  checkImageExistance(folder: typeof LOGOS | typeof SCREENSHOTS, id: string) {
    fetch(getGameImageURL(folder, id))
    .then(res => {
      const target = (folder === LOGOS) ? 'thumbnailExists' : 'screenshotExists';
      const exists = (res.status >= 200 && res.status < 300);
      if (this.state[target] !== exists) {
        this.setState({ [target]: exists } as any); // setState is very annoying to make typesafe
      } else {
        // @PERF It is a little bit wasteful to refresh all images instead of just the changed one
        GameImageSplit.refreshImages();
      }
    });
  }

  /** When a key is pressed down "globally" (and this component is present) */
  onGlobalKeyDown = (event: KeyboardEvent) => {
    // Start editing
    if (event.ctrlKey && event.code === 'KeyE' && // (CTRL + E ...
        !this.props.isEditing && this.props.currentGame) { // ... while not editing, and a game is selected)
      this.props.onEditClick();
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  }

  onLocalKeyDown = (event: React.KeyboardEvent) => {
    // Save changes
    if (event.ctrlKey && event.key === 's' && // (CTRL + S ...
        this.props.isEditing && this.props.currentGame) { // ... while editing, and a game is selected)
      this.props.onSaveGame();
      event.preventDefault();
    }
  }

  onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion[] = this.state.tagSuggestions;

    if (newTag !== '') {
      // Delayed set
      window.Shared.back.send<any, any>(BackIn.GET_TAG_SUGGESTIONS, newTag, (res) => {
        if (res.data) {
          this.setState({
            tagSuggestions: res.data
          });
        }
      });
    } else {
      newSuggestions = [];
    }

    this.setState({
      currentTagInput: newTag,
      tagSuggestions: newSuggestions
    });
  }

  onScreenshotContextMenu = (event: React.MouseEvent) => {
    const { currentGame } = this.props;
    const template: MenuItemConstructorOptions[] = [];
    if (currentGame) {
      template.push({
        label: this.context.menu.viewThumbnailInFolder,
        click: () => { remote.shell.showItemInFolder(getGameImagePath(LOGOS, currentGame.id).replace(/\//g, '\\')); },
        enabled: true
      });
      template.push({
        label: this.context.menu.viewScreenshotInFolder,
        click: () => { remote.shell.showItemInFolder(getGameImagePath(SCREENSHOTS, currentGame.id).replace(/\//g, '\\')); },
        enabled: true
      });
    }
    if (template.length > 0) {
      event.preventDefault();
      openContextMenu(template);
    }
  }

  onAddScreenshotDialog = this.addImageDialog(SCREENSHOTS);
  onAddThumbnailDialog = this.addImageDialog(LOGOS);

  addImageDialog(folder: typeof LOGOS | typeof SCREENSHOTS) {
    return () => {
      const { currentGame } = this.props;
      if (!currentGame) { throw new Error('Failed to add image file. The currently selected game could not be found.'); }
      // Synchronously show a "open dialog" (this makes the main window "frozen" while this is open)
      const filePaths = window.Shared.showOpenDialogSync({
        title: this.context.dialog.selectScreenshot,
        properties: ['openFile']
      });
      if (filePaths && filePaths[0]) {
        fs.readFile(filePaths[0], (error, data) => {
          if (error) { console.error(error); }
          else {
            window.Shared.back.send<any, SaveImageData>(BackIn.SAVE_IMAGE, {
              folder: folder,
              id: currentGame.id,
              content: data.toString('base64'),
            });
          }
        });
      }
    };
  }

  onRemoveScreenshotClick = this.removeImage.bind(this, SCREENSHOTS);
  onRemoveThumbnailClick = this.removeImage.bind(this, LOGOS);

  removeImage(folder: string): void {
    if (this.props.currentGame) {
      window.Shared.back.send<DeleteImageData>(BackIn.DELETE_IMAGE, {
        folder: folder,
        id: this.props.currentGame.id,
      });
    }
  }

  onThumbnailDrop = this.imageDrop(LOGOS);
  onScreenshotDrop = this.imageDrop(SCREENSHOTS);

  imageDrop(type: typeof LOGOS | typeof SCREENSHOTS): (event: React.DragEvent) => void {
    return event => {
      event.preventDefault();
      const files = copyArrayLike(event.dataTransfer.files);
      const { currentGame } = this.props;
      if (!currentGame) { throw new Error('Can not add a new image, "currentGame" is missing.'); }
      if (files.length > 1) { // (Multiple files)
        saveImage(files[0], LOGOS, currentGame.id);
        saveImage(files[1], SCREENSHOTS, currentGame.id);
      } else { // (Single file)
        saveImage(files[0], type, currentGame.id);
      }

      function saveImage(file: Blob, folder: string, id: string) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'object') {
            window.Shared.back.send<any, SaveImageData>(BackIn.SAVE_IMAGE, {
              folder: folder,
              id: id,
              content: Buffer.from(reader.result).toString('base64'),
            });
          }
        };
        reader.readAsArrayBuffer(file.slice(0, file.size - 1));
      }
      function copyArrayLike<T>(arrayLike: { [key: number]: T }): Array<T> {
        const array: T[] = [];
        for (let key in arrayLike) {
          array[key] = arrayLike[key];
        }
        return array;
      }
    };
  }

  onDeleteGameClick = (): void => {
    this.props.onDeleteSelectedGame();
  }

  onAddAppLaunch(addAppId: string): void {
    window.Shared.back.send<any, LaunchAddAppData>(BackIn.LAUNCH_ADDAPP, { id: addAppId });
  }

  onAddAppDelete = (addAppId: string): void => {
    if (this.props.currentGame) {
      const newAddApps = deepCopy(this.props.currentGame.addApps);
      if (!newAddApps) { throw new Error('editAddApps is missing.'); }
      const index = newAddApps.findIndex(addApp => addApp.id === addAppId);
      if (index === -1) { throw new Error('Cant remove additional application because it was not found.'); }
      newAddApps.splice(index, 1);
      this.props.onEditGame({ addApps: newAddApps });
    }
  }

  onNewAddAppClick = (): void => {
    if (!this.props.currentGame)    { throw new Error('Unable to add a new AddApp. "currentGame" is missing.'); }
    const newAddApp = ModelUtils.createAddApp(this.props.currentGame);
    newAddApp.id = uuid();
    this.props.onEditGame({ addApps: [...this.props.currentGame.addApps, ...[newAddApp]] });
  }

  onScreenshotClick = (): void => {
    this.setState({ showPreview: true });
  }

  onScreenshotPreviewClick = (): void => {
    this.setState({ showPreview: false });
  }

  onEditPlaylistNotes = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    this.props.onEditPlaylistNotes(event.currentTarget.value);
  }

  /** When a key is pressed while an input field is selected (except for multiline fields) */
  onInputKeyDown = (event: React.KeyboardEvent): void => {
    // if (event.key === 'Enter') { this.props.onSaveGame(); }
  }

  onTagSelect = (tag: Tag, index: number): void => {
    const alias = tag.primaryAlias.name;
    const search = `tag:${wrapSearchTerm(alias)}`;
    this.props.onSearch(search);
  }

  onAddTagSuggestion = (suggestion: TagSuggestion): void => {
    if (suggestion.tag.id) {
      window.Shared.back.send<TagByIdResponse, TagByIdData>(BackIn.GET_TAG_BY_ID, suggestion.tag.id, (res) => {
        const tag = res.data;
        if (tag) {
          const game = this.props.currentGame;
          // Ignore dupe tags
          if (game && game.tags.findIndex(t => t.id == tag.id) == -1) {
            this.props.onEditGame({ tags: [...game.tags, tag] });
            console.log('ADDED TAG ' + tag.id);
          }
        }
      });
    }
    // Clear out suggestions box
    this.setState({
      tagSuggestions: [],
      currentTagInput: ''
    });
  }

  onAddTagByString = (text: string): void => {
    if (text !== '') {
      window.Shared.back.send<TagGetOrCreateResponse, TagGetOrCreateData>(BackIn.GET_OR_CREATE_TAG, { tag: text }, (res) => {
        const tag = res.data;
        if (tag) {
          const game = this.props.currentGame;
          // Ignore dupe tags
          if (game && game.tags.findIndex(t => t.id == tag.id) == -1) {
            this.props.onEditGame({ tags: [...game.tags, tag] });
            console.log('ADDED TAG ' + tag.id);
          }
        }
      });
    }
    // Clear out suggestions box
    this.setState({
      tagSuggestions: [],
      currentTagInput: ''
    });
  }

  onRemoveTag = (tag: Tag, index: number): void => {
    const game = this.props.currentGame;
    if (game) {
      const newTags = deepCopy(game.tags);
      newTags.splice(index, 1);
      this.props.onEditGame({ tags: newTags });
    }
  }

  /** Create a callback for when a game field is clicked. */
  wrapOnTextClick<T extends PickType<Game, string>>(field: T): () => void {
    return () => {
      const { currentGame, isEditing } = this.props;
      if (!isEditing && currentGame) {
        this.props.onDeselectPlaylist();
        const value = currentGame[field];
        const search = (value)
          ? `${field}:${wrapSearchTerm(value)}`
          : `missing:${field}`;
        this.props.onSearch(search);
      }
    };
  }

  /** Create a wrapper for a EditableTextWrap's onChange callback (this is to reduce redundancy). */
  wrapOnTextChange(func: (game: Game, text: string) => void): (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return (event) => {
      const game = this.props.currentGame;
      if (game) {
        func(game, event.currentTarget.value);
      }
    };
  }

  /** Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy). */
  wrapOnCheckBoxChange(func: (game: Game) => void): () => void {
    return () => {
      const game = this.props.currentGame;
      const editable = this.props.preferencesData.enableEditing && this.props.isEditing;
      if (game && editable) {
        func(game);
      }
    };
  }

  static contextType = LangContext;
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
