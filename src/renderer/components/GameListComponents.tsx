import { getPlatformIconURL } from '@renderer/Util';
import { GameListComponentProps, GameListHeaderComponentProps } from 'flashpoint-launcher-renderer';
import { SortableColumn } from './GameListHeader';

export function GameListRowPlatform({ game, logoVersion }: GameListComponentProps) {
  const platformIcon = getPlatformIconURL(game.primaryPlatform, logoVersion);

  return (
    <div
      className='game-list-item__icon'
      style={{ backgroundImage: `url("${platformIcon}")` }} />
  );
}

export function GameListRowTitle({ game }: GameListComponentProps) {
  return (
    <div
      className='game-list-item__field game-list-item__field--title'
      title={game?.title}>
      {game?.title}
    </div>
  );
}

export function GameListRowDeveloper({ game }: GameListComponentProps) {
  return (
    <div
      className='game-list-item__field game-list-item__field--title'
      title={game?.developer}>
      {game?.developer}
    </div>
  );
}

export function GameListRowPublisher({ game }: GameListComponentProps) {
  return (
    <div
      className='game-list-item__field game-list-item__field--title'
      title={game?.publisher}>
      {game?.publisher}
    </div>
  );
}

export function GameListHeaderPlatform(props: GameListHeaderComponentProps) {
  return <SortableColumn
    orderKey='platform'
    modifier='icon'
    {...props}
  />;
}

export function GameListHeaderTitle(props: GameListHeaderComponentProps) {
  return <SortableColumn
    title='Title'
    orderKey='title'
    modifier='title'
    {...props}
  />;
}

export function GameListHeaderDeveloper(props: GameListHeaderComponentProps) {
  return <SortableColumn
    title='Developer'
    orderKey='developer'
    modifier='developer'
    {...props}
  />;
}

export function GameListHeaderPublisher(props: GameListHeaderComponentProps) {
  return <SortableColumn
    title='Publisher'
    orderKey='publisher'
    modifier='publisher'
    {...props}
  />;
}
