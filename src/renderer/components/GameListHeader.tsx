import * as React from 'react';
import { useMemo } from 'react';

export type GameListHeaderProps = {};

/**
 * Header on top of the GameList.
 * It contains the resizable columns that decide how wide each column is.
 */
export function GameListHeader(props: GameListHeaderProps) {
  return useMemo(() => (
    <div className='game-list-header'>
      <Column modifier='icon' hideDivider={true} />
      <div className='game-list-header__right'>
        <Column title='Title'     modifier='title'     hideDivider={true} />
        {/* <Column title='Tags'      modifier='tags'                         /> */}
        <Column title='Developer' modifier='developer'                    />
        <Column title='Publisher' modifier='publisher'                    />
      </div>
      <div className='game-list-header__scroll-fill' />
    </div>
  ), []);
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
