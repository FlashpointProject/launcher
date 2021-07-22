import * as React from 'react';
import { useMemo } from 'react';
import { updatePreferencesData } from '@shared/preferences/util';
import { GameOrderBy } from '@shared/order/interfaces';
import { OpenIcon } from './OpenIcon';
import { WithPreferencesProps } from '@renderer/containers/withPreferences';

export type GameListHeaderProps = WithPreferencesProps & {
  showExtremeIcon: boolean;
};

/**
 * Header on top of the GameList.
 * It contains the resizable columns that decide how wide each column is.
 */
export function GameListHeader(props: GameListHeaderProps) {
  const {gamesOrderBy, gamesOrder} = props.preferencesData;

  return useMemo(() => (
    <div className='game-list-header'>
      { props.showExtremeIcon ? (
        <Column modifier='icon' hideDivider={true} />
      ) : undefined}
      <SortableColumn modifier='icon' hideDivider={true} orderBy='platform' preferencesData={props.preferencesData} />
      <div className='game-list-header__right'>
        <SortableColumn
          title='Title'
          modifier='title'
          hideDivider={true}
          orderBy='title'
          preferencesData={props.preferencesData} />
        <SortableColumn
          title='Developer'
          modifier='developer'
          hideDivider={true}
          orderBy='developer'
          preferencesData={props.preferencesData} />
        <SortableColumn
          title='Publisher'
          modifier='publisher'
          hideDivider={true}
          orderBy='publisher'
          preferencesData={props.preferencesData} />
        {/* <Column title='Tags'      modifier='tagsStr'                      /> */}
      </div>
      <div className='game-list-header__scroll-fill' />
    </div>
  ), [gamesOrderBy, gamesOrder]);
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

type SortableColumnProps = ColumnProps & WithPreferencesProps & {
  /** GameOrderBy key */
  orderBy: GameOrderBy;
};

function SortableColumn(props: SortableColumnProps) {
  const className = 'game-list-header-column';
  const { gamesOrderBy, gamesOrder } = props.preferencesData;
  const active = gamesOrderBy === props.orderBy;
  const showDivider = !props.hideDivider;
  // Render
  return (
    <div className={`${className} ${className}--${props.modifier} ${className}--sortable`} onClick={() => toggleSorting(props.orderBy)}>
      { showDivider ? (
        <div className='game-list-header-column__divider' />
      ) : undefined }
      <div className='game-list-header-column__title'>
        {props.title || ''}
        { active ? (
          <div className='game-list-header-column__sort-icon-wrapper'>
            <OpenIcon
              icon={gamesOrder === 'ASC'? 'chevron-top' : 'chevron-bottom'}
              className='game-list-header-column__sort-icon'/>
          </div>
        ): undefined }
      </div>
    </div>
  );

}

function toggleSorting(orderBy: GameOrderBy) {
  const { gamesOrderBy, gamesOrder } = window.Shared.preferences.data;
  const direction = gamesOrderBy === orderBy && gamesOrder === 'ASC'? 'DESC' : 'ASC';

  updatePreferencesData({
    gamesOrderBy: orderBy,
    gamesOrder: direction
  });
}
