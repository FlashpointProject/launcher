import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { getPlatformIconURL } from '../Util';

export type GameListItemProps = ListRowProps & {
  id: string;
  title: string;
  platform: string;
  tagsStr: string;
  developer: string;
  publisher: string;
  extreme: boolean;
  /** Don't render if extreme games is disabled, match header */
  showExtremeIcon: boolean;
  /** Updates to clear platform icon cache */
  logoVersion: number;
  /** If the row can be dragged (defaults to false). */
  isDraggable?: boolean;
  /** If the row is selected. */
  isSelected: boolean;
  /** If the row is being dragged. */
  isDragged: boolean;
  /** Path to the extreme icon */
  extremeIconPath: string;
};

export function GameListItem(props: GameListItemProps) {
  const { id, title, platform, tagsStr, developer, publisher, extreme, isDraggable, isSelected, isDragged, extremeIconPath, showExtremeIcon, index, style } = props;
  // Get the platform icon path
  const platformIcon = React.useMemo(() => (
    getPlatformIconURL(platform, props.logoVersion)
  ), [platform]);
  // Pick class names
  const className = React.useMemo(() => {
    let className = 'game-list-item';
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
        { showExtremeIcon &&
          (extreme ? (
            <div
              className='game-list-item__icon'
              style={{ backgroundImage: `url("${extremeIconPath}")` }} />
          ) : (
            <div className='game-list-item__icon' />
          ))
        }
        <div
          className='game-list-item__icon'
          style={{ backgroundImage: `url("${platformIcon}")` }} />
        <div className='game-list-item__right'>
          <div
            className='game-list-item__field game-list-item__field--title'
            title={title}>
            {title}
          </div>
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
          {/* <div
            className='game-list-item__field game-list-item__field--tagsStr'
            title={tagsStr}>
            {tagsStr}
          </div> */}
        </div>
      </li>
    );
  }, [style, className, isDraggable, id, tagsStr, title, platformIcon]);
}

export namespace GameListItem { // eslint-disable-line no-redeclare
  /** ID of the attribute used to store the game's id. */
  export const idAttribute = 'data-game-id';

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
