import * as React from 'react';
import { Link } from 'react-router-dom';
import { ICentralState, UpgradeStageState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { SizeProvider } from '../SizeProvider';
import { GameLauncher } from '../../GameLauncher';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { IGamePlaylist } from '../../playlist/interfaces';
import { Paths } from '../../Paths';
import { RandomGames } from '../RandomGames';
import { IUpgradeStage } from '../../upgrade/upgrade';

interface OwnProps {
  central: ICentralState;
  onSelectPlaylist: (playlist?: IGamePlaylist) => void;
  clearSearch: () => void;
  onDownloadTechUpgradeClick: () => void;
  onDownloadScreenshotsUpgradeClick: () => void;
}

export type IHomePageProps = OwnProps & WithPreferencesProps;

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
                Don't know what to play? Check out the <Link to={Paths.BROWSE} onClick={this.onHallOfFameClick}>Hall of Fame</Link>!
              </QuickStartItem>
              <QuickStartItem icon='magnifying-glass'>
                Looking for something specific? View <Link to={Paths.BROWSE} onClick={this.onAllGamesClick}>All Games</Link>.
              </QuickStartItem>
              <QuickStartItem icon='wrench'>
                Want to change something? Go to <Link to={Paths.CONFIG}>Config</Link>.
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
                <p className='home-page__random-games__title'>Random Games</p>
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
          'Already Installed'
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

  private onHallOfFameClick = () => {
    // Select the "Hall of Fame" playlist
    const playlists = this.props.central.playlists.playlists;
    let hof: IGamePlaylist|undefined = playlists.find(
      (playlist) => (playlist.title === 'Flashpoint Hall of Fame')
    );
    this.props.onSelectPlaylist(hof);
  }

  private onAllGamesClick = () => {
    // Deselect the current playlist and clear the search
    this.props.onSelectPlaylist(undefined);
    this.props.clearSearch();
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
