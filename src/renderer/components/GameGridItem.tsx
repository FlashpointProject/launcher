import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';
import { getPlatformIconPath } from '../Util';

export type GameGridItemProps = Partial<GridCellProps> & {
  /** Game to display. */
  game: IGameInfo;
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
export class GameGridItem extends React.Component<GameGridItemProps> {
  render() {
    const game = this.props.game;
    const platformIcon = getPlatformIconPath(game.platform);
    // Set element attributes
    const attributes: any = {};
    attributes[GameGridItem.idAttribute] = game.id;
    // Pick class names
    let className: string = 'game-grid-item';
    if (this.props.isSelected) { className += ' game-grid-item--selected'; }
    if (this.props.isDragged)  { className += ' game-grid-item--dragged';  }
    // Render
    return (
      <li
        style={this.props.style}
        className={className}
        draggable={this.props.isDraggable}
        { ...attributes }>
        <div className='game-grid-item__thumb'>
          <div
            className='game-grid-item__thumb__image'
            style={{ backgroundImage: `url('${this.props.thumbnail}')` }}>
            <div className='game-grid-item__thumb__icons'>
              {(platformIcon) ? (
                <div
                  className='game-grid-item__thumb__icons__icon'
                  style={{ backgroundImage: `url('${platformIcon}')` }} />
              ) : undefined }
            </div>
          </div>
        </div>
        <div className='game-grid-item__title' title={game.title}>
          <p className='game-grid-item__title__text'>{game.title}</p>
        </div>
      </li>
    );
  }

  /** ID of the attribute used to store the game's id. */
  public static idAttribute: string = 'data-game-id';
  
  /**
   * Get the id of the game displayed in a GameGridItem element (or throw an error if it fails).
   * @param element GameGridItem element.
   */
  public static getId(element: Element): string {
    const value = element.getAttribute(GameGridItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameGridItem element. Attribute not found.'); }
    return value;
  }
  
  /**
   * Check if an element is the top element of GameGridItem or not.
   * @param element Potential element to check.
   */
  public static isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameGridItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
