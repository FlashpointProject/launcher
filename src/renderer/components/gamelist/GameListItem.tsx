import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { IRawLaunchBoxPlatform, IRawLaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { IGameInfo } from '../../../shared/game/interfaces';

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
  /** If the list item is selected */
  isSelected: boolean;
}

export class GameListItem extends React.Component<IGameListItemProps, {}> {
  constructor(props: IGameListItemProps) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
  }

  render() {
    const game = this.props.game;
    const title: string = game.title || '';
    const size: string = (this.props.height || 0)+'px';
    let className: string = 'game-list__item';
    // Add class to all with an even index
    if (this.props.index % 2 === 0) {
      className += ' game-list__item--even';
    }
    // Add class if selected
    if (this.props.isSelected) {
      className += ' game-list__item--selected';
    }
    // Render
    return (
      <li style={this.props.style} className={className} 
          onClick={this.onClick} onDoubleClick={this.onDoubleClick}>
        <div className="game-list__item__thumb" style={{
          backgroundImage: `url("${this.props.thumbnail}")`,
          width: size,
          height: size,
        }} />
        <div className="game-list__item__right">
          <p className="game-list__item__right__title">{title}</p>
          <p className="game-list__item__right__genre">{game.genre}</p>
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
