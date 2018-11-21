import * as React from 'react';
import { ICentralState } from '../../interfaces';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameGridItem } from '../GameGridItem';
import { SizeProvider } from '../SizeProvider';
import { GameLauncher } from '../../GameLauncher';
import { filterExtreme } from '../../../shared/game/GameFilter';
import { WithPreferencesProps } from '../../containers/withPreferences';

interface OwnProps {
  central: ICentralState;
}

export type IHomePageProps = OwnProps & WithPreferencesProps;

export interface IHomePageState {
  /** If the random games has been picked yet */
  pickedRandomGames: boolean;
  randomGames: IGameInfo[];
  randomGameThumbnails: Array<string | undefined>;
}

export class HomePage extends React.Component<IHomePageProps, IHomePageState> {
  private static readonly randomGamesCount = 6;

  constructor(props: IHomePageProps) {
    super(props);
    this.state = {
      pickedRandomGames: false,
      randomGames: [],
      randomGameThumbnails: [],
    };
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
    const { pickedRandomGames, randomGames, randomGameThumbnails } = this.state;
    // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
    const height: number = 140;
    const width: number = (height * 0.666) | 0;
    return (
      <div className='home-page simple-scroll'>
        <div className='home-page__inner'>
          <h1 style={{ color: 'red', margin: '2em 0 5em 0', fontSize: '3em', textAlign: 'center' }}>S  T  U  F  F</h1>
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
