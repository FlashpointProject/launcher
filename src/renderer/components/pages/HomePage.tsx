import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { wrapSearchTerm } from '../../../shared/game/GameFilter';
import { GamePlaylist } from '../../../shared/interfaces';
import { LangContainer } from '../../../shared/lang';
import { PlatformInfo } from '../../../shared/platform/interfaces';
import { formatString } from '../../../shared/utils/StringFormatter';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { CentralState, UpgradeStageState } from '../../interfaces';
import { Paths } from '../../Paths';
import { UpgradeStage } from '../../upgrade/types';
import { joinLibraryRoute } from '../../Util';
import { LangContext } from '../../util/lang';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { RandomGames } from '../RandomGames';
import { SizeProvider } from '../SizeProvider';

const ARCADE = 'Arcade';
const THEATRE = 'Theatre';

type OwnProps = {
  platforms: string[];
  playlists: GamePlaylist[];
  /** Semi-global prop. */
  central: CentralState;
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** Called when the "download tech" button is clicked. */
  onDownloadTechUpgradeClick: () => void;
  /** Called when the "download screenshots" button is clicked. */
  onDownloadScreenshotsUpgradeClick: () => void;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithSearchProps;

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
      central: {
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
    const numOfPlatforms = this.props.platforms.length;
    const formatPlatforms = this.props.platforms.map((platform, index) =>
      <span key={index}>
        <Link
          to={joinLibraryRoute(ARCADE)}
          onClick={this.onPlatformClick(platform)}>
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
                {formatString(strings.hallOfFameInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={this.onHallOfFameClick}>{strings.hallOfFame}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='play-circle'>
                {formatString(strings.allGamesInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={this.onAllGamesClick}>{strings.allGames}</Link>)}
              </QuickStartItem>
              <QuickStartItem icon='video'>
                {formatString(strings.allAnimationsInfo, <Link to={joinLibraryRoute(THEATRE)} onClick={this.onAllAnimationsClick}>{strings.allAnimations}</Link>)}
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
                  to={joinLibraryRoute(ARCADE)}
                  onClick={this.onFavoriteClick}>
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
                <RandomGames
                  showExtreme={!disableExtremeGames && browsePageShowExtreme}
                  showBroken={showBrokenGames} />
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

  onHelpClick = () => {
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    remote.shell.openItem(path.join(fullFlashpointPath, 'readme.txt'));
  }

  private onHallOfFameClick = () => {
    const playlist = this.props.playlists.find(p => p.title === 'Flashpoint Hall of Fame');
    if (playlist) {
      this.props.onSelectPlaylist(ARCADE, playlist.filename);
      this.props.clearSearch();
    }
  }

  onFavoriteClick = () => {
    const playlist = this.props.playlists.find(p => p.title === '*Favorites*');
    if (playlist) {
      this.props.onSelectPlaylist(ARCADE, playlist.filename);
      this.props.clearSearch();
    }
  }

  onAllGamesClick = () => {
    this.props.onSelectPlaylist(ARCADE, undefined);
    this.props.clearSearch();
  }

  onAllAnimationsClick = () => {
    this.props.onSelectPlaylist(THEATRE, undefined);
    this.props.clearSearch();
  }

  /** Gets the platform as a string and performs a search dynamically for each platform generated. */
  onPlatformClick = (platform: string) => (event: any) => {
    this.props.onSearch('!' + wrapSearchTerm(platform));
    this.props.onSelectPlaylist(ARCADE, undefined);
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

