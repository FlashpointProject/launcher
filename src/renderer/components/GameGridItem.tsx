import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';
import { IDefaultProps } from '../interfaces';
import { getPlatformIconPath } from '../Util';

export interface IGameGridItemProps extends Partial<GridCellProps>, IDefaultProps {
  /** Game to show */
  game: IGameInfo;
  /** Path to the games thumbnail */
  thumbnail: string;
  /** If the grid item can be dragged (defaults to false) */
  isDraggable?: boolean;
  /** If the grid item is selected */
  isSelected: boolean;
  /** If the grid item is being dragged */
  isDragged: boolean;
}

export class GameGridItem extends React.Component<IGameGridItemProps, {}> {
  constructor(props: IGameGridItemProps) {
    super(props);
  }

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
      <li style={this.props.style}
          className={className}
          draggable={this.props.isDraggable}
          { ...attributes }>
        <div className='game-grid-item__thumb'>
          <div className='game-grid-item__thumb__image' style={{
            backgroundImage: `url('${this.props.thumbnail}')`
          }}>
            <div className='game-grid-item__thumb__icons'>
              {(platformIcon) ? (
                <div className='game-grid-item__thumb__icons__icon' style={{
                  backgroundImage: `url('${platformIcon}')`
                }} />
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
