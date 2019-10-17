import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { filterBroken, filterExtreme } from '../../shared/game/GameFilter';
import { IGameInfo } from '../../shared/game/interfaces';
import { GameImageCollection } from '../image/GameImageCollection';
import { findElementAncestor, shuffle } from '../Util';
import { GameGridItem } from './GameGridItem';
import { GameItemContainer } from './GameItemContainer';
import { LangContext } from '../util/lang';

type RandomGamesProps = {
  /** Games to randomly pick from. */
  games: IGameInfo[];
  /** Game image collection to get the images from. */
  gameImages: GameImageCollection;
  /** Called when the user attempts to launch a game. */
  onLaunchGame: (game: IGameInfo) => void;
  /** If extreme games could be picked and displayed. */
  showExtreme: boolean;
  /** If broken games could be picked and displayed. */
  showBroken: boolean;
};

/** The number of games shown in the RandomGames component. */
const numberOfGames = 6;
/** Number of times to re-roll for unique genre */
const rolls = 10;

/** A small "grid" of randomly selected games. */
export function RandomGames(props: RandomGamesProps) {
  const strings = React.useContext(LangContext).home;
  // Filter the given selection
  const filteredGames = useMemo(() => {
    return filterBroken(props.showBroken, filterExtreme(props.showExtreme, props.games));
  }, [/* Only filter games on the first render. */]);
  // Keep a state of the random games
  const [randomGames, setRandomGames] = React.useState(getRandomGames(filteredGames));

  // Launch Callback
  const onGameLaunch = useCallback((event: React.MouseEvent, gameId: string) => {
    const game = randomGames.find(game => game.id === gameId);
    console.log(game);
    if (game) { props.onLaunchGame(game); }
  }, [randomGames]);

  // Render games
  const gameItems = React.useMemo(() => (
    randomGames.map(game => (
      <GameGridItem
        key={game.id}
        game={game}
        thumbnail={props.gameImages.getThumbnailPath(game) || ''}
        isSelected={false}
        isDragged={false} />
    ))
  ), [randomGames, props.gameImages]);

  // Render
  return (
    <div>
      <p className='home-page__random-games__title'>{strings.randomPicks}</p>
      <button
        className='simple-button home-page__random-games__button'
        onClick={(event) => { setRandomGames(getRandomGames(filteredGames)); }}
        >{strings.reroll}</button>
      <GameItemContainer
        className='random-games'
        onGameLaunch={onGameLaunch}
        findGameId={findGameId}>
        { gameItems }
      </GameItemContainer>
    </div>
  );
}

/**
 * Try getting a game ID by checking an element and all of its ancestors.
 * @param element Element or sub-element of a game.
 */
function findGameId(element: EventTarget): string | undefined {
  const game = findElementAncestor(element as Element, target => GameGridItem.isElement(target), true);
  if (game) { return GameGridItem.getId(game); }
}

/**
 * Gets a biased selection of random games. Tries to get unique genres for each.
 * @param games List of games to use
 * @returns List of randomized games
 */
function getRandomGames(games: IGameInfo[]) {
  const shuffledGames = shuffle(games);
  if (numberOfGames >= games.length) {
    // Not enough games to roll for, just return what we have
    return shuffledGames;
  } else {
    let randomGames: IGameInfo[] = [];
    let index = 0;
    // Roll upto X times looking for unique genres
    for (let i = 0; i < numberOfGames; i++) {
      for (let j = 0; j < rolls; j++) {
        const game = shuffledGames[index];
        if (index++ >= shuffledGames.length) { index = 0; }
        if (!randomGames.find((existingGame) => { return game.genre === existingGame.genre; })) {
          randomGames.push(game);
          break;
        }
      }
      // Rolls were all the same genre, just pick the next unique game
      if (randomGames.length <= i) {
        while (true) {
          const game = shuffledGames[index];
          if (index++ >= shuffledGames.length) { index = 0; }
          if (!randomGames.find((existingGame) => { game.id === existingGame.id; })) {
            randomGames.push(game);
            break;
          }
        }
      }
    }
    return randomGames;
  }
}