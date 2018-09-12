import * as React from 'react';
import { IDefaultProps } from '../interfaces';
import { ListRowProps } from 'react-virtualized';
import { IGameInfo } from '../../shared/game/interfaces';

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
  /** If the grid item is "even" */
  isEven: boolean;
}

export class GameGridItem extends React.Component<IGameGridItemProps, {}> {
  constructor(props: IGameGridItemProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
  }

  render() {
    const game = this.props.game;
    const title: string = game.title || '';
    const width: string = (this.props.width || 0)+'px';
    const height: string = (this.props.height || 0)+'px';
    let className: string = 'game-grid__item';
    // Add class to all with an even index
    if (this.props.isEven) {
      className += ' game-grid__item--even';
    }
    // Add class if selected
    if (this.props.isSelected) {
      className += ' game-grid__item--selected';
    }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}>
        <div className="game-grid__item__thumb" style={{
          backgroundImage: `url("${this.props.thumbnail}")`,
          width: width,
          height: height,
        }} />
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
