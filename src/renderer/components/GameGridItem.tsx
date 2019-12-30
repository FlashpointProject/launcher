import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { getPlatformIconURL } from '../Util';

export type GameGridItemProps = Partial<GridCellProps> & {
  id: string;
  title: string;
  platform: string;
  /** Path to the game's thumbnail. */
  thumbnail: string;
  /** If the cell can be dragged (defaults to false). */
  isDraggable?: boolean;
  /** If the cell is selected. */
  isSelected: boolean;
  /** If the cell is being dragged. */
  isDragged: boolean;
};

/** Displays a single game. Meant to be rendered inside a grid. */
export function GameGridItem(props: GameGridItemProps) {
  const { id, title, platform, thumbnail, isDraggable, isSelected, isDragged, style } = props;
  // Get the platform icon path
  const platformIcon = React.useMemo(() => (
    getPlatformIconURL(platform)
  ), [platform]);
  // Pick class names
  const className = React.useMemo(() => {
    let className: string = 'game-grid-item';
    if (isSelected) { className += ' game-grid-item--selected'; }
    if (isDragged)  { className += ' game-grid-item--dragged';  }
    return className;
  }, [isSelected, isDragged]);
  // Memoize render
  return React.useMemo(() => {
    // Set element attributes
    const attributes: any = {};
    attributes[GameGridItem.idAttribute] = id;
    // Render
    return (
      <li
        style={style}
        className={className}
        draggable={isDraggable}
        { ...attributes }>
        <div className='game-grid-item__thumb'>
          <div
            className='game-grid-item__thumb__image'
            style={{ backgroundImage: `url('${thumbnail}')` }}>
            <div className='game-grid-item__thumb__icons'>
              {(platformIcon) ? (
                <div
                  className='game-grid-item__thumb__icons__icon'
                  style={{ backgroundImage: `url('${platformIcon}')` }} />
              ) : undefined }
            </div>
          </div>
        </div>
        <div className='game-grid-item__title' title={title}>
          <p className='game-grid-item__title__text'>{title}</p>
        </div>
      </li>
    );
  }, [style, className, isDraggable, id, title, platformIcon, thumbnail]);
}

export namespace GameGridItem { // eslint-disable-line no-redeclare
  /** ID of the attribute used to store the game's id. */
  export const idAttribute: string = 'data-game-id';

  /**
   * Get the id of the game displayed in a GameGridItem element (or throw an error if it fails).
   * @param element GameGridItem element.
   */
  export function getId(element: Element): string {
    const value = element.getAttribute(GameGridItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameGridItem element. Attribute not found.'); }
    return value;
  }

  /**
   * Check if an element is the top element of GameGridItem or not.
   * @param element Potential element to check.
   */
  export function isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameGridItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
