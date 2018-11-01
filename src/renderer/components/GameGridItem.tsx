import * as React from 'react';
import { GridCellProps } from 'react-virtualized';
import { IDefaultProps } from '../interfaces';
import { IGameInfo } from '../../shared/game/interfaces';
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
  /** If the grid item is selected */
  isSelected: boolean;
  index: number;
}

export class GameGridItem extends React.Component<IGameGridItemProps, {}> {
  constructor(props: IGameGridItemProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
  }

  render() {
    const game = this.props.game;
    const platformIcon = getPlatformIconPath(game.platform);
    let className: string = 'game-grid-item';
    // Add class if selected
    if (this.props.isSelected) {
      className += ' game-grid-item--selected';
    }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}
          onDragStart={this.onDragStart} draggable={!!this.props.onDragStart}>
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
        <div className='game-grid-item__title'>
        <p className='game-grid-item__title__text'>{game.title || ''}</p>
        </div>
      </li>
    );
  }

  onClick(event: React.MouseEvent<HTMLLIElement>): void {
    if (this.props.onClick) {
      this.props.onClick(this.props.game, this.props.index);
    }
  }

  onDoubleClick(event: React.MouseEvent<HTMLLIElement>): void {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.props.game, this.props.index);
    }
  }
  
  onDragStart(event: React.DragEvent): void {
    if (this.props.onDragStart) {
      this.props.onDragStart(event, this.props.game, this.props.index);
    }
  }
}
