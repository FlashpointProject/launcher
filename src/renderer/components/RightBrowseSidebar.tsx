import { Game } from '@database/entity/Game';
import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import * as remote from '@electron/remote';
import { WithConfirmDialogProps } from '@renderer/containers/withConfirmDialog';
import { BackIn, BackOut, BackOutTemplate, TagSuggestion } from '@shared/back/types';
import { LOGOS, SCREENSHOTS } from '@shared/constants';
import { wrapSearchTerm } from '@shared/game/GameFilter';
import { ModelUtils } from '@shared/game/util';
import { GamePropSuggestions, PickType, ProcessAction } from '@shared/interfaces';
import { LangContainer } from '@shared/lang';
import { deepCopy, generateTagFilterGroup, sizeToString } from '@shared/Util';
import axios from 'axios';
import { formatString } from '@shared/utils/StringFormatter';
import { uuid } from '@shared/utils/uuid';
import { clipboard, Menu, MenuItemConstructorOptions } from 'electron';
import { GameData, Platform, PlaylistGame } from 'flashpoint-launcher';
import * as fs from 'fs';
import * as React from 'react';
import { WithPreferencesProps } from '../containers/withPreferences';
import { WithSearchProps } from '../containers/withSearch';
import { getGameImagePath, getGameImageURL, getPlatformIconURL } from '../Util';
import { CheckBox } from './CheckBox';
import { ConfirmElement, ConfirmElementArgs } from './ConfirmElement';
import { DropdownInputField } from './DropdownInputField';
import { GameDataBrowser } from './GameDataBrowser';
import { GameImageSplit } from './GameImageSplit';
import { ImagePreview } from './ImagePreview';
import { InputElement, InputField } from './InputField';
import { OpenIcon } from './OpenIcon';
import { RightBrowseSidebarAddApp } from './RightBrowseSidebarAddApp';
import { SimpleButton } from './SimpleButton';
import { TagInputField } from './TagInputField';
import { LangContext } from '@renderer/util/lang';

type OwnProps = {
  logoVersion: number;
  /** Currently selected game (if any) */
  currentGame?: Game;
  /** Whether the current game is extreme */
  isExtreme: boolean;
  /** Is the current game running? */
  gameRunning: boolean;
  /* Current Library */
  currentLibrary: string;
  /** Currently selected game entry (if any) */
  currentPlaylistEntry?: PlaylistGame;
  /** Called when the play button is pressed */
  onGameLaunch: (gameId: string) => Promise<void>;
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
  /** List of busy games */
  busyGames: string[];

  onEditClick: () => void;
  onDiscardClick: () => void;
  onSaveGame: () => void;
  onOpenExportMetaEdit: (gameId: string) => void;

  onFpfssEditGame: (gameId: string) => void;
  onEditGame: (game: Partial<Game>) => void;
  onUpdateActiveGameData: (activeDataOnDisk: boolean, activeDataId?: number) => void;

  fpfssEditMode?: boolean;
};

export type RightBrowseSidebarProps = OwnProps & WithPreferencesProps & WithSearchProps & WithConfirmDialogProps;

type RightBrowseSidebarState = {
  /** If a preview of the current game's screenshot should be shown. */
  showPreview: boolean;
  screenshotExists: boolean;
  thumbnailExists: boolean;
  currentTagInput: string;
  currentPlatformInput: string;
  tagSuggestions: TagSuggestion<Tag>[];
  platformSuggestions: TagSuggestion<Platform>[];
  gameDataBrowserOpen: boolean;
  activeData: GameData | null;
  showExtremeScreenshots: boolean;
  middleScrollRef: React.RefObject<HTMLDivElement>;
};

/** Sidebar on the right side of BrowsePage. */
export class RightBrowseSidebar extends React.Component<RightBrowseSidebarProps, RightBrowseSidebarState> {
  // Bound "on change" callbacks for game fields
  onLibraryChange             = this.wrapOnTextChange((game, text) => this.props.onEditGame({ library: text }));
  onTitleChange               = this.wrapOnTextChange((game, text) => this.props.onEditGame({ title: text }));
  onAlternateTitlesChange     = this.wrapOnTextChange((game, text) => this.props.onEditGame({ alternateTitles: text }));
  onDeveloperChange           = this.wrapOnTextChange((game, text) => this.props.onEditGame({ developer: text }));
  onSeriesChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ series: text }));
  onSourceChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ source: text }));
  onPublisherChange           = this.wrapOnTextChange((game, text) => this.props.onEditGame({ publisher: text }));
  onPlayModeChange            = this.wrapOnTextChange((game, text) => this.props.onEditGame({ playMode: text }));
  onStatusChange              = this.wrapOnTextChange((game, text) => this.props.onEditGame({ status: text }));
  onVersionChange             = this.wrapOnTextChange((game, text) => this.props.onEditGame({ version: text }));
  onReleaseDateChange         = this.wrapOnTextChange((game, text) => this.props.onEditGame({ releaseDate: text }));
  onLanguageChange            = this.wrapOnTextChange((game, text) => this.props.onEditGame({ language: text }));
  onLaunchCommandChange       = this.wrapOnTextChange((game, text) => this.props.onEditGame({ legacyLaunchCommand: text }));
  onApplicationPathChange     = this.wrapOnTextChange((game, text) => this.props.onEditGame({ legacyApplicationPath: text }));
  onNotesChange               = this.wrapOnTextChange((game, text) => this.props.onEditGame({ notes: text }));
  onOriginalDescriptionChange = this.wrapOnTextChange((game, text) => this.props.onEditGame({ originalDescription: text }));
  onBrokenChange              = this.wrapOnCheckBoxChange(() => {
    if (this.props.currentGame) {
      this.props.onEditGame({ broken: !this.props.currentGame.broken });
    }});
  // Bound "on click" callbacks for game fields
  onDeveloperClick            = this.wrapOnTextClick('developer');
  onSeriesClick               = this.wrapOnTextClick('series');
  onSourceClick               = this.wrapOnTextClick('source');
  onPublisherClick            = this.wrapOnTextClick('publisher');
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
      currentPlatformInput: '',
      currentTagInput: '',
      tagSuggestions: [],
      platformSuggestions: [],
      gameDataBrowserOpen: false,
      showExtremeScreenshots: false,
      activeData: null,
      middleScrollRef: React.createRef(),
    };
  }

  componentDidMount() {
    window.Shared.back.registerAny(this.onResponse);
    window.addEventListener('keydown', this.onGlobalKeyDown);

    if (this.props.currentGame && this.props.currentGame.activeDataId) {
      window.Shared.back.request(BackIn.GET_GAME_DATA, this.props.currentGame.activeDataId)
      .then((data) => {
        if (data) {
          this.setState({
            activeData: data
          });
        }
      });
    }
  }

  componentWillUnmount() {
    window.Shared.back.unregisterAny(this.onResponse);
    window.removeEventListener('keydown', this.onGlobalKeyDown);
  }

  componentDidUpdate(prevProps: RightBrowseSidebarProps): void {
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
    if (this.props.currentGame && this.props.currentGame.id !== (prevProps.currentGame && prevProps.currentGame.id)) {
      // Hide again when changing games
      this.setState({ showExtremeScreenshots: false });
      // Move scroll bar of middle section back to the top
      if (this.state.middleScrollRef.current) {
        this.state.middleScrollRef.current.scrollTo(0,0);
      }
    }
    if (prevProps.currentGame && prevProps.currentGame.activeDataId && (!this.props.currentGame || !this.props.currentGame.activeDataId)) {
      /** No game data, clear */
      this.setState({ activeData: null });
    }
    if ((prevProps.currentGame && prevProps.currentGame.activeDataId) !== (this.props.currentGame && this.props.currentGame.activeDataId)) {
      /** Game Data changed */
      if (this.props.currentGame && this.props.currentGame.activeDataId) {
        window.Shared.back.request(BackIn.GET_GAME_DATA, this.props.currentGame.activeDataId)
        .then((gameData) => this.setState({ activeData: gameData }));
      }
    }
  }

  render() {
    const allStrings = this.context;
    const strings = allStrings.browse;
    const game: Game | undefined = this.props.currentGame;
    if (game) {
      const { isEditing, isNewGame, currentPlaylistEntry, preferencesData, suggestions, tagCategories } = this.props;
      const currentAddApps = game.addApps;
      const isPlaceholder = game.placeholder;
      const editDisabled = !preferencesData.enableEditing;
      const editable = isEditing;
      const dateAdded = game.dateAdded;
      const dateModified = game.dateModified;
      const screenshotSrc = getGameImageURL(SCREENSHOTS, game.id);

      const removeGameFromPlaylistElement =
        <ConfirmElement
          message={allStrings.dialog.removePlaylistGame}
          onConfirm={this.props.onRemoveSelectedGameFromPlaylist}
          render={this.renderRemoveFromPlaylistButton}
          extra={strings} />;

      return (
        <div
          className={'browse-right-sidebar ' + (editable ? 'browse-right-sidebar--edit-enabled' : 'browse-right-sidebar--edit-disabled')}
          onKeyDown={this.onLocalKeyDown}>
          <div className='browse-right-sidebar__top'>
            {/* -- Title & Developer(s) -- */}
            <div className='browse-right-sidebar__section'>
              <div className='browse-right-sidebar__row'>
                <div className='browse-right-sidebar__title-row'>
                  <div className='browse-right-sidebar__title-row__title'>
                    <InputField
                      text={game.title}
                      placeholder={strings.noTitle}
                      editable={editable}
                      onChange={this.onTitleChange} />
                  </div>
                  <div className='browse-right-sidebar__title-row__buttons'>
                    { editDisabled ? (
                      <>
                        {/* "Remove From Playlist" Button */}
                        { currentPlaylistEntry ? removeGameFromPlaylistElement : undefined }
                      </>
                    ) : (
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
                            { this.props.preferencesData.fpfssBaseUrl && !editDisabled && !isPlaceholder && (
                              <div
                                className='browse-right-sidebar__title-row__buttons__edit-button'
                                title={strings.editFpfssGame}
                                onClick={() => this.props.onFpfssEditGame(game.id)}>
                                <OpenIcon icon='cloud-upload' />
                              </div>
                            ) }
                            {/* "Edit" Button */}
                            { editDisabled || isPlaceholder ? undefined : (
                              <div
                                className='browse-right-sidebar__title-row__buttons__edit-button'
                                title={strings.editGame}
                                onClick={this.props.onEditClick}>
                                <OpenIcon icon='pencil' />
                              </div>
                            ) }
                            {/* "Remove From Playlist" Button */}
                            { currentPlaylistEntry ? removeGameFromPlaylistElement : undefined }
                            {/* "Delete Game" Button */}
                            { (isPlaceholder || isNewGame || currentPlaylistEntry) && !editDisabled ? undefined : (
                              <ConfirmElement
                                message={allStrings.dialog.deleteGame}
                                onConfirm={this.onDeleteGameClick}
                                render={this.renderDeleteGameButton}
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
                    onClick={this.onDeveloperClick} />
                </div>
              ) }
            </div>
            {/** Mini download info */}
            <div className='browse-right-sidebar__mini-download-info'>
              <div className='browse-right-sidebar__mini-download-info__state'>
                { this.props.fpfssEditMode ? strings.fpfssGame :
                  this.state.activeData ? (this.state.activeData.presentOnDisk ? strings.installed : strings.notInstalled): strings.legacyGame}
              </div>
              { this.state.activeData && (
                <div className='browse-right-sidebar__mini-download-info__size'>
                  {`${sizeToString(this.state.activeData.size)}`}
                </div>
              )}
            </div>
            {/* -- Play Button -- */}
            { isPlaceholder || this.props.fpfssEditMode ? undefined :
              (this.props.currentGame && this.props.busyGames.includes(this.props.currentGame.id)) ? (
                <div className='browse-right-sidebar__play-button--busy'>
                  {strings.busy}
                </div>
              )
                : this.props.gameRunning ? (
                  <div
                    className='browse-right-sidebar__play-button--running'
                    onClick={() => {
                      if (this.props.currentGame) {
                        window.Shared.back.send(BackIn.SERVICE_ACTION, ProcessAction.STOP, `game.${this.props.currentGame.id}`);
                      }
                    }}>
                    {strings.stop}
                  </div>
                ) : (this.state.activeData && !this.state.activeData.presentOnDisk) ? (
                  <div
                    className='browse-right-sidebar__play-button--download'
                    onClick={() => {
                      this.props.currentGame && this.props.onGameLaunch(this.props.currentGame.id)
                      .then(this.onForceUpdateGameData);
                    }}>
                    {strings.download}
                  </div>
                )
                  : (
                    <div className='browse-right-sidebar__play-button' >
                      <div className='browse-right-sidebar__play-button--text'
                        onClick={() => this.props.currentGame && this.props.onGameLaunch(this.props.currentGame.id)} >
                        {strings.play}
                      </div>
                      { this.state.activeData ? (
                        <div className='browse-right-sidebar__play-button--dropdown'
                          onClick={() =>
                            openContextMenu([{
                              label: strings.uninstallGame,
                              click: async () => {
                                if (this.state.activeData) {
                                  const res = await this.props.openConfirmDialog(allStrings.dialog.uninstallGame, [allStrings.misc.yes, allStrings.misc.no], 1);
                                  if (res === 0) {
                                    window.Shared.back.request(BackIn.UNINSTALL_GAME_DATA, this.state.activeData.id)
                                    .then(() => {
                                      this.onForceUpdateGameData();
                                    })
                                    .catch(() => {
                                      alert(allStrings.dialog.unableToUninstallGameData);
                                    });
                                  }
                                }
                              }
                            }])
                          }>
                          <OpenIcon icon='chevron-bottom'/>
                        </div>
                      ) : undefined }

                    </div>
                  )
            }
            {/** Gameplay Statistics */}
            { isPlaceholder || this.props.fpfssEditMode ? undefined : (
              <div className='browse-right-sidebar__stats'>
                <div className='browse-right-sidebar__stats-row'>
                  <div className='browse-right-sidebar__stats-row-left'>
                    {strings.lastPlayed}
                  </div>
                  <div className='browse-right-sidebar__stats-row-right'>
                    {game.lastPlayed ? formatLastPlayed(game.lastPlayed, strings) : strings.never}
                  </div>
                </div>
                <div className='browse-right-sidebar__stats-row'>
                  <div className='browse-right-sidebar__stats-row-left'>
                    {strings.playtime}
                  </div>
                  <div className='browse-browser-right-sidebarright-sidebar__stats-row-right'>
                    {formatPlaytime(game.playtime, strings)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div
            ref={this.state.middleScrollRef}
            className='browse-right-sidebar__middle simple-scroll'>
            {/* -- Most Fields -- */}
            { isPlaceholder ? undefined : (
              <>
                <div className='browse-right-sidebar__section'>
                  { editable && (
                    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                      <p>{strings.library}: </p>
                      {/** TODO: Localize library options, make visible once library searching has merged */}
                      <DropdownInputField
                        text={game.library}
                        placeholder={strings.noLibrary}
                        onChange={this.onLibraryChange}
                        className='browse-right-sidebar__searchable'
                        editable={editable}
                        items={suggestions && filterSuggestions(suggestions.library) || []}
                        onItemSelect={text => this.props.onEditGame({ library: text })} />
                    </div>
                  )}
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.alternateTitles}: </p>
                    <InputField
                      text={game.alternateTitles}
                      placeholder={strings.noAlternateTitles}
                      className='browse-right-sidebar__searchable'
                      onChange={this.onAlternateTitlesChange}
                      editable={editable} />
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
                      onTagSubmit={this.onAddTagByString} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.series}: </p>
                    <InputField
                      text={game.series}
                      placeholder={strings.noSeries}
                      className='browse-right-sidebar__searchable'
                      onChange={this.onSeriesChange}
                      editable={editable}
                      onClick={this.onSeriesClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.publisher}: </p>
                    <InputField
                      text={game.publisher}
                      placeholder={strings.noPublisher}
                      className='browse-right-sidebar__searchable'
                      onChange={this.onPublisherChange}
                      editable={editable}
                      onClick={this.onPublisherClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.source}: </p>
                    <InputField
                      text={game.source}
                      placeholder={strings.noSource}
                      onChange={this.onSourceChange}
                      className='browse-right-sidebar__searchable'
                      editable={editable}
                      onClick={this.onSourceClick} />
                  </div>
                  { !editable && (
                    <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                      <p>{strings.platform}: </p>
                      <TagInputField
                        text={''}
                        className='browse-right-sidebar__searchable'
                        editable={false}
                        tags={game.platforms.filter(p => p.primaryAlias.name === game.platformName)}
                        suggestions={[]}
                        categories={[]}
                        onTagSelect={this.onPlatformSelect}
                        renderIcon={this.renderPlatformIcon}
                        renderIconSugg={this.renderPlatformIconSugg} />
                    </div>
                  )}
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{editable ? allStrings.config.platforms : strings.otherTechnologies}: </p>
                    <TagInputField
                      text={this.state.currentPlatformInput}
                      placeholder={strings.enterTag}
                      className='browse-right-sidebar__searchable'
                      editable={editable}
                      onChange={this.onCurrentPlatformChange}
                      tags={editable ? game.platforms : game.platforms.filter(p => p.primaryAlias.name !== game.platformName)}
                      suggestions={this.state.platformSuggestions}
                      categories={tagCategories}
                      onTagSelect={this.onPlatformSelect}
                      onTagEditableSelect={this.onRemovePlatform}
                      onTagSuggestionSelect={this.onAddPlatformSuggestion}
                      onTagSubmit={this.onAddPlatformByString}
                      renderIcon={this.renderPlatformIcon}
                      renderIconSugg={this.renderPlatformIconSugg}
                      primaryValue={game.platformName}
                      selectPrimaryValue={this.promotePlatform} />
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
                      onClick={this.onPlayModeClick} />
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
                      onClick={this.onStatusClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.version}: </p>
                    <InputField
                      text={game.version}
                      placeholder={strings.noVersion}
                      className='browse-right-sidebar__searchable'
                      onChange={this.onVersionChange}
                      editable={editable}
                      onClick={this.onVersionClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.releaseDate}: </p>
                    <InputField
                      text={game.releaseDate}
                      placeholder={strings.noReleaseDate}
                      onChange={this.onReleaseDateChange}
                      className='browse-right-sidebar__searchable'
                      editable={editable}
                      onClick={this.onReleaseDateClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.language}: </p>
                    <InputField
                      text={game.language}
                      placeholder={strings.noLanguage}
                      onChange={this.onLanguageChange}
                      className='browse-right-sidebar__searchable'
                      editable={editable}
                      onClick={this.onLanguageClick} />
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.dateAdded}: </p>
                    <p
                      className='browse-right-sidebar__row__date-added'
                      title={dateAdded}>
                      {(new Date(dateAdded)).toUTCString()}
                    </p>
                  </div>
                  <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                    <p>{strings.dateModified}: </p>
                    <p
                      className='browse-right-sidebar__row__date-added'
                      title={dateModified}>
                      {(new Date(dateModified)).toUTCString()}
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
            { ((!editDisabled && editable) || game.notes) && !isPlaceholder ? (
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
            { ((!editDisabled && editable) || game.originalDescription) && !isPlaceholder ? (
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
            {/* -- LEGACY GAMES ONLY - Application Path & Launch Command -- */}
            { !game.activeDataId && !isPlaceholder ? (
              <div className='browse-right-sidebar__section'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.applicationPath}: </p>
                  <DropdownInputField
                    text={game.legacyApplicationPath}
                    placeholder={strings.noApplicationPath}
                    onChange={this.onApplicationPathChange}
                    editable={editable}
                    items={suggestions && filterSuggestions(suggestions.applicationPath) || []}
                    onItemSelect={text => this.props.onEditGame({ legacyApplicationPath: text })} />
                </div>
                <div className='browse-right-sidebar__row browse-right-sidebar__row--one-line'>
                  <p>{strings.launchCommand}: </p>
                  <InputField
                    text={game.legacyLaunchCommand}
                    placeholder={strings.noLaunchCommand}
                    onChange={this.onLaunchCommandChange}
                    editable={editable}
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
          </div>
          { !this.props.fpfssEditMode && (
            <div className='browse-right-sidebar__bottom'>
              {/* -- Screenshot -- */}
              <div className='browse-right-sidebar__section browse-right-sidebar__section--below-gap'>
                <div className='browse-right-sidebar__row browse-right-sidebar__row__spacer' />
                <div className='browse-right-sidebar__row browse-right-sidebar__row__screenshot-container'>
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
                            onSetImage={this.onSetThumbnail}
                            onRemoveClick={this.onRemoveThumbnailClick}
                            onDrop={this.onThumbnailDrop} />
                          <GameImageSplit
                            text={strings.screenshot}
                            imgSrc={this.state.screenshotExists ? screenshotSrc : undefined}
                            showHeaders={true}
                            onSetImage={this.onSetScreenshot}
                            onRemoveClick={this.onRemoveScreenshotClick}
                            onDrop={this.onScreenshotDrop} />
                        </div>
                        <div className='browse-right-sidebar__row__screenshot__placeholder__front'>
                          <p>{strings.dropImageHere}</p>
                        </div>
                      </div>
                    ) :
                      (this.props.isExtreme && this.props.preferencesData.hideExtremeScreenshots && !this.state.showExtremeScreenshots) ? (
                        <div
                          className='browse-right-sidebar__row__screenshot-image--hidden'
                          onClick={this.onShowExtremeScreenshots}>
                          <div className='browse-right-sidebar__row__screenshot-image--hidden-text'>
                            {strings.showExtremeScreenshot}
                          </div>
                        </div>
                      ) : (
                        <img
                          className='browse-right-sidebar__row__screenshot-image'
                          alt='' // Hide the broken link image if source is not found
                          src={screenshotSrc}
                          onClick={this.onScreenshotClick} />
                      )
                    }
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
          )}
          { !this.props.fpfssEditMode && (
            <div className='browse-right-sidebar__super-bottom'>
              <SimpleButton
                value={strings.openGameDataBrowser}
                onClick={() => this.setState({ gameDataBrowserOpen: !this.state.gameDataBrowserOpen })}/>
              { this.props.preferencesData.enableEditing && !this.props.isEditing && (
                <>
                  <SimpleButton
                    value={allStrings.misc.exportMetaEditTitle}
                    title={allStrings.misc.exportMetaEditDesc}
                    onClick={() => this.props.currentGame && this.props.onOpenExportMetaEdit(this.props.currentGame.id)} />
                  <SimpleButton
                    value={allStrings.menu.copyGameUUID}
                    onClick={() => this.props.currentGame && clipboard.writeText(this.props.currentGame.id)} />
                </>
              )}
              { this.state.gameDataBrowserOpen && (
                <GameDataBrowser
                  onClose={() => this.setState({ gameDataBrowserOpen: false })}
                  game={game}
                  onUpdateActiveGameData={this.props.onUpdateActiveGameData}
                  onForceUpdateGameData={this.onForceUpdateGameData} />
              )}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className='browse-right-sidebar-empty'>
          <h1>{formatString(strings.noGameSelected, allStrings.libraries[this.props.currentLibrary + 'Singular'] || allStrings.libraries['arcadeSingular'] || 'Game')}</h1>
          <p>{strings.clickToSelectGame}</p>
        </div>
      );
    }
  }

  renderDeleteGameButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
    return (
      <div
        className='browse-right-sidebar__title-row__buttons__delete-game'
        title={extra.deleteGameAndAdditionalApps}
        onClick={confirm} >
        <OpenIcon icon='trash' />
      </div>
    );
  }

  renderRemoveFromPlaylistButton({ confirm, extra }: ConfirmElementArgs<LangContainer['browse']>): JSX.Element {
    return (
      <div
        className='browse-right-sidebar__title-row__buttons__remove-from-playlist'
        title={extra.removeGameFromPlaylist}
        onClick={confirm} >
        <OpenIcon icon='circle-x' />
      </div>
    );
  }

  onResponse: Parameters<typeof window.Shared.back.registerAny>[0] = (event, type, args) => {
    if (type === BackOut.IMAGE_CHANGE) {
      const [ folder, id ] = args as Parameters<BackOutTemplate[typeof type]>;

      // Refresh image if it was replaced or removed
      if (this.props.isEditing && this.props.currentGame && this.props.currentGame.id === id) {
        if (folder === LOGOS) {
          this.checkImageExistance(LOGOS, this.props.currentGame.id);
        } else if (folder === SCREENSHOTS) {
          this.checkImageExistance(SCREENSHOTS, this.props.currentGame.id);
        }
      }
    }
  };

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

  // When a key is pressed down "globally" (and this component is present)
  onGlobalKeyDown = (event: KeyboardEvent) => {
    // Start editing
    if (event.ctrlKey && event.code === 'KeyE' && // (CTRL + E ...
        !this.props.isEditing && this.props.currentGame) { // ... while not editing, and a game is selected)
      this.props.onEditClick();
      if (this.launchCommandRef.current) { this.launchCommandRef.current.focus(); }
      event.preventDefault();
    }
  };

  onLocalKeyDown = (event: React.KeyboardEvent) => {
    // Save changes
    if (event.ctrlKey && event.key === 's' && // (CTRL + S ...
        this.props.isEditing && this.props.currentGame) { // ... while editing, and a game is selected)
      this.props.onSaveGame();
      event.preventDefault();
    }
  };

  onCurrentTagChange = (event: React.ChangeEvent<InputElement>) => {
    const newTag = event.currentTarget.value;
    let newSuggestions: TagSuggestion<Tag>[] = this.state.tagSuggestions;

    if (newTag !== '' && this.props.currentGame) {
      // Delayed set
      const existingTags = this.props.currentGame.tags.reduce<string[]>((prev, cur) => prev.concat(cur.primaryAlias.name), []);
      window.Shared.back.request(BackIn.GET_TAG_SUGGESTIONS, newTag, this.props.preferencesData.tagFilters.filter(tfg => tfg.enabled || (tfg.extreme && !this.props.preferencesData.browsePageShowExtreme)).concat([generateTagFilterGroup(existingTags)]))
      .then(data => {
        if (data) { this.setState({ tagSuggestions: data }); }
      });
    } else {
      newSuggestions = [];
    }

    this.setState({
      currentTagInput: newTag,
      tagSuggestions: newSuggestions
    });
  };

  onCurrentPlatformChange = (event: React.ChangeEvent<InputElement>) => {
    const newPlatform = event.currentTarget.value;
    let newSuggestions: TagSuggestion<Platform>[] = this.state.platformSuggestions;

    if (newPlatform !== '' && this.props.currentGame) {
      // Delayed set
      window.Shared.back.request(BackIn.GET_PLATFORM_SUGGESTIONS, newPlatform)
      .then(data => {
        if (data) { this.setState({ platformSuggestions: data }); }
      });
    } else {
      newSuggestions = [];
    }

    this.setState({
      currentPlatformInput: event.currentTarget.value,
      platformSuggestions: newSuggestions
    });
  };

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
  };

  setImageFactory = (folder: typeof LOGOS | typeof SCREENSHOTS) => async (data: ArrayBuffer) => {
    if (this.props.currentGame) {
      const res = await axios.post(`${getGameImageURL(folder, this.props.currentGame.id)}`, data);
      if (res.status !== 200) {
        alert(`ERROR: Server Returned ${res.status} - ${res.statusText}`);
      }
    }
  };

  onSetThumbnail = this.setImageFactory(LOGOS);
  onSetScreenshot = this.setImageFactory(SCREENSHOTS);

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
            window.Shared.back.send(BackIn.SAVE_IMAGE, folder, currentGame.id, data.toString('base64'));
          }
        });
      }
    };
  }

  onRemoveScreenshotClick = this.removeImage.bind(this, SCREENSHOTS);
  onRemoveThumbnailClick = this.removeImage.bind(this, LOGOS);

  removeImage(folder: string): void {
    if (this.props.currentGame) {
      window.Shared.back.send(BackIn.DELETE_IMAGE, folder, this.props.currentGame.id);
    }
  }

  onShowExtremeScreenshots = (): void => {
    this.setState({ showExtremeScreenshots: true });
  };

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
  }

  onDeleteGameClick = (): void => {
    this.props.onDeleteSelectedGame();
  };

  onAddAppLaunch(addAppId: string): void {
    window.Shared.back.send(BackIn.LAUNCH_ADDAPP, addAppId);
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
  };

  onNewAddAppClick = (): void => {
    if (!this.props.currentGame)    { throw new Error('Unable to add a new AddApp. "currentGame" is missing.'); }
    const newAddApp = ModelUtils.createAddApp(this.props.currentGame);
    newAddApp.id = uuid();
    this.props.onEditGame({ addApps: [...this.props.currentGame.addApps, ...[newAddApp]] });
  };

  onScreenshotClick = (): void => {
    this.setState({ showPreview: true });
  };

  onScreenshotPreviewClick = (): void => {
    this.setState({ showPreview: false });
  };

  onEditPlaylistNotes = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    this.props.onEditPlaylistNotes(event.currentTarget.value);
  };

  onTagSelect = (tag: Tag): void => {
    const alias = tag.primaryAlias.name;
    const search = `tag:${wrapSearchTerm(alias)}`;
    this.props.onSearch(search);
  };

  onPlatformSelect = (platform: Platform): void => {
    const alias = platform.primaryAlias.name;
    const search = `platform:${wrapSearchTerm(alias)}`;
    this.props.onSearch(search);
  };

  onAddTagSuggestion = (suggestion: TagSuggestion<Tag>): void => {
    if (suggestion.tag.id) {
      window.Shared.back.request(BackIn.GET_TAG_BY_ID, suggestion.tag.id)
      .then((tag) => {
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
  };

  onAddPlatformSuggestion = (suggestion: TagSuggestion<Platform>): void => {
    if (suggestion.tag.id) {
      window.Shared.back.request(BackIn.GET_PLATFORM_BY_ID, suggestion.tag.id)
      .then((platform) => {
        if (platform) {
          const game = this.props.currentGame;
          // Ignore dupe tags
          if (game && game.platforms.findIndex(p => p.id == platform.id) == -1) {
            const primary = game.platforms.length === 0 ? platform.primaryAlias.name : game.platformName;
            this.props.onEditGame({ platforms: [...game.platforms, platform], platformName: primary });
            console.log('ADDED PLATFORM ' + platform.id);
          }
        }
      });
    }
    // Clear out suggestions box
    this.setState({
      platformSuggestions: [],
      currentPlatformInput: ''
    });
  };

  onForceUpdateGameData = (): void => {
    if (this.props.currentGame && this.props.currentGame.activeDataId) {
      window.Shared.back.request(BackIn.GET_GAME_DATA, this.props.currentGame.activeDataId)
      .then((gameData) => {
        this.setState({ activeData: gameData });
      });
    }
  };

  onAddTagByString = (text: string): void => {
    if (text !== '') {
      if (this.props.fpfssEditMode) {
        const game = this.props.currentGame;
        if (game) {
          const tag: Tag = {
            id: -1,
            primaryAlias: {
              id: -1,
              tagId: -1,
              name: text
            },
            aliases: [
              {
                id: -1,
                tagId: -1,
                name: text
              }
            ],
            primaryAliasId: -1,
            dateModified: '',
            categoryId: 0
          };
          this.props.onEditGame({ tags: [...game.tags, tag]});
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_TAG, text)
        .then((tag) => {
          if (tag) {
            const game = this.props.currentGame;
            // Ignore dupe tags
            if (game && game.tags.findIndex(t => t.id == tag.id) == -1) {
              this.props.onEditGame({ tags: [...game.tags, tag] });
            }
          }
        });
      }

    }
    // Clear out suggestions box
    this.setState({
      tagSuggestions: [],
      currentTagInput: ''
    });
  };

  onAddPlatformByString = (text: string): void => {
    if (text !== '') {
      if (this.props.fpfssEditMode) {
        const game = this.props.currentGame;
        if (game) {
          const platform: Platform = {
            id: -1,
            primaryAlias: {
              id: -1,
              platformId: -1,
              name: text
            },
            aliases: [{
              id: -1,
              platformId: -1,
              name: text
            }],
            primaryAliasId: -1,
            dateModified: ''
          };
          const primary = game.platforms.length === 0 ? platform.primaryAlias.name : game.platformName;
          this.props.onEditGame({ platforms: [...game.platforms, platform], platformName: primary });
        }
      } else {
        window.Shared.back.request(BackIn.GET_OR_CREATE_PLATFORM, text)
        .then((platform) => {
          if (platform) {
            const game = this.props.currentGame;
            // Ignore dupe platforms
            if (game && game.platforms.findIndex(t => t.id == platform.id) == -1) {
              this.props.onEditGame({ platforms: [...game.platforms, platform] });
            }
          }
        });
      }
    }
    this.setState({
      currentPlatformInput: ''
    });
  };

  onRemoveTag = (tag: Tag, index: number): void => {
    const game = this.props.currentGame;
    if (game) {
      const newTags = deepCopy(game.tags);
      newTags.splice(index, 1);
      this.props.onEditGame({ tags: newTags });
    }
  };

  onRemovePlatform = (platform: Platform, index: number): void => {
    const game = this.props.currentGame;
    if (game) {
      const newPlatforms = deepCopy(game.platforms);
      newPlatforms.splice(index, 1);
      this.props.onEditGame({ platforms: newPlatforms });
    }
  };

  /**
   * Create a callback for when a game field is clicked.
   *
   * @param field Name of metadata field that was clicked
   */
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

  /**
   * Create a wrapper for a EditableTextWrap's onChange callback (this is to reduce redundancy).
   *
   * @param func Function to wrap
   */
  wrapOnTextChange(func: (game: Game, text: string) => void): (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return (event) => {
      const game = this.props.currentGame;
      if (game) {
        func(game, event.currentTarget.value);
      }
    };
  }

  /**
   * Create a wrapper for a CheckBox's onChange callback (this is to reduce redundancy).
   *
   * @param func Function to wrap
   */
  wrapOnCheckBoxChange(func: (game: Game) => void): () => void {
    return () => {
      const game = this.props.currentGame;
      const editable = this.props.preferencesData.enableEditing && this.props.isEditing;
      if (game && editable) {
        func(game);
      }
    };
  }

  renderPlatformIcon = (platform: Platform): JSX.Element => {
    const platformIcon = getPlatformIconURL(platform.primaryAlias.name, this.props.logoVersion);
    return (
      <div
        className='tag-icon tag-icon-image'
        style={{ backgroundImage: `url('${platformIcon}')` }} />
    );
  };

  renderPlatformIconSugg = (platformSugg: TagSuggestion<Platform>) => {
    const iconUrl = getPlatformIconURL(platformSugg.primaryAlias, this.props.logoVersion);
    return (
      <div
        className='platform-tag__icon'
        style={{ backgroundImage: `url(${iconUrl})` }} />
    );
  };

  promotePlatform = (value: string) => {
    console.log(value);
    const platform = this.props.currentGame?.platforms.find(p => p.primaryAlias.name === value);
    if (platform) {
      this.props.onEditGame({ platformId: platform.id, platformName: value });
    }
  };

  static contextType = LangContext;
}

function filterSuggestions(suggestions?: string[]): string[] {
  if (!suggestions) { return []; }
  // if (suggestions.length > 25) { return suggestions.slice(0, 25); }
  return suggestions;
}

/**
 * Open a context menu, built from the specified template.
 *
 * @param template Template list of Menu Items to use in Context Menu
 */
function openContextMenu(template: MenuItemConstructorOptions[]): Menu {
  const menu = remote.Menu.buildFromTemplate(template);
  menu.popup({ window: remote.getCurrentWindow() });
  return menu;
}

/**
 * Get a formatted last played string (Rounded to the nearest useful amount)
 *
 * @param lastPlayed Last Played Date
 * @param strings localized strings
 */
function formatLastPlayed(lastPlayed: string, strings: any): string {
  const secondsInDay = 60 * 60 * 24;
  const lpdate = new Date(lastPlayed);
  const diff = Math.ceil((Date.now() - lpdate.getTime()) / 1000);

  if (diff < (secondsInDay * 2)) {
    if ((new Date()).getDate() === lpdate.getDate()) {
      return strings.today;
    } else {
      return strings.yesterday;
    }
  } else if (diff < (secondsInDay * 8)) {
    return formatString(strings.daysAgo, Math.floor(diff / secondsInDay).toString()) as string;
  } else if (diff < (secondsInDay * 7 * 4)) {
    return formatString(strings.weeksAgo, Math.floor(diff / (secondsInDay * 7)).toString()) as string;
  } else {
    const ordinal = ordinalSuffixOf(lpdate.getDate());
    const month = lpdate.toLocaleString('default', { month: 'long' });
    return `${ordinal} ${month} ${lpdate.getFullYear()}`;
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
