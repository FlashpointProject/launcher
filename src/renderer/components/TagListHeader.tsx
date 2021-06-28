import { LangContext } from '@renderer/util/lang';
import * as React from 'react';
import { useMemo } from 'react';

export type TagListHeaderProps = {};

/**
 * Header on top of the GameList.
 * It contains the resizable columns that decide how wide each column is.
 */
export function TagListHeader(props: TagListHeaderProps) {
  const strings = React.useContext(LangContext);
  return useMemo(() => (
    <div className='tag-list-header'>
      <Column modifier='icon' hideDivider={true} />
      <div className='tag-list-header__right'>
        <Column title={strings.tags.name}        modifier='name'        hideDivider={true} />
        <Column title={strings.tags.aliases}     modifier='aliases'                        />
        <Column title={strings.tags.category}    modifier='category'                       />
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
