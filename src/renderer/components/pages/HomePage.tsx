import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { wrapSearchTerm } from '../../../shared/game/GameFilter';
import { IGameInfo } from '../../../shared/game/interfaces';
import { LangContainer } from '../../../shared/lang';
import { GameLibraryFileItem } from '../../../shared/library/types';
import { findDefaultLibrary } from '../../../shared/library/util';
import { formatString } from '../../../shared/utils/StringFormatter';
import { WithLibraryProps } from '../../containers/withLibrary';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { GameLauncher } from '../../GameLauncher';
import { GameImageCollection } from '../../image/GameImageCollection';
import { CentralState, UpgradeStageState } from '../../interfaces';
import { Paths } from '../../Paths';
import { GamePlaylist } from '../../playlist/types';
import { UpgradeStage } from '../../upgrade/types';
import { joinLibraryRoute } from '../../Util';
import { LangContext } from '../../util/lang';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { RandomGames } from '../RandomGames';
import { SizeProvider } from '../SizeProvider';

type OwnProps = {
  /** Semi-global prop. */
  central: CentralState;
  onSelectPlaylist: (playlist?: GamePlaylist, route?: string) => void;
  /** Collection to get game images from. */
  gameImages: GameImageCollection;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** Called when the "download tech" button is clicked. */
  onDownloadTechUpgradeClick: () => void;
  /** Called when the "download screenshots" button is clicked. */
  onDownloadScreenshotsUpgradeClick: () => void;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithLibraryProps & WithSearchProps;

export interface HomePage {
  context: LangContainer;
}

/** Page shown as soon as the application starts up. */
export class HomePage extends React.Component<HomePageProps> {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  logoDelay = (Date.now() * -0.001) + 's';

  render() {
    const strings = this.context.home;
    const {
      onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick,
      gameImages,
      central: {
        platforms,
        gamesDoneLoading,
        upgrade: {
          techState,
          screenshotsState
        }
      },
      preferencesData: {
        browsePageShowExtreme
      }
    } = this.props;
    const upgradeData = this.props.central.upgrade.data;
    const { showBrokenGames } = window.External.config.data;
    const { disableExtremeGames } = window.External.config.data;
    // Grabs a dynamic list of supported platforms and pre-formats them as Links
    const numOfPlatforms = this.props.central.platforms.length;
    const formatPlatforms = this.props.central.platforms.map((platform, index) =>
      <span key={index}>
        <Link
          to={joinLibraryRoute('arcade')}
          onClick={this.onPlatformClick(platform.name)}>
          {platform}
        </Link>
        { (index < numOfPlatforms - 1) ? ', ' : undefined }
      </span>
    );
    // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
    const height: number = 140;
    const width: number = (height * 0.666) | 0;
    return (
      <div className='home-page simple-scroll'>
        <div className='home-page__inner'>
          {/* Logo */}
          <div className='home-page__logo fp-logo-box'>
            <div
              className='fp-logo fp-logo--animated'
              style={{ animationDelay: this.logoDelay }} />
          </div>
          {/* Quick Start */}
          <div className='home-page__box'>
            <div className='home-page__box-head'>{strings.quickStartHeader}</div>
            <ul className='home-page__box-body'>
              <QuickStartItem icon='badge'>
                {formatString(strings.hallOfFameInfo, <Link to={this.getHallOfFameBrowseRoute()} onClick={this.onHallOfFameClick}>{strings.hallOfFame}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='play-circle'>
                {formatString(strings.allGamesInfo, <Link to={joinLibraryRoute('arcade')} onClick={this.onAllGamesClick}>{strings.allGames}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='video'>
                {formatString(strings.allAnimationsInfo, <Link to={joinLibraryRoute('theatre')} onClick={this.onAllAnimationsClick}>{strings.allAnimations}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='wrench'>
                {formatString(strings.configInfo, <Link to={Paths.CONFIG}>{strings.config}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='info'>
                {formatString(strings.helpInfo, <Link to='#' onClick={this.onHelpClick}>{strings.help}</Link>)}
              </QuickStartItem>
            </ul>
          </div>
          {/* Upgrades */}
          { upgradeData ? (
              <div className='home-page__box home-page__box--upgrades'>
                <div className='home-page__box-head'>{strings.upgradesHeader}</div>
                <ul className='home-page__box-body'>
                  { this.renderStageSection(strings, upgradeData.tech, techState, onDownloadTechUpgradeClick) }
                  <br/>
                  { this.renderStageSection(strings, upgradeData.screenshots, screenshotsState, onDownloadScreenshotsUpgradeClick) }
                </ul>
              </div>
            ) : undefined
          }
          {/* Extras */}
          <div className='home-page__box home-page__box--extras'>
            <div className='home-page__box-head'>{strings.extrasHeader}</div>
            <ul className='home-page__box-body'>
              <QuickStartItem icon='heart'>
                <Link
                  to={this.getFavoriteBrowseRoute()}
                  onClick={this.onFavoriteClick}>
                  {strings.favoritesPlaylist}
                </Link>
              </QuickStartItem>
              <QuickStartItem icon='list'>
                <a
                  href='http://bluemaxima.org/flashpoint/datahub/Genres'
                  target='_top'>
                  {strings.genreList}
                </a>
              </QuickStartItem>
              <br />
              <QuickStartItem icon='tag'>
                {strings.filterByPlatform}:
              </QuickStartItem>
              <QuickStartItem className='home-page__box-item--platforms'>
                { formatPlatforms }
              </QuickStartItem>
              <br />
              <QuickStartItem icon='code'>
                <a
                  href='https://trello.com/b/Tu9E5GLk/launcher'
                  target='_top'>
                  {strings.plannedFeatures}
                </a>
              </QuickStartItem>
            </ul>
          </div>
          {/* Notes */}
          <div className='home-page__box'>
            <div className='home-page__box-head'>{strings.notesHeader}</div>
            <ul className='home-page__box-body'>
              <QuickStartItem>
                {strings.notes}
              </QuickStartItem>
            </ul>
          </div>
          {/* Random Games */}
          <SizeProvider width={width} height={height}>
            <div className='home-page__random-games'>
              <div className='home-page__random-games__inner'>
                <p className='home-page__random-games__title'>{strings.randomPicks}</p>
                { gamesDoneLoading ? (
                  <RandomGames
                    games={games.collection.games}
                    gameImages={gameImages}
                    onLaunchGame={this.onLaunchGame}
                    showExtreme={!disableExtremeGames && browsePageShowExtreme}
                    showBroken={showBrokenGames}
                  />
                ) : (
                  <p className='home-page__random-games__loading'>
                    { this.props.central.gamesFailedLoading ? ('No games found.') : ('Loading...') }
                  </p>
                ) }
              </div>
            </div>
          </SizeProvider>
        </div>
      </div>
    );
  }

  renderStageSection(strings: LangContainer['home'], stageData: UpgradeStage | undefined, stageState: UpgradeStageState, onClick: () => void) {
    return (
      <>
        <QuickStartItem><b>{stageData && stageData.title || '...'}</b></QuickStartItem>
        <QuickStartItem><i>{stageData && stageData.description || '...'}</i></QuickStartItem>
        <QuickStartItem>{ this.renderStageButton(strings, stageState, onClick) }</QuickStartItem>
      </>
    );
  }

  renderStageButton(strings: LangContainer['home'], stageState: UpgradeStageState, onClick: () => void) {
    return (
      stageState.checksDone ? (
        stageState.alreadyInstalled ? (
          <p className='home-page__grayed-out'>{strings.alreadyInstalled}</p>
        ) : (
          stageState.isInstallationComplete ? (
            strings.installComplete
          ) : (
            stageState.isInstalling ? (
              <p>{stageState.installProgressNote}</p>
            ) : (
              <a
                className='simple-button'
                onClick={onClick}>
                {strings.download}
              </a>
            )
          )
        )
      ) : '...'
    );
  }

  onLaunchGame(game: IGameInfo): void {
    GameLauncher.launchGame(game);
  }

  onHelpClick = () => {
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    remote.shell.openItem(path.join(fullFlashpointPath, 'readme.txt'));
  }

  private onHallOfFameClick = () => {
    const { central, clearSearch, libraryData, onSelectPlaylist } = this.props;
    // Find the hall of fame playlist and select it
    const playlist = findHallOfFamePlaylist(central.playlists.playlists);
    const route = playlist && getPlaylistLibraryRoute(playlist, libraryData.libraries);
    onSelectPlaylist(playlist, route);
    // Clear the current search
    clearSearch();
  }

  onFavoriteClick = () => {
    const { central, clearSearch, libraryData, onSelectPlaylist } = this.props;
    // Find the favorites playlist and select it
    const playlist = findFavoritePlaylist(central.playlists.playlists);
    const route = playlist && getPlaylistLibraryRoute(playlist, libraryData.libraries);
    onSelectPlaylist(playlist, route);
    // Clear the current search
    clearSearch();
  }

  onAllGamesClick = () => {
    this.props.onSelectPlaylist(undefined, 'arcade');
    this.props.clearSearch();
  }

  onAllAnimationsClick = () => {
    this.props.onSelectPlaylist(undefined, 'theatre');
    this.props.clearSearch();
  }

  /** Gets the platform as a string and performs a search dynamically for each platform generated. */
  onPlatformClick = (platform: string) => (event: any) => {
    // Search to filter out all other platforms
    this.props.onSearch('!' + wrapSearchTerm(platform));
    // Deselect the curret playlist
    this.props.onSelectPlaylist(undefined, 'arcade');
  }

  getHallOfFameBrowseRoute = (): string => {
    const defaultLibrary = this.props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let hof = findHallOfFamePlaylist(this.props.central.playlists.playlists);
    if (hof && hof.library) { return joinLibraryRoute(hof.library); }
    else                    { return defaultRoute;                  }
  }

  getFavoriteBrowseRoute = (): string => {
    const defaultLibrary = this.props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let fav = findFavoritePlaylist(this.props.central.playlists.playlists);
    if (fav && fav.library) { return joinLibraryRoute(fav.library); }
    else                    { return defaultRoute;                  }
  }

  static contextType = LangContext;
}

function QuickStartItem(props: { icon?: OpenIconType, className?: string, children?: React.ReactNode }): JSX.Element {
  return (
    <li className={'home-page__box-item simple-center ' + (props.className||'')}>
      { props.icon ? (
         <div className='home-page__box-item-icon simple-center__vertical-inner'>
          <OpenIcon icon={props.icon} />
        </div>
      ) : undefined }
      <div className='simple-center__vertical-inner'>
        {props.children}
      </div>
    </li>
  );
}

function findHallOfFamePlaylist(playlists: GamePlaylist[]): GamePlaylist | undefined {
  return playlists.find(playlist => playlist.title === 'Flashpoint Hall of Fame');
}

function findFavoritePlaylist(playlists: GamePlaylist[]): GamePlaylist | undefined {
  return playlists.find(playlist => playlist.title === '*Favorites*');
}

/**
 * Get the library route of a playlist.
 * Note: A playlist with an empty or missing library route (undefined or '') means that it belongs to the default library.
 * @param playlist Playlist to get the library route of.
 * @param libraries Library collection to search for the default library in.
 * @returns If the playlist has a library route declared, it is returned.
 *          If not, the default library's route is returned instead (if it is found).
 *          If the default library is not found, return undefined.
 */
function getPlaylistLibraryRoute(playlist: GamePlaylist, libraries: GameLibraryFileItem[]): string | undefined {
  if (playlist.library) {
    return playlist.library;
  } else {
    const defLibrary = findDefaultLibrary(libraries);
    if (defLibrary) { return defLibrary.route; }
  }
}
