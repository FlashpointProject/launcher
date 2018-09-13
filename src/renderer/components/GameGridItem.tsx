import * as React from 'react';
import { ListRowProps } from 'react-virtualized';
import { IDefaultProps } from '../interfaces';
import { IGameInfo } from '../../shared/game/interfaces';
import { getPlatformIconPath } from '../Resources';

export interface IGameGridItemProps extends ListRowProps, IDefaultProps {
  /** Game to show */
  game: IGameInfo;
  /** Path to the games thumbnail */
  thumbnail: string;
  /** Height of the grid item (in pixels) */
  width: number;
  /** Height of the grid item (in pixels) */
  height: number;
  /** Called when the item is clicked */
  onClick?: (game: IGameInfo, index: number) => void;
  /** Called when the item is double clicked */
  onDoubleClick?: (game: IGameInfo, index: number) => void;
  /** If the grid item is selected */
  isSelected: boolean;
}

export class GameGridItem extends React.Component<IGameGridItemProps, {}> {
  constructor(props: IGameGridItemProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
  }

  render() {
    const game = this.props.game;
    const width: number = this.props.width || 0;
    const height: number = this.props.height || 0;
    const platformIcon = getPlatformIconPath(game.platform.toLocaleLowerCase());
    let className: string = 'game-grid-item';
    // Add class if selected
    if (this.props.isSelected) {
      className += ' game-grid-item--selected';
    }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}>
        <div className="game-grid-item__thumb"style={{
          width: width+'px',
          height: width+'px',
        }}>
          <div className="game-grid-item__thumb__image" style={{
            backgroundImage: `url("${this.props.thumbnail}")`
          }}>
            <div className="game-grid-item__thumb__icons">
              {(platformIcon) ? (
                <div className="game-grid-item__thumb__icons__icon" style={{
                  backgroundImage: `url("${platformIcon}")`
                }} />
              ) : undefined }           
            </div>
          </div>
        </div>
        <div className="game-grid-item__title" style={{
          height: (height - width) + 'px',
        }}>
        <p className="game-grid-item__title__text">{game.title || ''}</p>
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
}
