import { remote } from 'electron';
import * as path from 'path';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { IGameInfo } from '../../../shared/game/interfaces';
import { WithLibraryProps } from '../../containers/withLibrary';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { GameLauncher } from '../../GameLauncher';
import { ICentralState, UpgradeStageState } from '../../interfaces';
import { Paths } from '../../Paths';
import { IGamePlaylist } from '../../playlist/interfaces';
import { IUpgradeStage } from '../../upgrade/upgrade';
import { joinLibraryRoute } from '../../Util';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { RandomGames } from '../RandomGames';
import { SizeProvider } from '../SizeProvider';
import { findDefaultLibrary } from '../../../shared/library/util';
import { WithSearchProps } from '../../containers/withSearch';

interface OwnProps {
  central: ICentralState;
  onSelectPlaylist: (playlist?: IGamePlaylist, route?: string) => void;
  clearSearch: () => void;
  onDownloadTechUpgradeClick: () => void;
  onDownloadScreenshotsUpgradeClick: () => void;
}

export type IHomePageProps = OwnProps & WithPreferencesProps & WithLibraryProps & WithSearchProps;

export interface IHomePageState {
  /** Delay applied to the logo's animation */
  logoDelay: string;
}

export class HomePage extends React.Component<IHomePageProps, IHomePageState> {
  constructor(props: IHomePageProps) {
    super(props);
    this.state = {
      logoDelay: (Date.now() * -0.001) + 's', // (Offset the animation with the current time stamp)
    };
  }

  render() {
    const {
      onDownloadTechUpgradeClick,
      onDownloadScreenshotsUpgradeClick,
      central: {
        gamesDoneLoading,
        games,
        gameImages,
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
    const { logoDelay } = this.state;
    // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
    const height: number = 140;
    const width: number = (height * 0.666) | 0;
    return (
      <div className='home-page simple-scroll'>
        <div className='home-page__inner'>
          {/* Logo */}
          <div className='home-page__logo'>
            <div className='home-page__logo__image' style={{ animationDelay:logoDelay }} />
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
          {/* Additional info - Trello request */}
          <div className='home-page__box'>
            <div className='home-page__box__head'>Extras</div>
            <ul className='home-page__box__body'>
              <QuickStartItem>
                <Link to={this.getFavoriteBrowseRoute()} onClick={this.onFavoriteClick}>Favorites Playlist</Link>
              </QuickStartItem>
              <QuickStartItem>
                <a href="http://bluemaxima.org/flashpoint/datahub/Genres" target="_top">Genre List</a>
              </QuickStartItem>
              <br></br>
              <QuickStartItem>
              Filter by platform:  
              </QuickStartItem>
              <QuickStartItem>
                <Link to={joinLibraryRoute('arcade')} onClick={this.onFlashClick}>Flash</Link> 
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onShockwaveClick}>Shockwave</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onGrooveClick}>3D Groove GX</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.on3dviaClick}>3DVIA Player</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onHtml5Click}>HTML5</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onJavaClick}>Java Applets</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onPopcapClick}>PopCap Plugin</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onSilverlightClick}>Silverlight</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onUnityClick}>Unity</Link>
                {', '}
                <Link to={joinLibraryRoute('arcade')} onClick={this.onActivexClick}>ActiveX</Link>
              </QuickStartItem>
              <br></br>
              <QuickStartItem>
                <a href="https://trello.com/b/Tu9E5GLk/launcher" target="_top">Check out our planned features!</a>
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

  private renderStageSection(stageData: IUpgradeStage|undefined, stageState: UpgradeStageState, onClick: () => void) {
    return (
      <>
        <QuickStartItem><b>{stageData && stageData.title || '...'}</b></QuickStartItem>
        <QuickStartItem><i>{stageData && stageData.description || '...'}</i></QuickStartItem>
        <QuickStartItem>{ this.renderStageButton(stageState, onClick) }</QuickStartItem>
      </>
    );
  }

  private renderStageButton(stageState: UpgradeStageState, onClick: () => void) {
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
              <a className='simple-button' onClick={onClick}>Download</a>
            )            
          )
        )
      ) : '...'
    );
  }

  private onLaunchGame(game: IGameInfo, index: number): void {
    GameLauncher.launchGame(game);
  }

  private onHelpClick = () => {
    const fullFlashpointPath = window.External.config.fullFlashpointPath;
    remote.shell.openItem(path.join(fullFlashpointPath, 'readme.txt'));
  }

  private onHallOfFameClick = () => {
    const { central, libraryData, onSelectPlaylist } = this.props;
    let hof = findHallOfFamePlaylist(central.playlists.playlists);
    let route: string|undefined = undefined;
    if (hof) {
      if (hof.library) { route = hof.library; }
      else {
        const defLibrary = findDefaultLibrary(libraryData.libraries);
        if (defLibrary) { route = defLibrary.route; }
      }
    }
    onSelectPlaylist(hof, route);
  }

  private onFavoriteClick = () => {
    const { central, libraryData, onSelectPlaylist } = this.props;
    let hof = findFavoritePlaylist(central.playlists.playlists);
    let route: string|undefined = undefined;
    if (hof) {
      if (hof.library) { route = hof.library; }
      else {
        const defLibrary = findDefaultLibrary(libraryData.libraries);
        if (defLibrary) { route = defLibrary.route; }
      }
    }
    onSelectPlaylist(hof, route);
  }

  private onAllGamesClick = () => {
    this.props.onSelectPlaylist(undefined, 'arcade');
    this.props.clearSearch();
  }

  private onAllAnimationsClick = () => {
    this.props.onSelectPlaylist(undefined, 'theatre');
    this.props.clearSearch();
  }

  private onFlashClick = () => {
    this.props.onSearch('!flash');
  }

  private onShockwaveClick = () => {
    this.props.onSearch('!shockwave');
  }

  private onGrooveClick = () => {
    this.props.onSearch('!3d groove gx');
  }

  private on3dviaClick = () => {
    this.props.onSearch('!3dvia');
  }

  private onActivexClick = () => {
    this.props.onSearch('!activex');
  }

  private onHtml5Click = () => {
    this.props.onSearch('!html5');
  }

  private onJavaClick = () => {
    this.props.onSearch('!java');
  }

  private onPopcapClick = () => {
    this.props.onSearch('!popcap');
  }

  private onSilverlightClick = () => {
    this.props.onSearch('!silverlight');
  }

  private onUnityClick = () => {
    this.props.onSearch('!unity');
  }

  private getHallOfFameBrowseRoute = (): string => {
    const defaultLibrary = this.props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let hof = findHallOfFamePlaylist(this.props.central.playlists.playlists);
    if (hof && hof.library) { return joinLibraryRoute(hof.library); }
    else                    { return defaultRoute;                  }
  }

  private getFavoriteBrowseRoute = (): string => {
    const defaultLibrary = this.props.libraryData.libraries.find(library => !!library.default);
    const defaultRoute = defaultLibrary ? joinLibraryRoute(defaultLibrary.route) : Paths.BROWSE;
    let hof = findFavoritePlaylist(this.props.central.playlists.playlists);
    if (hof && hof.library) { return joinLibraryRoute(hof.library); }
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

function findHallOfFamePlaylist(playlists: IGamePlaylist[]): IGamePlaylist|undefined {
  return playlists.find(playlist => playlist.title === 'Flashpoint Hall of Fame');
}

function findFavoritePlaylist(playlists: IGamePlaylist[]): IGamePlaylist|undefined {
  return playlists.find(playlist => playlist.title === '*Favorites*');
}
