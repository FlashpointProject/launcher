import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { OpenIcon } from './OpenIcon';
import { Tag, TagCategory } from 'flashpoint-launcher';

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
  let className = 'tag-list-item';
  if (index % 2 === 0) { className += ' tag-list-item--even';     }
  if (isSelected)      { className += ' tag-list-item--selected'; }

  const category = props.tagCategories.find(c => c.name == tag.category);
  const attributes: any = {};
  attributes[TagListItem.idAttribute] = tag.id;

  // Memoize render
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
          title={tag.name || 'BROKEN TAG - ID ' + tag.id}>
          {tag.name || 'BROKEN TAG - ID ' + tag.id}
        </div>
        <div
          className='tag-list-item__field tag-list-item__field--aliases'
          title={tag.aliases.join('; ')}>
          {tag.aliases.join('; ')}
        </div>
        <div
          className='tag-list-item__field tag-list-item__field--category'
          title={category ? category.name : 'NONE'}>
          {category ? category.name : 'NONE'}
        </div>
      </div>
    </li>
  );
}

export namespace TagListItem {
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-tag-id';

  /**
   * Get the id of the game displayed in a GameListItem element (or throw an error if it fails).
   *
   * @param element GameListItem element.
   */
  export function getId(element: Element): number {
    const value = element.getAttribute(TagListItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return Number.parseInt(value);
  }

  /**
   * Check if an element is the top element of GameListItem or not.
   *
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(TagListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
