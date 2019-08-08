import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { IGameInfo } from '../../../shared/game/interfaces';
import { IGameLibraryFileItem } from '../../../shared/library/interfaces';
import { findDefaultLibrary } from '../../../shared/library/util';
import { WithLibraryProps } from '../../containers/withLibrary';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { GameLauncher } from '../../GameLauncher';
import { GameImageCollection } from '../../image/GameImageCollection';
import { CentralState, UpgradeStageState } from '../../interfaces';
import { Paths } from '../../Paths';
import { IGamePlaylist } from '../../playlist/interfaces';
import { IUpgradeStage } from '../../upgrade/upgrade';
import { joinLibraryRoute } from '../../Util';
import { getPlatforms } from '../../util/platform';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { RandomGames } from '../RandomGames';
import { SizeProvider } from '../SizeProvider';

type OwnProps = {
  /** Semi-global prop. */
  central: CentralState;
  onSelectPlaylist: (playlist?: IGamePlaylist, route?: string) => void;
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

/** Page shown as soon as the application starts up. */
export class HomePage extends React.Component<HomePageProps> {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  logoDelay = (Date.now() * -0.001) + 's';

  render() {
    const {
      onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick,
      gameImages,
      central: {
        gamesDoneLoading,
        games,
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
    const platformList = getPlatforms(this.props.central.games.collection);
    const formatPlatforms = platformList.map((platform, index) =>
      <span key={index}>
        <Link
          to={joinLibraryRoute('arcade')}
          onClick={this.onPlatformClick(platform)}>
          {platform}
        </Link>
        { (index < platformList.length -1) ? ', ' : undefined }
      </span>
    );
    // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
    const height: number = 140;
    const width: number = (height * 0.666) | 0;
    return (
      <div className='home-page simple-scroll'>
        <div className='home-page__inner'>
          {/* Logo */}
          <div className='home-page__logo'>
            <div
              className='home-page__logo__image'
              style={{ animationDelay: this.logoDelay }} />
          </div>
          {/* Quick Start */}
          <div className='home-page__box'>
            <div className='home-page__box__head'>Quick Start</div>
            <ul className='home-page__box__body'>
              <QuickStartItem icon='badge'>
                Only want the best of the best? Check out the <Link to={this.getHallOfFameBrowseRoute()} onClick={this.onHallOfFameClick}>Hall of Fame</Link>!
              </QuickStartItem>
              <QuickStartItem icon='play-circle'>
                Looking for something to play? View <Link to={joinLibraryRoute('arcade')} onClick={this.onAllGamesClick}>All Games</Link>.
              </QuickStartItem>
              <QuickStartItem icon='video'>
                Just want something to watch? View <Link to={joinLibraryRoute('theatre')} onClick={this.onAllAnimationsClick}>All Animations</Link>.
              </QuickStartItem>
              <QuickStartItem icon='wrench'>
                Want to change something? Go to <Link to={Paths.CONFIG}>Config</Link>.
              </QuickStartItem>
              <QuickStartItem icon='info'>
                Need help? <Link to='#' onClick={this.onHelpClick}>Read the readme</Link>.
              </QuickStartItem>
            </ul>
          </div>
          {/* Upgrades */}
          { upgradeData ? (
              <div className='home-page__box home-page__box--upgrades'>
                <div className='home-page__box__head'>Upgrades</div>
                <ul className='home-page__box__body'>
                  { this.renderStageSection(upgradeData.tech, techState, onDownloadTechUpgradeClick) }
                  <br/>
                  { this.renderStageSection(upgradeData.screenshots, screenshotsState, onDownloadScreenshotsUpgradeClick) }
                </ul>
              </div>
            ) : undefined
          }
          {/* Extras */}
          <div className='home-page__box home-page__box--extras'>
            <div className='home-page__box__head'>Extras</div>
            <ul className='home-page__box__body'>
              <QuickStartItem icon='heart'>
                <Link
                  to={this.getFavoriteBrowseRoute()}
                  onClick={this.onFavoriteClick}>
                  Favorites Playlist
                </Link>
              </QuickStartItem>
              <QuickStartItem icon='list'>
                <a
                  href='http://bluemaxima.org/flashpoint/datahub/Genres'
                  target='_top'>
                  Genre List
                </a>
              </QuickStartItem>
              <br />
              <QuickStartItem icon='tag'>
                Filter by platform:
              </QuickStartItem>
              <QuickStartItem>
                { formatPlatforms }
              </QuickStartItem>
              <br />
              <QuickStartItem icon='code'>
                <a
                  href='https://trello.com/b/Tu9E5GLk/launcher'
                  target='_top'>
                  Check out our planned features!
                </a>
              </QuickStartItem>
            </ul>
          </div>
          {/* Notes */}
          <div className='home-page__box'>
            <div className='home-page__box__head'>Notes</div>
            <ul className='home-page__box__body'>
              <QuickStartItem>
                Don't forget to read the readme if you're having issues.
              </QuickStartItem>
            </ul>
          </div>
          {/* Random Games */}
          <SizeProvider width={width} height={height}>
            <div className='home-page__random-games'>
              <div className='home-page__random-games__inner'>
                <p className='home-page__random-games__title'>Random Picks</p>
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

  renderStageSection(stageData: IUpgradeStage|undefined, stageState: UpgradeStageState, onClick: () => void) {
    return (
      <>
        <QuickStartItem><b>{stageData && stageData.title || '...'}</b></QuickStartItem>
        <QuickStartItem><i>{stageData && stageData.description || '...'}</i></QuickStartItem>
        <QuickStartItem>{ this.renderStageButton(stageState, onClick) }</QuickStartItem>
      </>
    );
  }

  renderStageButton(stageState: UpgradeStageState, onClick: () => void) {
    return (
      stageState.checksDone ? (
        stageState.alreadyInstalled ? (
          <p className='home-page__grayed-out'>Already Installed</p>
        ) : (
          stageState.isInstallationComplete ? (
            'Installation Complete! Restart the launcher!'
          ) : (
            stageState.isInstalling ? (
              <p>{stageState.installProgressNote}</p>
            ) : (
              <a
                className='simple-button'
                onClick={onClick}>
                Download
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
    this.props.onSearch('!' + platform);
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
}

function QuickStartItem(props: { icon?: OpenIconType, className?: string, children?: React.ReactNode }): JSX.Element {
  return (
    <li className={'home-page__box__item simple-center ' + (props.className||'')}>
      { props.icon ? (
         <div className='home-page__box__item__icon simple-center__vertical-inner'>
          <OpenIcon icon={props.icon} />
        </div>
      ) : undefined }
      <div className='simple-center__vertical-inner'>
        {props.children}
      </div>
    </li>
  );
}

function findHallOfFamePlaylist(playlists: IGamePlaylist[]): IGamePlaylist | undefined {
  return playlists.find(playlist => playlist.title === 'Flashpoint Hall of Fame');
}

function findFavoritePlaylist(playlists: IGamePlaylist[]): IGamePlaylist | undefined {
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
function getPlaylistLibraryRoute(playlist: IGamePlaylist, libraries: IGameLibraryFileItem[]): string | undefined {
  if (playlist.library) {
    return playlist.library;
  } else {
    const defLibrary = findDefaultLibrary(libraries);
    if (defLibrary) { return defLibrary.route; }
  }
}
