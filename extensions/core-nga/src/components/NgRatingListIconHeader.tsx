import { GameListHeaderComponentProps } from 'flashpoint-launcher-renderer';

export default function NgRatingListIconHeader(props: GameListHeaderComponentProps) {
  return (
    <window.ext.components.SortableColumn
      modifier='icon'
      extOrderKey={{
        extId: 'nga',
        key: 'rating',
        default: 'u'
      }}
      {...props} />
  );
}
