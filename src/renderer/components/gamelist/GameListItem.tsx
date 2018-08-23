import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { IRawLaunchBoxPlatform, IRawLaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { Thumbnail } from '../common/Thumbnail';
import { IGameInfo } from '../../../shared/game/interfaces';
import { LaunchBoxGame } from '../../../shared/launchbox/LaunchBoxGame';

export interface IGameListItemProps extends ListRowProps, IDefaultProps {
  game: IGameInfo;
  imageFolder: string;
}

export class GameListItem extends React.Component<IGameListItemProps, {}> {
  constructor(props: IGameListItemProps) {
    super(props);
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
          src={`${this.props.imageFolder}/${LaunchBoxGame.generateImageFilename(title)}-01.png`}
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
    window.External.launchGameSync(this.props.game);
  }
}
