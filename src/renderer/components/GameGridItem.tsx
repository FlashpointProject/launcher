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
    let className: string = 'game-grid-item';
    if (this.props.isSelected) { className += ' game-grid-item--selected'; }
    if (this.props.isDragged)  { className += ' game-grid-item--dragged';  }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}
          onDragStart={this.onDragStart} onDragEnd={this.onDragEnd}
          draggable={!!this.props.onDragStart}>
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
}
