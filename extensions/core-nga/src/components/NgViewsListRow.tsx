import { GameListComponentProps } from 'flashpoint-launcher-renderer';
import { ExtData } from './types';

const numFormat = new Intl.NumberFormat();

export default function NgViewsListRow(props: GameListComponentProps) {
  const extData: ExtData | undefined = props.game.extData?.nga;
  const views = Number(extData?.views) || 0;

  return (
    <div className='game-list-item__field game-list-item__field--nga-views'>{numFormat.format(views)}</div>
  );
}
