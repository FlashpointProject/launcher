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
  /** Called when the item is clicked */
  onClick?: (game: IGameInfo, index: number) => void;
  /** Called when the item is double clicked */
  onDoubleClick?: (game: IGameInfo, index: number) => void;
  /** Called when starting to "drag" this element (if set, the element will be flagged as "draggable") */
  onDragStart?: (event: React.DragEvent, game: IGameInfo, index: number) => void;
  /** Called when ending to "drag" this element */
  onDragEnd?: (event: React.DragEvent, game: IGameInfo, index: number) => void;
  /** If the grid item is selected */
  isSelected: boolean;
  /** If the grid item is being dragged */
  isDragged: boolean;
  index: number;
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
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}
          onDragStart={this.onDragStart} onDragEnd={this.onDragEnd}
          draggable={!!this.props.onDragStart}
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

  private onClick = (): void => {
    if (this.props.onClick) {
      this.props.onClick(this.props.game, this.props.index);
    }
  }

  private onDoubleClick = (): void => {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.props.game, this.props.index);
    }
  }
  
  private onDragStart = (event: React.DragEvent): void => {
    if (this.props.onDragStart) {
      this.props.onDragStart(event, this.props.game, this.props.index);
    }
  }

  private onDragEnd = (event: React.DragEvent): void => {
    if (this.props.onDragEnd) {
      this.props.onDragEnd(event, this.props.game, this.props.index);
    }
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
