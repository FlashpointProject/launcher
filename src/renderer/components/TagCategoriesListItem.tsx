import { TagCategory } from 'flashpoint-launcher';
import { RowComponentProps } from 'react-window';
import { OpenIcon } from './OpenIcon';

export type TagCategoriesListItemProps = RowComponentProps & {
  /** Current tag */
  category: TagCategory;
  /** If the row is selected. */
  isSelected: boolean;
};

export function TagCategoriesListItem(props: TagCategoriesListItemProps) {
  const { category, isSelected, index, style } = props;
  // Pick class names
  let className = 'tag-list-item';
  if (index % 2 === 0) { className += ' tag-list-item--even';     }
  if (isSelected)      { className += ' tag-list-item--selected'; }
  // Memoize render
  const attributes: any = {};
  attributes[TagCategoriesListItem.idAttribute] = category.id;
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
          title={category.name}>
          {category.name}
        </div>
        <div
          className='tag-list-item__field tag-list-item__field--description'
          title={category.description}>
          {category.description}
        </div>
      </div>
    </li>
  );
}

export namespace TagCategoriesListItem {
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-tag-id';

  /**
   * Get the id of the game displayed in a GameListItem element (or throw an error if it fails).
   *
   * @param element GameListItem element.
   */
  export function getId(element: Element): number {
    const value = element.getAttribute(TagCategoriesListItem.idAttribute);
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
      const value = element.getAttribute(TagCategoriesListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
