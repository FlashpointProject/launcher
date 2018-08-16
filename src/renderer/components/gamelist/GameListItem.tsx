import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { Thumbnail } from '../common/Thumbnail';
import { LaunchBoxGame } from '../../../shared/launchbox/LaunchBoxGame';

export interface IGameListItemProps extends ListRowProps, IDefaultProps {
  game: ILaunchBoxGame;
}
export interface IGameListItemState {
}

export class GameListItem extends React.Component<IGameListItemProps, IGameListItemState> {
  constructor(props: IGameListItemProps) {
    super(props);
    this.state = {
    };
    this.onDoubleClick = this.onDoubleClick.bind(this);
  }
  
  render() {
    const game = this.props.game;
    const title: string = game.title || '';
    let className: string = 'game-list__item';
    // Add class to all with an even index
    if (this.props.index % 2 === 0) {
      className += ' game-list__item--even';
    }
    // Render
    return (
      <li style={this.props.style} className={className} onDoubleClick={this.onDoubleClick}>
        <Thumbnail 
          src={`../Data/Images/${LaunchBoxGame.generateImageFilename(title)}-01.png`}
          parentWidth={50} parentHeight={50}
          imageWidth={50} imageHeight={50}
          outerProps={{className:"game-list__item__thumb__border"}}
          wrapperProps={{className:"game-list__item__thumb__wrapper"}}
          imageProps={{className:"game-list__item__thumb__image"}}
          />
        <div className="game-list__item__right">
          <p className="game-list__item__right__title">{title}</p>
          <p className="game-list__item__right__genre">{game.genre}</p>
        </div>
      </li>
    );
  }

  onDoubleClick(event: React.MouseEvent<HTMLLIElement>): void {
    const game = this.props.game;
    (window as any).launchGame(game);
  }
}
