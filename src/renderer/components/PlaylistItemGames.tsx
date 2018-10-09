import * as React from 'react';
import { IGameCollection, IGameInfo } from '../../shared/game/interfaces';
import { IGamePlaylist, IGamePlaylistEntry } from '../playlist/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { GameGridItem } from './GameGridItem';
import { lerp } from '../Util';

export interface IPlaylistItemGamesProps {
  playlist: IGamePlaylist;
  collection?: IGameCollection;
  gameImages: GameImageCollection;
  gameScale: number;
}

export interface IPlaylistItemGamesState {
}

export class PlaylistItemGames extends React.Component<IPlaylistItemGamesProps, IPlaylistItemGamesState> {
  private _wrapper: React.RefObject<HTMLDivElement> = React.createRef();
  private width: number = 0;
  private height: number = 0;

  constructor(props: IPlaylistItemGamesProps) {
    super(props);
    this.state = {};
  }

  componentDidMount(): void {
    this.updateCssVars();
  }

  componentDidUpdate(): void {
    this.updateCssVars();
  }

  render() {
    // Calculate height and width
    const min = 188 * 0.785;
    const max = 691 * 0.5;
    this.height = lerp(min, max, this.props.gameScale) | 0; // ("x|0" is the same as Math.floor(x))
    this.width = (this.height * 0.666) | 0;
    // Render
    const gameInfos = this.getGames();
    const gameEntries = this.props.playlist.games;
    return (
      <div className='playlist-list-item__games' ref={this._wrapper}>
        {gameEntries.map((gameEntry, index) => this.renderGame(gameEntry, gameInfos[index], index))}
        <div className='playlist-list-item__games__game'>
          <div className='playlist-list-item__games__show-all'>
            <div className='playlist-list-item__games__show-all__inner'>
              <div className='playlist-list-item__games__show-all__inner__box'>
                <p className='playlist-list-item__games__show-all__text'>
                  Show All
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderGame(gameEntry: IGamePlaylistEntry, gameInfo: IGameInfo|undefined, index: number): JSX.Element {
    return (
      <div className='playlist-list-item__games__game' key={index}>
        { gameInfo ? (
          <GameGridItem game={gameInfo}
                        thumbnail={this.props.gameImages.getThumbnailPath(gameInfo.title, gameInfo.platform)||''} 
                        isSelected={false}
                        index={index} />
        ) : (
          <>not found?</>
        ) }
      </div>
    );
  }

  /**
   * Get all games in the playlists from 
   */
  private getGames(): (IGameInfo|undefined)[] {
    if (!this.props.collection) { return []; }
    const games: (IGameInfo|undefined)[] = [];
    let collectionGames = this.props.collection.games;
    let gameEntries = this.props.playlist.games;
    for (let i = 0; i < gameEntries.length; i++) {
      const game2 = gameEntries[i];
      for (let j = collectionGames.length-1; j >= 0; j--) {
        const game = collectionGames[j];
        if (game2.id === game.id) {
          games[i] = game;
        }
      }
    }
    return games;
  }
  
  /** Update CSS Variables */
  updateCssVars() {
    // Set CCS vars
    const wrapper = this._wrapper.current;
    if (wrapper) {
      wrapper.style.setProperty('--width', this.width+'');
      wrapper.style.setProperty('--height', this.height+'');
    }
  }
}
