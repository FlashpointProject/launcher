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
import { CentralState } from '../../interfaces';
import { Paths } from '../../Paths';
import { GamePlaylist } from '../../playlist/types';
import { UpgradeStage } from '../../upgrade/types';
import { joinLibraryRoute } from '../../Util';
import { LangContext } from '../../util/lang';
import { getPlatforms } from '../../util/platform';
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
  onDownloadUpgradeClick: (stage: UpgradeStage) => void;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithLibraryProps & WithSearchProps;

export interface HomePage {
  context: LangContainer;
}

export function HomePage(props: HomePageProps) {
  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  const logoDelay = React.useMemo(() => (Date.now() * -0.001) + 's', []);
  const strings = React.useContext(LangContext).home;
  const {
    onDownloadUpgradeClick,
    gameImages,
    central: {
      games,
    },
    preferencesData: {
      browsePageShowExtreme
    }
  } = props;
  const upgradeStages = props.central.upgrades;
  const { showBrokenGames } = window.External.config.data;
  const { disableExtremeGames } = window.External.config.data;

  const onPlatformClick = React.useCallback((platform: string) => (event: any) => {
    // Search to filter out all other platforms
    props.onSearch('!' + wrapSearchTerm(platform));
    // Deselect the curret playlist
    props.onSelectPlaylist(undefined, 'arcade');
  }, [props.onSearch, props.onSelectPlaylist]);

  const onLaunchGame = React.useCallback((game: IGameInfo) => {
    GameLauncher.launchGame(game);
  }, []);

  const onHelpClick = React.useCallback(() => {
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    remote.shell.openItem(path.join(fullFlashpointPath, 'readme.txt'));
  }, [window.External.config.fullFlashpointPath]);

  const onHallOfFameClick = React.useCallback(() => {
    const { central, clearSearch, libraryData, onSelectPlaylist } = props;
    // Find the hall of fame playlist and select it
    const playlist = findHallOfFamePlaylist(central.playlists.playlists);
    const route = playlist && getPlaylistLibraryRoute(playlist, libraryData.libraries);
    onSelectPlaylist(playlist, route);
    // Clear the current search
    clearSearch();
  }, [props.central, props.clearSearch, props.libraryData, props.onSelectPlaylist]);

  const onFavoriteClick = React.useCallback(() => {
    const { central, clearSearch, libraryData, onSelectPlaylist } = props;
    // Find the favorites playlist and select it
    const playlist = findFavoritePlaylist(central.playlists.playlists);
    const route = playlist && getPlaylistLibraryRoute(playlist, libraryData.libraries);
    onSelectPlaylist(playlist, route);
    // Clear the current search
    clearSearch();
  }, [props.central, props.clearSearch, props.libraryData, props.onSelectPlaylist]);

  const onAllGamesClick = React.useCallback(() => {
    props.onSelectPlaylist(undefined, 'arcade');
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const onAllAnimationsClick = React.useCallback(() => {
    props.onSelectPlaylist(undefined, 'theatre');
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const hallOfFameBrowseRoute = React.useMemo(() => {
    const defaultLibrary = props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let hof = findHallOfFamePlaylist(props.central.playlists.playlists);
    if (hof && hof.library) { return joinLibraryRoute(hof.library); }
    else                    { return defaultRoute;                  }
  }, [props.libraryData, props.central.playlists.playlists]);

  const favouriteBrowseRoute = React.useMemo(() => {
    const defaultLibrary = props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let fav = findFavoritePlaylist(props.central.playlists.playlists);
    if (fav && fav.library) { return joinLibraryRoute(fav.library); }
    else                    { return defaultRoute;                  }
  }, [props.libraryData, props.central.playlists.playlists]);

  const platformList = React.useMemo(() => {
    const platforms = getPlatforms(props.central.games.collection);
    return platforms.map((platform, index) =>
      <span key={index}>
        <Link
          to={joinLibraryRoute('arcade')}
          onClick={onPlatformClick(platform)}>
          {platform}
        </Link>
        { (index < platforms.length -1) ? ', ' : undefined }
      </span>
    );
  }, [props.central.games.collection]);

  // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
  const height: number = 140;
  const width: number = (height * 0.666) | 0;

  /** Render for each box */

  const renderQuickStart = React.useMemo(() =>
    <div className='home-page__box'>
      <div className='home-page__box-head'>{strings.quickStartHeader}</div>
      <ul className='home-page__box-body'>
        <QuickStartItem icon='badge'>
          {formatString(strings.hallOfFameInfo, <Link to={hallOfFameBrowseRoute} onClick={onHallOfFameClick}>{strings.hallOfFame}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='play-circle'>
          {formatString(strings.allGamesInfo, <Link to={joinLibraryRoute('arcade')} onClick={onAllGamesClick}>{strings.allGames}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='video'>
          {formatString(strings.allAnimationsInfo, <Link to={joinLibraryRoute('theatre')} onClick={onAllAnimationsClick}>{strings.allAnimations}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='wrench'>
          {formatString(strings.configInfo, <Link to={Paths.CONFIG}>{strings.config}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='info'>
          {formatString(strings.helpInfo, <Link to='#' onClick={onHelpClick}>{strings.help}</Link>)}
        </QuickStartItem>
      </ul>
    </div>
  , [strings, hallOfFameBrowseRoute, onHallOfFameClick, onAllGamesClick,
     onAllAnimationsClick, onHelpClick]);

  const renderExtras = React.useMemo(() => <div className='home-page__box home-page__box--extras'>
    <div className='home-page__box-head'>{strings.extrasHeader}</div>
      <ul className='home-page__box-body'>
        <QuickStartItem icon='heart'>
          <Link
            to={favouriteBrowseRoute}
            onClick={onFavoriteClick}>
            {strings.favoritesPlaylist}
          </Link>
        </QuickStartItem>
        <QuickStartItem icon='list'>
          <a
            href='http://bluemaxima.org/flashpoint/datahub/Genres'
            target='_top'>
            {strings.tagList}
          </a>
        </QuickStartItem>
        <br />
        <QuickStartItem icon='tag'>
          {strings.filterByPlatform}:
        </QuickStartItem>
        <QuickStartItem className='home-page__box-item--platforms'>
          { platformList }
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
  , [strings, favouriteBrowseRoute, onFavoriteClick, platformList]);

  const renderUpgrades = React.useMemo(() => {
    if (upgradeStages.length > 0) {
      const renderedStages: JSX.Element[] = [];
      for (let i = 0; i < upgradeStages.length; i++) {
        renderedStages.push(
          <div key={i*2}>
            {renderStageSection(strings, upgradeStages[i], onDownloadUpgradeClick)}
          </div>
        );
        renderedStages.push(
          <br key={(i*2)+1}/>
        );
      }
      // Remove trailing <br/>
      if (renderedStages.length > 0) { renderedStages.pop(); }
      return (
        <div className='home-page__box home-page__box--upgrades'>
          <div className='home-page__box-head'>{strings.upgradesHeader}</div>
          <ul className='home-page__box-body'>
            { renderedStages }
          </ul>
        </div>
      );
    }
  }, [strings, upgradeStages, onDownloadUpgradeClick]);

  const renderNotes = React.useMemo(() =>
    <div className='home-page__box'>
      <div className='home-page__box-head'>{strings.notesHeader}</div>
      <ul className='home-page__box-body'>
        <QuickStartItem>
          {strings.notes}
        </QuickStartItem>
      </ul>
    </div>
  , [strings]);

  const renderRandomGames = React.useMemo(() =>
    <SizeProvider width={width} height={height}>
      <div className='home-page__random-games'>
        <div className='home-page__random-games__inner'>
          <p className='home-page__random-games__title'>{strings.randomPicks}</p>
          { props.central.gamesDoneLoading ? (
            <RandomGames
              games={games.collection.games}
              gameImages={gameImages}
              onLaunchGame={onLaunchGame}
              showExtreme={!disableExtremeGames && browsePageShowExtreme}
              showBroken={showBrokenGames}
            />
          ) : (
            <p className='home-page__random-games__loading'>
              { props.central.gamesFailedLoading ? ('No games found.') : ('Loading...') }
            </p>
          ) }
        </div>
      </div>
    </SizeProvider>
  , [strings, onLaunchGame, props.central.gamesDoneLoading, props.central.gamesFailedLoading]);

  return React.useMemo(() => (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
          <div
            className='fp-logo fp-logo--animated'
            style={{ animationDelay: logoDelay }} />
        </div>
        { renderQuickStart }
        {/* Upgrades */}
        { renderUpgrades }
        {/* Extras */}
        { renderExtras }
        {/* Notes */}
        { renderNotes }
        {/* Random Games */}
        { renderRandomGames }
      </div>
    </div>
  ), [renderQuickStart, renderExtras, renderNotes, renderRandomGames]);
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

function renderStageSection(strings: LangContainer['home'], stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  return (
    <>
      <QuickStartItem><b>{stage && stage.title || '...'}</b></QuickStartItem>
      <QuickStartItem><i>{stage && stage.description || '...'}</i></QuickStartItem>
      <QuickStartItem>{ renderStageButton(strings, stage, onDownload) }</QuickStartItem>
    </>
  );
}

function renderStageButton(strings: LangContainer['home'], stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  const stageState = stage.state;
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
              onClick={() => { onDownload(stage); }}>
              {strings.download}
            </a>
          )
        )
      )
    ) : '...'
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
