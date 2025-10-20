import { useViewName } from '@renderer/hooks/search';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/useAppSelector';
import { setExtOrder, setOrderBy, setOrderReverse } from '@renderer/store/search/slice';
import { GameListHeaderComponentProps, SortableColumnProps } from 'flashpoint-launcher-renderer';
import { DynamicComponent } from './DynamicComponent';
import { GameOrderChangeEvent } from './GameOrder';
import { OpenIcon } from './OpenIcon';

export type GameListHeaderProps = {
  showExtremeIcon: boolean;
};

// Header on top of the GameList. It contains the resizable columns that decide how wide each column is.
export function GameListHeader(props: GameListHeaderProps) {
  const dispatch = useAppDispatch();
  const viewName = useViewName();
  const insidePlaylist = useAppSelector(state => state.search.views[viewName].selectedPlaylist !== undefined);
  const extOrder = useAppSelector(state => state.search.views[viewName].extOrder);
  const orderBy = useAppSelector(state => state.search.views[viewName].orderBy);
  const orderReverse = useAppSelector(state => state.search.views[viewName].orderReverse);
  const gameListDisplaySettings = useAppSelector(state => state.main.displaySettings.gameList);
  const totalWeight = gameListDisplaySettings.columns.reduce((prev, cur) => cur.type === 'normal' ? prev + cur.weight : prev, 0);

  const onChangeOrder = (event: GameOrderChangeEvent) => {
    dispatch(setOrderBy({
      view: viewName,
      value: event.orderBy
    }));
    dispatch(setOrderReverse({
      view: viewName,
      value: event.orderReverse
    }));
    dispatch(setExtOrder({
      view: viewName,
      value: event.extOrder
    }));
  };

  const gameListHeaderProps: GameListHeaderComponentProps = {
    insidePlaylist,
    orderBy,
    orderReverse,
    extOrder,
    onChangeOrder,
  };

  return (
    <div className='game-list-header'>
      { props.showExtremeIcon ? (
        <Column modifier='icon' hideDivider={true} />
      ) : undefined}
      { gameListDisplaySettings.columns.filter(c => c.type === 'icon').map(col => {
        return <DynamicComponent props={gameListHeaderProps} name={col.headerComponent} />;
      })}
      <div className='game-list-header__right'>
        { gameListDisplaySettings.columns.filter(c => c.type === 'normal').map((col, idx) => {
          return <div style={{ width: `${(col.weight / totalWeight) * 100}%` }}>
            <DynamicComponent key={idx} props={gameListHeaderProps} name={col.headerComponent} />
          </div>;
        })}
      </div>
      <div className='game-list-header__scroll-fill' />
    </div>
  );
}

type ColumnProps = {
  /** Name of the modifier. */
  modifier: string;
  /** Displayed title of the column. */
  title?: string;
  /** If the divider should be hidden (defaults to false). */
  hideDivider?: boolean;
};

function Column(props: ColumnProps) {
  const className = 'game-list-header-column';
  const showDivider = !props.hideDivider;
  // Render
  return (
    <div className={`${className} ${className}--${props.modifier}`}>
      { showDivider ? (
        <div className='game-list-header-column__divider' />
      ) : undefined }
      <div className='game-list-header-column__title'>{props.title || ''}</div>
    </div>
  );
}

export function SortableColumn(props: SortableColumnProps) {
  const { insidePlaylist, orderBy, orderReverse, extOrder, orderKey, extOrderKey, onChangeOrder } = props;
  const className = 'game-list-header-column';
  const isExt = extOrderKey !== undefined;
  const active = !insidePlaylist &&
    (extOrder.extId !== '' ?
      (isExt ? (extOrderKey.extId === extOrder.extId && extOrderKey.key === extOrder.key) : false)
      : orderBy === orderKey
    );

  const onToggle = () => {
    const direction = active ? (orderReverse === 'ASC' ? 'DESC' : 'ASC'): 'ASC';
    if (isExt) {
      onChangeOrder({
        orderBy: orderBy,
        orderReverse: direction,
        extOrder: extOrderKey,
      });
    } else if (orderKey) {
      onChangeOrder({
        orderBy: orderKey,
        orderReverse: direction,
        extOrder: {
          extId: '',
          key: '',
          default: ''
        },
      });
    }
  };

  // Render
  return (
    <div className={`${className} ${className}--${props.modifier} ${className}--sortable`} onClick={onToggle}>
      { props.showDivider ? (
        <div className='game-list-header-column__divider' />
      ) : undefined }
      <div className='game-list-header-column__title'>
        {props.title || ''}
        { active ? (
          <div className='game-list-header-column__sort-icon-wrapper'>
            <OpenIcon
              icon={orderReverse === 'DESC'? 'chevron-top' : 'chevron-bottom'}
              className='game-list-header-column__sort-icon'/>
          </div>
        ): undefined }
      </div>
    </div>
  );
}
