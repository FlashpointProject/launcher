import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { ILaunchBoxPlatform, ILaunchBoxGame } from '../../../shared/launchbox/interfaces';
import { ISearchOnSearchEvent } from '../generic/search/Search';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { Thumbnail } from '../common/Thumbnail';
import { LaunchBoxGame } from '../../../shared/launchbox/LaunchBoxGame';
import { GameListItem } from './GameListItem';

export interface IGameListProps extends IDefaultProps {
  imageFolder?: string;
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
  
  rowRenderer(props: ListRowProps): React.ReactNode {
    const game = (this.props.games as ILaunchBoxGame[])[props.index];
    // Render
    return (
      <GameListItem key={props.key} {...props} game={game} imageFolder={this.props.imageFolder||''} />
    );
  }
}
