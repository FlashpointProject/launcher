import * as React from 'react';
import { IDefaultProps } from '../../interfaces';
import { List, AutoSizer, ListRowProps } from 'react-virtualized';
import { GameListItem } from './GameListItem';
import { GameOrderBy, GameOrderReverse } from '../GameOrder';
import { IGameInfo } from '../../../shared/game/interfaces';
import { GameThumbnailCollection } from '../../GameThumbnailCollection';

export interface IGameListProps extends IDefaultProps {
  gameThumbnails?: GameThumbnailCollection;
  games?: IGameInfo[];
  rowHeight: number;
  noRowsRenderer?: () => JSX.Element;
  // React-Virtualized Pass-through
  orderBy?: GameOrderBy;
  orderReverse?: GameOrderReverse;
}

export class GameList extends React.Component<IGameListProps, {}> {
  private _list: React.RefObject<List> = React.createRef();

  constructor(props: IGameListProps) {
    super(props);
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
                ref={this._list}
                className="game-list"
                width={width}
                height={height}
                rowHeight={this.props.rowHeight}
                rowCount={games.length}
                overscanRowCount={15}
                noRowsRenderer={this.props.noRowsRenderer}
                rowRenderer={this.rowRenderer}
                // Pass-through props (they have no direct effect on the list)
                // (If any property is changed the list is re-rendered, even these)
                orderBy={this.props.orderBy}
                orderReverse={this.props.orderReverse}
                />
            );
          }}
        </AutoSizer>
      </div>
    );
  }

  rowRenderer(props: ListRowProps): React.ReactNode {
    const game = (this.props.games as IGameInfo[])[props.index];
    let thumbnail = (this.props.gameThumbnails as GameThumbnailCollection).getFilePath(game.title);
    // Render
    return (
      <GameListItem key={props.key} {...props} 
                    game={game} 
                    thumbnail={thumbnail||''} 
                    height={this.props.rowHeight} />
    );
  }
}
