import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { Thumbnail } from '../common/Thumbnail';
import { LaunchBoxGame } from '../../../shared/launchbox/LaunchBoxGame';

export interface IGameListProps extends IDefaultProps {
  games?: ILaunchBoxGame[];
}
export interface IGameListState {
}

export class GameList extends React.Component<IGameListProps, IGameListState> {
  constructor(props: IGameListProps) {
    super(props);
    this.state = {
    };
    this.noRowsRenderer = this.noRowsRenderer.bind(this);
    this.rowRenderer = this.rowRenderer.bind(this);
  }
  
  render() {
    const games = this.props.games || [];
    return (
      <div className="game-browser">
        <AutoSizer>
          {({width, height}) => {
            return (
              <List 
                ref="List"
                className="game-list"
                width={width}
                height={height}
                rowHeight={50}
                rowCount={games.length}
                overscanRowCount={8}
                noRowsRenderer={this.noRowsRenderer}
                rowRenderer={this.rowRenderer} />
            );
          }}
        </AutoSizer>
      </div>
    );
  }
  
  noRowsRenderer() {
    return (
      <div>No games found!</div>
    );
  }
  
  rowRenderer({index, isScrolling, key, style}: ListRowProps): React.ReactNode {
    const game = (this.props.games as ILaunchBoxGame[])[index];
    const title: string = game.title || '';
    let className: string = 'game-list__item';
    // Add class to all with an even index
    if (index % 2 === 0) {
      className += ' game-list__item--even';
    }
    // Render
    return (
      <li key={key} style={style} className={className}>
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
}
