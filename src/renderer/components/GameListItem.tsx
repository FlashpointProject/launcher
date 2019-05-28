import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';
import { IDefaultProps } from '../interfaces';
import { getPlatformIconPath } from '../Util';

export interface IGameListItemProps extends ListRowProps, IDefaultProps {
  /** Game to show */
  game: IGameInfo;
  /** Path to the games thumbnail */
  thumbnail: string;
  /** Height of the list item (in pixels) */
  height: number;
  /** If the grid item can be dragged (defaults to false) */
  isDraggable?: boolean;
  /** If the grid item is selected */
  isSelected: boolean;
  /** If the grid item is being dragged */
  isDragged: boolean;
}

export class GameListItem extends React.Component<IGameListItemProps, {}> {
  constructor(props: IGameListItemProps) {
    super(props);
  }

  render() {
    const game = this.props.game;
    const title: string = game.title || '';
    const size: string = (this.props.height || 0)+'px';
    const platformIcon = getPlatformIconPath(game.platform);
    // Set element attributes
    const attributes: any = {};
    attributes[GameListItem.idAttribute] = game.id;
    // Pick class names
    let className: string = 'game-list-item';
    if (this.props.index % 2 === 0) { className += ' game-list-item--even';     }
    if (this.props.isSelected)      { className += ' game-list-item--selected'; }
    if (this.props.isDragged)       { className += ' game-list-item--dragged';  }
    // Render
    return (
      <li style={this.props.style}
          className={className} 
          draggable={this.props.isDraggable}
          { ...attributes }>
        <div className='game-list-item__thumb' style={{
          backgroundImage: `url("${this.props.thumbnail}")`,
          width: size,
          height: size,
        }} />
        <div className='game-list-item__right'>
          <p className='game-list-item__right__title' title={title}>{title}</p>
          <p className='game-list-item__right__genre'>{game.genre}</p>
          <div className='game-list-item__right__icons'>
            {(platformIcon) ? (
              <div className='game-list-item__right__icons__icon' style={{
                backgroundImage: `url("${platformIcon}")`
              }} />
            ) : undefined }
          </div>
        </div>
      </li>
    );
  }

  /** ID of the attribute used to store the game's id. */
  public static idAttribute: string = 'data-game-id';
  
  /**
   * Get the id of the game displayed in a GameListItem element (or throw an error if it fails).
   * @param element GameListItem element.
   */
  public static getId(element: Element): string {
    const value = element.getAttribute(GameListItem.idAttribute);
    if (typeof value !== 'string') { throw new Error('Failed to get ID from GameListItem element. Attribute not found.'); }
    return value;
  }
  
  /**
   * Check if an element is the top element of GameListItem or not.
   * @param element Potential element to check.
   */
  public static isElement(element: Element | null | undefined): boolean {
    if (element) {
      const value = element.getAttribute(GameListItem.idAttribute);
      return (typeof value === 'string');
    } else { return false; }
  }
}
