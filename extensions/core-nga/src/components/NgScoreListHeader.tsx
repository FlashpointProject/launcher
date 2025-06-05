import { GameListHeaderComponentProps } from 'flashpoint-launcher-renderer';

export default function NgScoreListHeader(props: GameListHeaderComponentProps) {
  return (
    <window.ext.components.SortableColumn
      title='NG Score'
      modifier='ng-score'
      extOrderKey={{
        extId: 'nga',
        key: 'score',
        default: 0
      }}
      {...props} />
  );
}
