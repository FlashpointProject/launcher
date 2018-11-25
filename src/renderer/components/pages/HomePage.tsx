import * as React from 'react';
import { Link } from 'react-router-dom';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameGridItem } from '../GameGridItem';
import { SizeProvider } from '../SizeProvider';
import { GameLauncher } from '../../GameLauncher';
import { filterExtreme } from '../../../shared/game/GameFilter';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { IGamePlaylist } from '../../playlist/interfaces';
import { Paths } from '../../Paths';

interface OwnProps {
  central: ICentralState;
  onSelectPlaylist: (playlist?: IGamePlaylist) => void;
  clearSearch: () => void;
}

export type IHomePageProps = OwnProps & WithPreferencesProps;

export interface IHomePageState {
  /** If the random games has been picked yet */
  pickedRandomGames: boolean;
  randomGames: IGameInfo[];
  randomGameThumbnails: Array<string | undefined>;
  /** Delay applied to the logo's animation */
  logoDelay: string;
}

export class HomePage extends React.Component<IHomePageProps, IHomePageState> {
  private static readonly randomGamesCount = 6;

  constructor(props: IHomePageProps) {
    super(props);
    this.state = {
      pickedRandomGames: false,
      randomGames: [],
      randomGameThumbnails: [],
      logoDelay: (Date.now() * -0.001) + 's', // (Offset the animation with the current time stamp)
    };
    this.onHallOfFameClick = this.onHallOfFameClick.bind(this);
    this.onAllGamesClick = this.onAllGamesClick.bind(this);
  }

  componentDidMount() {
    this.selectRandomGames();
  }

  componentDidUpdate() {
    if (!this.state.pickedRandomGames) {
      this.selectRandomGames();
    }
  }

  render() {
    const { pickedRandomGames, randomGames, randomGameThumbnails, logoDelay } = this.state;
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
          <div className='home-page__quick-start'>
            <div className='home-page__quick-start__head'>Quick Start</div>
            <ul className='home-page__quick-start__body'>
              <QuickStartItem icon='badge'>
                Don't know what to play? Check out the <Link to={Paths.browse} onClick={this.onHallOfFameClick}>Hall of Fame</Link>!
              </QuickStartItem>
              <QuickStartItem icon='magnifying-glass'>
                Looking for something specific? View <Link to={Paths.browse} onClick={this.onAllGamesClick}>All Games</Link>.
              </QuickStartItem>
              <QuickStartItem icon='wrench'>
                Want to change something? Go to <Link to={Paths.config}>Config</Link>.
              </QuickStartItem>
            </ul>
          </div>
          {/* Notes */}
          <div className='home-page__quick-start'>
            <div className='home-page__quick-start__head'>Notes</div>
            <ul className='home-page__quick-start__body'>
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
                { pickedRandomGames ? (
                  <div className='home-page__random-games__games'>
                      { randomGames.map((game, index) => (
                        <GameGridItem
                          key={game.id}
                          game={game}
                          thumbnail={randomGameThumbnails[index] || ''}
                          onDoubleClick={this.onLaunchGame}
                          isSelected={false}
                          isDragged={false}
                          index={index} />
                      )) }
                  </div>
                ) : (
                  <p className='home-page__random-games__loading'>
                    Loading...
                  </p>
                ) }
              </div>
            </div>
          </SizeProvider>
        </div>
      </div>
    );
  }

  private onLaunchGame(game: IGameInfo, index: number): void {
    GameLauncher.launchGame(game);
  }

  private onHallOfFameClick(event: React.MouseEvent) {
    // Select the "Hall of Fame" playlist
    const playlists = this.props.central.playlists.playlists;
    let hof: IGamePlaylist|undefined = playlists.find(
      (playlist) => (playlist.title === 'Flashpoint Hall of Fame')
    );
    this.props.onSelectPlaylist(hof);
  }

  private onAllGamesClick(event: React.MouseEvent) {
    // Deselect the current playlist and clear the search
    this.props.onSelectPlaylist(undefined);
    this.props.clearSearch();
  }

  /** Select the random games to show */
  private selectRandomGames() {
    const gameImages = this.props.central.gameImages;
    const allGames = this.props.central.games.collection.games;
    if (allGames.length > 0) {
      // Filter and randomize games
      let games = allGames.slice();
      games = filterExtreme(this.props.preferencesData.browsePageShowExtreme, games);
      games = games.sort(() => .5 - Math.random()); // (Shuffle array)
      // Pick a number of games and find their thumbnails
      const randomGames = games.slice(0, Math.min(HomePage.randomGamesCount, games.length));
      const randomGameThumbnails = randomGames.map((game) => gameImages.getThumbnailPath(game.title, game.platform));
      // Update state
      this.setState({
        pickedRandomGames: true,
        randomGames,
        randomGameThumbnails,
      });
    }
  }
}

function QuickStartItem(props: { icon?: OpenIconType, children?: React.ReactNode }): JSX.Element {
  return (
    <li className='home-page__quick-start__item simple-center'>
      { props.icon ? (
         <div className='home-page__quick-start__item__icon simple-center__vertical-inner'>
          <OpenIcon icon={props.icon} />
        </div>       
      ) : undefined }
      <div className='simple-center__vertical-inner'>
        {props.children}
      </div>
    </li>
  );
}
