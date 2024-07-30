import { WithPreferencesProps } from '@renderer/containers/withPreferences';
import { updatePreferencesData } from '@shared/preferences/util';
import { GameOrderBy, GameOrderDirection } from 'flashpoint-launcher';
import { useMemo } from 'react';
import { OpenIcon } from './OpenIcon';
import { useView } from '@renderer/hooks/search';
import { useDispatch } from 'react-redux';
import { searchActions } from '@renderer/store/search/slice';

export type GameListHeaderProps = WithPreferencesProps & {
  showExtremeIcon: boolean;
};

// Header on top of the GameList. It contains the resizable columns that decide how wide each column is.
export function GameListHeader(props: GameListHeaderProps) {
  const { gamesOrderBy, gamesOrder } = props.preferencesData;
  const currentView = useView();
  const dispatch = useDispatch();

  const onToggleSort = (key: GameOrderBy) => {
    if (currentView.orderBy === key) {
      const newDirection = currentView.orderReverse === 'ASC' ? 'DESC' : 'ASC';
      dispatch(searchActions.setOrderReverse({
        view: currentView.id,
        value: newDirection,
      }));
    } else {
      dispatch(searchActions.setOrderBy({
        view: currentView.id,
        value: key,
      }));
      dispatch(searchActions.setOrderReverse({
        view: currentView.id,
        value: 'ASC',
      }));
    }
    if (currentView.selectedPlaylist !== undefined && currentView.advancedFilter.playlistOrder) {
      dispatch(searchActions.setAdvancedFilter({
        view: currentView.id,
        filter: {
          ...currentView.advancedFilter,
          playlistOrder: false,
        },
      }));
    }
  };

  const curOrderBy = (currentView.selectedPlaylist !== undefined && currentView.advancedFilter.playlistOrder) ?
    undefined :
    currentView.orderBy;

  return useMemo(() => (
    <div className='game-list-header'>
      { props.showExtremeIcon ? (
        <Column modifier='icon' hideDivider={true} />
      ) : undefined}
      <SortableColumn
        modifier='icon'
        hideDivider={true}
        orderBy='platform'
        onToggleSort={onToggleSort}
        direction={currentView.orderReverse}
        value={curOrderBy} />
      <div className='game-list-header__right'>
        <SortableColumn
          title='Title'
          modifier='title'
          hideDivider={true}
          orderBy='title'
          onToggleSort={onToggleSort}
          direction={currentView.orderReverse}
          value={curOrderBy} />
        <SortableColumn
          title='Developer'
          modifier='developer'
          hideDivider={true}
          orderBy='developer'
          onToggleSort={onToggleSort}
          direction={currentView.orderReverse}
          value={curOrderBy} />
        <SortableColumn
          title='Publisher'
          modifier='publisher'
          hideDivider={true}
          orderBy='publisher'
          onToggleSort={onToggleSort}
          direction={currentView.orderReverse}
          value={curOrderBy} />
        {/* <Column title='Tags'      modifier='tagsStr'                      /> */}
      </div>
      <div className='game-list-header__scroll-fill' />
    </div>
  ), [currentView.orderReverse, currentView.orderBy, currentView.selectedPlaylist, currentView.advancedFilter.playlistOrder]);
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

type SortableColumnProps = ColumnProps & {
  /** GameOrderBy key */
  orderBy: GameOrderBy;
  /** Currently selected value */
  value?: GameOrderBy;
  /** Current selected direction */
  direction: GameOrderDirection;
  /** When toggled */
  onToggleSort: (key: GameOrderBy) => void;
};

function SortableColumn(props: SortableColumnProps) {
  const { orderBy, value, direction, onToggleSort } = props;
  const className = 'game-list-header-column';
  const active = orderBy === value;
  const showDivider = !props.hideDivider;
  // Render
  return (
    <div className={`${className} ${className}--${props.modifier} ${className}--sortable`} onClick={() => onToggleSort(orderBy)}>
      { showDivider ? (
        <div className='game-list-header-column__divider' />
      ) : undefined }
      <div className='game-list-header-column__title'>
        {props.title || ''}
        { active ? (
          <div className='game-list-header-column__sort-icon-wrapper'>
            <OpenIcon
              icon={direction === 'DESC'? 'chevron-top' : 'chevron-bottom'}
              className='game-list-header-column__sort-icon'/>
          </div>
        ): undefined }
      </div>
    </div>
  );
}
