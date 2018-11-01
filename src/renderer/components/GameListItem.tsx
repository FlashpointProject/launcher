import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { ListRowProps } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';
import { getPlatformIconPath } from '../Util';

export interface IGameListItemProps extends ListRowProps, IDefaultProps {
  /** Game to show */
  game: IGameInfo;
  /** Path to the games thumbnail */
  thumbnail: string;
  /** Height of the list item (in pixels) */
  height: number;
  /** Called when the item is clicked */
  onClick?: (game: IGameInfo, index: number) => void;
  /** Called when the item is double clicked */
  onDoubleClick?: (game: IGameInfo, index: number) => void;
  /** Called when starting to "drag" this element (if set, the element will be flagged as "draggable") */
  onDragStart?: (event: React.DragEvent, game: IGameInfo, index: number) => void;
  /** If the list item is selected */
  isSelected: boolean;
}

export class GameListItem extends React.Component<IGameListItemProps, {}> {
  constructor(props: IGameListItemProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
  }

  render() {
    const game = this.props.game;
    const title: string = game.title || '';
    const size: string = (this.props.height || 0)+'px';
    const platformIcon = getPlatformIconPath(game.platform);
    let className: string = 'game-list-item';
    // Add class to all with an even index
    if (this.props.index % 2 === 0) {
      className += ' game-list-item--even';
    }
    // Add class if selected
    if (this.props.isSelected) {
      className += ' game-list-item--selected';
    }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onDragStart={this.onDragStart} draggable={!!this.props.onDragStart}
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}>
        <div className='game-list-item__thumb' style={{
          backgroundImage: `url("${this.props.thumbnail}")`,
          width: size,
          height: size,
        }} />
        <div className='game-list-item__right'>
          <p className='game-list-item__right__title'>{title}</p>
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
