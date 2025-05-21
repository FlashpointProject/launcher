import { GameListHeaderComponentProps } from 'flashpoint-launcher-renderer';

export default function NgViewsListHeader(props: GameListHeaderComponentProps) {
  return (
    <window.ext.components.SortableColumn
      title='NG Views'
      modifier='nga-views'
      extOrderKey={{
        extId: 'nga',
        key: 'views',
        default: 0
      }}
      {...props} />
  );
}
