import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { getPlatformIconURL } from '../Util';
import { Tag } from '@database/entity/Tag';

export type GameListItemProps = ListRowProps & {
  id: string;
  title: string;
  platform: string;
  tags: Tag[];
  developer: string;
  publisher: string;
  /** If the row can be dragged (defaults to false). */
  isDraggable?: boolean;
  /** If the row is selected. */
  isSelected: boolean;
  /** If the row is being dragged. */
  isDragged: boolean;
};

export function GameListItem(props: GameListItemProps) {
  const { id, title, platform, tags, developer, publisher, isDraggable, isSelected, isDragged, index, style } = props;
  // Get the platform icon path
  const platformIcon = React.useMemo(() => (
    getPlatformIconURL(platform)
  ), [platform]);
  // Pick class names
  const className = React.useMemo(() => {
    let className: string = 'game-list-item';
    if (index % 2 === 0) { className += ' game-list-item--even';     }
    if (isSelected)      { className += ' game-list-item--selected'; }
    if (isDragged)       { className += ' game-list-item--dragged';  }
    return className;
  }, [index, isSelected, isDragged]);
  // Memoize render
  return React.useMemo(() => {
    // Set element attributes
    const attributes: any = {};
    attributes[GameListItem.idAttribute] = id;
    // Render
    return (
      <li
        style={style}
        className={className}
        draggable={isDraggable}
        { ...attributes }>
        <div
          className='game-list-item__icon'
          style={{ backgroundImage: `url("${platformIcon}")` }} />
        <div className='game-list-item__right'>
          <div
            className='game-list-item__field game-list-item__field--title'
            title={title}>
            {title}
          </div>
          { tags.forEach(t => (
            <div
              className='game-list-item__field game-list-item__field--tags'
              title={t.aliases[0].name}>
              {t.aliases[0].name}
            </div>
          ))}
          <div
            className='game-list-item__field game-list-item__field--developer'
            title={developer}>
            {developer}
          </div>
          <div
            className='game-list-item__field game-list-item__field--publisher'
            title={publisher}>
            {publisher}
          </div>
        </div>
      </li>
    );
  }, [style, className, isDraggable, id, tags, title, platformIcon]);
}

export namespace GameListItem { // eslint-disable-line no-redeclare
  /** ID of the attribute used to store the game's id. */
  export const idAttribute: string = 'data-game-id';

  /**
   * Get the id of the game displayed in a GameListItem element (or throw an error if it fails).
   * @param element GameListItem element.
   */
  export function getId(element: Element): string {
    const value = element.getAttribute(GameListItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return value;
  }

  /**
   * Check if an element is the top element of GameListItem or not.
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
