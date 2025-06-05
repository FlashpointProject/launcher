import { GameListComponentProps } from 'flashpoint-launcher-renderer';
import { ExtData } from './types';

export default function NgScoreListRow(props: GameListComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const score = Number(extData?.score) || 0;

  return (
    <div className='game-list-item__field game-list-item__field--ng-score'>{score.toFixed(2)}</div>
  );
}
