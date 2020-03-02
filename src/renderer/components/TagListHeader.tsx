import * as React from 'react';
import { useMemo } from 'react';

export type TagListHeaderProps = {};

/**
 * Header on top of the GameList.
 * It contains the resizable columns that decide how wide each column is.
 */
export function TagListHeader(props: TagListHeaderProps) {
  return useMemo(() => (
    <div className='tag-list-header'>
      <Column modifier='icon' hideDivider={true} />
      <div className='tag-list-header__right'>
        <Column title='Name'        modifier='name'        hideDivider={true} />
        <Column title='Description' modifier='description'                    />
        <Column title='Aliases'     modifier='aliases'                        />
        <Column title='Category'    modifier='category'                       />
      </div>
      <div className='tag-list-header__scroll-fill' />
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
  const className = 'tag-list-header-column';
  const showDivider = !props.hideDivider;
  // Render
  return (
    <div className={`${className} ${className}--${props.modifier}`}>
      { showDivider ? (
        <div className='tag-list-header-column__divider' />
      ) : undefined }
      <div className='tag-list-header-column__title'>{props.title || ''}</div>
    </div>
  );
}
