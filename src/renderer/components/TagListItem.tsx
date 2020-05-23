import { Tag } from '@database/entity/Tag';
import { TagCategory } from '@database/entity/TagCategory';
import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { OpenIcon } from './OpenIcon';

export type TagListItemProps = ListRowProps & {
  /** Current tag */
  tag: Tag;
  /** If the row is selected. */
  isSelected: boolean;
  /** Tag Categories */
  readonly tagCategories: TagCategory[];
};

export function TagListItem(props: TagListItemProps) {
  const { tag, isSelected, index, style } = props;
  // Pick class names
  const className = React.useMemo(() => {
    let className: string = 'tag-list-item';
    if (index % 2 === 0) { className += ' tag-list-item--even';     }
    if (isSelected)      { className += ' tag-list-item--selected'; }
    return className;
  }, [index, isSelected]);
  // Memoize render
  return React.useMemo(() => {
    const category = props.tagCategories.find(c => c.id == tag.categoryId);
    // Set element attributes
    const attributes: any = {};
    attributes[TagListItem.idAttribute] = tag.id;
    // Render
    return (
      <li
        style={style}
        className={className}
        { ...attributes }>
        <OpenIcon
          className='tag-list-icon'
          icon='tag'
          color={category ? category.color : '#FFFFFF'} />
        <div className='tag-list-item__right'>
          <div
            className='tag-list-item__field tag-list-item__field--name'
            title={tag.primaryAlias.name}>
            {tag.primaryAlias.name}
          </div>
          <div
            className='tag-list-item__field tag-list-item__field--description'
            title={tag.description}>
            {tag.description}
          </div>
          <div
            className='tag-list-item__field tag-list-item__field--aliases'
            title={tag.aliases.map(a => a.name).join('; ')}>
            {tag.aliases.map(a => a.name).join('; ')}
          </div>
          <div
            className='tag-list-item__field tag-list-item__field--category'
            title={category ? category.name : 'NONE'}>
            {category ? category.name : 'NONE'}
          </div>
        </div>
      </li>
    );
  }, [style, className, tag]);
}

export namespace TagListItem { // eslint-disable-line no-redeclare
  /** ID of the attribute used to store the game's id. */
  export const idAttribute: string = 'data-tag-id';

  /**
   * Get the id of the game displayed in a GameListItem element (or throw an error if it fails).
   * @param element GameListItem element.
   */
  export function getId(element: Element): number {
    const value = element.getAttribute(TagListItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return Number.parseInt(value);
  }

  /**
   * Check if an element is the top element of GameListItem or not.
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(TagListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}